import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import * as dotenv from 'dotenv';
import { smartNormalizeSprite } from './smart-sprite-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'leandro');
const MASTERS_DIR = path.join(ROOT, 'output', 'masters', 'leandro');
const DINARTE_DIR = path.join(ROOT, 'output', 'frames', 'dinarte');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const SEED_DIR = path.join(WS, 'assets', 'participants', 'leandro');

const SOURCE_CARD = path.join(SEED_DIR, 'source_card.jpeg');
const FACE_MASTER = path.join(SEED_DIR, 'face_master_360.png');
const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
const ai = new GoogleGenAI({ apiKey: API_KEY });

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
}

function jpegPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/jpeg' } };
}

// Leandro target height on 576x576 canvas
const LEANDRO_TARGET_HEIGHT = 554;

export async function generateLeandroIdle01() {
  console.log('\n[*] Generating Leandro idle_01 (handsome clean pixel art face & eyes)...');
  const templatePath = path.join(TEMPLATES_DIR, 'idle_01.png');
  const dinarteIdle = path.join(DINARTE_DIR, 'idle_01.png');

  const parts = [
    {
      text: 'IMAGE 1 (REAL PERSON PHOTO - SOURCE IDENTITY): Study Leandro real face: handsome young man with warm tan skin, short wavy/textured dark hair, clean trimmed dark beard and mustache along jawline, natural dark eyes, friendly/confident expression.',
    },
    jpegPart(SOURCE_CARD),
    {
      text: 'IMAGE 2 (CLEAN 360 PIXEL ART FACE REFERENCE): Pixel art facial feature reference for dark beard, mustache, and short dark wavy hair.',
    },
    pngPart(FACE_MASTER),
    {
      text: 'IMAGE 3 (CANONICAL POSE REFERENCE): Canonical idle stance skeleton and scale reference.',
    },
    pngPart(fs.existsSync(dinarteIdle) ? dinarteIdle : templatePath),
    {
      text: `TASK: Generate the master pixel-art idle_01 sprite for Leandro.
ART STYLE: 32-bit fighting game arcade pixel art (Neo-Geo / CPS2 era style).

CRITICAL APPEARANCE & IDENTITY:
1. FACE & EYES (HIGHEST PRIORITY):
   - Handsome, clean, well-defined pixel art face matching IMAGE 1.
   - Symmetrical, crisp, expressive dark eyes with clear white sclera and dark pupils looking forward. NO melted, distorted, glitchy, or misaligned eyes!
   - Neat, clean short dark beard and mustache along the jawline.
   - Short dark wavy/textured hair.
   - Warm tan skin tone.
2. OUTFIT:
   - Plain clean black crewneck short-sleeve t-shirt.
   - Dark olive-grey / charcoal cargo pants.
   - Black tactical boots / sneakers.
   - BARE HANDS (no gloves, no wraps).
3. BODY:
   - Normal athletic build, SMOOTH arms without bodybuilder muscle cuts or bulging veins.
4. POSE & FRAMING:
   - Raised fists fighting guard stance (matching IMAGE 3).
   - Centered vertically and horizontally. Grounded baseline.
   - Solid pure magenta background (#FF00FF) ONLY.
   - Exactly ONE character. NO text, NO UI, NO extra panels.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for Leandro idle_01');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(MASTERS_DIR, { recursive: true });
  fs.writeFileSync(path.join(FRAMES_DIR, 'idle_01_raw_provider_output.png'), raw);

  const normalized = await smartNormalizeSprite(raw, {
    targetHeight: LEANDRO_TARGET_HEIGHT,
  });

  fs.writeFileSync(IDLE01_PATH, normalized.buffer);
  fs.writeFileSync(path.join(MASTERS_DIR, 'fighter_master.png'), normalized.buffer);
  console.log(`[+] Leandro idle_01 saved: bbox=`, normalized.bbox);
  return normalized.bbox;
}

export async function generateLeandroFrame(frameName: string) {
  console.log(`\n[*] Generating Leandro ${frameName}...`);
  const dinarteRef = path.join(DINARTE_DIR, `${frameName}.png`);
  const templateRef = path.join(TEMPLATES_DIR, `${frameName}.png`);
  const poseRefPath = fs.existsSync(dinarteRef) ? dinarteRef : templateRef;

  let posePrompt = '';
  let isLying = false;
  let isVictory = false;
  let isAttack = false;
  let isHurt = false;

  if (frameName === 'idle_02') {
    posePrompt = `IDLE_02 MICROVARIATION:
- Subtle idle breathing animation microvariation from idle_01.
- Exact same character, face, hair, beard, clothes, boots, scale, and colors as IMAGE 1 (idle_01).
- The ONLY difference is slightly lowered fists/arms in the guard to simulate natural breathing cycle.`;
  } else if (frameName === 'walk_01') {
    posePrompt = `WALK_01 STRIDE:
- First walking step matching IMAGE 2 pose: right leg forward, left leg trailing back, arms swinging naturally in walking stride.
- Torso properly aligned and centered over hips and legs.
- Exact same face, hair, beard, black tee, cargo pants, boots, scale as IMAGE 1.`;
  } else if (frameName === 'walk_02') {
    posePrompt = `WALK_02 ALTERNATING STRIDE:
- Second, alternating walking step matching IMAGE 2 pose: left leg forward, right leg trailing back, opposite arm swinging forward.
- Torso properly aligned and centered over hips and legs.
- Exact same face, hair, beard, black tee, cargo pants, boots, scale as IMAGE 1.`;
  } else if (frameName === 'attack') {
    isAttack = true;
    posePrompt = `ATTACK PUNCH POSE:
- Straight punch attack matching IMAGE 2 pose: lead fist extended forward in a punch, rear hand guarding, body lunging forward.
- Exact same face, hair, beard, black tee, cargo pants, boots, scale as IMAGE 1.`;
  } else if (frameName === 'hurt') {
    isHurt = true;
    posePrompt = `HURT / HIT IMPACT REACTION POSE:
- CLEAR DAMAGE / RECOIL POSE matching IMAGE 2: body reeling backward from impact, torso tilted back, head thrown back with grimacing/impact facial expression, arms recoiling.
- Feet grounded on floor. MUST look clearly hit/recoiling (NOT an idle pose, NOT lying down).
- Exact same face, hair, beard, black tee, cargo pants, boots, scale as IMAGE 1.`;
  } else if (frameName === 'victory') {
    isVictory = true;
    posePrompt = `VICTORY CELEBRATION POSE:
- Victory cheer matching IMAGE 2: one fist raised high in celebration, confident smiling expression.
- Exact same face, hair, beard, black tee, cargo pants, boots, scale as IMAGE 1.`;
  } else if (frameName === 'lying') {
    isLying = true;
    posePrompt = `KNOCKED OUT / LYING ON THE FLOOR:
- Character is completely knocked out, lying FLAT HORIZONTALLY on the floor baseline matching IMAGE 2 pose.
- Face down or to the side, eyes closed, body horizontal.
- Exact same face, hair, beard, black tee, cargo pants, boots as IMAGE 1.
- CRITICAL HARD REQUIREMENT: EXACTLY ONE SINGLE CHARACTER lying on the floor. ZERO standing figures, ZERO background figures, ZERO collage! Only ONE horizontal knocked-out body on solid magenta background.`;
  }

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & IDENTITY LOCK - IDLE_01): Leandro master reference. Lock: (1) Clean handsome face, neat dark beard/mustache, short wavy dark hair, tan skin; (2) Plain black crewneck t-shirt; (3) Dark olive/charcoal cargo pants; (4) Black boots; (5) Smooth arms, bare hands; (6) 32-bit pixel art style.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (CANONICAL ${frameName.toUpperCase()} POSE SKELETON): Copy ONLY the body pose, limb angles, action silhouette, and motion dynamics from this reference.`,
    },
    pngPart(poseRefPath),
    {
      text: `TASK: Generate the ${frameName.toUpperCase()} frame for Leandro.

${posePrompt}

CRITICAL RULES:
- The character MUST be 100% IDENTICAL to IMAGE 1 (idle_01) in face, hair, beard, clothing colors, and smooth arm anatomy.
- Scale and proportions must strictly match IMAGE 1.
- Solid pure magenta background (#FF00FF) ONLY.
- Exactly ONE character. NO text, NO UI, NO multiple figures.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error(`No image returned for Leandro ${frameName}`);

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, `${frameName}_raw_provider_output.png`), raw);

  const normalized = await smartNormalizeSprite(raw, {
    targetHeight: LEANDRO_TARGET_HEIGHT,
    isLying,
    isVictory,
    isAttack,
    isHurt,
  });

  const outPath = path.join(FRAMES_DIR, `${frameName}.png`);
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Leandro ${frameName} saved: bbox=`, normalized.bbox, `SHA256=${sha}`);
  return normalized.bbox;
}

async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'idle_01' || target === 'all') {
    await generateLeandroIdle01();
  }

  const derived = ['idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  for (const f of derived) {
    if (target === f || target === 'all') {
      await generateLeandroFrame(f);
    }
  }
}

main().catch(err => {
  console.error('[!] Error in Leandro generation:', err);
  process.exit(1);
});
