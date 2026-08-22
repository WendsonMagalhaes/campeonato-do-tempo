import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');

const checkFighters = ['dinarte', 'david', 'adriel', 'manasses', 'tiago', 'ricardo', 'erikson', 'fernando', 'caio', 'hiago', 'marconi', 'kelvin'];

async function checkOtherFighters() {
  console.log(`=== CHECKING OTHER FIGHTERS IDLE_01 HEIGHTS & BOUNDS ===`);
  for (const c of checkFighters) {
    const candidates = [
      path.join(ROOT, 'output', 'frames', c, 'idle_01.png'),
      path.join(ROOT, 'output', 'masters', c, 'fighter_master.png'),
      path.join(WS, 'assets', 'participants', c, 'fighter', 'idle_01.png'),
      path.join(WS, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', c, 'fighter', 'idle_01.png'),
      path.join(WS, 'app', 'public', 'assets', 'participants', c, 'fighter', 'idle_01.png'),
    ];
    let loc = candidates.find(p => fs.existsSync(p));
    if (!loc) {
      console.log(`${c.padEnd(12)}: NOT FOUND`);
      continue;
    }
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
    const bw = maxX >= minX ? maxX - minX + 1 : 0;
    const bh = maxY >= minY ? maxY - minY + 1 : 0;
    console.log(`${c.padEnd(12)}: [${String(minX).padStart(3)},${String(minY).padStart(3)} -> ${String(maxX).padStart(3)},${String(maxY).padStart(3)}] size=${String(bw).padStart(3)}x${String(bh).padStart(3)} bottomY=${maxY} (path: ${path.basename(path.dirname(loc))}/${path.basename(loc)})`);
  }
}

checkOtherFighters().catch(console.error);
