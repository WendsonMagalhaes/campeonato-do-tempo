from __future__ import annotations

import json
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from stabilize import Stabilizer

HOST = "127.0.0.1"
PORT = 8765

_lock = threading.Lock()
_candidate: dict | None = None
_roi = {"x": 0, "y": 0, "w": 320, "h": 80}
_camera_index = 0
_switch_camera = False
_latest_jpeg: bytes | None = None
_latest_debug_jpeg: bytes | None = None
_stabilizer = Stabilizer()
_running = True
_capture_enabled = False # Toggle OCR OCR/spam off by default


def set_candidate(value: float, confidence: float = 1.0, frame_id: str | None = None, force: bool = False) -> dict:
    global _candidate
    with _lock:
        if not force and _candidate is not None:
            # Prevent pushing micro-updates unless the value actually differs significantly
            # If the value is the same, just return the existing candidate to save frontend updates.
            if abs(_candidate["value"] - value) < 0.001:
                return _candidate
                
        payload = {
            "id": str(uuid.uuid4()),
            "event": "TIMER_VALUE_DETECTED",
            "value": value,
            "confidence": confidence,
            "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "frameId": frame_id or str(uuid.uuid4()),
        }
        _candidate = payload
    return payload


def camera_loop() -> None:
    global _latest_jpeg, _switch_camera, _camera_index
    try:
        import cv2  # type: ignore
    except Exception:
        return
    
    cam = cv2.VideoCapture(_camera_index)
    
    while _running:
        with _lock:
            do_switch = _switch_camera
            current_index = _camera_index
            enabled = _capture_enabled
            
        if do_switch:
            cam.release()
            cam = cv2.VideoCapture(current_index)
            with _lock:
                _switch_camera = False

        if not cam.isOpened():
            time.sleep(0.5)
            continue
            
        ok, frame = cam.read()
        if not ok:
            time.sleep(0.05)
            continue
            
        ok_jpg, encoded = cv2.imencode(".jpg", frame)
        if ok_jpg:
            with _lock:
                _latest_jpeg = encoded.tobytes()

        if enabled:
            with _lock:
                roi = dict(_roi)
            x, y, w, h = int(roi["x"]), int(roi["y"]), int(roi["w"]), int(roi["h"])
            crop = frame[y : y + h, x : x + w] if h > 0 and w > 0 else frame
            
            # The green LEDs are very bright. We use the green channel and adaptive thresholding to be robust to glare.
            # Convert to grayscale first. LCD timers have dark digits on bright reflective backgrounds.
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            
            # Use ADAPTIVE THRESHOLD INV! This fixes the glare AND the fact that digits are black on LCDs.
            bw = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 10)
            
            # Clean noise (open) instead of close (which merges adjacent digits incorrectly).
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            bw = cv2.morphologyEx(bw, cv2.MORPH_OPEN, kernel)
            
            ok_debug, encoded_debug = cv2.imencode(".jpg", bw)
            if ok_debug:
                with _lock:
                    global _latest_debug_jpeg
                    _latest_debug_jpeg = encoded_debug.tobytes()
            
            contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            boxes = [cv2.boundingRect(c) for c in contours]
            
            # Filter noise, but keep individual digit strokes!
            filtered_boxes = []
            for bx in boxes:
                bx_x, bx_y, bx_w, bx_h = bx
                if bx_w * bx_h < 10: continue
                if bx_h < 5: continue
                if bx_w > max(10, int(crop.shape[1] * 0.15)): continue # A single stroke/digit cannot be wider than 15% of the total crop width
                filtered_boxes.append(bx)
                
            filtered_boxes.sort(key=lambda bx: bx[0])
            
            # Cluster by X-gap to merge separated strokes of the same digit
            clusters = []
            for bx in filtered_boxes:
                bx_x, bx_y, bx_w, bx_h = bx
                if not clusters:
                    clusters.append([bx])
                    continue
                
                last_cluster = clusters[-1]
                max_right = max(b[0] + b[2] for b in last_cluster)
                gap = bx_x - max_right
                # If gap is small (less than ~12px), they belong to the same digit
                if gap < max(8, int(crop.shape[1] * 0.04)):
                    clusters[-1].append(bx)
                else:
                    clusters.append([bx])
                    
            merged_boxes = []
            for cluster in clusters:
                min_x = min(b[0] for b in cluster)
                min_y = min(b[1] for b in cluster)
                max_r = max(b[0] + b[2] for b in cluster)
                max_b = max(b[1] + b[3] for b in cluster)
                # Ignore tiny clusters
                if max_r - min_x < 2 or max_b - min_y < 10:
                    continue
                merged_boxes.append((min_x, min_y, max_r - min_x, max_b - min_y))
                
            # Filter to find a horizontally aligned group of digits to eliminate random noise hallucinations
            timer_group = []
            for i in range(len(merged_boxes)):
                x1, y1, w1, h1 = merged_boxes[i]
                group = [merged_boxes[i]]
                for j in range(len(merged_boxes)):
                    if i == j: continue
                    x2, y2, w2, h2 = merged_boxes[j]
                    # Digits in the timer should be roughly the same height and horizontally aligned
                    cy1, cy2 = y1 + h1/2.0, y2 + h2/2.0
                    if abs(cy1 - cy2) < max(h1, h2) * 0.5 and 0.5 < h1/float(h2) < 2.0:
                        group.append(merged_boxes[j])
                        
                if len(group) >= 5:  # Require at least 5 digits/colons aligned
                    group.sort(key=lambda b: b[0])
                    if len(group) > len(timer_group):
                        timer_group = group
            
            if not timer_group:
                # No valid timer group found, skip OCR to avoid hallucination
                time.sleep(0.03)
                continue
                
            DIGITS_LOOKUP = {
                (1, 1, 1, 1, 1, 1, 0): 0,
                (0, 1, 1, 0, 0, 0, 0): 1,
                (1, 1, 0, 1, 1, 0, 1): 2,
                (1, 1, 1, 1, 0, 0, 1): 3,
                (0, 1, 1, 0, 0, 1, 1): 4,
                (1, 0, 1, 1, 0, 1, 1): 5,
                (1, 0, 1, 1, 1, 1, 1): 6,
                (1, 1, 1, 0, 0, 0, 0): 7,
                (1, 1, 1, 1, 1, 1, 1): 8,
                (1, 1, 1, 1, 0, 1, 1): 9
            }
            
            result_str = ""
            for x, y, w, h in timer_group:
                digit_roi = bw[y:y+h, x:x+w]
                
                # Narrow bounding box -> likely '1' or ':'
                if w / float(h) < 0.45:
                    mid_y1 = int(h * 0.35)
                    mid_y2 = int(h * 0.65)
                    mid_roi = digit_roi[mid_y1:mid_y2, 0:w]
                    
                    mid_pixels = cv2.countNonZero(mid_roi)
                    mid_area = max(1, w * (mid_y2 - mid_y1))
                    
                    if mid_pixels < mid_area * 0.2:
                        result_str += ":"
                    else:
                        result_str += "1"
                    continue
                    
                t_h = max(1, int(h * 0.25))
                t_w = max(1, int(w * 0.35))
                offset = max(1, int(w * 0.15))
                
                # Protect against very narrow digits trying to offset more than their width
                if w - t_w - offset < 0:
                    offset = 0
                
                segments = [
                    ((t_w, 0), (w - t_w, t_h)),                                       # 0: top
                    ((w - t_w, t_h), (w, h // 2 - t_h // 2)),                         # 1: top-right
                    ((w - t_w - offset, h // 2 + t_h // 2), (w - offset, h - t_h)),   # 2: bottom-right
                    ((t_w, h - t_h), (w - t_w, h)),                                   # 3: bottom
                    ((0, h // 2 + t_h // 2), (t_w, h - t_h)),                         # 4: bottom-left
                    ((offset, t_h), (t_w + offset, h // 2 - t_h // 2)),               # 5: top-left
                    ((t_w, h // 2 - t_h // 2), (w - t_w, h // 2 + t_h // 2))          # 6: middle
                ]
                
                on = [0] * 7
                for i, ((sx1, sy1), (sx2, sy2)) in enumerate(segments):
                    # Ensure coordinates are within bounds safely
                    sx1 = max(0, min(sx1, w - 1))
                    sx2 = max(0, min(sx2, w))
                    sy1 = max(0, min(sy1, h - 1))
                    sy2 = max(0, min(sy2, h))
                    
                    seg_roi = digit_roi[sy1:sy2, sx1:sx2]
                    total_pixels = (sx2 - sx1) * (sy2 - sy1)
                    if total_pixels == 0:
                        continue
                    if cv2.countNonZero(seg_roi) / float(total_pixels) > 0.35:
                        on[i] = 1
                        
                on_tuple = tuple(on)
                
                best_digit = None
                min_dist = 999
                for t, d in DIGITS_LOOKUP.items():
                    dist = sum([1 for a, b in zip(on_tuple, t) if a != b])
                    if dist < min_dist:
                        min_dist = dist
                        best_digit = d
                        
                # Strict distance requirement to avoid hallucinating noise as digits
                if min_dist <= 1:
                    result_str += str(best_digit)
            
            if result_str:
                print(f"OCR raw: {result_str}, boxes: {len(timer_group)}")

            
            # Parse result into float
            parsed_val = None
            parts = [p for p in result_str.split(":") if p]
            
            try:
                valid_parts = all(len(p) <= 2 for p in parts)
                if valid_parts and len(parts) == 3:
                    mm, ss, cs = int(parts[0]), int(parts[1]), int(parts[2])
                    parsed_val = mm * 60 + ss + cs / 100.0
                elif valid_parts and len(parts) == 2:
                    ss, cs = int(parts[0]), int(parts[1])
                    parsed_val = ss + cs / 100.0
                else:
                    # Fallback if colons were missed or misplaced
                    digits_only = "".join(c for c in result_str if c.isdigit())
                    if len(digits_only) == 6:
                        mm, ss, cs = int(digits_only[0:2]), int(digits_only[2:4]), int(digits_only[4:6])
                        parsed_val = mm * 60 + ss + cs / 100.0
                    elif len(digits_only) in (3, 4, 5):
                        parsed_val = int(digits_only[:-2]) + int(digits_only[-2:]) / 100.0
            except ValueError:
                pass
                
            if parsed_val is not None:
                # Format to string "SS.CC" as expected by the stabilizer (or use directly)
                reading = f"{parsed_val:.2f}"
                stable = _stabilizer.push(reading)
                if stable is not None:
                    set_candidate(float(stable), 0.4, "camera")
                
        time.sleep(0.03)
    cam.release()


class Handler(BaseHTTPRequestHandler):
    def _json(self, code: int, payload: dict | list | None) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/":
            self._json(200, {
                "message": "Timer Capture is running. Open /stream to view camera.",
                "stream_url": "/stream"
            })
            return
        if path == "/debug":
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, private")
            self.send_header("Pragma", "no-cache")
            self.end_headers()
            try:
                while _running:
                    with _lock:
                        jpeg = _latest_debug_jpeg
                    if jpeg is None:
                        time.sleep(0.05)
                        continue
                    
                    self.wfile.write(b"--frame\r\n")
                    self.wfile.write(b"Content-Type: image/jpeg\r\n")
                    self.wfile.write(f"Content-Length: {len(jpeg)}\r\n\r\n".encode("utf-8"))
                    self.wfile.write(jpeg)
                    self.wfile.write(b"\r\n")
                    time.sleep(0.05)
            except Exception:
                pass
            return
        if path == "/stream":
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, private")
            self.send_header("Pragma", "no-cache")
            self.end_headers()
            try:
                while _running:
                    with _lock:
                        jpeg = _latest_jpeg
                    if jpeg is None:
                        time.sleep(0.05)
                        continue
                    
                    self.wfile.write(b"--frame\r\n")
                    self.wfile.write(b"Content-Type: image/jpeg\r\n")
                    self.wfile.write(f"Content-Length: {len(jpeg)}\r\n\r\n".encode("utf-8"))
                    self.wfile.write(jpeg)
                    self.wfile.write(b"\r\n")
                    time.sleep(0.05)
            except Exception:
                pass
            return
        if path == "/health":
            self._json(200, {"ok": True, "role": "timer-capture-peripheral"})
            return
        if path == "/candidate":
            with _lock:
                payload = _candidate
            if payload is None:
                self._json(204, None)
                return
            self._json(200, payload)
            return
        if path == "/roi":
            self._json(200, _roi)
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length) or b"{}")
        path = urlparse(self.path).path
        if path == "/simulate":
            value = float(body.get("value", 0))
            payload = set_candidate(value, 1.0, "simulate", force=True)
            self._json(200, payload)
            return
        if path == "/roi":
            with _lock:
                _roi.update({k: body[k] for k in ("x", "y", "w", "h") if k in body})
            self._json(200, _roi)
            return
        if path == "/camera":
            with _lock:
                global _camera_index, _switch_camera
                _camera_index = int(body.get("index", 0))
                _switch_camera = True
            self._json(200, {"index": _camera_index})
            return
        if path == "/capture/toggle":
            with _lock:
                global _capture_enabled
                _capture_enabled = bool(body.get("enabled", False))
                if not _capture_enabled:
                    global _candidate
                    _candidate = None
                    _stabilizer.reset()
            self._json(200, {"enabled": _capture_enabled})
            return
        self._json(404, {"error": "not found"})

    def log_message(self, fmt: str, *args: object) -> None:
        return


def main() -> None:
    thread = threading.Thread(target=camera_loop, daemon=True)
    thread.start()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Timer Capture localhost http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
