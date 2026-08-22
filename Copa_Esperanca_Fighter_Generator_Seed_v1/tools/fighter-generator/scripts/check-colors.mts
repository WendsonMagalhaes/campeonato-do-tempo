import sharp from 'sharp';
import * as path from 'path';

async function getPalette(imagePath: string) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const colors = new Map<string, number>();
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      const a = data[idx+3];
      if (a < 128) continue;
      // skip pure magenta
      if (r > 250 && g < 5 && b > 250) continue;
      
      const key = `${r},${g},${b}`;
      colors.set(key, (colors.get(key) || 0) + 1);
    }
  }
  
  const sorted = [...colors.entries()].sort((a,b) => b[1] - a[1]);
  return sorted.slice(0, 10);
}

async function run() {
  const base = path.resolve('Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson');
  console.log('idle_01 palette:', await getPalette(path.join(base, 'idle_01.png')));
  console.log('idle_02 palette:', await getPalette(path.join(base, 'idle_02.png')));
  console.log('walk_01 palette:', await getPalette(path.join(base, 'walk_01.png')));
  console.log('walk_02 palette:', await getPalette(path.join(base, 'walk_02.png')));
}

run();
