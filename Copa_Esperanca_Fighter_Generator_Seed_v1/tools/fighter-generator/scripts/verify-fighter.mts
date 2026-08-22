import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

export async function verifyFighterFrames(slug: string) {
  const dir = path.join(ROOT, 'output', 'frames', slug);
  console.log(`\n======================================================`);
  console.log(`VERIFYING ALL 8 FRAMES FOR ${slug.toUpperCase()}`);
  console.log(`======================================================`);

  let allPass = true;

  for (const f of FRAMES) {
    const p = path.join(dir, `${f}.png`);
    if (!fs.existsSync(p)) {
      console.log(`[FAIL] ${f}: File not found at ${p}`);
      allPass = false;
      continue;
    }

    const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;

    if (w !== 576 || h !== 576) {
      console.log(`[FAIL] ${f}: Dimension mismatch ${w}x${h} (expected 576x576)`);
      allPass = false;
      continue;
    }

    let minX = w, minY = h, maxX = 0, maxY = 0, fgCount = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        const isMagenta = (r === 255 && g === 0 && b === 255) || (Math.abs(r - 255) <= 30 && g <= 30 && Math.abs(b - 255) <= 30) || a < 10;
        if (!isMagenta) {
          fgCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const bw = maxX >= minX ? maxX - minX + 1 : 0;
    const bh = maxY >= minY ? maxY - minY + 1 : 0;

    // Check baseline (bottomY should be within 570..575)
    const baselineOk = maxY >= 570 && maxY <= 575;

    // For lying: height should be ~100-150px, width ~400-530px, minY >= 440
    let lyingOk = true;
    if (f === 'lying') {
      if (bh > 160 || minY < 420 || bw < 350) {
        lyingOk = false;
        allPass = false;
      }
    }

    console.log(`[${baselineOk && lyingOk ? 'PASS' : 'WARN'}] ${f.padEnd(8)}: bbox=[${String(minX).padStart(3)},${String(minY).padStart(3)} -> ${String(maxX).padStart(3)},${String(maxY).padStart(3)}] size=${String(bw).padStart(3)}x${String(bh).padStart(3)} bottomY=${maxY} (fgPixels=${fgCount})`);
  }

  return allPass;
}

verifyFighterFrames(process.argv[2] || 'leandro').catch(console.error);
