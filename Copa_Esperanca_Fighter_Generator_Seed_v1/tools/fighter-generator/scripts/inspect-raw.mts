import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chars = ['leandro', 'radja', 'joao', 'lailson'];

async function inspectRawOutputs() {
  for (const c of chars) {
    console.log(`\n=================== RAW OUTPUTS: ${c.toUpperCase()} ===================`);
    const dir = path.join(ROOT, 'output', 'frames', c);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('_raw_provider_output.png'));
    for (const f of files) {
      const p = path.join(dir, f);
      const meta = await sharp(p).metadata();
      const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const w = info.width, h = info.height;
      let minX = w, minY = h, maxX = 0, maxY = 0, fg = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          const isMagenta = (Math.abs(r - 255) <= 35 && g <= 35 && Math.abs(b - 255) <= 35) || a < 10;
          if (!isMagenta) {
            fg++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      console.log(`${f.padEnd(35)} | ${meta.width}x${meta.height} | FG: [${minX},${minY} -> ${maxX},${maxY}] size: ${maxX-minX+1}x${maxY-minY+1}`);
    }
  }
}

inspectRawOutputs().catch(console.error);
