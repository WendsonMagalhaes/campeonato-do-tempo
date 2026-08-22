import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp, { OverlayOptions } from 'sharp';
import * as dotenv from 'dotenv';
import { normalizeSpritePerfect } from './perfect-normalizer.mts';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(SCRIPT_DIR, '..');
const WS_ROOT = path.resolve(TOOL_ROOT, '..', '..', '..');
dotenv.config({ path: path.join(TOOL_ROOT, '.env') });

const SLUG = 'lailson2';
const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

const FRAMES_DIR = path.join(TOOL_ROOT, 'output', 'frames', SLUG);
const REVIEW_DIR = path.join(TOOL_ROOT, 'review');
const DINARTE_DIR = path.join(TOOL_ROOT, 'output', 'frames', 'dinarte');
const TEMPLATES_DIR = path.join(TOOL_ROOT, 'templates');

const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
const ai = new GoogleGenAI({ apiKey: API_KEY });

const TARGET_HEIGHT = 554;

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
}

export async function buildContactSheet(): Promise<string> {
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
    const framePath = path.join(FRAMES_DIR, `${frameName}.png`);

    if (!fs.existsSync(framePath)) {
      throw new Error(`Missing frame ${frameName} for ${SLUG} at ${framePath}`);
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

  const outPath = path.join(REVIEW_DIR, `${SLUG}_frames_contact_sheet.png`);
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

export async function syncAssets(): Promise<Record<string, string>> {
  const seedFighterDir = path.join(WS_ROOT, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', SLUG, 'fighter');
  const appFighterDir = path.join(WS_ROOT, 'app', 'public', 'assets', 'participants', SLUG, 'fighter');
  const rootFighterDir = path.join(WS_ROOT, 'assets', 'participants', SLUG, 'fighter');

  fs.mkdirSync(seedFighterDir, { recursive: true });
  fs.mkdirSync(appFighterDir, { recursive: true });
  fs.mkdirSync(rootFighterDir, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const hashes: Record<string, string> = {};

  for (const frame of FRAMES) {
    const src = path.join(FRAMES_DIR, `${frame}.png`);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing frame ${src}`);
    }

    const buf = fs.readFileSync(src);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    hashes[frame] = sha;

    fs.writeFileSync(path.join(seedFighterDir, `${frame}.png`), buf);
    fs.writeFileSync(path.join(appFighterDir, `${frame}.png`), buf);
    fs.writeFileSync(path.join(rootFighterDir, `${frame}.png`), buf);
  }

  const contactSrc = path.join(REVIEW_DIR, `${SLUG}_frames_contact_sheet.png`);
  if (fs.existsSync(contactSrc)) {
    const contactBuf = fs.readFileSync(contactSrc);
    hashes['contact_sheet'] = crypto.createHash('sha256').update(contactBuf).digest('hex');
    fs.writeFileSync(path.join(seedFighterDir, `${SLUG}_frames_contact_sheet.png`), contactBuf);
    fs.writeFileSync(path.join(appFighterDir, `${SLUG}_frames_contact_sheet.png`), contactBuf);
    fs.writeFileSync(path.join(rootFighterDir, `${SLUG}_frames_contact_sheet.png`), contactBuf);
    fs.writeFileSync(path.join(FRAMES_DIR, `${SLUG}_frames_contact_sheet.png`), contactBuf);
  }

  return hashes;
}

export async function generateWalk01() {
  console.log('\\n[*] Generating walk_01...');
  const poseRef = fs.existsSync(path.join(DINARTE_DIR, 'walk_01.png'))
    ? path.join(DINARTE_DIR, 'walk_01.png')
    : path.join(TEMPLATES_DIR, 'walk_01.png');

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & IDENTITY LOCK — IDLE_01): Master reference for Lailson2.
This is the character identity to copy exactly. Notice the exact proportions, body type (not overly muscular, just normal), clothing, face, and colors.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (WALK_01 STRIDE REFERENCE): The exact pose to copy. Follow the stride, leg positions, and arm swing.`,
    },
    pngPart(poseRef),
    {
      text: `TASK: Generate the WALK_01 sprite for the exact same character as IMAGE 1 (idle_01) in the pose of IMAGE 2.

CRITICAL REQUIREMENTS:
1. BODY PROPORTIONS: The character MUST NOT be overly muscular ("bombadão"). Match the exact body type and proportions from IMAGE 1 (idle_01). Keep arms and torso normal, exactly as in IMAGE 1.
2. POSE: Strictly follow the stride and pose from IMAGE 2 (walk_01 reference).
3. IDENTITY LOCK: Exact same face, hair, clothing, shoes, and colors as IMAGE 1.
4. CLEAN PIXEL ART: 32-bit fighting game style.
5. Solid pure magenta background (#FF00FF) ONLY.
6. Exactly ONE single character centered.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for walk_01');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'walk_01_raw_provider_output.jpg'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: TARGET_HEIGHT,
    frameName: 'walk_01',
  });

  const outPath = path.join(FRAMES_DIR, 'walk_01.png');
  fs.writeFileSync(outPath, normalized.buffer);
  console.log(`[+] walk_01 generated`);
}

export async function generateVictory() {
  console.log('\\n[*] Generating victory...');
  const poseRef = fs.existsSync(path.join(DINARTE_DIR, 'victory.png'))
    ? path.join(DINARTE_DIR, 'victory.png')
    : path.join(TEMPLATES_DIR, 'victory.png');

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & IDENTITY LOCK — IDLE_01): Master reference for Lailson2.
This is the character identity to copy exactly. Notice the exact proportions, body type, clothing, face, and colors.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (VICTORY POSE REFERENCE): The exact pose to copy. Follow the angles, limb positions, and facing direction exactly as shown in this reference. Note especially the arm raised high in the air.`,
    },
    pngPart(poseRef),
    {
      text: `TASK: Generate the VICTORY sprite for the exact same character as IMAGE 1 (idle_01) in the pose of IMAGE 2.

CRITICAL REQUIREMENTS:
1. POSE: Strictly copy the pose from IMAGE 2 (victory reference). The character MUST have one arm raised HIGH in the air in celebration, exactly like the reference. Do NOT keep both arms down. Do NOT make it a generic frontal pose. It must be angled exactly like the reference.
2. IDENTITY LOCK: EXACT same face, hair, glasses, blue shirt, dark jeans, and brown shoes as IMAGE 1. 
3. PROPORTIONS: Keep body proportions EXACTLY the same as IMAGE 1 (normal, NOT muscular). 
4. LIMBS: Must have exactly 2 arms and 2 legs. NO ghost limbs, NO phantom extra hands.
5. CLEAN PIXEL ART: 32-bit fighting game style.
6. Solid pure magenta background (#FF00FF) ONLY.
7. Exactly ONE single character centered.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for victory');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'victory_raw_provider_output.jpg'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: TARGET_HEIGHT,
    frameName: 'victory',
  });

  const outPath = path.join(FRAMES_DIR, 'victory.png');
  fs.writeFileSync(outPath, normalized.buffer);
  console.log(`[+] victory generated`);
}

export async function createProgrammaticIdle02() {
  console.log('\\n[*] Creating programmatic idle_02 via pixel shift...');
  // We will read idle_01, extract the top part, shift it down by 3 pixels, and composite it over the original.
  const idle01Buffer = fs.readFileSync(IDLE01_PATH);
  
  // We'll just shift the region above y=340 down by 3 pixels.
  // Wait, sharp doesn't have an easy "shift pixels" without extracting and compositing.
  const shiftY = 3;
  const splitY = 340; 
  
  const topPart = await sharp(idle01Buffer)
    .extract({ left: 0, top: 0, width: 576, height: splitY })
    .toBuffer();
    
  // We composite the original with the shifted topPart
  const composited = await sharp(idle01Buffer)
    .composite([
      { input: topPart, left: 0, top: shiftY }
    ])
    .png()
    .toBuffer();
    
  // To avoid leaving a trail at the very top (y=0 to y=shiftY), we can paint a magenta rectangle there.
  // Actually, since it's solid magenta, we can just overlay a magenta block.
  const magentaBlock = await sharp({
    create: { width: 576, height: shiftY, channels: 3, background: { r: 255, g: 0, b: 255 } }
  }).png().toBuffer();
  
  const finalIdle02 = await sharp(composited)
    .composite([
      { input: magentaBlock, left: 0, top: 0 }
    ])
    .png()
    .toBuffer();

  const outPath = path.join(FRAMES_DIR, 'idle_02.png');
  fs.writeFileSync(outPath, finalIdle02);
  console.log(`[+] idle_02 programmatic shift applied and saved`);
}

export async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'all' || target === 'walk_01') {
    await generateWalk01();
  }
  if (target === 'all' || target === 'victory') {
    await generateVictory();
  }
  if (target === 'all' || target === 'idle_02') {
    await createProgrammaticIdle02();
  }

  console.log('\\n[*] Rebuilding contact sheet...');
  await buildContactSheet();

  console.log('\\n[*] Syncing all frames and contact sheet...');
  const hashes = await syncAssets();

  console.log('\\n=========================================');
  console.log('LAILSON 2 FINAL SYNCED SHA256 HASHES:');
  console.log('=========================================');
  for (const [k, v] of Object.entries(hashes)) {
    console.log(`${k.padEnd(15, ' ')}: ${v}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('lailson2-qa-surgical.mts')) {
  main().catch((err) => {
    console.error('[!] Error:', err);
    process.exit(1);
  });
}
