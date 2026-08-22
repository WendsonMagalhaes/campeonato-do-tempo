import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(SCRIPT_DIR, '..');
const WS_ROOT = path.resolve(TOOL_ROOT, '..', '..', '..');

const slug = 'lailson';
const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying', `${slug}_frames_contact_sheet`];

const targets = [
  { name: 'Seed Dir', dir: path.join(WS_ROOT, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', slug, 'fighter') },
  { name: 'Root Assets', dir: path.join(WS_ROOT, 'assets', 'participants', slug, 'fighter') },
  { name: 'App Public', dir: path.join(WS_ROOT, 'app', 'public', 'assets', 'participants', slug, 'fighter') },
];

console.log('=== CHECKING LAILSON SYNC INTEGRITY ===');
let allMatch = true;

for (const f of FRAMES) {
  const filename = `${f}.png`;
  const src = f.includes('contact_sheet')
    ? path.join(TOOL_ROOT, 'review', filename)
    : path.join(TOOL_ROOT, 'output', 'frames', slug, filename);

  if (!fs.existsSync(src)) {
    console.error(`Missing source frame: ${src}`);
    allMatch = false;
    continue;
  }

  const srcBuf = fs.readFileSync(src);
  const srcHash = crypto.createHash('sha256').update(srcBuf).digest('hex');
  console.log(`\nFrame: ${f} (${srcHash})`);

  for (const t of targets) {
    const dstPath = path.join(t.dir, filename);
    if (!fs.existsSync(dstPath)) {
      console.error(`  [FAIL] Missing in ${t.name}: ${dstPath}`);
      allMatch = false;
      continue;
    }
    const dstBuf = fs.readFileSync(dstPath);
    const dstHash = crypto.createHash('sha256').update(dstBuf).digest('hex');
    if (dstHash !== srcHash) {
      console.error(`  [FAIL] Hash mismatch in ${t.name}: ${dstHash} vs ${srcHash}`);
      allMatch = false;
    } else {
      console.log(`  [PASS] ${t.name}: MATCH`);
    }
  }
}

if (allMatch) {
  console.log('\n>>> ALL 8 FRAMES + CONTACT SHEET ARE 100% IN SYNC ACROSS ALL FOLDERS! <<<');
} else {
  console.error('\n>>> SYNC FAILED! <<<');
  process.exit(1);
}
