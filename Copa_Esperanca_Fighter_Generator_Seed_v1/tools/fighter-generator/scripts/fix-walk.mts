import { createCanvas, loadImage } from 'canvas';
import * as path from 'path';
import * as fs from 'fs';

async function fixWalk02() {
  const base = path.resolve('app/public/assets/participants/lailson/fighter');
  const walk1 = await loadImage(path.join(base, 'walk_01.png'));
  
  const canvas = createCanvas(walk1.width, walk1.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(walk1, 0, 0);
  
  const idata = ctx.getImageData(0, 0, walk1.width, walk1.height).data;
  
  // Find bbox
  let minX = walk1.width, maxX = 0, minY = walk1.height, maxY = 0;
  for(let y=0; y<walk1.height; y++){
    for(let x=0; x<walk1.width; x++){
      const idx = (y*walk1.width + x)*4;
      const r=idata[idx], g=idata[idx+1], b=idata[idx+2];
      if(r===255 && g===0 && b===255) continue;
      if(x < minX) minX = x;
      if(x > maxX) maxX = x;
      if(y < minY) minY = y;
      if(y > maxY) maxY = y;
    }
  }
  
  const charW = maxX - minX;
  const charH = maxY - minY;
  
  const outCanvas = createCanvas(walk1.width, walk1.height);
  const outCtx = outCanvas.getContext('2d');
  outCtx.fillStyle = '#FF00FF';
  outCtx.fillRect(0, 0, walk1.width, walk1.height);
  
  // Split at waist: roughly 50% down the character height
  const splitY = Math.floor(minY + charH * 0.52);
  
  // Draw top half normal
  outCtx.drawImage(walk1,
    0, 0, walk1.width, splitY,
    0, 0, walk1.width, splitY
  );
  
  // Draw bottom half flipped horizontally
  outCtx.save();
  outCtx.translate(walk1.width, 0);
  outCtx.scale(-1, 1);
  outCtx.drawImage(walk1,
    0, splitY, walk1.width, walk1.height - splitY,
    0, splitY, walk1.width, walk1.height - splitY
  );
  outCtx.restore();
  
  const outPath = path.resolve('Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson/walk_02_fixed.png');
  fs.writeFileSync(outPath, outCanvas.toBuffer('image/png'));
  console.log('Saved', outPath);
}
fixWalk02();
