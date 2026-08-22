import { createCanvas, loadImage } from 'canvas';
import * as path from 'path';
import * as fs from 'fs';

async function fixIdle02() {
  const base = path.resolve('app/public/assets/participants/lailson/fighter');
  const idle = await loadImage(path.join(base, 'idle_01.png'));
  
  const canvas = createCanvas(idle.width, idle.height);
  const ctx = canvas.getContext('2d');
  
  // Fill magenta
  ctx.fillStyle = '#FF00FF';
  ctx.fillRect(0, 0, idle.width, idle.height);
  
  // Draw original
  ctx.drawImage(idle, 0, 0);
  
  const idata = ctx.getImageData(0, 0, idle.width, idle.height);
  const data = idata.data;
  
  // Find bbox
  let minX = idle.width, maxX = 0, minY = idle.height, maxY = 0;
  for(let y=0; y<idle.height; y++){
    for(let x=0; x<idle.width; x++){
      const idx = (y*idle.width + x)*4;
      const r=data[idx], g=data[idx+1], b=data[idx+2];
      if(r===255 && g===0 && b===255) continue;
      if(x < minX) minX = x;
      if(x > maxX) maxX = x;
      if(y < minY) minY = y;
      if(y > maxY) maxY = y;
    }
  }
  
  const charW = maxX - minX;
  const charH = maxY - minY;
  
  const outCanvas = createCanvas(idle.width, idle.height);
  const outCtx = outCanvas.getContext('2d');
  outCtx.fillStyle = '#FF00FF';
  outCtx.fillRect(0, 0, idle.width, idle.height);
  outCtx.drawImage(idle, 0, 0);
  
  // Shift left arm down by 4px
  const leftArmW = charW * 0.25;
  const leftArmX = minX;
  const shoulderY = minY + charH * 0.3;
  const armH = maxY - shoulderY;
  
  // We can just use drawImage to shift a chunk
  outCtx.fillStyle = '#FF00FF';
  outCtx.fillRect(leftArmX, shoulderY, leftArmW, armH + 4);
  outCtx.drawImage(idle, 
    leftArmX, shoulderY, leftArmW, armH,
    leftArmX, shoulderY + 4, leftArmW, armH
  );
  
  // Shift right arm down by 4px
  const rightArmW = charW * 0.25;
  const rightArmX = maxX - rightArmW;
  outCtx.fillRect(rightArmX, shoulderY, rightArmW, armH + 4);
  outCtx.drawImage(idle,
    rightArmX, shoulderY, rightArmW, armH,
    rightArmX, shoulderY + 4, rightArmW, armH
  );
  
  // We might have a gap at the shoulders, let's copy the row at shoulderY and stretch it
  outCtx.drawImage(idle,
    leftArmX, shoulderY, leftArmW, 1,
    leftArmX, shoulderY, leftArmW, 4
  );
  outCtx.drawImage(idle,
    rightArmX, shoulderY, rightArmW, 1,
    rightArmX, shoulderY, rightArmW, 4
  );
  
  const outPath = path.resolve('Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson/idle_02_fixed.png');
  fs.writeFileSync(outPath, outCanvas.toBuffer('image/png'));
  console.log('Saved', outPath);
}
fixIdle02();
