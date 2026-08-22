"""One-shot: analyze female_blue hurt bleed + re-extract cleaned flipped frame."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SHEET = ROOT / "app/public/assets/sprites/fighter_female_blue_sheet.png"
HURT_RT = ROOT / "app/public/assets/runtime/fighters/female_blue/hurt.png"
PACK_HURT = ROOT / "Copa_Esperanca_Cursor_Pack/runtime-assets/fighters/female_blue/hurt.png"
OUT_PREVIEW = ROOT / "app/tmp-battle-shots"


def connected_components(opaque: np.ndarray) -> list[tuple[int, int, int, int, int]]:
    h, w = opaque.shape
    visited = np.zeros_like(opaque, dtype=bool)
    comps: list[tuple[int, int, int, int, int]] = []
    for y in range(h):
        for x in range(w):
            if not opaque[y, x] or visited[y, x]:
                continue
            q = deque([(y, x)])
            visited[y, x] = True
            n = 0
            minx = maxx = x
            miny = maxy = y
            while q:
                cy, cx = q.popleft()
                n += 1
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))
            comps.append((n, minx, miny, maxx, maxy))
    comps.sort(reverse=True)
    return comps


def analyze_runtime() -> None:
    hurt = Image.open(HURT_RT).convert("RGBA")
    arr = np.array(hurt)
    opaque = arr[:, :, 3] > 20
    comps = connected_components(opaque)
    print("runtime hurt size", hurt.size)
    print("top components (pixels, minx,miny,maxx,maxy):")
    for c in comps[:10]:
        print(" ", c)


def place_bottom_center(content: Image.Image, canvas: int = 576) -> Image.Image:
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    cw, ch = content.size
    x = (canvas - cw) // 2
    y = canvas - ch
    out.paste(content, (x, y), content)
    return out


def reextract_hurt() -> None:
    """Crop hurt from sheet avoiding attack overlap, drop ghost fist, flip to face right."""
    sheet = Image.open(SHEET).convert("RGBA")
    # Atlas hurt region overlaps attack; start after attack fist (~x470).
    # Original hurt detectedContent: x=394,y=594,w=387,h=372
    # Attack content ends ~x467. Use tighter left edge.
    x0, y0, w, h = 468, 594, 313, 372
    crop = sheet.crop((x0, y0, x0 + w, y0 + h))
    arr = np.array(crop)
    opaque = arr[:, :, 3] > 20
    comps = connected_components(opaque)
    print("sheet crop comps:")
    for c in comps[:8]:
        print(" ", c)

    # Keep largest component + small spark comps near body; drop left fist blob
    keep = np.zeros_like(opaque, dtype=bool)
    if not comps:
        raise SystemExit("no opaque content in hurt crop")
    main = comps[0]
    _, minx, miny, maxx, maxy = main
    # Flood only the main body component
    visited = np.zeros_like(opaque, dtype=bool)
    q = deque()
    # find a seed in main bbox that is opaque
    seed = None
    for y in range(miny, maxy + 1):
        for x in range(minx, maxx + 1):
            if opaque[y, x]:
                seed = (y, x)
                break
        if seed:
            break
    assert seed
    q.append(seed)
    visited[seed] = True
    while q:
        cy, cx = q.popleft()
        keep[cy, cx] = True
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    # Also keep small spark components that are close to the body bbox
    for n, cminx, cminy, cmaxx, cmaxy in comps[1:]:
        if n < 8 or n > 800:
            continue
        cx = (cminx + cmaxx) / 2
        cy = (cminy + cmaxy) / 2
        # near body
        if minx - 40 <= cx <= maxx + 40 and miny - 40 <= cy <= maxy + 40:
            for y in range(cminy, cmaxy + 1):
                for x in range(cminx, cmaxx + 1):
                    if opaque[y, x]:
                        keep[y, x] = True

    cleaned = arr.copy()
    cleaned[~keep] = (0, 0, 0, 0)
    content = Image.fromarray(cleaned)

    # Trim to opaque bbox
    ys, xs = np.where(keep)
    content = content.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

    # Flip H so baked facing matches idle (right)
    content = content.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    framed = place_bottom_center(content)

    OUT_PREVIEW.mkdir(parents=True, exist_ok=True)
    preview = OUT_PREVIEW / "female_blue_hurt_fixed.png"
    framed.save(preview)
    print("wrote preview", preview)

    # Overwrite runtime + pack copies
    framed.save(HURT_RT)
    framed.save(PACK_HURT)
    print("updated", HURT_RT)
    print("updated", PACK_HURT)


if __name__ == "__main__":
    analyze_runtime()
    reextract_hurt()
    print("--- after ---")
    analyze_runtime()
