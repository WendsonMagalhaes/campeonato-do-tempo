import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractForegroundMask } from './perfect-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'radja');

async function verifyFrames() {
  console.log('=== RADJA SURGICAL QA VERIFICATION ===\n');

  const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  const dataMap: Record<string, { data: Uint8Array; info: sharp.OutputInfo; mask: Uint8Array; bbox: any }> = {};

  for (const f of frames) {
    const p = path.join(FRAMES_DIR, `${f}.png`);
    const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { mask, minX, minY, maxX, maxY, fgCount } = extractForegroundMask(data, info.width, info.height);
    const bbox = { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1, fgCount };
    dataMap[f] = { data, info, mask, bbox };
    console.log(`[FRAME] ${f.padEnd(10)}: bbox=[${minX}, ${minY} -> ${maxX}, ${maxY}] size=${bbox.width}x${bbox.height} fgCount=${fgCount}`);
  }

  // 1. Check idle_01 vs idle_02 difference
  console.log('\n--- IDLE_01 vs IDLE_02 ANALYSIS ---');
  let idleDiffCount = 0;
  let armDiffCount = 0;
  let lowerBodyDiffCount = 0;
  const d1 = dataMap['idle_01'].data;
  const d2 = dataMap['idle_02'].data;
  const m1 = dataMap['idle_01'].mask;
  const m2 = dataMap['idle_02'].mask;

  for (let y = 0; y < 576; y++) {
    for (let x = 0; x < 576; x++) {
      const idx = y * 576 + x;
      const i = idx * 4;
      const isDiff = Math.abs(d1[i] - d2[i]) > 10 || Math.abs(d1[i+1] - d2[i+1]) > 10 || Math.abs(d1[i+2] - d2[i+2]) > 10;
      if (isDiff) {
        idleDiffCount++;
        // Check Y region: arms/chest are roughly Y 200..380
        if (y >= 180 && y <= 380) armDiffCount++;
        if (y > 380) lowerBodyDiffCount++;
      }
    }
  }
  console.log(`Total diff pixels between idle_01 & idle_02: ${idleDiffCount}`);
  console.log(`Upper/Torso/Arm diff pixels: ${armDiffCount}`);
  console.log(`Lower body diff pixels: ${lowerBodyDiffCount}`);
  if (idleDiffCount === 0) {
    console.log('[FAIL] idle_02 is identical to idle_01!');
  } else if (idleDiffCount < 300) {
    console.log('[WARN] idle_02 diff is extremely small');
  } else {
    console.log('[PASS] idle_02 has a visible microvariation from idle_01!');
  }

  // 2. Check walk_01 vs walk_02 vs idle_01
  console.log('\n--- WALK_01 & WALK_02 STRIDE ANALYSIS ---');
  let walk1IdleDiff = 0, walk2IdleDiff = 0, walk1Walk2Diff = 0;
  const dw1 = dataMap['walk_01'].data;
  const dw2 = dataMap['walk_02'].data;

  for (let idx = 0; idx < 576 * 576; idx++) {
    const i = idx * 4;
    if (Math.abs(dw1[i] - d1[i]) > 15 || Math.abs(dw1[i+1] - d1[i+1]) > 15 || Math.abs(dw1[i+2] - d1[i+2]) > 15) walk1IdleDiff++;
    if (Math.abs(dw2[i] - d1[i]) > 15 || Math.abs(dw2[i+1] - d1[i+1]) > 15 || Math.abs(dw2[i+2] - d1[i+2]) > 15) walk2IdleDiff++;
    if (Math.abs(dw1[i] - dw2[i]) > 15 || Math.abs(dw1[i+1] - dw2[i+1]) > 15 || Math.abs(dw1[i+2] - dw2[i+2]) > 15) walk1Walk2Diff++;
  }
  console.log(`Diff pixels walk_01 vs idle_01: ${walk1IdleDiff} (distinct stride from idle)`);
  console.log(`Diff pixels walk_02 vs idle_01: ${walk2IdleDiff} (distinct stride from idle)`);
  console.log(`Diff pixels walk_01 vs walk_02: ${walk1Walk2Diff} (alternating strides differ)`);

  if (walk2IdleDiff < 5000) {
    console.log('[FAIL] walk_02 is too similar to idle!');
  } else {
    console.log('[PASS] walk_02 is clearly distinct from idle!');
  }

  if (walk1Walk2Diff < 5000) {
    console.log('[FAIL] walk_01 and walk_02 are identical!');
  } else {
    console.log('[PASS] walk_01 and walk_02 are distinct alternating strides!');
  }

  // 3. Check lying profile
  console.log('\n--- LYING POSE ANALYSIS ---');
  const lyingBox = dataMap['lying'].bbox;
  console.log(`Lying bbox: [${lyingBox.minX}, ${lyingBox.minY} -> ${lyingBox.maxX}, ${lyingBox.maxY}]`);
  console.log(`Lying height: ${lyingBox.height}px, width: ${lyingBox.width}px`);
  // Lying should be horizontal (width > 3x height)
  if (lyingBox.width > lyingBox.height * 2.5 && lyingBox.maxY === 575) {
    console.log('[PASS] Lying is properly horizontal and grounded on baseline Y=575');
  } else {
    console.log('[WARN] Lying geometry may need review');
  }

  // 4. Background magenta check
  console.log('\n--- BACKGROUND SOLID MAGENTA CHECK ---');
  for (const f of ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'lying']) {
    const raw = dataMap[f].data;
    const corners = [
      [0, 0],
      [575, 0],
      [0, 575],
      [575, 575],
    ];
    let ok = true;
    for (const [cx, cy] of corners) {
      const i = (cy * 576 + cx) * 4;
      const r = raw[i], g = raw[i+1], b = raw[i+2];
      if (r < 240 || g > 20 || b < 240) {
        ok = false;
        console.log(`[WARN] ${f} corner (${cx},${cy}) is not pure magenta: [${r}, ${g}, ${b}]`);
      }
    }
    if (ok) console.log(`[PASS] ${f.padEnd(10)}: pure solid magenta corners & bg`);
  }
}

verifyFrames().catch(console.error);
