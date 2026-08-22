"""
Convert newly generated generator frames for radja, joao, lailson, and leandro
into transparent RGBA runtime sprites in app/public/assets/participants/{slug}/fighter/
and assets/participants/{slug}/fighter/
"""

from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT / 'Copa_Esperanca_Fighter_Generator_Seed_v1' / 'tools' / 'fighter-generator' / 'output' / 'frames'
MASTERS_DIR = ROOT / 'Copa_Esperanca_Fighter_Generator_Seed_v1' / 'tools' / 'fighter-generator' / 'output' / 'masters'
APP_PARTICIPANTS_DIR = ROOT / 'app' / 'public' / 'assets' / 'participants'
ROOT_PARTICIPANTS_DIR = ROOT / 'assets' / 'participants'

FRAME_NAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying']
SLUGS = ['radja', 'joao', 'lailson', 'leandro']


def is_magenta_standard(r: int, g: int, b: int) -> bool:
    if abs(r - 255) <= 40 and g <= 40 and abs(b - 255) <= 40:
        return True
    c_max = max(r, g, b)
    c_min = min(r, g, b)
    if c_max - c_min < 15:
        return False
    if g > c_min + 15:
        return False
    if r > g + 15 and b > g + 15:
        if abs(r - b) < (c_max - c_min) * 0.6:
            return True
    return False


def is_radja_bg_magenta(r: int, g: int, b: int) -> bool:
    return r >= 185 and b >= 175 and g <= 85 and (r + b - 2 * g) >= 260


def process_frame(src_path: Path, is_radja: bool = False) -> Image.Image:
    im = Image.open(src_path).convert('RGB')
    arr = np.array(im)
    h, w, _ = arr.shape

    visited = np.zeros((h, w), dtype=bool)
    is_bg = np.zeros((h, w), dtype=bool)

    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h or visited[y, x]:
            continue
        visited[y, x] = True
        r, g, b = arr[y, x]

        bg_match = is_radja_bg_magenta(int(r), int(g), int(b)) if is_radja else is_magenta_standard(int(r), int(g), int(b))
        if bg_match:
            is_bg[y, x] = True
            q.append((x + 1, y))
            q.append((x - 1, y))
            q.append((x, y + 1))
            q.append((x, y - 1))

    out_arr = np.zeros((h, w, 4), dtype=np.uint8)
    out_arr[:, :, :3] = arr
    alpha = np.where(is_bg, 0, 255).astype(np.uint8)

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if alpha[y, x] == 255:
                neighbors_bg = 0
                if alpha[y - 1, x] == 0:
                    neighbors_bg += 1
                if alpha[y + 1, x] == 0:
                    neighbors_bg += 1
                if alpha[y, x - 1] == 0:
                    neighbors_bg += 1
                if alpha[y, x + 1] == 0:
                    neighbors_bg += 1

                if neighbors_bg >= 2:
                    alpha[y, x] = 180
                elif neighbors_bg == 1:
                    alpha[y, x] = 220

                if neighbors_bg > 0:
                    r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
                    if r > 200 and b > 190 and g < 100:
                        out_arr[y, x, 0] = int(r * 0.7)
                        out_arr[y, x, 2] = int(b * 0.7)

    out_arr[:, :, 3] = alpha
    return Image.fromarray(out_arr, 'RGBA')


def save_processed_image(img: Image.Image, slug: str, frame_name: str) -> None:
    app_dest = APP_PARTICIPANTS_DIR / slug / 'fighter' / f'{frame_name}.png'
    root_dest = ROOT_PARTICIPANTS_DIR / slug / 'fighter' / f'{frame_name}.png'

    app_dest.parent.mkdir(parents=True, exist_ok=True)
    root_dest.parent.mkdir(parents=True, exist_ok=True)

    img.save(app_dest, format='PNG')
    img.save(root_dest, format='PNG')
    print(f'[SAVED] {slug}/{frame_name}.png -> {app_dest.relative_to(ROOT)}')


def main() -> None:
    print('=== PROCESSING TRANSPARENT RUNTIME SPRITES ===\n')

    for slug in SLUGS:
        print(f'\n--- {slug.upper()} ---')
        is_radja = (slug == 'radja')

        for frame_name in FRAME_NAMES:
            src = FRAMES_DIR / slug / f'{frame_name}.png'
            if not src.exists() and frame_name == 'idle_01':
                src = MASTERS_DIR / slug / 'fighter_master.png'

            if not src.exists():
                print(f'[ERROR] Missing frame for {slug}: {src}')
                continue

            img = process_frame(src, is_radja=is_radja)
            save_processed_image(img, slug, frame_name)

    print('\nAll transparent runtime sprites generated successfully!')


if __name__ == '__main__':
    main()
