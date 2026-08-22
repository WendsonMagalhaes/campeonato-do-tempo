from PIL import Image

def is_magenta(r, g, b):
    return r > 200 and g < 50 and b > 200

img = Image.open("Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson2/victory.png").convert("RGBA")
width, height = img.size

row_counts = []
for y in range(height):
    count = 0
    for x in range(width):
        r,g,b,a = img.getpixel((x, y))
        if not is_magenta(r,g,b):
            count += 1
    row_counts.append(count)

for y in range(0, height, 20):
    print(f"y={y:3d} width={row_counts[y]}")
