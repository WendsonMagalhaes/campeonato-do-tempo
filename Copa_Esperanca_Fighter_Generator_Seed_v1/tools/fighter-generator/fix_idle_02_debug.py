from PIL import Image, ImageDraw

walk_02_path = "Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson2/walk_02.png"
idle_01_path = "Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson2/idle_01.png"
out_path = "Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/debug_split.png"

walk_img = Image.open(walk_02_path).convert("RGBA")
idle_img = Image.open(idle_01_path).convert("RGBA")

width, height = idle_img.size

# Let's generate a side by side with a line at split_y
split_y = int(height * 0.52)

combo = Image.new("RGBA", (width*2, height), (0,0,0,0))
combo.paste(walk_img, (0,0))
combo.paste(idle_img, (width,0))

draw = ImageDraw.Draw(combo)
draw.line([(0, split_y), (width*2, split_y)], fill="red", width=2)
combo.save(out_path)
print("Saved debug to", out_path)
