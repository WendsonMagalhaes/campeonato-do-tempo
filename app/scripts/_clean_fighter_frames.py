"""Re-normalize fighter runtime frames: keep largest alpha component, bottom-center on 576 canvas."""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(r'C:\Users\Zeus\Documents\workspace\campeonato-do-tempo-2026')
APP_PUBLIC = ROOT / 'app' / 'public' / 'assets'
COORDS = ROOT / 'Copa_Esperanca_Cursor_Pack' / 'docs' / 'SPRITE_ATLAS_COORDS.json'
OUT = APP_PUBLIC / 'runtime' / 'fighters'
CANVAS = 576
ALPHA_T = 12
MIN_COMPONENT = 80  # drop tiny bleed fragments


def largest_component_mask(alpha: Image.Image) -> Image.Image:
    w, h = alpha.size
    visited = [[False] * w for _ in range(h)]
    best = []
    for y in range(h):
        for x in range(w):
            if visited[y][x] or alpha.getpixel((x, y)) <= ALPHA_T:
                continue
            q = deque([(x, y)])
            visited[y][x] = True
            cells = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                        visited[ny][nx] = True
                        if alpha.getpixel((nx, ny)) > ALPHA_T:
                            q.append((nx, ny))
            if len(cells) > len(best):
                best = cells
    mask = Image.new('L', (w, h), 0)
    px = mask.load()
    for x, y in best:
        px[x, y] = 255
    # drop tiny islands already ignored by keeping only largest
    if len(best) < MIN_COMPONENT:
        return mask
    return mask


def place_bottom_center(crop: Image.Image) -> Image.Image:
    canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    cw, ch = crop.size
    # Scale down if larger than canvas while preserving aspect
    scale = min(1.0, CANVAS / max(cw, 1), CANVAS / max(ch, 1))
    if scale < 1.0:
        crop = crop.resize((max(1, int(cw * scale)), max(1, int(ch * scale))), Image.Resampling.NEAREST)
        cw, ch = crop.size
    x = (CANVAS - cw) // 2
    y = CANVAS - ch
    canvas.alpha_composite(crop, (x, y))
    return canvas


def clean_runtime_png(path: Path) -> None:
    im = Image.open(path).convert('RGBA')
    r, g, b, a = im.split()
    mask = largest_component_mask(a)
    # Keep original alpha only where largest component exists
    cleaned_a = Image.new('L', im.size, 0)
    ap = a.load()
    mp = mask.load()
    cp = cleaned_a.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if mp[x, y]:
                cp[x, y] = ap[x, y]
    cleaned = Image.merge('RGBA', (r, g, b, cleaned_a))
    bbox = cleaned_a.getbbox()
    if not bbox:
        return
    crop = cleaned.crop(bbox)
    out = place_bottom_center(crop)
    out.save(path)
    print(f'cleaned {path.relative_to(OUT)}')


def main() -> None:
    # Clean existing runtime frames in place (removes detached bleed fragments)
    for path in sorted(OUT.rglob('*.png')):
        clean_runtime_png(path)


if __name__ == '__main__':
    main()
