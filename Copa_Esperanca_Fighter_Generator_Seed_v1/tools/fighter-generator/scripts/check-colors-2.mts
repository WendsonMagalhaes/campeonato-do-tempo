import { createCanvas, loadImage } from 'canvas';
import * as path from 'path';

async function getPalette(imagePath: string) {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  
  const colors = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if (a < 128) continue;
    if (r > 250 && g < 10 && b > 250) continue; // skip magenta
    const key = `${r},${g},${b}`;
    colors.set(key, (colors.get(key) || 0) + 1);
  }
  return [...colors.entries()].sort((a,b) => b[1] - a[1]).slice(0, 15);
}

async function run() {
  const base = path.resolve('app/public/assets/participants/lailson/fighter');
  console.log('idle_01:', await getPalette(path.join(base, 'idle_01.png')));
  console.log('walk_01:', await getPalette(path.join(base, 'walk_01.png')));
  console.log('idle_02_fixed:', await getPalette(path.resolve('Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson/idle_02_fixed.png')));
  console.log('walk_02_fixed:', await getPalette(path.resolve('Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson/walk_02_fixed.png')));
}
run();
