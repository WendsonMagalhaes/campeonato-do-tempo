import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');

const chars = ['dinarte', 'leandro', 'radja', 'joao', 'lailson'];

async function checkAllIdles() {
  for (const c of chars) {
    console.log(`\n=================== IDLE_01 CHECK: ${c.toUpperCase()} ===================`);
    const locs = [
      path.join(ROOT, 'output', 'frames', c, 'idle_01.png'),
      path.join(ROOT, 'output', 'masters', c, 'fighter_master.png'),
      path.join(ROOT, 'output', 'backups', `${c}_pre_surgical_qa_20260821_140736`, 'output_frames', 'idle_01.png'),
      path.join(WS, 'assets', 'participants', c, 'fighter', 'idle_01.png'),
      path.join(WS, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', c, 'fighter', 'idle_01.png'),
      path.join(WS, 'app', 'public', 'assets', 'participants', c, 'fighter', 'idle_01.png'),
    ];
    for (const loc of locs) {
      if (!fs.existsSync(loc)) continue;
      const { data, info } = await sharp(loc).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const w = info.width, h = info.height;
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
      console.log(`${loc.replace(WS, '').padEnd(80)} | size=${maxX-minX+1}x${maxY-minY+1} [${minX},${minY} -> ${maxX},${maxY}]`);
    }
  }
}

checkAllIdles().catch(console.error);
