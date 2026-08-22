import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');

const FIGHTERS = ['leandro', 'radja', 'joao', 'lailson'];
const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

async function comprehensiveQA() {
  console.log(`================================================================`);
  console.log(`COMPREHENSIVE QA AUDIT FOR LEANDRO, RADJA, JOAO, LAILSON`);
  console.log(`================================================================\n`);

  let totalFramesChecked = 0;
  let totalErrors = 0;

  for (const slug of FIGHTERS) {
    console.log(`----------------------------------------------------------------`);
    console.log(`FIGHTER: ${slug.toUpperCase()}`);
    console.log(`----------------------------------------------------------------`);

    const framesDir = path.join(ROOT, 'output', 'frames', slug);
    const sheetPath = path.join(ROOT, 'review', `${slug}_frames_contact_sheet.png`);

    if (!fs.existsSync(sheetPath)) {
      console.log(`[FAIL] Contact sheet missing: ${sheetPath}`);
      totalErrors++;
    } else {
      const sMeta = await sharp(sheetPath).metadata();
      console.log(`[PASS] Contact sheet exists: ${sMeta.width}x${sMeta.height} (${path.basename(sheetPath)})`);
    }

    for (const f of FRAMES) {
      totalFramesChecked++;
      const p = path.join(framesDir, `${f}.png`);
      if (!fs.existsSync(p)) {
        console.log(`[FAIL] ${f}: missing at ${p}`);
        totalErrors++;
        continue;
      }

      const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;

      if (w !== 576 || h !== 576) {
        console.log(`[FAIL] ${f}: invalid dimensions ${w}x${h}`);
        totalErrors++;
        continue;
      }

      let minX = w, minY = h, maxX = 0, maxY = 0, fgPixels = 0;
      let nonMagentaBgErrors = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          const isMagenta = (r === 255 && g === 0 && b === 255);
          const isMagentaLike = (Math.abs(r - 255) <= 25 && g <= 25 && Math.abs(b - 255) <= 25);

          if (isMagenta || isMagentaLike) {
            // solid background
          } else {
            fgPixels++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const bw = maxX >= minX ? maxX - minX + 1 : 0;
      const bh = maxY >= minY ? maxY - minY + 1 : 0;

      const baselineOk = maxY >= 570 && maxY <= 575;
      let frameSpecificOk = true;
      let note = '';

      if (f === 'lying') {
        if (bh > 165 || minY < 415 || bw < 350) {
          frameSpecificOk = false;
          note = ` [ERROR: Lying bounds abnormal: h=${bh}, minY=${minY}, w=${bw}]`;
          totalErrors++;
        } else {
          note = ` (Single horizontal body on floor: height=${bh}px, width=${bw}px)`;
        }
      } else if (f === 'victory') {
        note = ` (Cheer / raised arm: height=${bh}px)`;
      } else {
        note = ` (Standing/action: height=${bh}px, bottomY=${maxY})`;
      }

      if (!baselineOk) {
        frameSpecificOk = false;
        note += ` [ERROR: Baseline not grounded at 575: maxY=${maxY}]`;
        totalErrors++;
      }

      const status = frameSpecificOk && baselineOk ? 'PASS' : 'FAIL';
      console.log(`  [${status}] ${f.padEnd(8)} | size=${String(bw).padStart(3)}x${String(bh).padStart(3)} | bbox=[${String(minX).padStart(3)},${String(minY).padStart(3)} -> ${String(maxX).padStart(3)},${String(maxY).padStart(3)}]${note}`);
    }
  }

  console.log(`\n================================================================`);
  console.log(`AUDIT SUMMARY: ${totalFramesChecked} frames checked. Total errors: ${totalErrors}`);
  console.log(`================================================================\n`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

comprehensiveQA().catch(err => {
  console.error(err);
  process.exit(1);
});
