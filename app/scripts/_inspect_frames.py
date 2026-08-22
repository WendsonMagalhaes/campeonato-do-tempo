from PIL import Image
from pathlib import Path

root = Path(r'C:\Users\Zeus\Documents\workspace\campeonato-do-tempo-2026\app\public\assets\runtime\fighters')
for rel in [
    'female_blue/idle_01.png',
    'female_blue/attack.png',
    'female_blue/hurt.png',
    'female_red/idle_01.png',
    'female_red/attack.png',
    'male_blue/idle_01.png',
    'male_blue/attack.png',
]:
    im = Image.open(root / rel).convert('RGBA')
    a = im.split()[-1]
    bbox = a.getbbox()
    w, h = im.size
    bottom = None
    for y in range(h - 1, -1, -1):
        for x in range(w):
            if a.getpixel((x, y)) > 8:
                bottom = y
                break
        if bottom is not None:
            break
    pad = (h - 1 - bottom) if bottom is not None else None
    print(f'{rel}: size={im.size} bbox={bbox} bottomOpaque={bottom} padBelow={pad}')
