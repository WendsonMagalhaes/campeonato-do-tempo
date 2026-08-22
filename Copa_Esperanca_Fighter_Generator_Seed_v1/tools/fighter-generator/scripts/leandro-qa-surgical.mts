import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import * as dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'leandro');
const MASTERS_DIR = path.join(ROOT, 'output', 'masters', 'leandro');
const SEED_PARTICIPANT_DIR = path.join(ROOT, '..', '..', 'assets', 'participants', 'leandro');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

const SOURCE_CARD = path.join(SEED_PARTICIPANT_DIR, 'source_card.jpeg');
const FACE_MASTER = path.join(SEED_PARTICIPANT_DIR, 'face_master_360.png');
const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
}

function jpegPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/jpeg' } };
}

async function normalizeSpriteToCanvas(imageBuffer: Buffer, targetW = 576, targetH = 576): Promise<Buffer> {
  const MAGENTA = { r: 255, g: 0, b: 255, alpha: 1 };
  const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let fg = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const isMagenta = (r > 220 && g < 40 && b > 220) || a < 10;
      if (isMagenta) continue;
      fg++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  let pipeline = sharp(imageBuffer);
  if (fg > 50 && maxX > minX && maxY > minY) {
    const pad = 6;
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    const width = Math.min(w - left, maxX - minX + 1 + pad * 2);
    const height = Math.min(h - top, maxY - minY + 1 + pad * 2);
    pipeline = pipeline.extract({ left, top, width, height });
  }

  return pipeline
    .resize(targetW, targetH, { fit: 'contain', background: MAGENTA })
    .flatten({ background: MAGENTA })
    .png()
    .toBuffer();
}

async function runGeneration(frameName: string, parts: any[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (!cand?.inlineData?.data) throw new Error(`No image returned for Leandro ${frameName}`);

  const raw = Buffer.from(cand.inlineData.data, 'base64');
  fs.writeFileSync(path.join(FRAMES_DIR, `${frameName}_raw_provider_output.png`), raw);

  const normalized = await normalizeSpriteToCanvas(raw);
  const outPath = path.join(FRAMES_DIR, `${frameName}.png`);
  fs.writeFileSync(outPath, normalized);
  const sha = crypto.createHash('sha256').update(normalized).digest('hex');
  console.log(`[+] Leandro ${frameName} generated: ${outPath} (SHA256: ${sha})`);
  return sha;
}

export async function generateLeandroIdle01() {
  console.log('[*] Generating clean Leandro idle_01 (crisp pixel-art face/eyes fix)...');
  const templatePath = path.join(TEMPLATES_DIR, 'idle_01.png');

  const parts = [
    {
      text: 'IMAGE 1 (REAL PERSON PHOTO REFERENCE): Leandro real photo. Study his real facial structure: warm tan skin, short dark wavy hair, neat trimmed dark beard/stubble along jawline and mustache, natural dark eyes looking forward.',
    },
    jpegPart(SOURCE_CARD),
    {
      text: 'IMAGE 2 (FACE MASTER CLOSE-UP REFERENCE): Clean 360 pixel-art face reference showing neat dark beard/mustache, short dark hair, clear clean eyes.',
    },
    pngPart(FACE_MASTER),
    {
      text: 'IMAGE 3 (CANONICAL IDLE POSE SKELETON): Canonical idle fighting stance template.',
    },
    pngPart(templatePath),
    {
      text: `LEANDRO IDLE_01 / FIGHTER MASTER GENERATION (FACE & EYES QA FIX):
Generate the master idle_01 sprite for Leandro with CRISP, CLEAR, CLEAN PIXEL-ART FACIAL FEATURES and PROPER EYES.

CRITICAL FACE & EYE QUALITY REQUIREMENTS:
- CLEAR PIXEL-ART EYES: Symmetrical, clean, readable dark eyes with clear white sclera and dark pupils looking forward/3-quarters toward opponent. NO melted, blobby, missing, glitchy, or mismatched eyes!
- Clean, well-defined jawline with neat dark short beard/stubble and mustache matching IMAGE 1 and IMAGE 2.
- Short dark wavy/curly hair. Warm tan skin tone.
- OUTFIT: Plain black crewneck short-sleeve t-shirt, dark charcoal/olive-grey cargo pants, black boots/sneakers, bare hands (no gloves).
- BODY: Normal/average athletic build, SMOOTH arms without bodybuilder muscle cuts or bulging veins.
- POSE: Canonical idle fighting stance from IMAGE 3 (raised fists guard, knees slightly bent, balanced fighting stance).
- Footprint/scale: ~80% canvas height.
- Single character centered on solid magenta background (#FF00FF). 576x576 RGBA pixel art.
- HARD FAIL: Glitchy/blobby/melting eyes, missing facial features, bodybuilder muscles, gloves, multiple characters.`,
    },
  ];

  return runGeneration('idle_01', parts);
}

export async function generateLeandroFrame(frameName: string) {
  console.log(`[*] Generating Leandro ${frameName} (with clean face lock from idle_01)...`);
  const templatePath = path.join(TEMPLATES_DIR, `${frameName}.png`);

  let poseDesc = '';
  if (frameName === 'idle_02') {
    poseDesc = 'Subtle idle breathing cycle microvariation: fists slightly lowered / relaxed compared to high guard of idle_01.';
  } else if (frameName === 'walk_01') {
    poseDesc = 'Walk stride 1: right leg stepping forward, left leg trailing back, arms swinging naturally in walking motion.';
  } else if (frameName === 'walk_02') {
    poseDesc = 'Walk stride 2 (alternating): left leg stepping forward, right leg trailing back, alternating arm swing.';
  } else if (frameName === 'attack') {
    poseDesc = 'Punch attack: lead fist extending forward in strong straight punch, body lunging forward, rear hand in guard.';
  } else if (frameName === 'hurt') {
    poseDesc = 'Hit impact reaction: reeling backward from impact, grimacing face, arms recoiling.';
  } else if (frameName === 'victory') {
    poseDesc = 'Victory celebration: triumph stance celebrating win, open confident expression.';
  } else if (frameName === 'lying') {
    poseDesc = 'Knocked out / lying flat on the floor baseline: character lying COMPLETELY FLAT HORIZONTALLY on ground, head down, eyes closed, same clothes and hair.';
  }

  const parts = [
    {
      text: 'IMAGE 1 (PRIMARY CHARACTER, FACE & OUTFIT LOCK — IDLE_01): Leandro master reference. Lock: (1) Crisp clean facial features, neat beard/mustache, short dark hair, clean eyes; (2) Black short-sleeve t-shirt; (3) Dark charcoal/olive cargo pants; (4) Black boots; (5) Smooth arms, normal athletic build, bare hands; (6) 32-bit pixel art style.',
    },
    pngPart(IDLE01_PATH),
    {
      text: 'IMAGE 2 (FACE MASTER REFERENCE): Secondary face and eye reference.',
    },
    pngPart(FACE_MASTER),
    {
      text: `IMAGE 3 (CANONICAL ${frameName.toUpperCase()} POSE TEMPLATE): Copy ONLY pose, limb position, footprint, baseline, and motion angle from this template.`,
    },
    pngPart(templatePath),
    {
      text: `LEANDRO ${frameName.toUpperCase()} FRAME GENERATION (FACE/EYES CONTINUITY QA FIX):
Generate the ${frameName} frame for Leandro as the EXACT SAME CHARACTER from IMAGE 1 (idle_01).

CRITICAL QUALITY & CONTINUITY REQUIREMENTS:
- FACE & EYES: Keep the facial features, clean eyes, neat beard/mustache, and hair 100% consistent with IMAGE 1 (idle_01). Clean, crisp, non-glitched pixel-art eyes and face!
- OUTFIT: Plain black short-sleeve t-shirt, dark charcoal/olive cargo pants, black boots.
- BODY: Normal/average build, smooth arms, bare hands.
- POSE: Execute the ${frameName} pose (${poseDesc}) matching IMAGE 3 template skeleton.
- Footprint, scale, and baseline matching idle_01 (~80% canvas height).
- Single character centered on solid magenta background (#FF00FF). 576x576 RGBA pixel art.
- FORBIDDEN: Glitchy/melting/deformed eyes, different face, muscle cuts, gloves, collage, multiple characters.`,
    },
  ];

  return runGeneration(frameName, parts);
}

async function main() {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
  const target = process.argv[2] || 'all';

  if (target === 'idle_01' || target === 'all') {
    await generateLeandroIdle01();
    // Also copy to masters dir
    const idle01Buf = fs.readFileSync(IDLE01_PATH);
    fs.mkdirSync(MASTERS_DIR, { recursive: true });
    fs.writeFileSync(path.join(MASTERS_DIR, 'fighter_master.png'), idle01Buf);
  }

  const derivedFrames = ['idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  for (const f of derivedFrames) {
    if (target === f || target === 'all') {
      await generateLeandroFrame(f);
    }
  }
}

main().catch((err) => {
  console.error('[!] Error in Leandro QA:', err);
  process.exit(1);
});
