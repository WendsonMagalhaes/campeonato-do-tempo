import { createCanvas, loadImage } from 'canvas';
import * as path from 'path';
import * as fs from 'fs';

async function run() {
  const base = path.resolve('app/public/assets/participants/lailson/fighter');
  console.log("base", base);
  const idle = await loadImage(path.join(base, 'idle_01.png'));
  const walk1 = await loadImage(path.join(base, 'walk_01.png'));
  
  const canvas = createCanvas(idle.width, idle.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(idle, 0, 0);
  let idata = ctx.getImageData(0, 0, idle.width, idle.height).data;
  
  console.log('idle_01 top left:', idata[0], idata[1], idata[2], idata[3]);
  
  ctx.clearRect(0,0, idle.width, idle.height);
  ctx.drawImage(walk1, 0, 0);
  idata = ctx.getImageData(0, 0, walk1.width, walk1.height).data;
  console.log('walk_01 top left:', idata[0], idata[1], idata[2], idata[3]);
}
run();