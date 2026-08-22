import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractForegroundMask } from './perfect-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'radja');

async function inspectMasks() {
  const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  for (const f of frames) {
    const p = path.join(FRAMES_DIR, `${f}.png`);
    if (!fs.existsSync(p)) continue;
    const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { mask, minX, minY, maxX, maxY, fgCount } = extractForegroundMask(data, info.width, info.height);
    console.log(`${f.padEnd(10)}: bbox=[${minX}, ${minY} -> ${maxX}, ${maxY}] size=${maxX-minX+1}x${maxY-minY+1} fgCount=${fgCount}`);
  }
}

inspectMasks().catch(console.error);
