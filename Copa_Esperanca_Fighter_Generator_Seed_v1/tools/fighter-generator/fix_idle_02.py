from PIL import Image

walk_02_path = "Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson2/walk_02.png"
idle_01_path = "Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson2/idle_01.png"
out_path = "Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson2/idle_02.png"

walk_img = Image.open(walk_02_path).convert("RGBA")
idle_img = Image.open(idle_01_path).convert("RGBA")

width, height = idle_img.size
split_y = 290

out_img = Image.new("RGBA", (width, height))

# Lower part from idle_01
out_img.paste(idle_img.crop((0, split_y, width, height)), (0, split_y))

# Upper part from walk_02
out_img.paste(walk_img.crop((0, 0, width, split_y)), (0, 0))

# The output must preserve the exact format. We should probably save it as PNG
out_img.save(out_path)
print("Saved to", out_path)
