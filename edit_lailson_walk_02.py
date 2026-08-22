from PIL import Image

def edit_image(path):
    img = Image.open(path).convert('RGB')
    w, h = img.size
    
    # Create a copy to read from while modifying
    orig = img.copy()
    
    bg_color = (255, 0, 255)
    
    def is_bg(c):
        return c[0] > 200 and c[2] > 200 and c[1] < 50
    
    def dist_to_bg(x, y):
        d = 999
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if 0 <= x+dx < w and 0 <= y+dy < h:
                    if is_bg(orig.getpixel((x+dx, y+dy))):
                        d = min(d, max(abs(dx), abs(dy)))
        return d
        
    skin_color = (244, 220, 176)
    
    # 1. Remove watch
    for y in range(308, 322):
        for x in range(170, 195):
            if dist_to_bg(x, y) > 1:
                # Inside the arm, paint with skin color
                img.putpixel((x, y), skin_color)
                
    # 2. Shift left leg (forward = left)
    # Box: x < 255, y >= 430
    for y in range(430, h):
        for x in range(0, 255):
            src_x = x + 3
            if src_x < 255:
                img.putpixel((x, y), orig.getpixel((src_x, y)))
            else:
                if y < 472:
                    img.putpixel((x, y), orig.getpixel((254, y))) # smear
                else:
                    img.putpixel((x, y), bg_color)
                    
    # 3. Shift right arm (backward = right)
    # Box: x >= 335, y <= 375
    for y in range(200, 376):
        for x in reversed(range(335, w)):
            src_x = x - 3
            if src_x >= 335:
                img.putpixel((x, y), orig.getpixel((src_x, y)))
            else:
                if 230 <= y <= 248:
                    img.putpixel((x, y), orig.getpixel((334, y))) # smear shoulder
                else:
                    img.putpixel((x, y), bg_color)
                    
    # Save the modified image
    img.save(path)
    print(f"Successfully edited {path}")

# Run on the main app asset
edit_image('app/public/assets/participants/lailson/fighter/walk_02.png')

