import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(SCRIPT_DIR, '..');
const SEED_ROOT = path.resolve(TOOL_ROOT, '..', '..');
const WS_ROOT = path.resolve(TOOL_ROOT, '..', '..', '..');

console.log('TOOL_ROOT:', TOOL_ROOT);
console.log('SEED_ROOT:', SEED_ROOT);
console.log('WS_ROOT:  ', WS_ROOT);

const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying', 'radja_frames_contact_sheet'];

const paths = [
  { name: 'TOOL output', dir: path.join(TOOL_ROOT, 'output', 'frames', 'radja') },
  { name: 'SEED', dir: path.join(SEED_ROOT, 'assets', 'participants', 'radja', 'fighter') },
  { name: 'ROOT assets', dir: path.join(WS_ROOT, 'assets', 'participants', 'radja', 'fighter') },
  { name: 'APP public', dir: path.join(WS_ROOT, 'app', 'public', 'assets', 'participants', 'radja', 'fighter') },
];

console.log('=== SYNC INTEGRITY CHECK FOR RADJA ===');
let allOk = true;

for (const f of FRAMES) {
  const isSheet = f.includes('contact_sheet');
  const filename = `${f}.png`;
  
  let toolFile = isSheet 
    ? path.join(TOOL_ROOT, 'review', `${f}.png`)
    : path.join(TOOL_ROOT, 'output', 'frames', 'radja', `${f}.png`);
  
  const toolHash = crypto.createHash('sha256').update(fs.readFileSync(toolFile)).digest('hex');
  console.log(`\nFrame: ${f} (Master SHA: ${toolHash})`);

  for (const p of paths) {
    if (p.name === 'TOOL output' && isSheet) continue;
    const targetFile = path.join(p.dir, filename);
    if (!fs.existsSync(targetFile)) {
      console.log(`  [FAIL] ${p.name}: Missing file ${targetFile}`);
      allOk = false;
      continue;
    }
    const targetHash = crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex');
    if (targetHash === toolHash) {
      console.log(`  [PASS] ${p.name}: Hash MATCH`);
    } else {
      console.log(`  [FAIL] ${p.name}: Hash MISMATCH (${targetHash})`);
      allOk = false;
    }
  }
}

if (allOk) {
  console.log('\n>>> ALL 8 FRAMES + CONTACT SHEET ARE 100% IN SYNC ACROSS ALL FOLDERS! <<<');
} else {
  console.error('\n>>> SYNC FAILED! <<<');
  process.exit(1);
}
