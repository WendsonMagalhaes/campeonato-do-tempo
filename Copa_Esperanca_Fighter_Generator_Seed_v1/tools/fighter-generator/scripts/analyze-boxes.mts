import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chars = ['dinarte', 'leandro', 'radja', 'joao', 'lailson'];
const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

async function analyze() {
  console.log(`\n=== TEMPLATES ===`);
  for (const frame of frames) {
    const p = path.join(ROOT, 'templates', `${frame}.png`);
    if (!fs.existsSync(p)) continue;
    const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        const isMagenta = (Math.abs(r - 255) <= 35 && g <= 35 && Math.abs(b - 255) <= 35) || a < 10;
        if (!isMagenta) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const bw = maxX >= minX ? maxX - minX + 1 : 0;
    const bh = maxY >= minY ? maxY - minY + 1 : 0;
    console.log(`${frame.padEnd(8)}: [${String(minX).padStart(3)},${String(minY).padStart(3)} -> ${String(maxX).padStart(3)},${String(maxY).padStart(3)}] size=${String(bw).padStart(3)}x${String(bh).padStart(3)} bottomY=${maxY}`);
  }

  for (const char of chars) {
    console.log(`\n=== ${char.toUpperCase()} ===`);
    for (const frame of frames) {
      const candidates = [
        path.join(ROOT, 'output', 'frames', char, `${frame}.png`),
        path.join(ROOT, 'output', 'masters', char, 'fighter_master.png'),
        path.join(ROOT, '..', '..', 'assets', 'participants', char, 'fighter', `${frame}.png`),
        path.join(ROOT, '..', '..', 'app', 'public', 'assets', 'participants', char, 'fighter', `${frame}.png`),
      ];
      let p = candidates.find(c => fs.existsSync(c));
      if (!p) {
        console.log(`${frame.padEnd(8)}: NOT FOUND`);
        continue;
      }
      const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;
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
      const bw = maxX >= minX ? maxX - minX + 1 : 0;
      const bh = maxY >= minY ? maxY - minY + 1 : 0;
      console.log(`${frame.padEnd(8)}: [${String(minX).padStart(3)},${String(minY).padStart(3)} -> ${String(maxX).padStart(3)},${String(maxY).padStart(3)}] size=${String(bw).padStart(3)}x${String(bh).padStart(3)} bottomY=${maxY} (path: ${path.basename(path.dirname(p))}/${path.basename(p)})`);
    }

    console.log(`--- BACKUP ${char.toUpperCase()} ---`);
    const backupDir = path.join(ROOT, 'output', 'backups', `${char}_pre_surgical_qa_20260821_140736`, 'output_frames');
    for (const frame of frames) {
      const p = path.join(backupDir, `${frame}.png`);
      if (!fs.existsSync(p)) continue;
      const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          const isMagenta = (Math.abs(r - 255) <= 35 && g <= 35 && Math.abs(b - 255) <= 35) || a < 10;
          if (!isMagenta) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const bw = maxX >= minX ? maxX - minX + 1 : 0;
      const bh = maxY >= minY ? maxY - minY + 1 : 0;
      console.log(`${frame.padEnd(8)}: [${String(minX).padStart(3)},${String(minY).padStart(3)} -> ${String(maxX).padStart(3)},${String(maxY).padStart(3)}] size=${String(bw).padStart(3)}x${String(bh).padStart(3)} bottomY=${maxY}`);
    }
  }
}

analyze().catch(console.error);
