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

const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'lailson');
const MASTERS_DIR = path.join(ROOT, 'output', 'masters', 'lailson');
const DINARTE_DIR = path.join(ROOT, 'output', 'frames', 'dinarte');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const SEED_DIR = path.join(WS, 'assets', 'participants', 'lailson');

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

const LAILSON_TARGET_HEIGHT = 554;

export async function generateLailsonFrame(frameName: string) {
  console.log(`\n[*] Generating Lailson ${frameName}...`);
  const dinarteRef = path.join(DINARTE_DIR, `${frameName}.png`);
  const templateRef = path.join(TEMPLATES_DIR, `${frameName}.png`);
  const poseRefPath = fs.existsSync(dinarteRef) ? dinarteRef : templateRef;

  let posePrompt = '';
  if (frameName === 'idle_02') {
    posePrompt = `IDLE_02 MICROVARIATION:
- Noticeable idle breathing animation microvariation from idle_01: wrists/guard slightly lowered and relaxed compared to the high guard of idle_01.
- EXACT SAME off-white NY baseball cap (worn forward), plain cream/off-white short-sleeve t-shirt, medium royal blue denim jeans, tan/beige sneakers, watch on LEFT wrist, smooth arms, scale.`;
  } else if (frameName === 'walk_01') {
    posePrompt = `WALK_01 STRIDE (STRIDE 1):
- First walking step matching IMAGE 2: right leg forward, left leg back trailing, natural arm swing.
- EXACT SAME NY cap, cream t-shirt, medium royal blue denim jeans, tan/beige sneakers, watch on LEFT wrist, smooth arms, scale.`;
  } else if (frameName === 'walk_02') {
    posePrompt = `WALK_02 ALTERNATING STRIDE (STRIDE 2):
- Second, alternating walking step matching IMAGE 2: left leg forward, right leg back trailing, natural opposite arm swing (bare skin hands).
- EXACT SAME NY cap, cream t-shirt, medium royal blue denim jeans, tan/beige sneakers, watch on LEFT wrist, smooth arms, scale.`;
  } else if (frameName === 'attack') {
    posePrompt = `ATTACK PUNCH POSE:
- Straight punch attack matching IMAGE 2: lead fist extending forward in punch, rear hand guarding.
- EXACT SAME NY cap, cream t-shirt, medium royal blue denim jeans, tan/beige sneakers, watch on LEFT wrist, smooth arms, scale.`;
  } else if (frameName === 'hurt') {
    posePrompt = `HURT / HIT IMPACT REACTION POSE:
- Reeling backward from impact matching IMAGE 2: torso tilted back, head thrown back, grimacing face under cap, arms recoiling.
- Feet grounded on floor.
- EXACT SAME NY cap, cream t-shirt, medium royal blue denim jeans, tan/beige sneakers, smooth arms, scale.`;
  } else if (frameName === 'victory') {
    posePrompt = `VICTORY CELEBRATION POSE:
- Victory cheer matching IMAGE 2: one fist raised high, confident smiling expression under NY cap.
- EXACT SAME NY cap, cream t-shirt, medium royal blue denim jeans, tan/beige sneakers, smooth arms, scale.`;
  } else if (frameName === 'lying') {
    posePrompt = `KNOCKED OUT / LYING ON THE FLOOR:
- Single character lying horizontally flat on the ground matching IMAGE 2. Eyes closed.
- EXACT SAME NY cap, cream t-shirt, medium royal blue denim jeans, tan/beige sneakers.
- CRITICAL: EXACTLY ONE SINGLE CHARACTER lying on the floor. ZERO standing figures. ZERO extra characters.`;
  }

  const parts = [
    {
      text: `IMAGE 1 (PRIMARY CHARACTER & IDENTITY LOCK - IDLE_01): Lailson master reference. Lock: (1) Off-white/cream NY baseball cap (worn facing forward); (2) Plain off-white/cream short-sleeve crewneck t-shirt; (3) Medium royal blue denim jeans with cargo pockets; (4) Tan/beige sneakers with white accents; (5) Silver/black watch on LEFT wrist only (never right); (6) Normal athletic build with smooth non-muscular arms; (7) 32-bit pixel art style.`,
    },
    pngPart(IDLE01_PATH),
    {
      text: `IMAGE 2 (CANONICAL ${frameName.toUpperCase()} POSE SKELETON): Copy ONLY the body pose, limb angles, action silhouette, and motion dynamics from this reference.`,
    },
    pngPart(poseRefPath),
    {
      text: `TASK: Generate the ${frameName.toUpperCase()} frame for Lailson.

${posePrompt}

CRITICAL RULES:
- The character MUST be 100% IDENTICAL to IMAGE 1 (idle_01) in face, NY cap, cream t-shirt, medium royal blue denim jeans, tan/beige sneakers, watch on left wrist, and smooth arms with bare hands.
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
  if (!cand?.inlineData?.data) throw new Error(`No image returned for Lailson ${frameName}`);

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, `${frameName}_raw_provider_output.png`), raw);

  const normalized = await normalizeSpritePerfect(raw, {
    targetHeight: LAILSON_TARGET_HEIGHT,
    frameName,
  });

  const outPath = path.join(FRAMES_DIR, `${frameName}.png`);
  fs.writeFileSync(outPath, normalized.buffer);
  const sha = crypto.createHash('sha256').update(normalized.buffer).digest('hex');
  console.log(`[+] Lailson ${frameName} saved: bbox=`, normalized.bbox, `SHA256=${sha}`);
  return normalized.bbox;
}

async function main() {
  const target = process.argv[2] || 'all';
  const frames = ['idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

  for (const f of frames) {
    if (target === f || target === 'all') {
      await generateLailsonFrame(f);
    }
  }
}

main().catch(err => {
  console.error('[!] Error in Lailson generation:', err);
  process.exit(1);
});
