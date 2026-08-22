"""Fresh female_blue hurt: crop after attack, drop corner bleed, flip once to face RIGHT."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(r"C:\Users\Zeus\Documents\workspace\campeonato-do-tempo-2026")
SHEET = ROOT / "app/public/assets/sprites/fighter_female_blue_sheet.png"
OUTS = [
    ROOT / "app/public/assets/runtime/fighters/female_blue/hurt.png",
    ROOT / "Copa_Esperanca_Cursor_Pack/runtime-assets/fighters/female_blue/hurt.png",
]
PREVIEW = ROOT / "app/tmp-battle-shots/hurt_final_check.png"
CANVAS = 576
ALPHA_T = 16
# After attack fist (~467); stop before lying hair
BOX = (475, 592, 475 + 290, 592 + 355)


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


def extract() -> Image.Image:
    sheet = Image.open(SHEET).convert("RGBA")
    crop = sheet.crop(BOX)
    a = crop.split()[-1]
    comps = components(a)
    comps.sort(key=len, reverse=True)
    main = comps[0]
    xs = [p[0] for p in main]
    ys = [p[1] for p in main]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    width = max(1, maxx - minx)
    height = max(1, maxy - miny)
    keep = set(main)
    for comp in comps[1:]:
        cxs = [p[0] for p in comp]
        cys = [p[1] for p in comp]
        cminx, cmaxx = min(cxs), max(cxs)
        cminy, cmaxy = min(cys), max(cys)
        cx = (cminx + cmaxx) / 2
        cy = (cminy + cmaxy) / 2
        if cmaxx < minx + 0.18 * width:
            print("drop left", len(comp))
            continue
        if cminx > maxx - 0.3 * width and cminy > maxy - 0.4 * height:
            print("drop corner", len(comp))
            continue
        near = minx - 36 <= cx <= maxx + 36 and miny - 36 <= cy <= maxy + 36
        if near and 8 <= len(comp) <= 500:
            print("keep fx", len(comp))
            keep.update(comp)
        else:
            print("drop other", len(comp))
    cleaned = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    cp, sp = cleaned.load(), crop.load()
    for x, y in keep:
        cp[x, y] = sp[x, y]
    bbox = cleaned.split()[-1].getbbox()
    content = cleaned.crop(bbox)
    # ONE flip: sheet hurt faces LEFT → match idle RIGHT
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
    return out


def main() -> None:
    framed = extract()
    for p in OUTS:
        framed.save(p)
        print("wrote", p, p.stat().st_size)

    idle = Image.open(ROOT / "app/public/assets/runtime/fighters/female_blue/idle_01.png")
    canvas = Image.new("RGB", (1200, 620), (255, 255, 255))
    for i, (im, label) in enumerate([(idle, "IDLE face RIGHT"), (framed, "HURT face RIGHT")]):
        x = 20 + i * 590
        r = im.resize((560, 560))
        canvas.paste(r, (x, 40), r if r.mode == "RGBA" else None)
        ImageDraw.Draw(canvas).text((x + 10, 10), label, fill=(0, 0, 0))
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(PREVIEW)
    print("preview", PREVIEW)


if __name__ == "__main__":
    main()
