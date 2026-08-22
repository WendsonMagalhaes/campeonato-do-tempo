import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');

const p1 = path.join(ROOT, 'output', 'frames', 'radja', 'idle_01.png');
const p2 = path.join(ROOT, '..', '..', 'assets', 'participants', 'radja', 'fighter', 'idle_01.png');
const p3 = path.join(WS, 'app', 'public', 'assets', 'participants', 'radja', 'fighter', 'idle_01.png');

for (const p of [p1, p2, p3]) {
  if (fs.existsSync(p)) {
    const b = fs.readFileSync(p);
    const sha = crypto.createHash('sha256').update(b).digest('hex');
    console.log(`${p}: ${sha} (${b.length} bytes)`);
  } else {
    console.log(`${p}: NOT FOUND`);
  }
}
