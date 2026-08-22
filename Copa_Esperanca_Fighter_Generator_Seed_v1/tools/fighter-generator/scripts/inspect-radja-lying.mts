import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractForegroundMask } from './test-flood-fill.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'radja');

async function inspectRadjaLying() {
  const rawP = path.join(FRAMES_DIR, 'lying_raw_provider_output.png');
  const { data, info } = await sharp(rawP).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { mask, minX, minY, maxX, maxY, fgCount } = extractForegroundMask(data, info.width, info.height);
  console.log(`Radja lying raw: [${minX}, ${minY} -> ${maxX}, ${maxY}] size=${maxX-minX+1}x${maxY-minY+1} in ${info.width}x${info.height}`);

  const rows = new Array(info.height).fill(0);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (mask[y * info.width + x] === 1) rows[y]++;
    }
  }

  for (let y = 0; y < info.height; y += 32) {
    let sum = 0;
    for (let dy = 0; dy < 32 && y + dy < info.height; dy++) sum += rows[y + dy];
    if (sum > 0) {
      console.log(`Y ${String(y).padStart(4)}..${String(Math.min(info.height-1, y+31)).padStart(4)}: ${sum} fg pixels`);
    }
  }
}

inspectRadjaLying().catch(console.error);
