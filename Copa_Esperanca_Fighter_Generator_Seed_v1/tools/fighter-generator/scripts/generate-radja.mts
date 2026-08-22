import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { normalizeSpritePerfect } from './perfect-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'radja');
const MASTERS_DIR = path.join(ROOT, 'output', 'masters', 'radja');
const DINARTE_DIR = path.join(ROOT, 'output', 'frames', 'dinarte');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const SEED_DIR = path.join(WS, 'assets', 'participants', 'radja');

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

const RADJA_TARGET_HEIGHT = 493;

export async function generateRadjaFrame(frameName: string) {
  console.log(`\n[*] Generating Radja ${frameName}...`);
  const dinarteRef = path.join(DINARTE_DIR, `${frameName}.png`);
  const templateRef = path.join(TEMPLATES_DIR, `${frameName}.png`);
  const poseRefPath = fs.existsSync(dinarteRef) ? dinarteRef : templateRef;

  let posePrompt = '';
  if (frameName === 'idle_02') {
    posePrompt = `IDLE_02 MICROVARIATION:
- Subtle idle breathing microvariation from idle_01.
- Fists/arms slightly lowered in guard compared to idle_01.
- EXACT SAME deep black curly hair, purple jacket DRAPED off shoulders, black top, dark pants, white hand wraps, body size and scale.`;
  } else if (frameName === 'walk_01') {
    posePrompt = `WALK_01 STRIDE (TORSO ALIGNMENT & POSE MATCH):
- First walking step matching IMAGE 2: right leg forward, left leg back trailing, natural arm swing with white hand wraps.
- Torso properly aligned and centered over hips and legs (upright posture).
- EXACT SAME deep black hair, purple jacket DRAPED off shoulders, black top, dark pants, sneakers, scale.`;
  } else if (frameName === 'walk_02') {
    posePrompt = `WALK_02 ALTERNATING STRIDE:
- Second, alternating walking step matching IMAGE 2: left leg forward, right leg back trailing, opposite arm swing.
- Torso properly aligned over legs.
- EXACT SAME deep black hair, purple jacket DRAPED off shoulders, black top, dark pants, sneakers, white hand wraps, scale.`;
  } else if (frameName === 'attack') {
    posePrompt = `ATTACK PUNCH POSE:
- Straight punch attack matching IMAGE 2: lead fist with white hand wrap extending forward in punch, rear hand guarding.
- EXACT SAME deep black hair, purple jacket DRAPED off shoulders, black top, dark pants, scale.`;
  } else if (frameName === 'hurt') {
    posePrompt = `HURT / HIT IMPACT REACTION POSE:
- Reeling backward from impact matching IMAGE 2: body staggering back, head tilted back, grimacing face, arms recoiling.
- Feet grounded on floor.
- EXACT SAME deep black hair, purple jacket DRAPED off shoulders, black top, dark pants, white hand wraps, scale.`;
  } else if (frameName === 'victory') {
    posePrompt = `VICTORY CELEBRATION POSE:
- Victory cheer matching IMAGE 2: one fist with white wrap raised high, confident smile.
- EXACT SAME deep black hair, purple jacket DRAPED off shoulders, black top, dark pants, scale.`;
  } else if (frameName === 'lying') {
    posePrompt = `KNOCKED OUT / LYING ON THE FLOOR:
- Single character lying horizontally flat on the ground matching IMAGE 2. Eyes closed.
- EXACT SAME deep black hair, purple jacket, black top, dark pants, white hand wraps.
- CRITICAL: EXACTLY ONE SINGLE CHARACTER lying on the floor. ZERO standing figures. ZERO extra characters.`;
  }

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & IDENTITY LOCK - IDLE_01): Radja master reference. Lock: (1) Voluminous deep black curly/coily hair (cool charcoal highlights ONLY — FORBIDDEN brown hair); (2) Purple oversized jacket DRAPED / FALLING OFF the shoulders onto upper arms; (3) Black crop top; (4) Dark pants; (5) White hand wraps on BOTH hands/wrists; (6) 32-bit pixel art style.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (CANONICAL ${frameName.toUpperCase()} POSE SKELETON): Copy ONLY the body pose, limb angles, action silhouette, and motion dynamics from this reference.`,
    },
    pngPart(poseRefPath),
    {
      text: `TASK: Generate the ${frameName.toUpperCase()} frame for Radja.

${posePrompt}

CRITICAL RULES:
- The character MUST be 100% IDENTICAL to IMAGE 1 (idle_01) in face, deep black hair, draped purple jacket, black top, and white hand wraps.
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
  if (!cand?.inlineData?.data) throw new Error(`No image returned for Radja ${frameName}`);

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, `${frameName}_raw_provider_output.png`), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: RADJA_TARGET_HEIGHT,
    frameName,
  });

  const outPath = path.join(FRAMES_DIR, `${frameName}.png`);
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Radja ${frameName} saved: bbox=`, normalized.bbox, `SHA256=${sha}`);
  return normalized.bbox;
}

async function main() {
  const target = process.argv[2] || 'all';
  const frames = ['idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

  for (const f of frames) {
    if (target === f || target === 'all') {
      await generateRadjaFrame(f);
    }
  }
}

main().catch(err => {
  console.error('[!] Error in Radja generation:', err);
  process.exit(1);
});
