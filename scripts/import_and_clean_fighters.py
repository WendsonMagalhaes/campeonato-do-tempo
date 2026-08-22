"""
Script to import, remove magenta background via connected border flood-fill,
and integrate enhanced fighter frames for Radja, Leandro, Joao, and Lailson.
"""

from collections import deque
from pathlib import Path
import numpy as np
import scipy.ndimage as ndi
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FG_OUTPUT = ROOT / 'Copa_Esperanca_Fighter_Generator_Seed_v1' / 'tools' / 'fighter-generator' / 'output'
FG_REVIEW = ROOT / 'Copa_Esperanca_Fighter_Generator_Seed_v1' / 'tools' / 'fighter-generator' / 'review'

DEST_APP = ROOT / 'app' / 'public' / 'assets' / 'participants'
DEST_ASSETS = ROOT / 'assets' / 'participants'
DEST_SEED = ROOT / 'Copa_Esperanca_Fighter_Generator_Seed_v1' / 'assets' / 'participants'

CANONICAL_FRAMES = [
    'idle_01',
    'idle_02',
    'walk_01',
    'walk_02',
    'attack',
    'hurt',
    'victory',
    'lying',
]

TARGET_FIGHTERS = ['radja', 'leandro', 'joao', 'lailson']
SOURCE_DIR_MAP = {
    'lailson': 'lailson2',
}


def is_magenta_bg_pixel(arr: np.ndarray) -> np.ndarray:
    """Vectorized check for magenta background pixels."""
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    dist = np.sqrt((r - 255.0) ** 2 + g ** 2 + (b - 255.0) ** 2)
    return (dist < 140.0) | ((r > 140.0) & (b > 140.0) & (((r + b) / 2.0 - g) > 50.0))


def remove_background_connected(im_rgb: Image.Image) -> tuple[Image.Image, dict]:
    """
    Remove magenta background strictly based on connectivity to outer borders.
    Preserves all interior pixels (such as Joao's tie or Radja's clothing) 100% opaque.
    """
    arr = np.array(im_rgb.convert('RGB'))
    h, w, _ = arr.shape
    assert (h, w) == (576, 576), f"Expected 576x576, got {w}x{h}"

    mag_mask = is_magenta_bg_pixel(arr)
    # 4-way connectivity structure
    struct = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    labeled, num_features = ndi.label(mag_mask, structure=struct)

    border_labels = set()
    border_labels.update(np.unique(labeled[0, :]))
    border_labels.update(np.unique(labeled[h - 1, :]))
    border_labels.update(np.unique(labeled[:, 0]))
    border_labels.update(np.unique(labeled[:, w - 1]))
    border_labels.discard(0)

    is_bg = np.isin(labeled, list(border_labels))
    is_fg = ~is_bg

    alpha = np.where(is_bg, 0, 255).astype(np.uint8)

    out_arr = np.zeros((h, w, 4), dtype=np.uint8)
    out_arr[:, :, :3] = arr[:, :, :3]
    out_arr[:, :, 3] = alpha

    # Calculate metrics
    op_mask = alpha > 15
    ys, xs = np.where(op_mask)
    if len(ys) > 0:
        min_y, max_y = int(ys.min()), int(ys.max())
        min_x, max_x = int(xs.min()), int(xs.max())
        content_height = max_y - min_y + 1
        content_width = max_x - min_x + 1
    else:
        min_y, max_y, min_x, max_x = 0, 0, 0, 0
        content_height, content_width = 0, 0

    # Check for internal holes inside foreground
    filled_fg = ndi.binary_fill_holes(is_fg)
    holes_count = int(np.sum(filled_fg & ~is_fg))

    # Check preserved interior magenta count
    preserved_interior_mag = int(np.sum(is_fg & mag_mask))

    stats = {
        'bbox': (min_x, min_y, max_x, max_y),
        'width': content_width,
        'height': content_height,
        'fg_pixels': int(np.sum(is_fg)),
        'holes_count': holes_count,
        'preserved_interior_mag': preserved_interior_mag,
    }

    return Image.fromarray(out_arr, 'RGBA'), stats


def generate_contact_sheet(slug: str, frames_dict: dict[str, Image.Image]) -> Image.Image:
    """Generate a contact sheet (4x2 grid) for visual inspection."""
    cell_w, cell_h = 576, 576
    pad = 10
    cols, rows = 4, 2
    sheet_w = (cell_w + pad) * cols + pad
    sheet_h = (cell_h + pad) * rows + pad

    sheet = Image.new('RGBA', (sheet_w, sheet_h), (30, 30, 30, 255))
    draw = ImageDraw.Draw(sheet)

    for i, frame_name in enumerate(CANONICAL_FRAMES):
        if frame_name not in frames_dict:
            continue
        col = i % cols
        row = i // cols
        left = pad + col * (cell_w + pad)
        top = pad + row * (cell_h + pad)

        img = frames_dict[frame_name]
        sheet.paste(img, (left, top), img)

        # Label rectangle
        draw.rectangle(
            [(left, top + cell_h - 36), (left + cell_w, top + cell_h)],
            fill=(0, 0, 0, 180),
        )
        draw.text(
            (left + cell_w // 2, top + cell_h - 20),
            frame_name,
            fill=(255, 255, 255, 255),
            anchor='mm',
        )

    return sheet


def process_fighter(slug: str) -> dict:
    """Process all 8 frames for a single fighter."""
    print(f"\n==================== PROCESSING {slug.upper()} ====================")
    source_slug = SOURCE_DIR_MAP.get(slug, slug)
    frames_dir = FG_OUTPUT / 'frames' / source_slug
    master_file = FG_OUTPUT / 'masters' / source_slug / 'fighter_master.png'

    processed_frames: dict[str, Image.Image] = {}
    frame_stats: dict[str, dict] = {}

    for frame_name in CANONICAL_FRAMES:
        src_path = frames_dir / f'{frame_name}.png'
        if not src_path.exists() and frame_name == 'idle_01' and master_file.exists():
            src_path = master_file

        if not src_path.exists():
            raise FileNotFoundError(f"Missing frame source for {slug} (source: {source_slug}): {src_path}")

        raw_img = Image.open(src_path)
        clean_img, stats = remove_background_connected(raw_img)
        processed_frames[frame_name] = clean_img
        frame_stats[frame_name] = stats

        print(
            f"  {frame_name.ljust(8)}: bbox=[{stats['bbox'][0]:3d},{stats['bbox'][1]:3d} -> "
            f"{stats['bbox'][2]:3d},{stats['bbox'][3]:3d}] ({stats['width']:3d}x{stats['height']:3d}) | "
            f"height={stats['height']:3d} | holes={stats['holes_count']} | interior_mag={stats['preserved_interior_mag']:4d}"
        )

    # Save to all destination directories
    target_destinations = [
        DEST_APP / slug / 'fighter',
        DEST_ASSETS / slug / 'fighter',
        DEST_SEED / slug / 'fighter',
    ]

    for dest_dir in target_destinations:
        dest_dir.mkdir(parents=True, exist_ok=True)
        for frame_name, img in processed_frames.items():
            img.save(dest_dir / f'{frame_name}.png', format='PNG')

    # Save master image (idle_01 with transparent background)
    master_img = processed_frames['idle_01']
    master_destinations = [
        DEST_APP / slug / 'fighter_master.png',
        DEST_ASSETS / slug / 'fighter_master.png',
        DEST_SEED / slug / 'fighter_master.png',
    ]
    for master_dest in master_destinations:
        master_dest.parent.mkdir(parents=True, exist_ok=True)
        master_img.save(master_dest, format='PNG')

    # Generate and save contact sheet
    contact_sheet = generate_contact_sheet(slug, processed_frames)
    FG_REVIEW.mkdir(parents=True, exist_ok=True)
    contact_sheet.save(FG_REVIEW / f'{slug}_frames_contact_sheet.png', format='PNG')
    for dest_dir in target_destinations:
        contact_sheet.save(dest_dir / f'{slug}_frames_contact_sheet.png', format='PNG')

    print(f"  [SAVED] All 8 frames, master, and contact sheet saved for {slug}.")
    return frame_stats


def main():
    print("=== FIGHTER FRAME IMPORT & BACKGROUND REMOVAL ===")
    all_stats = {}
    for slug in TARGET_FIGHTERS:
        all_stats[slug] = process_fighter(slug)

    print("\n=== SUMMARY OF IDLE CONTENT HEIGHTS ===")
    for slug in TARGET_FIGHTERS:
        h1 = all_stats[slug]['idle_01']['height']
        h2 = all_stats[slug]['idle_02']['height']
        mean_h = (h1 + h2) / 2.0
        print(f"  {slug.ljust(8)}: idle_01={h1}px, idle_02={h2}px -> mean={mean_h:.1f}px (rounded: {round(mean_h)})")


if __name__ == '__main__':
    main()
