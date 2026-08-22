import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function checkLyingDetails() {
  const p = path.join(ROOT, 'output', 'frames', 'leandro', 'lying_raw_provider_output.png');
  if (!fs.existsSync(p)) return;
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  
  // Look at foreground distribution by vertical slice (y ranges)
  const rows = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      const isMagenta = (Math.abs(r - 255) <= 35 && g <= 35 && Math.abs(b - 255) <= 35) || a < 10;
      if (!isMagenta) {
        rows[y]++;
      }
    }
  }

  console.log(`=== VERTICAL FG PROFILE FOR LEANDRO LYING RAW (h=${h}) ===`);
  for (let y = 0; y < h; y += 32) {
    let sum = 0;
    for (let dy = 0; dy < 32 && y + dy < h; dy++) sum += rows[y + dy];
    console.log(`Y ${String(y).padStart(4)}..${String(Math.min(h-1, y+31)).padStart(4)}: ${sum} fg pixels`);
  }
}

checkLyingDetails().catch(console.error);
