import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(SCRIPT_DIR, '..');
const WORKSPACE_ROOT = path.resolve(TOOL_ROOT, '..', '..');

const SLUGS = ['radja', 'joao', 'lailson', 'leandro'];

function getTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function performBackups(timestamp = getTimestamp()) {
  const backupsCreated: Record<string, string> = {};

  for (const slug of SLUGS) {
    const backupDir = path.join(TOOL_ROOT, 'output', 'backups', `${slug}_pre_surgical_qa_${timestamp}`);
    fs.mkdirSync(backupDir, { recursive: true });

    // 1. Output frames
    const outputFramesDir = path.join(TOOL_ROOT, 'output', 'frames', slug);
    if (fs.existsSync(outputFramesDir)) {
      const targetFramesDir = path.join(backupDir, 'output_frames');
      fs.mkdirSync(targetFramesDir, { recursive: true });
      for (const file of fs.readdirSync(outputFramesDir)) {
        fs.copyFileSync(path.join(outputFramesDir, file), path.join(targetFramesDir, file));
      }
    }

    // 2. Output master
    const outputMasterPath = path.join(TOOL_ROOT, 'output', 'masters', slug, 'fighter_master.png');
    if (fs.existsSync(outputMasterPath)) {
      const targetMastersDir = path.join(backupDir, 'output_masters');
      fs.mkdirSync(targetMastersDir, { recursive: true });
      fs.copyFileSync(outputMasterPath, path.join(targetMastersDir, 'fighter_master.png'));
    }

    // 3. Seed fighter assets
    const seedFighterDir = path.join(WORKSPACE_ROOT, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', slug, 'fighter');
    if (fs.existsSync(seedFighterDir)) {
      const targetSeedDir = path.join(backupDir, 'seed_fighter');
      fs.mkdirSync(targetSeedDir, { recursive: true });
      for (const file of fs.readdirSync(seedFighterDir)) {
        fs.copyFileSync(path.join(seedFighterDir, file), path.join(targetSeedDir, file));
      }
    }

    // 4. App public fighter assets
    const appFighterDir = path.join(WORKSPACE_ROOT, 'app', 'public', 'assets', 'participants', slug, 'fighter');
    if (fs.existsSync(appFighterDir)) {
      const targetAppDir = path.join(backupDir, 'app_fighter');
      fs.mkdirSync(targetAppDir, { recursive: true });
      for (const file of fs.readdirSync(appFighterDir)) {
        fs.copyFileSync(path.join(appFighterDir, file), path.join(targetAppDir, file));
      }
    }

    // 5. Contact sheet in review
    const reviewSheet = path.join(TOOL_ROOT, 'review', `${slug}_frames_contact_sheet.png`);
    if (fs.existsSync(reviewSheet)) {
      fs.copyFileSync(reviewSheet, path.join(backupDir, `${slug}_frames_contact_sheet.png`));
    }

    backupsCreated[slug] = backupDir;
    console.log(`[+] Backup created for ${slug} at: ${backupDir}`);
  }

  return backupsCreated;
}

if (process.argv[1] && process.argv[1].endsWith('backup-qa-fighters.mts')) {
  performBackups();
}
