import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const FG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS_ROOT = path.resolve(FG_ROOT, '../../..');

const FIGHTERS = ['leandro', 'radja', 'joao', 'lailson'];
const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

function syncAll() {
  console.log(`=== SYNCING FIGHTER ASSETS TO SEED AND RUNTIME ===`);

  for (const slug of FIGHTERS) {
    const srcFramesDir = path.join(FG_ROOT, 'output', 'frames', slug);
    const srcMastersDir = path.join(FG_ROOT, 'output', 'masters', slug);

    const targetDirs = [
      path.join(WS_ROOT, 'assets', 'participants', slug, 'fighter'),
      path.join(WS_ROOT, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', slug, 'fighter'),
      path.join(WS_ROOT, 'app', 'public', 'assets', 'participants', slug, 'fighter'),
    ];

    for (const targetDir of targetDirs) {
      fs.mkdirSync(targetDir, { recursive: true });
      for (const f of FRAMES) {
        const srcFile = path.join(srcFramesDir, `${f}.png`);
        const destFile = path.join(targetDir, `${f}.png`);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
      console.log(`[SYNCED] ${slug} -> ${targetDir.replace(WS_ROOT, '')}`);
    }

    const masterSrc = path.join(srcMastersDir, 'fighter_master.png');
    if (fs.existsSync(masterSrc)) {
      const masterTargets = [
        path.join(WS_ROOT, 'assets', 'participants', slug, 'fighter_master.png'),
        path.join(WS_ROOT, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', slug, 'fighter_master.png'),
        path.join(WS_ROOT, 'app', 'public', 'assets', 'participants', slug, 'fighter_master.png'),
      ];
      for (const t of masterTargets) {
        fs.copyFileSync(masterSrc, t);
      }
      console.log(`[SYNCED MASTER] ${slug} fighter_master.png`);
    }
  }

  console.log(`\n[SUCCESS] All fighter assets synchronized successfully.`);
}

syncAll();
