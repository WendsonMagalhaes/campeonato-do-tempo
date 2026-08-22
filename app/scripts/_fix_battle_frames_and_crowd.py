"""One-off 2026-08-15 fixes for battle presentation assets.

1. female_red: re-extract idle_02 / hurt_02 / lying from the source sheet
   (runtime PNGs were byte-duplicates of idle_01 / hurt_01 and the BLUE lying art).
2. Normalize hurt frames to right-baked (victim recoils away from a fist coming
   from the RIGHT), matching the female_blue hurt convention in fighterFacing.ts:
   flip male_blue/hurt, male_red/hurt, female_red/hurt_01, female_red/hurt_02.
3. Extract railing-free crowd ground groups from crowd_sheet band y=512-768
   into app/public/assets/runtime/crowd/ (group B has the freestanding
   handrail post erased).

Atlas source: docs/copa-ui/SPRITE_ATLAS_COORDS.json (Copa pack copy was removed).
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from _reextract_fighter_frames import extract_one

ROOT = Path(r'C:\Users\Zeus\Documents\workspace\campeonato-do-tempo-2026')
COORDS = ROOT / 'docs' / 'copa-ui' / 'SPRITE_ATLAS_COORDS.json'
SHEETS = ROOT / 'app' / 'public' / 'assets' / 'sprites'
FIGHTERS_OUT = ROOT / 'app' / 'public' / 'assets' / 'runtime' / 'fighters'
CROWD_OUT = ROOT / 'app' / 'public' / 'assets' / 'runtime' / 'crowd'

# Frames re-extracted from the female_red sheet (runtime files were placeholders).
FEMALE_RED_REEXTRACT = ['idle_02', 'hurt_02', 'lying']

# Left-baked hurt frames flipped once to right-baked (fist enters from the right).
FLIP_TO_RIGHT = [
    ('male_blue', ['hurt']),
    ('male_red', ['hurt']),
    ('female_red', ['hurt_01', 'hurt_02']),
]

# Railing-free clusters measured in crowd_sheet band y=512-768 (alpha scan).
# Erase rects are sheet-space; group B post is removed in two parts so the
# green crate (right edge x=648) keeps its pixels below y=689.
CROWD_GROUPS = {
    # Woman + cap man + seated yellow guy on wooden crate.
    'ground_group_a': {'box': (393, 513, 586, 749), 'erase': []},
    # Bald man + cheering man + green crate; freestanding handrail post erased.
    'ground_group_b': {
        'box': (591, 513, 726, 749),
        'erase': [(644, 630, 666, 689), (649, 689, 666, 749)],
    },
}


def reextract_female_red() -> None:
    atlas = json.loads(COORDS.read_text(encoding='utf-8'))
    meta = atlas['female_red']
    sheet = Image.open(SHEETS / 'fighter_female_red_sheet.png').convert('RGBA')
    out_dir = FIGHTERS_OUT / 'female_red'
    for name in FEMALE_RED_REEXTRACT:
        img = extract_one(sheet, meta['frames'][name])
        img.save(out_dir / f'{name}.png')
        print('re-extracted female_red', name)


def flip_hurts() -> None:
    for variant, names in FLIP_TO_RIGHT:
        for name in names:
            path = FIGHTERS_OUT / variant / f'{name}.png'
            img = Image.open(path).convert('RGBA')
            img.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(path)
            print('flipped to right-baked', variant, name)


def extract_crowd() -> None:
    sheet = Image.open(SHEETS / 'crowd_sheet.png').convert('RGBA')
    CROWD_OUT.mkdir(parents=True, exist_ok=True)
    for name, spec in CROWD_GROUPS.items():
        x0, y0, x1, y1 = spec['box']
        crop = sheet.crop((x0, y0, x1, y1))
        px = crop.load()
        for ex0, ey0, ex1, ey1 in spec['erase']:
            for y in range(ey0 - y0, min(ey1 - y0 + 1, crop.height)):
                for x in range(ex0 - x0, min(ex1 - x0 + 1, crop.width)):
                    px[x, y] = (0, 0, 0, 0)
        # Trim to opaque bbox so dest boxes map exactly to visible content.
        bbox = crop.split()[-1].getbbox()
        if bbox:
            crop = crop.crop(bbox)
        crop.save(CROWD_OUT / f'{name}.png')
        print('crowd', name, 'size', crop.size)


if __name__ == '__main__':
    reextract_female_red()
    flip_hurts()
    extract_crowd()
