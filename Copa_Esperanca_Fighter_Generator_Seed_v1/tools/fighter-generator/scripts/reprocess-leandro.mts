import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { normalizeSpritePerfect } from './perfect-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'leandro');
const MASTERS_DIR = path.join(ROOT, 'output', 'masters', 'leandro');

const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

async function reprocessLeandro() {
  console.log(`=== REPROCESSING LEANDRO FRAMES WITH PERFECT NORMALIZER ===`);
  for (const f of frames) {
    let rawP = path.join(FRAMES_DIR, `${f}_raw_provider_output.png`);
    if (f === 'lying') {
      const directTest = path.join(FRAMES_DIR, 'lying_direct_test_raw.png');
      if (fs.existsSync(directTest)) rawP = directTest;
    }
    if (!fs.existsSync(rawP)) {
      console.log(`${f}: NO RAW FOUND`);
      continue;
    }
    const rawBuf = fs.readFileSync(rawP);
    const { buffer, bbox } = await normalizeSpritePerfect(rawBuf, {
      targetHeight: 554,
      frameName: f,
    });
    fs.writeFileSync(path.join(FRAMES_DIR, `${f}.png`), buffer);
    if (f === 'idle_01') {
      fs.writeFileSync(path.join(MASTERS_DIR, 'fighter_master.png'), buffer);
    }
    console.log(`${f.padEnd(8)}: bbox=[${String(bbox.minX).padStart(3)},${String(bbox.minY).padStart(3)} -> ${String(bbox.maxX).padStart(3)},${String(bbox.maxY).padStart(3)}] size=${String(bbox.width).padStart(3)}x${String(bbox.height).padStart(3)}`);
  }
}

reprocessLeandro().catch(console.error);
