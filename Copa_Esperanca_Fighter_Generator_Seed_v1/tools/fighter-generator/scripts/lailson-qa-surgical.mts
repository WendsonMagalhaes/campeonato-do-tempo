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

const FRAMES_DIR = path.join(TOOL_ROOT, 'output', 'frames', 'lailson');
const REVIEW_DIR = path.join(TOOL_ROOT, 'review');
const DINARTE_DIR = path.join(TOOL_ROOT, 'output', 'frames', 'dinarte');
const LEANDRO_DIR = path.join(TOOL_ROOT, 'output', 'frames', 'leandro');
const TEMPLATES_DIR = path.join(TOOL_ROOT, 'templates');
const SLUG = 'lailson';
const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');
const WALK01_PATH = path.join(FRAMES_DIR, 'walk_01.png');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
const ai = new GoogleGenAI({ apiKey: API_KEY });

const LAILSON_TARGET_HEIGHT = 554;

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
}

export async function generateLailsonIdle02() {
  console.log('\n[*] Generating Lailson idle_02 (clear visible microvariation: guard/fists lowered ~12px, clean pixel art)...');
  const poseRef = fs.existsSync(path.join(LEANDRO_DIR, 'idle_02.png'))
    ? path.join(LEANDRO_DIR, 'idle_02.png')
    : path.join(TEMPLATES_DIR, 'idle_02.png');

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & IDENTITY LOCK — IDLE_01): Lailson master reference.
Lock ALL of the following:
(1) Off-white/cream NY baseball cap worn facing forward with flat brim;
(2) Plain off-white/cream short-sleeve crewneck t-shirt;
(3) Medium royal blue denim jeans with cargo pockets;
(4) Tan/beige sneakers with white sole accents;
(5) Black/silver wristwatch on the LEFT wrist only;
(6) Normal athletic build with smooth arms and bare skin hands;
(7) 32-bit Neo-Geo / Capcom CPS2 fighting game pixel art style.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (IDLE_02 MICROVARIATION REFERENCE POSE): Notice how the fists/wrists and guard are clearly lowered by ~10-15px for the relaxed breathing animation cycle.`,
    },
    pngPart(poseRef),
    {
      text: `TASK: Generate the IDLE_02 sprite for Lailson as the EXACT SAME CHARACTER from IMAGE 1 (idle_01).

CRITICAL REQUIREMENTS FOR IDLE_02:
1. CLEAR, VISIBLE MICROVARIATION:
   - Lower the fists and arms visibly by ~10-15px (breathing exhale / relaxed guard cycle) compared to IMAGE 1 (idle_01).
   - The motion MUST be clearly perceptible and distinct when flipping between idle_01 and idle_02!
2. PERFECT IDENTITY & CLOTHING LOCK:
   - Head, face, NY baseball cap, cream t-shirt, royal blue denim jeans, and tan sneakers must be 100% IDENTICAL in color palette, shading, and proportions to IMAGE 1.
   - Watch on LEFT wrist only. DO NOT add a watch to the right wrist. DO NOT add floating watches.
3. FIX PREVIOUS ERRORS:
   - In the previous attempt, a random watch "appeared out of nowhere" and the arms did not actually move down.
   - You MUST NOT hallucinate any extra accessories.
   - You MUST actually move the arms down.
4. CLEAN PIXEL ART & ARTIFACT-FREE:
   - ZERO horizontal/vertical seam lines, ZERO glitch cuts, ZERO magenta leaks or halo artifacts.
   - Smooth pixel art edges.
5. Scale, proportions, and grounded feet matching IMAGE 1 (~554px character height on 576x576 canvas).
6. Solid pure magenta background (#FF00FF) ONLY.
7. Exactly ONE single character centered. NO multiple figures, NO background elements.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for Lailson idle_02');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'idle_02_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: LAILSON_TARGET_HEIGHT,
    frameName: 'idle_02',
  });

  const outPath = path.join(FRAMES_DIR, 'idle_02.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Lailson idle_02 generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return { buffer: normalized.buffer, sha256: sha };
}

export async function generateLailsonWalk02() {
  console.log('\n[*] Generating Lailson walk_02 (alternating walking stride, clean pixel art, ZERO seam lines)...');
  const poseRef = fs.existsSync(path.join(LEANDRO_DIR, 'walk_02.png'))
    ? path.join(LEANDRO_DIR, 'walk_02.png')
    : (fs.existsSync(path.join(DINARTE_DIR, 'walk_02.png'))
      ? path.join(DINARTE_DIR, 'walk_02.png')
      : path.join(TEMPLATES_DIR, 'walk_02.png'));

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & IDENTITY LOCK — IDLE_01): Lailson master reference.
Lock ALL of the following:
(1) Off-white/cream NY baseball cap worn facing forward;
(2) Plain off-white/cream short-sleeve crewneck t-shirt;
(3) Medium royal blue denim jeans with cargo pockets;
(4) Tan/beige sneakers with white sole accents;
(5) Black/silver wristwatch on LEFT wrist only;
(6) Normal athletic build with smooth arms and bare skin hands;
(7) 32-bit fighting game pixel art style.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (WALK_01 STRIDE REFERENCE): This is Lailson's first walking step. Note his clothes, stride, and anatomy.`,
    },
    pngPart(WALK01_PATH),
    {
      text: `IMAGE 3 (WALK_02 ALTERNATING STRIDE POSE SKELETON): Copy the alternating walk stride from this pose: left leg stepping forward, right leg trailing back, opposite arm swinging forward.`,
    },
    pngPart(poseRef),
    {
      text: `TASK: Generate the WALK_02 sprite for Lailson as the EXACT SAME CHARACTER from IMAGE 1 (idle_01) executing the alternating walk stride of IMAGE 3 (walk_02).

CRITICAL REQUIREMENTS FOR WALK_02:
1. CLEAR, VISIBLE ALTERNATING WALKING STEP:
   - This is the SECOND / ALTERNATING step of the 2-frame walking cycle (alternating from walk_01).
   - The arm swing and leg stride must be visibly distinct from walk_01 so that alternating walk_01 and walk_02 creates a fluid, natural walking animation.
2. PERFECT IDENTITY & CLOTHING LOCK:
   - EXACT same medium royal blue denim jeans with cargo pockets, tan sneakers with white sole, plain cream short-sleeve t-shirt, off-white NY baseball cap, and face.
   - Bare skin hands (no gloves). Watch on left wrist only.
3. ZERO SEAM LINES & ZERO GLITCH ARTIFACTS:
   - ABSOLUTELY ZERO horizontal or vertical slice/seam lines across the torso, arms, or background.
   - Seamless, clean 32-bit pixel art rendering.
4. Scale, character height (~554px), and grounded baseline matching IMAGE 1 and IMAGE 2.
5. Solid pure magenta background (#FF00FF) ONLY.
6. Exactly ONE single character centered. NO extra limbs, NO ghost artifacts.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for Lailson walk_02');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'walk_02_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: LAILSON_TARGET_HEIGHT,
    frameName: 'walk_02',
  });

  const outPath = path.join(FRAMES_DIR, 'walk_02.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Lailson walk_02 generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return { buffer: normalized.buffer, sha256: sha };
}

export async function buildLailsonContactSheet(): Promise<string> {
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

export async function syncLailsonAssets(): Promise<Record<string, string>> {
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

  // Sync contact sheet
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

export async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'all' || target === 'idle_02') {
    await generateLailsonIdle02();
  }
  if (target === 'all' || target === 'walk_02') {
    await generateLailsonWalk02();
  }

  if (target !== 'sync') {
    console.log('\n[*] Rebuilding contact sheet...');
    await buildLailsonContactSheet();
  }

  console.log('\n[*] Syncing all 8 frames and contact sheet across all directories...');
  const hashes = await syncLailsonAssets();

  console.log('\n=========================================');
  console.log('LAILSON FINAL SYNCED SHA256 HASHES:');
  console.log('=========================================');
  for (const [k, v] of Object.entries(hashes)) {
    console.log(`${k.padEnd(15, ' ')}: ${v}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('lailson-qa-surgical.mts')) {
  main().catch((err) => {
    console.error('[!] Error in Lailson surgical QA:', err);
    process.exit(1);
  });
}
