import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const FG_ROOT = path.resolve(SCRIPTS_DIR, '..'); // .../Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator
const SEED_ROOT = path.resolve(FG_ROOT, '../..'); // .../Copa_Esperanca_Fighter_Generator_Seed_v1
const WS_ROOT = path.resolve(SEED_ROOT, '..'); // .../campeonato-do-tempo-2026

console.log('FG_ROOT:  ', FG_ROOT);
console.log('SEED_ROOT:', SEED_ROOT);
console.log('WS_ROOT:  ', WS_ROOT);

const fighters = ['leandro', 'radja', 'joao', 'lailson'];
const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

for (const slug of fighters) {
  for (const f of frames) {
    const p1 = path.join(FG_ROOT, 'output', 'frames', slug, `${f}.png`);
    const p_seed = path.join(SEED_ROOT, 'assets', 'participants', slug, 'fighter', `${f}.png`);
    const p_extra = path.join(WS_ROOT, 'assets', 'participants', slug, 'fighter', `${f}.png`);
    const p_app = path.join(WS_ROOT, 'app', 'public', 'assets', 'participants', slug, 'fighter', `${f}.png`);

    const b1 = fs.readFileSync(p1);
    
    fs.mkdirSync(path.dirname(p_seed), { recursive: true });
    fs.writeFileSync(p_seed, b1);

    if (fs.existsSync(path.dirname(p_extra))) {
      fs.mkdirSync(path.dirname(p_extra), { recursive: true });
      fs.writeFileSync(p_extra, b1);
    }

    fs.mkdirSync(path.dirname(p_app), { recursive: true });
    fs.writeFileSync(p_app, b1);

    console.log(`[SYNCED OK] ${slug} ${f} (${b1.length} bytes)`);
  }
}
