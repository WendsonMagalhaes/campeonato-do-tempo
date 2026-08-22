import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { normalizeSpritePerfect } from './perfect-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'joao');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const LEANDRO_DIR = path.join(ROOT, 'output', 'frames', 'leandro');
const DINARTE_DIR = path.join(ROOT, 'output', 'frames', 'dinarte');

const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
const ai = new GoogleGenAI({ apiKey: API_KEY });

const JOAO_TARGET_HEIGHT = 471;

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
}

export async function generateJoaoWalk02() {
  console.log('[*] Generating João walk_02 (active alternating walking stride with clear leg separation)...');
  const templateRef = path.join(TEMPLATES_DIR, 'walk_02.png');
  const leandroRef = path.join(LEANDRO_DIR, 'walk_02.png');
  const poseRef = fs.existsSync(templateRef) ? templateRef : leandroRef;

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER, IDENTITY & OUTFIT LOCK — IDLE_01): João master reference.
STRICT IDENTITY & VISUAL SPECIFICATION:
(1) 2-piece tailored black/charcoal formal suit jacket/blazer with lapels;
(2) SOLID BLACK collared dress shirt (camisa preta) under the jacket;
(3) Bright HOT PINK / MAGENTA necktie (gravata rosa) clearly visible;
(4) Matching black formal dress trousers;
(5) Polished black formal dress shoes;
(6) Short dark fade hair, dark trimmed beard/mustache;
(7) NO GLASSES (bare eyes/face, sem óculos);
(8) BARE HANDS ONLY (no gloves, no wraps, no boxing gear);
(9) 32-bit pixel art fighting game sprite on solid magenta background (#FF00FF).`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (CANONICAL WALK_02 POSE SKELETON & STRIDE REFERENCE): Study this walking stride skeleton.
Copy EXACTLY the walking movement and limb angles:
- The character is ACTIVELY WALKING FORWARD with legs separated in stride.
- Viewer's RIGHT leg is stepping forward with foot planted forward.
- Viewer's LEFT leg is extended back with heel lifted off the ground.
- Viewer's RIGHT arm is swinging forward with bare hand.
- Viewer's LEFT arm is swinging back.`,
    },
    pngPart(poseRef),
    {
      text: `JOÃO WALK_02 GENERATION (ACTIVE WALKING STRIDE & ARM SWING QA FIX):
Generate the walk_02 frame for João as the EXACT SAME CHARACTER from IMAGE 1 (idle_01) executing the ACTIVE WALKING STRIDE of IMAGE 2 (walk_02).

CRITICAL QUALITY & WALKING MOTION REQUIREMENTS:
- ACTIVE WALKING STRIDE WITH CLEAR LEG SEPARATION:
  - The character MUST BE WALKING, not standing still.
  - The legs MUST be clearly separated in the stride: viewer's RIGHT leg stepping forward (planted on floor), viewer's LEFT leg trailing behind with heel raised.
  - DO NOT draw feet together. DO NOT draw standing idle stance.
- NATURAL WALKING ARM SWING:
  - Arms swing naturally in walking motion with bare hands: viewer's RIGHT arm swings forward at waist/chest level, viewer's LEFT arm swings backward.
- OUTFIT LOCK: Black tailored suit blazer, BLACK shirt (camisa preta), HOT PINK / MAGENTA tie (gravata rosa), black trousers, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS (no gloves).
- Footprint and scale matching idle_01 (~471px height on 576x576 canvas).
- Single character centered on solid pure magenta background (#FF00FF).
- HARD FAIL: Standing idle, feet together, narrow standing stance, walk_01 clone, ghost limbs, white shirt, glasses, gloves.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for João walk_02');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'walk_02_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: JOAO_TARGET_HEIGHT,
    frameName: 'walk_02',
  });

  const outPath = path.join(FRAMES_DIR, 'walk_02.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] João walk_02 generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return sha;
}

export async function generateJoaoHurt() {
  console.log('[*] Generating João hurt (hit reaction, clean 2 arms, no ghost limbs)...');
  const poseRef = path.join(DINARTE_DIR, 'hurt.png');
  const fallbackRef = path.join(TEMPLATES_DIR, 'hurt.png');
  const chosenRef = fs.existsSync(poseRef) ? poseRef : fallbackRef;

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER, IDENTITY & OUTFIT LOCK — IDLE_01): João master reference.
STRICT IDENTITY & VISUAL SPECIFICATION:
(1) 2-piece tailored black/charcoal formal suit jacket/blazer with lapels;
(2) SOLID BLACK collared dress shirt (camisa preta) under the jacket;
(3) Bright HOT PINK / MAGENTA necktie (gravata rosa);
(4) Matching black formal dress trousers;
(5) Polished black formal dress shoes;
(6) Short dark fade hair, dark beard/mustache;
(7) NO GLASSES (bare eyes/face, sem óculos);
(8) BARE HANDS ONLY (no gloves, no wraps);
(9) 32-bit pixel art fighting game sprite on solid magenta background (#FF00FF).`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (CANONICAL HURT POSE SKELETON): Dinarte hurt frame. Copy EXACTLY this hit reaction pose: torso reeling back from impact, head thrown back, grimacing face, arms recoiling from blow, feet grounded on floor.`,
    },
    pngPart(chosenRef),
    {
      text: `JOÃO HURT FRAME GENERATION (NO GHOST ARMS / CLEAN ANATOMY QA FIX):
Generate the hurt (hit impact reaction) frame for João as the EXACT SAME CHARACTER from IMAGE 1 (idle_01) in the clean pose of IMAGE 2.

CRITICAL QUALITY & ANATOMY REQUIREMENTS:
- STRICTLY TWO ARMS: Exactly ONE left arm and ONE right arm recoiling from impact with bare hands.
- ABSOLUTELY ZERO GHOST ARMS: NO extra floating hands, NO phantom wrists, NO third arm artifact near the chest or torso!
- STRICTLY TWO LEGS: Grounded on the floor baseline.
- POSE: Reeling backward from impact — head thrown back, grimacing face, torso tilted back.
- OUTFIT LOCK: Black tailored suit blazer, BLACK shirt (camisa preta), HOT PINK / MAGENTA tie (gravata rosa), black pants, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS (no gloves).
- Footprint and scale matching idle_01 (~471px height on 576x576 canvas).
- Single character centered on solid pure magenta background (#FF00FF).
- FORBIDDEN: ghost arms, phantom limbs, third hand on chest, white shirt, glasses, gloves, collage, multiple characters.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for João hurt');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'hurt_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: JOAO_TARGET_HEIGHT,
    frameName: 'hurt',
  });

  const outPath = path.join(FRAMES_DIR, 'hurt.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] João hurt generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return sha;
}

export async function generateJoaoLying() {
  console.log('[*] Generating João lying (single clean horizontal body, exactly 2 legs, no ghost legs)...');
  const poseRef = path.join(DINARTE_DIR, 'lying.png');
  const fallbackRef = path.join(TEMPLATES_DIR, 'lying.png');
  const chosenRef = fs.existsSync(poseRef) ? poseRef : fallbackRef;

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER, IDENTITY & OUTFIT LOCK — IDLE_01): João master reference.
STRICT IDENTITY & VISUAL SPECIFICATION:
(1) 2-piece tailored black/charcoal formal suit jacket/blazer with lapels;
(2) SOLID BLACK collared dress shirt (camisa preta) under the jacket;
(3) Bright HOT PINK / MAGENTA necktie (gravata rosa);
(4) Matching black formal dress trousers;
(5) Polished black formal dress shoes;
(6) Short dark fade hair, dark beard/mustache;
(7) NO GLASSES (bare eyes/face, sem óculos);
(8) BARE HANDS ONLY (no gloves, no wraps);
(9) 32-bit pixel art fighting game sprite on solid magenta background (#FF00FF).`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (CANONICAL LYING POSE SKELETON): Dinarte lying frame. Copy EXACTLY this clean horizontal defeat pose: single horizontal body lying flat along the floor baseline, head on left with eyes closed, torso horizontal, TWO legs extending cleanly to the right side with ONE pair of black dress shoes on ground.`,
    },
    pngPart(chosenRef),
    {
      text: `JOÃO LYING FRAME GENERATION (CLEAN SINGLE BODY & NO GHOST LEGS QA FIX):
Generate the lying (knocked out / defeated) frame for João as the EXACT SAME CHARACTER from IMAGE 1 (idle_01) in the clean pose of IMAGE 2 (lying).

CRITICAL QUALITY & POSE REQUIREMENTS:
- SINGLE CLEAN HORIZONTAL BODY: ONLY ONE single body lying flat horizontally along the floor baseline.
  - Head on the left resting on ground with eyes closed.
  - Torso lying horizontally on ground in black suit with black shirt and hot pink tie.
  - EXACTLY TWO LEGS extending cleanly to the right side with EXACTLY ONE pair of black polished dress shoes resting flat on the floor.
- ABSOLUTELY ZERO GHOST LEGS OR PHANTOM FEET: Strictly TWO legs (one pair of shins/feet/shoes). NO duplicate legs, NO floating shins/feet, NO extra limbs behind, above, or below the legs!
- ONLY A HORIZONTAL LYING FIGURE: Do NOT draw any standing character above or beside him!
- OUTFIT LOCK: Black tailored suit blazer, BLACK shirt (camisa preta), HOT PINK / MAGENTA tie (gravata rosa), black pants, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS (no gloves).
- Single character centered on solid pure magenta background (#FF00FF).
- FORBIDDEN: ghost legs, phantom feet, extra shoes, duplicate shins, standing characters, multiple figures, split images.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned for João lying');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, 'lying_raw_provider_output.png'), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: JOAO_TARGET_HEIGHT,
    frameName: 'lying',
  });

  const outPath = path.join(FRAMES_DIR, 'lying.png');
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] João lying generated: ${outPath} (bbox:`, normalized.bbox, `SHA256: ${sha})`);
  return sha;
}

export async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'all' || target === 'walk_02') {
    await generateJoaoWalk02();
  }
  if (target === 'hurt') {
    await generateJoaoHurt();
  }
  if (target === 'lying') {
    await generateJoaoLying();
  }
}

if (process.argv[1] && process.argv[1].endsWith('joao-qa-surgical.mts')) {
  main().catch((err) => {
    console.error('[!] Error in João surgical QA:', err);
    process.exit(1);
  });
}
