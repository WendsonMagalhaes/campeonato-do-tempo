import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');
const chars = ['dinarte', 'leandro', 'radja', 'joao', 'lailson'];

async function analyzeAllMasters() {
  for (const c of chars) {
    console.log(`\n=================== ${c.toUpperCase()} ===================`);
    const files = [
      path.join(WS, 'assets', 'participants', c, 'body_master.png'),
      path.join(WS, 'assets', 'participants', c, 'face_master_360.png'),
      path.join(ROOT, 'output', 'masters', c, 'fighter_master.png'),
      path.join(ROOT, 'output', 'frames', c, 'idle_01.png'),
      path.join(ROOT, 'output', 'backups', `${c}_pre_surgical_qa_20260821_140736`, 'output_masters', 'fighter_master.png'),
      path.join(ROOT, 'output', 'backups', `${c}_pre_surgical_qa_20260821_140736`, 'output_frames', 'idle_01.png'),
    ];
    for (const f of files) {
      if (fs.existsSync(f)) {
        const meta = await sharp(f).metadata();
        const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
        const rel = f.replace(WS, '').replace(/^[\\\/]/, '');
        console.log(`${rel.padEnd(70)} | ${meta.width}x${meta.height} | FG bbox: [${minX},${minY} -> ${maxX},${maxY}] size: ${maxX-minX+1}x${maxY-minY+1}`);
      }
    }
  }
}

analyzeAllMasters().catch(console.error);
