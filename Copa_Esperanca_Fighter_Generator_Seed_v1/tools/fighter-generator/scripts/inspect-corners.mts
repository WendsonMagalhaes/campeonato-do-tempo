import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'radja');

async function inspectPixels() {
  const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  for (const f of frames) {
    const p = path.join(FRAMES_DIR, `${f}.png`);
    if (!fs.existsSync(p)) continue;
    const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const c0 = [data[0], data[1], data[2], data[3]]; // top-left (0,0)
    const c1 = [data[(info.width - 1) * 4], data[(info.width - 1) * 4 + 1], data[(info.width - 1) * 4 + 2], data[(info.width - 1) * 4 + 3]]; // top-right
    const c2 = [data[((info.height - 1) * info.width) * 4], data[((info.height - 1) * info.width) * 4 + 1], data[((info.height - 1) * info.width) * 4 + 2], data[((info.height - 1) * info.width) * 4 + 3]]; // bottom-left
    
    // Find min/max colors
    console.log(`${f.padEnd(10)}: dim=${info.width}x${info.height} TL=${JSON.stringify(c0)} TR=${JSON.stringify(c1)} BL=${JSON.stringify(c2)}`);
  }
}

inspectPixels().catch(console.error);
