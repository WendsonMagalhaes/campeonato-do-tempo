from PIL import Image
import numpy as np

im = Image.open(r'C:\Users\Zeus\Documents\workspace\campeonato-do-tempo-2026\app\public\assets\backgrounds\battle_dock_coldroom_bg.png').convert('RGB')
arr = np.asarray(im)
h, w = arr.shape[:2]
# Find bright whitish plastic chair-ish pixels (high R,G,B similar)
white = (arr[:,:,0] > 200) & (arr[:,:,1] > 200) & (arr[:,:,2] > 200) & (np.abs(arr[:,:,0].astype(int)-arr[:,:,1]) < 25)
# Focus on lower half (ground props)
region = white[int(h*0.45):, :]
ys, xs = np.where(region)
print('bg', w, h)
if len(xs):
    print('white cluster x', xs.min(), xs.max(), 'y', ys.min()+int(h*0.45), ys.max()+int(h*0.45))
# Sample floor luminance near bottom
for y in [700, 750, 800, 850, 880, 900]:
    row = arr[y, w//2]
    print('center pixel y', y, row)

# Map to 1920x1080
sx, sy = 1920/w, 1080/h
print('scale', sx, sy)
# Suggested baselines: concrete floor foreground is lower portion
for native_y in [820, 850, 880, 900]:
    print('native', native_y, '-> logical', int(native_y*sy))
