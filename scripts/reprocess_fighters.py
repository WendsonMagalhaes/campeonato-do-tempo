"""
Reprocess fighter sprites:
1. Fix duplicate/static idles for joao, monalisa, samara by processing output/masters/{slug}/fighter_master.png as idle_01.png
2. Reprocess all 8 frames of radja with strict exterior background removal and body opacity protection
"""

from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTERS_DIR = ROOT / 'Copa_Esperanca_Fighter_Generator_Seed_v1' / 'tools' / 'fighter-generator' / 'output' / 'masters'
FRAMES_DIR = ROOT / 'Copa_Esperanca_Fighter_Generator_Seed_v1' / 'tools' / 'fighter-generator' / 'output' / 'frames'
APP_PARTICIPANTS_DIR = ROOT / 'app' / 'public' / 'assets' / 'participants'
ROOT_PARTICIPANTS_DIR = ROOT / 'assets' / 'participants'

FRAME_NAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying']


def is_magenta_standard(r: int, g: int, b: int) -> bool:
    """Standard magenta detection for typical fighter frames."""
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


def process_standard_master(src_path: Path) -> Image.Image:
    """Process a raw master image with standard flood-fill magenta removal."""
    im = Image.open(src_path).convert('RGB')
    arr = np.array(im)
    h, w, _ = arr.shape

    visited = np.zeros((h, w), dtype=bool)
    alpha = np.full((h, w), 255, dtype=np.uint8)

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
        if is_magenta_standard(int(r), int(g), int(b)):
            alpha[y, x] = 0
            q.append((x + 1, y))
            q.append((x - 1, y))
            q.append((x, y + 1))
            q.append((x, y - 1))

    out_arr = np.zeros((h, w, 4), dtype=np.uint8)
    out_arr[:, :, :3] = arr
    out_arr[:, :, 3] = alpha

    new_alpha = np.copy(alpha)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if alpha[y, x] != 0:
                r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
                max_allowed = g + 25
                if r > max_allowed and b > max_allowed and abs(r - b) < 40:
                    out_arr[y, x, 0] = min(r, max_allowed)
                    out_arr[y, x, 2] = min(b, max_allowed)

                transp_neighbors = 0
                if alpha[y - 1, x] == 0:
                    transp_neighbors += 1
                if alpha[y + 1, x] == 0:
                    transp_neighbors += 1
                if alpha[y, x - 1] == 0:
                    transp_neighbors += 1
                if alpha[y, x + 1] == 0:
                    transp_neighbors += 1

                if transp_neighbors >= 2:
                    new_alpha[y, x] = 180
                elif transp_neighbors == 1:
                    new_alpha[y, x] = 220
                else:
                    new_alpha[y, x] = 255
            else:
                new_alpha[y, x] = 0

    out_arr[:, :, 3] = new_alpha
    return Image.fromarray(out_arr, 'RGBA')


def is_radja_bg_magenta(r: int, g: int, b: int) -> bool:
    """Strict exterior magenta background detection for Radja frames."""
    return r >= 185 and b >= 175 and g <= 85 and (r + b - 2 * g) >= 260


def process_radja_frame(src_path: Path) -> Image.Image:
    """Process a raw Radja frame strictly preserving purple jacket and clothes."""
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
        if is_radja_bg_magenta(int(r), int(g), int(b)):
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

                # Defringe ONLY on the immediate 1px border pixel with intense magenta spill
                if neighbors_bg > 0:
                    r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
                    if r > 200 and b > 190 and g < 100:
                        out_arr[y, x, 0] = int(r * 0.7)
                        out_arr[y, x, 2] = int(b * 0.7)

    out_arr[:, :, 3] = alpha
    return Image.fromarray(out_arr, 'RGBA')


def save_processed_image(img: Image.Image, slug: str, frame_name: str) -> None:
    """Save processed RGBA image to both app/public and assets dirs."""
    app_dest = APP_PARTICIPANTS_DIR / slug / 'fighter' / f'{frame_name}.png'
    root_dest = ROOT_PARTICIPANTS_DIR / slug / 'fighter' / f'{frame_name}.png'

    app_dest.parent.mkdir(parents=True, exist_ok=True)
    root_dest.parent.mkdir(parents=True, exist_ok=True)

    img.save(app_dest, format='PNG')
    img.save(root_dest, format='PNG')
    print(f'[SAVED] {slug}/{frame_name}.png -> {app_dest.relative_to(ROOT)}')


def main() -> None:
    print('=== REPROCESS FIGHTER FRAMES ===\n')

    # 1. Fix static/duplicate idles for joao, monalisa, samara
    for slug in ['joao', 'monalisa', 'samara']:
        master_src = MASTERS_DIR / slug / 'fighter_master.png'
        if not master_src.exists():
            print(f'[ERROR] Missing master for {slug} at {master_src}')
            continue
        img = process_standard_master(master_src)
        save_processed_image(img, slug, 'idle_01')

    # 2. Reprocess Radja frames
    print('\n=== REPROCESS RADJA FRAMES ===\n')
    for frame_name in FRAME_NAMES:
        if frame_name == 'idle_01':
            src = MASTERS_DIR / 'radja' / 'fighter_master.png'
        else:
            src = FRAMES_DIR / 'radja' / f'{frame_name}.png'

        if not src.exists():
            print(f'[ERROR] Missing raw frame for radja: {src}')
            continue

        img = process_radja_frame(src)
        save_processed_image(img, 'radja', frame_name)

    print('\nReprocessing complete!')


if __name__ == '__main__':
    main()
