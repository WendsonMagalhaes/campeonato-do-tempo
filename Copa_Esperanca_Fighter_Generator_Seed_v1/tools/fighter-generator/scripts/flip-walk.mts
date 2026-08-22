import { createCanvas, loadImage } from 'canvas';
import * as path from 'path';
import * as fs from 'fs';

async function generateWalk02() {
  const base = path.resolve('app/public/assets/participants/lailson/fighter');
  const walk1 = await loadImage(path.join(base, 'walk_01.png'));
  
  const canvas = createCanvas(walk1.width, walk1.height);
  const ctx = canvas.getContext('2d');
  
  // Fill magenta
  ctx.fillStyle = '#FF00FF';
  ctx.fillRect(0, 0, walk1.width, walk1.height);
  
  // Draw flipped
  ctx.save();
  ctx.translate(walk1.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(walk1, 0, 0);
  ctx.restore();
  
  const outPath = path.resolve('Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson/walk_02_fixed.png');
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log('Saved', outPath);
}
generateWalk02();
