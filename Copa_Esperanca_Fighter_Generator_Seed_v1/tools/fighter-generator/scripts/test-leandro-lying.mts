import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import sharp from 'sharp';
import { extractForegroundMask } from './test-flood-fill.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'leandro');
const DINARTE_DIR = path.join(ROOT, 'output', 'frames', 'dinarte');
const SEED_DIR = path.join(WS, 'assets', 'participants', 'leandro');

const SOURCE_CARD = path.join(SEED_DIR, 'source_card.jpeg');
const FACE_MASTER = path.join(SEED_DIR, 'face_master_360.png');
const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
}

async function testLeandroLyingDirect() {
  console.log('[*] Testing Leandro lying generation with zero standing figure...');
  const dinarteLying = path.join(DINARTE_DIR, 'lying.png');

  const parts = [
    {
      text: 'IMAGE 1 (CANONICAL POSE REFERENCE - LYING FLAT ON GROUND): Copy this EXACT horizontal lying pose, scale, and angle. Single knocked-out fighter lying horizontally flat on the ground.',
    },
    pngPart(dinarteLying),
    {
      text: 'IMAGE 2 (CHARACTER APPEARANCE & OUTFIT LOCK): Leandro identity: handsome face, short dark wavy hair, neat trimmed beard/mustache, plain black crewneck t-shirt, dark olive/charcoal cargo pants, black boots.',
    },
    pngPart(IDLE01_PATH),
    {
      text: `TASK: Generate the LYING DOWN / KNOCKED OUT frame for Leandro.
ART STYLE: 32-bit fighting game arcade pixel art.

CRITICAL HARD CONSTRAINTS:
1. ONLY ONE CHARACTER ON THE CANVAS:
   - The ONLY person is Leandro lying COMPLETELY FLAT HORIZONTALLY on the floor, knocked out (matching IMAGE 1).
   - FORBIDDEN: NO standing figure. NO standing silhouette. NO second character. NO vertical collage. NO upright poses.
2. POSE:
   - Character is lying horizontally flat on the ground, face to the side or down, eyes closed, resting on the floor baseline (identical to IMAGE 1).
3. APPEARANCE LOCK:
   - Same black crewneck t-shirt, dark cargo pants, black boots, dark hair, beard from IMAGE 2.
4. BACKGROUND:
   - Solid pure magenta (#FF00FF) background ONLY. 576x576 RGBA.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error('No image returned');

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  const testRawP = path.join(FRAMES_DIR, 'lying_direct_test_raw.png');
  fs.writeFileSync(testRawP, raw);

  const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { minX, minY, maxX, maxY, fgCount } = extractForegroundMask(data, info.width, info.height);
  console.log(`Lying raw bbox: [${minX}, ${minY} -> ${maxX}, ${maxY}] size: ${maxX - minX + 1}x${maxY - minY + 1} in ${info.width}x${info.height}`);
}

testLeandroLyingDirect().catch(console.error);
