#!/usr/bin/env python3
"""Crop square selection cursor frames from selection_cursor_frame_sheet.png.

Usage (from repo root or any cwd):
  python app/scripts/crop-selection-cursor-frames.py

Writes:
  app/public/assets/runtime/cursors/p1|p2/{idle,move,lock,selected}_01..04.png
  docs/copa-ui/SELECTION_CURSOR_FRAMES.json
  docs/copa-ui-runtime/selection_cursor_frame_rois_debug.png
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SHEET = ROOT / "app/public/assets/ui/selection_cursor_frame_sheet.png"
OUT = ROOT / "app/public/assets/runtime/cursors"
MANIFEST = ROOT / "docs/copa-ui/SELECTION_CURSOR_FRAMES.json"
DEBUG = ROOT / "docs/copa-ui-runtime/selection_cursor_frame_rois_debug.png"

# Measured hollow centers on 1024×768 sheet (P1 left blue / P2 right red).
P1_XS = [92, 208, 328, 444]
P2_XS = [608, 724, 844, 964]
ROWS = {"idle": 129, "move": 263, "lock": 398, "selected": 533}
HALF = {
    "idle": (52, 52),
    "move": (70, 55),
    "lock": (54, 54),
    "selected": (88, 88),
}


def main() -> None:
    im = Image.open(SHEET).convert("RGBA")
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.float32)
    lum = rgb.mean(axis=2)
    h, w = arr.shape[:2]

    alpha = np.zeros((h, w), dtype=np.uint8)
    alpha[lum > 14] = np.clip(((lum[lum > 14] - 14) / 30) * 255, 0, 255).astype(np.uint8)
    alpha[lum > 35] = 255
    arr[:, :, 3] = alpha
    sheet = Image.fromarray(arr, "RGBA")
    sheet.save(SHEET, "PNG")

    frames: dict = {}
    rois: dict[str, tuple[int, int, int, int]] = {}

    for player, xs in (("p1", P1_XS), ("p2", P2_XS)):
        for state, cy in ROWS.items():
            hx, hy = HALF[state]
            for fi, cx in enumerate(xs, start=1):
                if state == "move":
                    x0, x1 = cx - hx - 12, cx + hx - 8
                else:
                    x0, x1 = cx - hx, cx + hx
                y0, y1 = cy - hy, cy + hy
                x0, y0 = max(0, x0), max(0, y0)
                x1, y1 = min(w, x1), min(h, y1)

                crop_arr = arr[y0:y1, x0:x1].copy()
                cl = crop_arr[:, :, :3].mean(axis=2)
                crop_arr[cl < 16, 3] = 0
                ch, cw = crop_arr.shape[:2]
                fcx, fcy = cx - x0, cy - y0
                hole_r = 26 if state != "selected" else 24
                yy, xx = np.ogrid[:ch, :cw]
                hole = (np.maximum(np.abs(xx - fcx), np.abs(yy - fcy)) < hole_r) & (cl < 40)
                inner = (np.abs(xx - fcx) < hole_r + 4) & (np.abs(yy - fcy) < hole_r + 4) & (cl < 18)
                crop_arr[hole | inner, 3] = 0

                name = f"{state}_{fi:02d}.png"
                dest_dir = OUT / player
                dest_dir.mkdir(parents=True, exist_ok=True)
                Image.fromarray(crop_arr, "RGBA").save(dest_dir / name, "PNG")

                key = f"{player}/{state}_{fi:02d}"
                frames[key] = {
                    "path": f"/assets/runtime/cursors/{player}/{name}",
                    "sourceROI": {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)},
                    "anchor": {"cx": int(fcx), "cy": int(fcy)},
                    "hole": {
                        "x": int(fcx - hole_r),
                        "y": int(fcy - hole_r),
                        "w": hole_r * 2,
                        "h": hole_r * 2,
                    },
                    "frameIndex": fi,
                    "state": state,
                    "player": player,
                }
                rois[key] = (x0, y0, x1, y1)

    dbg = Image.open(SHEET).convert("RGB")
    draw = ImageDraw.Draw(dbg)
    colors = {"idle": (0, 255, 0), "move": (0, 200, 255), "lock": (255, 200, 0), "selected": (255, 0, 255)}
    for key, (x0, y0, x1, y1) in rois.items():
        st = key.split("/")[1].rsplit("_", 1)[0]
        draw.rectangle([x0, y0, x1 - 1, y1 - 1], outline=colors[st], width=2)
    DEBUG.parent.mkdir(parents=True, exist_ok=True)
    dbg.save(DEBUG)

    manifest = {
        "sheet": "/assets/ui/selection_cursor_frame_sheet.png",
        "sheetSize": {"w": w, "h": h},
        "method": "pre-crop fixed ROIs around measured hollow centers; labels excluded",
        "notes": "P1 left blue / P2 right red; rows IDLE,MOVE,LOCK,SELECTED; 4 frames each; bottom extras skipped",
        "frames": frames,
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {len(frames)} frames → {OUT}")
    print(f"Manifest → {MANIFEST}")


if __name__ == "__main__":
    main()
