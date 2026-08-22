import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const FG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS_ROOT = path.resolve(FG_ROOT, '../../..');

const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

const LOCATIONS = [
  { name: 'tools/output', dir: path.join(FG_ROOT, 'output', 'frames', 'joao') },
  { name: 'Seed_v1/assets', dir: path.join(WS_ROOT, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', 'joao', 'fighter') },
  { name: 'root/assets', dir: path.join(WS_ROOT, 'assets', 'participants', 'joao', 'fighter') },
  { name: 'app/public/assets', dir: path.join(WS_ROOT, 'app', 'public', 'assets', 'participants', 'joao', 'fighter') },
];

function getHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return 'MISSING';
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

console.log('=== VERIFYING JOAO FRAMES HASHES ACROSS ALL LOCATIONS ===\n');

let allMatch = true;

for (const frame of FRAMES) {
  console.log(`--- Frame: ${frame}.png ---`);
  const hashes: Record<string, string> = {};
  for (const loc of LOCATIONS) {
    const p = path.join(loc.dir, `${frame}.png`);
    const h = getHash(p);
    hashes[loc.name] = h;
    console.log(`  ${loc.name.padEnd(20)}: ${h}`);
  }
  const uniqueHashes = new Set(Object.values(hashes));
  if (uniqueHashes.size > 1 || uniqueHashes.has('MISSING')) {
    console.log(`  [!] MISMATCH in ${frame}!`);
    allMatch = false;
  } else {
    console.log(`  [+] All 4 locations MATCH.`);
  }
}

if (allMatch) {
  console.log('\n[SUCCESS] All João frames match 100% across all 4 locations!');
} else {
  console.error('\n[FAILURE] Hash mismatch detected!');
  process.exit(1);
}
