"""Clean leftover islands on female_blue hurt, flip to face RIGHT (match idle)."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\Users\Zeus\Documents\workspace\campeonato-do-tempo-2026")
PATHS = [
    ROOT / "app/public/assets/runtime/fighters/female_blue/hurt.png",
    ROOT / "Copa_Esperanca_Cursor_Pack/runtime-assets/fighters/female_blue/hurt.png",
]
CANVAS = 576
ALPHA_T = 16


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


def clean_and_flip(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    a = im.split()[-1]
    comps = components(a)
    comps.sort(key=len, reverse=True)
    main = comps[0]
    keep = set(main)
    xs = [p[0] for p in main]
    ys = [p[1] for p in main]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    for comp in comps[1:]:
        cxs = [p[0] for p in comp]
        cys = [p[1] for p in comp]
        cminx, cmaxx = min(cxs), max(cxs)
        cminy, cmaxy = min(cys), max(cys)
        # Keep only small FX near torso/head (sparks), drop edge strips / fists
        cx = (cminx + cmaxx) / 2
        cy = (cminy + cmaxy) / 2
        near_torso = minx + 40 < cx < maxx - 40 and cy < miny + 0.55 * (maxy - miny)
        if near_torso and 8 <= len(comp) <= 400:
            print(path.name, "keep fx", len(comp), (cminx, cminy, cmaxx, cmaxy))
            keep.update(comp)
        else:
            print(path.name, "drop", len(comp), (cminx, cminy, cmaxx, cmaxy))
    cleaned = Image.new("RGBA", im.size, (0, 0, 0, 0))
    cp, sp = cleaned.load(), im.load()
    for x, y in keep:
        cp[x, y] = sp[x, y]
    bbox = cleaned.split()[-1].getbbox()
    content = cleaned.crop(bbox)
    # Normalize baked facing to RIGHT (same as idle/walk/attack)
    content = content.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    cw, ch = content.size
    scale = min(CANVAS / cw, CANVAS / ch, 1.0)
    if scale < 1.0:
        content = content.resize(
            (max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))),
            Image.Resampling.NEAREST,
        )
        cw, ch = content.size
    out.alpha_composite(content, ((CANVAS - cw) // 2, CANVAS - ch))
    out.save(path)
    print("wrote", path, "bbox", out.split()[-1].getbbox())


if __name__ == "__main__":
    for p in PATHS:
        clean_and_flip(p)
