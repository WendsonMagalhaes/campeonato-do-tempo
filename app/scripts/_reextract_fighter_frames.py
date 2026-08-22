"""Re-extract fighter frames: atlas crop + keep main body and nearby FX islands."""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(r'C:\Users\Zeus\Documents\workspace\campeonato-do-tempo-2026')
COORDS = ROOT / 'Copa_Esperanca_Cursor_Pack' / 'docs' / 'SPRITE_ATLAS_COORDS.json'
SHEETS = ROOT / 'app' / 'public' / 'assets' / 'sprites'
OUT = ROOT / 'app' / 'public' / 'assets' / 'runtime' / 'fighters'
CANVAS = 576
ALPHA_T = 16
NEAR_PX = 28  # keep FX islands near the main body
# female_blue hurt: attack cell overlaps; use atlas coords that start after the fist.
# Do not keep medium islands fully left of the body (ghost fist bleed).

VARIANT_SHEET = {
    'male_blue': 'fighter_male_blue_sheet.png',
    'male_red': 'fighter_male_red_sheet.png',
    'female_blue': 'fighter_female_blue_sheet.png',
    'female_red': 'fighter_female_red_sheet.png',
}


def components(alpha: Image.Image) -> list[list[tuple[int, int]]]:
    w, h = alpha.size
    visited = bytearray(w * h)
    out: list[list[tuple[int, int]]] = []

    def idx(x: int, y: int) -> int:
        return y * w + x

    for y in range(h):
        for x in range(w):
            i = idx(x, y)
            if visited[i] or alpha.getpixel((x, y)) <= ALPHA_T:
                continue
            q = deque([(x, y)])
            visited[i] = 1
            cells: list[tuple[int, int]] = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = idx(nx, ny)
                        if not visited[ni]:
                            visited[ni] = 1
                            if alpha.getpixel((nx, ny)) > ALPHA_T:
                                q.append((nx, ny))
            out.append(cells)
    return out


def keep_mask(alpha: Image.Image) -> set[tuple[int, int]]:
    comps = components(alpha)
    if not comps:
        return set()
    comps.sort(key=len, reverse=True)
    main = comps[0]
    # Bounding box of main
    xs = [p[0] for p in main]
    ys = [p[1] for p in main]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    width = max(1, maxx - minx)
    keep = set(main)
    for comp in comps[1:]:
        # Drop far bleed; keep near FX (motion lines / sparks / ribbon tips)
        if len(comp) < 6:
            continue
        cxs = [p[0] for p in comp]
        cmaxx = max(cxs)
        # Detached attack-fist islands sit fully left of the body core
        if cmaxx < minx + 0.2 * width:
            continue
        near = False
        for x, y in comp:
            if (minx - NEAR_PX) <= x <= (maxx + NEAR_PX) and (miny - NEAR_PX) <= y <= (maxy + NEAR_PX):
                near = True
                break
        if near and len(comp) < 1500:
            keep.update(comp)
    return keep


def place(crop: Image.Image) -> Image.Image:
    canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    cw, ch = crop.size
    scale = min(CANVAS / cw, CANVAS / ch, 1.0)
    if scale < 1.0:
        crop = crop.resize((max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))), Image.Resampling.NEAREST)
        cw, ch = crop.size
    canvas.alpha_composite(crop, ((CANVAS - cw) // 2, CANVAS - ch))
    return canvas


def extract_one(sheet: Image.Image, frame: dict) -> Image.Image:
    box = frame.get('detectedContent') or frame
    x, y, w, h = int(box['x']), int(box['y']), int(box['w']), int(box['h'])
    sw, sh = sheet.size
    x0, y0 = max(0, x - 2), max(0, y - 2)
    x1, y1 = min(sw, x + w + 2), min(sh, y + h + 2)
    crop = sheet.crop((x0, y0, x1, y1)).convert('RGBA')
    a = crop.split()[-1]
    keep = keep_mask(a)
    cleaned = Image.new('RGBA', crop.size, (0, 0, 0, 0))
    cp, sp = cleaned.load(), crop.load()
    for px, py in keep:
        cp[px, py] = sp[px, py]
    bbox = cleaned.split()[-1].getbbox()
    if not bbox:
        return place(Image.new('RGBA', (1, 1), (0, 0, 0, 0)))
    return place(cleaned.crop(bbox))


def main() -> None:
    fighters = json.loads(COORDS.read_text(encoding='utf-8'))
    for key, sheet_name in VARIANT_SHEET.items():
        meta = fighters[key]
        sheet = Image.open(SHEETS / sheet_name).convert('RGBA')
        out_dir = OUT / key
        out_dir.mkdir(parents=True, exist_ok=True)
        for name, frame in meta['frames'].items():
            img = extract_one(sheet, frame)
            img.save(out_dir / f'{name}.png')
            print('wrote', key, name)


if __name__ == '__main__':
    main()
