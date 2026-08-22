import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { normalizeSpritePerfect } from './perfect-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'radja');

async function checkRadjaLying() {
  const rawP = path.join(FRAMES_DIR, 'lying_raw_provider_output.png');
  const rawBuf = fs.readFileSync(rawP);
  const norm = await normalizeSpritePerfect(rawBuf, {
    targetHeight: 493,
    frameName: 'lying',
  });
  fs.writeFileSync(path.join(FRAMES_DIR, 'lying.png'), norm.buffer);
  console.log('Radja lying bbox:', norm.bbox);
}

checkRadjaLying().catch(console.error);
