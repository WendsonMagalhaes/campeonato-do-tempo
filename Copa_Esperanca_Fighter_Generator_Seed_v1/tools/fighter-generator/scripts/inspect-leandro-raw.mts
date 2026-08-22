import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function inspectLeandroRaw() {
  const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  console.log(`=== INSPECTING LEANDRO RAW & NORMALIZED ===`);
  for (const f of frames) {
    const rawP = path.join(ROOT, 'output', 'frames', 'leandro', `${f}_raw_provider_output.png`);
    const normP = path.join(ROOT, 'output', 'frames', 'leandro', `${f}.png`);
    
    if (fs.existsSync(rawP)) {
      const { data, info } = await sharp(rawP).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const w = info.width, h = info.height;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          const isMagenta = (Math.abs(r - 255) <= 35 && g <= 35 && Math.abs(b - 255) <= 35) || a < 10;
          if (!isMagenta) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      console.log(`RAW ${f.padEnd(8)}: [${minX},${minY} -> ${maxX},${maxY}] size: ${maxX-minX+1}x${maxY-minY+1} in ${w}x${h}`);
    }
    if (fs.existsSync(normP)) {
      const { data, info } = await sharp(normP).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const w = info.width, h = info.height;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          const isMagenta = (Math.abs(r - 255) <= 35 && g <= 35 && Math.abs(b - 255) <= 35) || a < 10;
          if (!isMagenta) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      console.log(`NORM ${f.padEnd(7)}: [${minX},${minY} -> ${maxX},${maxY}] size: ${maxX-minX+1}x${maxY-minY+1} in ${w}x${h}`);
    }
  }
}

inspectLeandroRaw().catch(console.error);
