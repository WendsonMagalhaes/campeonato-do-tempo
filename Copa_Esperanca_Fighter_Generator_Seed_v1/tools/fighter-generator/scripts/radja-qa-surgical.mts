import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
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

const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');
const FACE_MASTER = path.join(SEED_DIR, 'face_master_360.png');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
const ai = new GoogleGenAI({ apiKey: API_KEY });

const RADJA_TARGET_HEIGHT = 493;

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
}

export async function generateRadjaIdle02() {
  console.log('[*] Generating Radja idle_02 (subtle arm/hand microvariation from idle_01)...');
  const templatePath = path.join(TEMPLATES_DIR, 'idle_02.png');
  const dinartePath = path.join(DINARTE_DIR, 'idle_02.png');
  const poseRef = fs.existsSync(dinartePath) ? dinartePath : templatePath;

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER, FACE, OUTFIT & POSE LOCK — IDLE_01): Radja. Master identity reference. Lock: (1) Voluminous deep black curly/coily hair with cool charcoal highlights (NO brown hair); (2) Oversized violet/purple bomber jacket DRAPED and falling off the shoulders onto upper arms; (3) Black crop top; (4) Dark charcoal/black pants; (5) White hand wraps on BOTH hands/wrists; (6) Athletic sneakers; (7) 32-bit pixel art style; (8) Exact character proportions and scale.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (IDLE_02 MICROVARIATION SKELETON): Reference for subtle breathing cycle motion.`,
    },
    pngPart(poseRef),
    {
      text: `RADJA IDLE_02 GENERATION (CRITICAL QA FIX):
Generate the idle_02 frame for Radja as the EXACT SAME CHARACTER from IMAGE 1 (idle_01).

MICROVARIATION REQUIREMENTS:
- Keep the character body, face, curly black hair, and clothing 100% IDENTICAL to IMAGE 1 (idle_01).
- The ONLY difference is a subtle change in the position of ONE arm / hand: lower the lead fist / arm slightly (relax guard by a few pixels), as part of the natural breathing animation cycle between idle_01 and idle_02.
- The purple jacket remains DRAPED off the shoulders onto upper arms.
- White wraps remain on BOTH hands and wrists.
- NO change to legs or head position.
- Height, scale, and footprint must match IMAGE 1 (~493px height on 576x576 canvas).
- Single character centered on solid pure magenta background (#FF00FF).
- FORBIDDEN: duplicate/identical pose of idle_01, jacket pulled up, brown hair, bare unwrapped hands, collage, multiple characters.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for Radja idle_02');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'idle_02_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: RADJA_TARGET_HEIGHT,
    frameName: 'idle_02',
  });

  const outPath = path.join(FRAMES_DIR, 'idle_02.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Radja idle_02 generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return sha;
}

export async function generateRadjaWalk01() {
  console.log('[*] Generating Radja walk_01 (natural straight walking stride, Dinarte pose language)...');
  const poseRef = path.join(DINARTE_DIR, 'walk_01.png');

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER, FACE & OUTFIT LOCK — IDLE_01): Radja. Master identity reference. Lock: (1) Voluminous deep black curly hair (charcoal highlights); (2) Oversized purple bomber jacket DRAPED off shoulders onto upper arms; (3) Black crop top; (4) Dark pants; (5) White hand wraps on BOTH hands/wrists; (6) Athletic sneakers; (7) 32-bit pixel art style.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (WALK_01 CANONICAL POSE SKELETON): Dinarte walk_01 frame. Copy EXACTLY this stride: left leg (viewer's left) stepping forward, right leg (viewer's right) trailing back, natural arm swing with forward arm swinging. Torso upright and balanced directly over pelvis.`,
    },
    pngPart(poseRef),
    {
      text: `RADJA WALK_01 GENERATION (TORSO ALIGNMENT & CLEAN LIMBS QA FIX):
Generate the walk_01 frame for Radja as the EXACT SAME CHARACTER from IMAGE 1 (idle_01) executing the walk_01 stride of IMAGE 2 (walk_01).

CRITICAL QUALITY & POSE REQUIREMENTS:
- TORSO & POSTURE: Upright athletic fighting game walking posture matching IMAGE 2. Torso is naturally aligned over the hips/pelvis (NOT twisted, NOT leaning crookedly, NOT deformed).
- CLEAN LIMBS: Strictly TWO arms, TWO legs. NO ghost limbs, NO third arm artifact, NO floating extra limbs.
- STRIDE 1: Step forward matching IMAGE 2: viewer's left leg stepping forward, viewer's right leg trailing back.
- CLOTHING & IDENTITY: Purple jacket DRAPED off shoulders, black crop top, dark pants, sneakers, white hand wraps on both hands/wrists. Deep black curly hair.
- Single character centered on solid pure magenta background (#FF00FF). 576x576 RGBA.
- FORBIDDEN: ghost arms, twisted/bent torso, jacket pulled up, brown hair, unwrapped hands, collage, multiple characters.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for Radja walk_01');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'walk_01_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: RADJA_TARGET_HEIGHT,
    frameName: 'walk_01',
  });

  const outPath = path.join(FRAMES_DIR, 'walk_01.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Radja walk_01 generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return sha;
}

export async function generateRadjaWalk02() {
  console.log('[*] Generating Radja walk_02 (ALTERNATING walk step: viewer right leg forward, left leg back)...');
  const poseRef = path.join(DINARTE_DIR, 'walk_02.png');

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & OUTFIT LOCK — IDLE_01): Radja. Master identity reference. Lock: deep black curly hair, draped purple jacket off shoulders, black top, dark pants, white hand wraps, sneakers.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (WALK_02 ALTERNATING POSE SKELETON): Dinarte walk_02 frame. Copy EXACTLY this alternating stride: the viewer's RIGHT leg steps forward, viewer's LEFT leg trails back, opposite arm swings forward.`,
    },
    pngPart(poseRef),
    {
      text: `RADJA WALK_02 GENERATION (CRITICAL ALTERNATING STRIDE QA FIX):
Generate the walk_02 frame for Radja as the EXACT SAME CHARACTER from IMAGE 1 (idle_01) executing the ALTERNATING walk_02 stride of IMAGE 2.

CRITICAL QUALITY & STRIDE REQUIREMENTS:
- REAL ALTERNATING WALKING STEP: Must be the alternating step of the walking cycle matching IMAGE 2!
  - Viewer's RIGHT leg is stepping forward with foot planted forward.
  - Viewer's LEFT leg is trailing behind with heel raised.
  - Arms swing in opposite rhythm to legs (viewer's right arm forward).
- CANNOT LOOK LIKE IDLE OR WALK_01: Legs must be clearly separated in the alternating walking stride. Do NOT draw feet together, do NOT draw standing idle stance.
- CLEAN LIMBS: Strictly TWO arms, TWO legs. Torso upright and centered over pelvis.
- CLOTHING & IDENTITY: Purple jacket DRAPED off shoulders, black top, dark pants, sneakers, white wraps on both wrists/hands. Deep black curly hair.
- Single character centered on solid pure magenta background (#FF00FF). 576x576 RGBA.
- FORBIDDEN: standing idle pose, feet together, walk_01 clone, ghost limbs, jacket pulled up, brown hair, collage, multiple characters.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for Radja walk_02');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'walk_02_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: RADJA_TARGET_HEIGHT,
    frameName: 'walk_02',
  });

  const outPath = path.join(FRAMES_DIR, 'walk_02.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Radja walk_02 generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return sha;
}

export async function generateRadjaLying() {
  console.log('[*] Generating Radja lying (single clean horizontal body, no ghost shins)...');
  const poseRef = path.join(DINARTE_DIR, 'lying.png');

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & OUTFIT LOCK — IDLE_01): Radja. Master identity reference. Lock: deep black curly hair, purple jacket, black top, dark pants, white hand wraps, sneakers.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (CANONICAL LYING POSE SKELETON): Dinarte lying frame. Copy EXACTLY this clean horizontal defeat pose: single horizontal body lying flat along the floor, head on left, torso horizontal, legs extending cleanly to the right with one pair of shoes on ground.`,
    },
    pngPart(poseRef),
    {
      text: `RADJA LYING FRAME GENERATION (CLEAN SINGLE BODY & NO GHOST LIMBS QA FIX):
Generate the lying (knocked out / defeated) frame for Radja as the EXACT SAME CHARACTER from IMAGE 1 (idle_01) in the clean pose of IMAGE 2 (lying).

CRITICAL QUALITY & POSE REQUIREMENTS:
- SINGLE CLEAN HORIZONTAL BODY: ONLY ONE single body lying flat horizontally along the floor.
  - Head on the left resting on ground with eyes closed.
  - Torso lying horizontally on ground.
  - TWO legs extending cleanly to the right side with ONE pair of shoes.
- ABSOLUTELY ZERO GHOST LIMBS OR EXTRA SHINS: Strictly TWO legs (one pair of shins/feet), TWO arms with white wraps. NO duplicate legs, NO floating shins/feet, NO extra limbs behind or above the legs!
- ONLY A HORIZONTAL LYING FIGURE: Do NOT draw any standing character above or beside her!
- CLOTHING & IDENTITY: Purple jacket, black top, dark pants, sneakers, white wraps on wrists/hands. Deep black curly hair.
- Single character centered on solid pure magenta background (#FF00FF). 576x576 RGBA.
- FORBIDDEN: ghost shins/legs, extra limbs, standing characters, multiple figures, split images, watermark.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for Radja lying');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'lying_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: RADJA_TARGET_HEIGHT,
    frameName: 'lying',
  });

  const outPath = path.join(FRAMES_DIR, 'lying.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Radja lying generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return sha;
}

export async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'all' || target === 'idle_02') {
    await generateRadjaIdle02();
  }
  if (target === 'all' || target === 'walk_01') {
    await generateRadjaWalk01();
  }
  if (target === 'all' || target === 'walk_02') {
    await generateRadjaWalk02();
  }
  if (target === 'all' || target === 'lying') {
    await generateRadjaLying();
  }
}

if (process.argv[1] && process.argv[1].endsWith('radja-qa-surgical.mts')) {
  main().catch((err) => {
    console.error('[!] Error in Radja surgical QA:', err);
    process.exit(1);
  });
}
