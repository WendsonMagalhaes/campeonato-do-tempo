import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chars = ['leandro', 'radja', 'joao', 'lailson'];

for (const c of chars) {
  const dir = path.join(ROOT, 'output', 'frames', c);
  if (fs.existsSync(dir)) {
    console.log(`=== ${c.toUpperCase()} (${dir}) ===`);
    console.log(fs.readdirSync(dir).join(', '));
  } else {
    console.log(`=== ${c.toUpperCase()}: NOT FOUND ===`);
  }
}
