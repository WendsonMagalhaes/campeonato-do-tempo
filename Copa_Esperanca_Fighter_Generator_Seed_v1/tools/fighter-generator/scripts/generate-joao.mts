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

const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'joao');
const MASTERS_DIR = path.join(ROOT, 'output', 'masters', 'joao');
const DINARTE_DIR = path.join(ROOT, 'output', 'frames', 'dinarte');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const SEED_DIR = path.join(WS, 'assets', 'participants', 'joao');

const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');
const MASTER_PATH = path.join(MASTERS_DIR, 'fighter_master.png');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
const ai = new GoogleGenAI({ apiKey: API_KEY });

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
}

const JOAO_TARGET_HEIGHT = 471;

function ensureCanonicalMaster() {
  if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });
  if (!fs.existsSync(MASTERS_DIR)) fs.mkdirSync(MASTERS_DIR, { recursive: true });

  if (fs.existsSync(MASTER_PATH) && !fs.existsSync(IDLE01_PATH)) {
    fs.copyFileSync(MASTER_PATH, IDLE01_PATH);
  }
}

export async function generateJoaoFrame(frameName: string, retries = 3) {
  console.log(`\n[*] Generating João ${frameName}...`);
  ensureCanonicalMaster();

  const dinarteRef = path.join(DINARTE_DIR, `${frameName}.png`);
  const templateRef = path.join(TEMPLATES_DIR, `${frameName}.png`);
  const poseRefPath = fs.existsSync(dinarteRef) ? dinarteRef : templateRef;

  let posePrompt = '';
  if (frameName === 'idle_02') {
    posePrompt = `IDLE_02 MICROVARIATION:
- Noticeable idle breathing animation microvariation from idle_01: subtle shift in fists/guard position while breathing (wrists/guard slightly shifted).
- EXACT SAME tailored black suit blazer with lapels, BLACK dress shirt (camisa preta), bright HOT PINK / MAGENTA necktie (gravata rosa), black trousers, black dress shoes.
- NO GLASSES (sem óculos - bare eyes/face matching idle_01). BARE HANDS (no gloves/wraps). Exact same scale and footprint.`;
  } else if (frameName === 'walk_01') {
    posePrompt = `WALK_01 STRIDE (STRIDE 1):
- First walking step matching IMAGE 2: left leg forward, right leg back trailing, natural arm swing with bare hands.
- Upright formal posture.
- EXACT SAME tailored black suit jacket, BLACK collared dress shirt (camisa preta), bright HOT PINK / MAGENTA necktie (gravata rosa), black trousers, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS (no gloves/wraps). Exact same scale and head-to-toe height as idle_01.`;
  } else if (frameName === 'walk_02') {
    posePrompt = `WALK_02 ALTERNATING STRIDE (STRIDE 2):
- Second, alternating walking step matching IMAGE 2: right leg forward, left leg back trailing, opposite arm swing with bare hands.
- Upright formal posture.
- EXACT SAME tailored black suit jacket, BLACK collared dress shirt (camisa preta), bright HOT PINK / MAGENTA necktie (gravata rosa), black trousers, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS (no gloves/wraps). Exact same scale and head-to-toe height as idle_01.`;
  } else if (frameName === 'attack') {
    posePrompt = `ATTACK PUNCH POSE:
- Straight punch attack matching IMAGE 2: lead fist extending forward in punch, rear hand guarding near ribs.
- EXACT SAME tailored black suit jacket, BLACK dress shirt (camisa preta), bright HOT PINK / MAGENTA necktie (gravata rosa), black trousers, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS (no gloves/wraps). Exact same scale as idle_01.`;
  } else if (frameName === 'hurt') {
    posePrompt = `HURT / HIT IMPACT REACTION POSE:
- Reeling backward from impact matching IMAGE 2: torso tilted back, head thrown back, grimacing face, arms recoiling.
- Feet grounded on floor.
- EXACT SAME tailored black suit jacket, BLACK dress shirt (camisa preta), bright HOT PINK / MAGENTA necktie (gravata rosa), black trousers, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS (no gloves/wraps). Exact same scale as idle_01.`;
  } else if (frameName === 'victory') {
    posePrompt = `VICTORY CELEBRATION POSE:
- Victory cheer matching IMAGE 2: one bare fist raised high, confident smiling expression.
- EXACT SAME tailored black suit jacket, BLACK dress shirt (camisa preta), bright HOT PINK / MAGENTA necktie (gravata rosa), black trousers, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS (no gloves/wraps). Exact same scale as idle_01.`;
  } else if (frameName === 'lying') {
    posePrompt = `KNOCKED OUT / LYING ON THE FLOOR:
- Single character lying horizontally flat on the ground matching IMAGE 2. Eyes closed.
- EXACT SAME black suit jacket, BLACK dress shirt (camisa preta), bright HOT PINK / MAGENTA necktie (gravata rosa), black trousers, black dress shoes.
- NO GLASSES (sem óculos). BARE HANDS.
- CRITICAL: EXACTLY ONE SINGLE CHARACTER lying flat on the floor. ZERO standing figures. ZERO extra characters.`;
  }

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & IDENTITY LOCK - IDLE_01): João master reference.
STRICT IDENTITY & VISUAL SPECIFICATION:
(1) 2-piece tailored black/charcoal formal suit jacket/blazer with lapels;
(2) BLACK / DARK CHARCOAL collared dress shirt (camisa preta) under the jacket — DO NOT invent white shirts or t-shirts;
(3) Bright HOT PINK / MAGENTA necktie (gravata rosa) clearly visible against the black shirt and black suit;
(4) Matching black formal dress trousers;
(5) Dark polished formal dress shoes;
(6) Short dark fade hair, dark beard/mustache;
(7) NO GLASSES (bare face/eyes, sem óculos) — DO NOT invent glasses or sunglasses;
(8) BARE HANDS ONLY (no gloves, no wraps, no boxing gear);
(9) 32-bit pixel art fighting game sprite on solid magenta background (#FF00FF).`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (CANONICAL ${frameName.toUpperCase()} POSE SKELETON): Copy ONLY the body pose, limb angles, action silhouette, and motion dynamics from this reference.`,
    },
    pngPart(poseRefPath),
    {
      text: `TASK: Generate the ${frameName.toUpperCase()} frame for João.

${posePrompt}

CRITICAL RULES:
- The character MUST be 100% IDENTICAL to IMAGE 1 (idle_01) in face, hair, black suit jacket, BLACK SHIRT (camisa preta), HOT PINK/MAGENTA TIE (gravata rosa), black trousers, black shoes.
- ABSOLUTELY NO WHITE SHIRT. The shirt under the jacket is SOLID BLACK.
- ABSOLUTELY NO GLASSES. His face has bare eyes with dark brows and dark beard.
- ABSOLUTELY NO GLOVES OR WRAPS. Bare hands on all frames.
- Scale and proportions must strictly match IMAGE 1 (~80% canvas height for standing/action frames).
- Solid pure magenta background (#FF00FF) ONLY.
- Exactly ONE character. NO text, NO UI, NO multiple figures.`,
    },
  ];

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts }],
        config: { responseModalities: ['IMAGE'] },
      });

      const cand = response.candidates?.[0]?.content?.parts?.[0];
      if (!cand?.inlineData?.data) throw new Error(`No image returned for João ${frameName} (attempt ${attempt})`);

      const raw = Buffer.from(cand.inlineData.data, 'base64');
      fs.writeFileSync(path.join(FRAMES_DIR, `${frameName}_raw_provider_output.png`), raw);

      const normalized = await normalizeSpritePerfect(raw, {
        targetHeight: JOAO_TARGET_HEIGHT,
        frameName,
      });

      const outPath = path.join(FRAMES_DIR, `${frameName}.png`);
      fs.writeFileSync(outPath, normalized.buffer);
      const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
      console.log(`[+] João ${frameName} saved: bbox=`, normalized.bbox, `SHA256=${sha}`);
      return { sha, bbox: normalized.bbox };
    } catch (err: any) {
      console.error(`[!] Attempt ${attempt} failed for João ${frameName}:`, err.message);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  const target = process.argv[2] || 'all';
  const frames = ['idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

  for (const f of frames) {
    if (target === f || target === 'all') {
      await generateJoaoFrame(f);
    }
  }
}

if (process.argv[1] && process.argv[1].includes('generate-joao')) {
  main().catch((err) => {
    console.error('[!] Error in João generation:', err);
    process.exit(1);
  });
}
