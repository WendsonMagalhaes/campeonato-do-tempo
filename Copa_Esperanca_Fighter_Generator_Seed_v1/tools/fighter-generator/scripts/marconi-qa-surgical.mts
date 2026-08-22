/**
 * One-shot Marconi QA surgical edits (pose-locked).
 * - walk_01 / walk_02: match idle_01 pants + sneakers + watch + art style
 * - attack / lying: remove all watches (left arm hidden / Erikson rule)
 */
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES = path.join(ROOT, 'output', 'frames', 'marconi');
const IDLE01 = path.join(FRAMES, 'idle_01.png');
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

function pngPart(filePath: string) {
  return { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: 'image/png' } };
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
      if (a < 8) continue;
      const isMagenta = r > 230 && g < 40 && b > 230;
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
    const pad = 4;
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

async function runEdit(frame: string, parts: any[]): Promise<string> {
  const outPath = path.join(FRAMES, `${frame}.png`);
  const backup = path.join(FRAMES, `${frame}.pre_marconi_qa_surgical_backup.png`);
  if (!fs.existsSync(backup)) fs.copyFileSync(outPath, backup);

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  let b64 = '';
  let mime = 'image/png';
  const cand = response.candidates?.[0]?.content?.parts?.[0];
  if (cand?.inlineData?.data) {
    b64 = cand.inlineData.data;
    mime = cand.inlineData.mimeType || mime;
  }
  if (!b64) throw new Error(`No image for ${frame}`);

  const raw = Buffer.from(b64, 'base64');
  const rawExt = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
  fs.writeFileSync(path.join(FRAMES, `${frame}_raw_provider_output.${rawExt}`), raw);

  const normalized = await normalizeSpriteToCanvas(raw);
  fs.writeFileSync(outPath, normalized);
  const sha = crypto.createHash('sha256').update(normalized).digest('hex');
  console.log(`[+] ${frame} sha256=${sha}`);
  return sha;
}

async function outfitLock(frame: string) {
  const base = path.join(FRAMES, `${frame}.png`);
  const parts = [
    {
      text: `IMAGE 1 (PRIMARY — KEEP POSE LOCKED 100%): Exact ${frame} sprite. Keep EXACT same pose, limb angles, stride, footprint/scale, face, beard, buzz cut, chubby body, black tee, and solid magenta (#FF00FF). Change ONLY pants color/style, sneakers, wristwatch, and art-style consistency.`,
    },
    pngPart(base),
    {
      text: 'IMAGE 2 (OUTFIT + STYLE LOCK = idle_01): Copy ONLY from this image: (1) dark CHARCOAL jeans — NOT blue denim, NO cargo pockets; (2) BLACK low-top sneakers with thin DARK GREY sole — NOT thick white soles, NO white side stripes; (3) chunky BLACK round digital watch on the character LEFT wrist when that wrist is visible; (4) same pixel-art line weight / face shading language. Do NOT copy idle pose or stance.',
    },
    pngPart(IDLE01),
    {
      text: `MARCONI OUTFIT/STYLE LOCK EDIT (${frame}):
Keep EXACT pose from IMAGE 1. Match IMAGE 2 for: charcoal jeans, black sneakers (thin dark-grey sole), LEFT-wrist watch if left wrist visible, same art style as idle_01.
FORBIDDEN: blue jeans, blue sneakers, white thick soles, Adidas stripes, cargo pants, different artist style, pose change, skinny body.
Solid magenta (#FF00FF). ONE sprite.`,
    },
  ];
  return runEdit(frame, parts);
}

async function removeWatch(frame: string) {
  const base = path.join(FRAMES, `${frame}.png`);
  const parts = [
    {
      text: `IMAGE 1 (PRIMARY — KEEP POSE LOCKED 100%): Exact ${frame} sprite. Keep EXACT same pose, limbs, clothes, face, hair, chubby body, scale/footprint, and solid magenta. Change ONLY wrist accessories — REMOVE every watch.`,
    },
    pngPart(base),
    {
      text: `MARCONI WATCH-REMOVE EDIT (${frame}, left arm hidden rule):
Keep EXACT same pose and outfit from IMAGE 1 — DO NOT change pose.
REMOVE every black wristwatch / digital watch / watch band from ANY visible wrist. Wrists = bare skin.
Do NOT add a watch anywhere. Do NOT invent a second arm. Do NOT move limbs.
FORBIDDEN: pose change, clothes redesign, adding watch.
Solid magenta (#FF00FF).`,
    },
  ];
  return runEdit(frame, parts);
}

/** Move watch to character LEFT = forward arm toward RIGHT edge of canvas (facing right). */
async function moveWatchLeft(frame: string) {
  const base = path.join(FRAMES, `${frame}.png`);
  const parts = [
    {
      text: `IMAGE 1 (PRIMARY — KEEP POSE LOCKED 100%): Exact ${frame} sprite. Keep EXACT same pose, limbs, clothes, face, hair, chubby body, scale/footprint, and solid magenta (#FF00FF). Change ONLY wristwatch laterality.`,
    },
    pngPart(base),
    {
      text: 'IMAGE 2 (CORRECT watch placement = idle_01): chunky BLACK round digital watch is on the FORWARD arm — the wrist/fist closer to the RIGHT edge of the canvas when facing right (character LEFT wrist). The near arm (closer to the LEFT edge of the canvas) is BARE skin.',
    },
    pngPart(IDLE01),
    {
      text: `MARCONI WATCH-LOCK EDIT (${frame}, mode=move_left) — CANVAS RULES:
Keep EXACT same pose, clothes, face, hair, scale from IMAGE 1 — DO NOT change pose. ONE character only.
1) DELETE the black watch from the NEAR arm (wrist/fist closer to the LEFT edge of the canvas). That wrist = bare skin.
2) DRAW the SAME chunky black round digital watch on the FORWARD arm (wrist/fist closer to the RIGHT edge of the canvas / toward opponent). Match IMAGE 2 watch style.
HARD FAIL: watch still on left-side-of-canvas arm; no watch on right-side-of-canvas forward arm.
Solid magenta (#FF00FF).`,
    },
  ];
  return runEdit(frame, parts);
}

async function main() {
  if (!API_KEY) throw new Error('GEMINI_API_KEY missing');
  if (!fs.existsSync(IDLE01)) throw new Error('idle_01 missing');

  const jobs = (process.argv.slice(2).length ? process.argv.slice(2) : ['walk_01', 'walk_02', 'attack', 'lying']) as string[];
  for (const frame of jobs) {
    if (frame === 'attack' || frame === 'lying') await removeWatch(frame);
    else if (frame === 'move_left:idle_02' || frame === 'move_left:walk_01' || frame === 'move_left:walk_02') {
      await moveWatchLeft(frame.replace('move_left:', ''));
    } else if (frame === 'idle_02' || frame === 'walk_01' || frame === 'walk_02') await moveWatchLeft(frame);
    else if (frame.startsWith('outfit:')) await outfitLock(frame.replace('outfit:', ''));
    else throw new Error(`Unsupported frame: ${frame}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
