import sharp, { OverlayOptions } from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(SCRIPT_DIR, '..');
const WORKSPACE_ROOT = path.resolve(TOOL_ROOT, '..', '..', '..');

const SLUGS = ['radja', 'joao', 'lailson', 'leandro'];
const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

export async function buildContactSheet(slug: string): Promise<string> {
  const framesDir = path.join(TOOL_ROOT, 'output', 'frames', slug);
  const width = 576;
  const height = 576;
  const cols = 4;
  const rows = 2;
  const padding = 10;

  const totalWidth = (width + padding) * cols + padding;
  const totalHeight = (height + padding) * rows + padding;

  const composites: OverlayOptions[] = [];

  for (let i = 0; i < FRAMES.length; i++) {
    const frameName = FRAMES[i];
    let framePath = path.join(framesDir, `${frameName}.png`);
    if (!fs.existsSync(framePath) && frameName === 'idle_01') {
      const masterPath = path.join(TOOL_ROOT, 'output', 'masters', slug, 'fighter_master.png');
      if (fs.existsSync(masterPath)) framePath = masterPath;
    }

    if (!fs.existsSync(framePath)) {
      throw new Error(`Missing frame ${frameName} for ${slug} at ${framePath}`);
    }

    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = padding + col * (width + padding);
    const top = padding + row * (height + padding);

    composites.push({
      input: framePath,
      left,
      top,
    });

    const textSvg = `
      <svg width="${width}" height="40">
        <rect width="100%" height="100%" fill="black" fill-opacity="0.7"/>
        <text x="50%" y="28" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
          ${frameName}
        </text>
      </svg>
    `;
    composites.push({
      input: Buffer.from(textSvg),
      left,
      top: top + height - 40,
    });
  }

  const outPath = path.join(TOOL_ROOT, 'review', `${slug}_frames_contact_sheet.png`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log(`[+] Contact sheet created: ${outPath}`);
  return outPath;
}

export async function syncAssets(slug: string): Promise<Record<string, string>> {
  const framesDir = path.join(TOOL_ROOT, 'output', 'frames', slug);
  const seedFighterDir = path.join(WORKSPACE_ROOT, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', slug, 'fighter');
  const appFighterDir = path.join(WORKSPACE_ROOT, 'app', 'public', 'assets', 'participants', slug, 'fighter');
  const rootFighterDir = path.join(WORKSPACE_ROOT, 'assets', 'participants', slug, 'fighter');

  fs.mkdirSync(seedFighterDir, { recursive: true });
  fs.mkdirSync(appFighterDir, { recursive: true });
  fs.mkdirSync(rootFighterDir, { recursive: true });

  const hashes: Record<string, string> = {};

  for (const frame of FRAMES) {
    let src = path.join(framesDir, `${frame}.png`);
    if (!fs.existsSync(src) && frame === 'idle_01') {
      const masterPath = path.join(TOOL_ROOT, 'output', 'masters', slug, 'fighter_master.png');
      if (fs.existsSync(masterPath)) src = masterPath;
    }

    if (fs.existsSync(src)) {
      const buf = fs.readFileSync(src);
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      hashes[frame] = sha;

      fs.writeFileSync(path.join(seedFighterDir, `${frame}.png`), buf);
      fs.writeFileSync(path.join(appFighterDir, `${frame}.png`), buf);
      fs.writeFileSync(path.join(rootFighterDir, `${frame}.png`), buf);
    }
  }

  // Sync contact sheet
  const contactSrc = path.join(TOOL_ROOT, 'review', `${slug}_frames_contact_sheet.png`);
  if (fs.existsSync(contactSrc)) {
    const contactBuf = fs.readFileSync(contactSrc);
    hashes['contact_sheet'] = crypto.createHash('sha256').update(contactBuf).digest('hex');
    fs.writeFileSync(path.join(seedFighterDir, `${slug}_frames_contact_sheet.png`), contactBuf);
    fs.writeFileSync(path.join(appFighterDir, `${slug}_frames_contact_sheet.png`), contactBuf);
    fs.writeFileSync(path.join(rootFighterDir, `${slug}_frames_contact_sheet.png`), contactBuf);
  }

  return hashes;
}

export async function main() {
  const allHashes: Record<string, Record<string, string>> = {};

  for (const slug of SLUGS) {
    console.log(`\n=== PROCESSING ${slug.toUpperCase()} ===`);
    await buildContactSheet(slug);
    const hashes = await syncAssets(slug);
    allHashes[slug] = hashes;
  }

  console.log('\n=========================================');
  console.log('FINAL SHA256 HASHES FOR SURGICAL QA');
  console.log('=========================================');
  for (const slug of SLUGS) {
    console.log(`\n--- ${slug.toUpperCase()} ---`);
    for (const [k, v] of Object.entries(allHashes[slug])) {
      console.log(`${k}: ${v}`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('rebuild-and-sync-qa.mts')) {
  main().catch((err) => {
    console.error('[!] Error in rebuild and sync:', err);
    process.exit(1);
  });
}
