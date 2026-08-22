import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');
const chars = ['dinarte', 'leandro', 'radja', 'joao', 'lailson'];

for (const c of chars) {
  console.log(`\n=================== ${c.toUpperCase()} ===================`);
  const dirs = [
    path.join(WS, 'assets', 'participants', c),
    path.join(WS, 'assets', 'participants', c, 'fighter'),
    path.join(WS, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', c),
    path.join(WS, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', c, 'fighter'),
    path.join(ROOT, 'output', 'masters', c),
  ];
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      const files = fs.readdirSync(d).filter(f => !fs.statSync(path.join(d, f)).isDirectory());
      console.log(`[DIR] ${d.replace(WS, '')}: ${files.join(', ')}`);
    }
  }
}
