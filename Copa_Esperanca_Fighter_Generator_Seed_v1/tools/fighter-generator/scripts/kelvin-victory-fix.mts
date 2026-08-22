/**
 * Kelvin QA surgical fix: victory frame regeneration with youthful teen body proportions.
 * Feedback: "o Victory do Kelvin ta com corpo de adulto"
 *
 * Action:
 * - Backup previous victory frame and contact sheet.
 * - Regenerate victory.png ensuring youthful teen proportions matching idle_01 (narrow shoulders, slim torso, slender arms, young head-to-body ratio).
 * - Keep Dinarte victory pose (right arm straight UP above head, left fist at waist, celebrating expression).
 * - Keep round black glasses, white AirPods, striped polo, navy pants, red-accent sneakers, watch on left wrist.
 * - Normalize solid magenta (#FF00FF) 576x576.
 * - Rebuild 2x4 contact sheet.
 * - Sync to seed assets and runtime app SoT.
 */
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import * as dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const WORKSPACE_ROOT = path.resolve(ROOT, '..', '..');
const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'kelvin');
const MASTERS_DIR = path.join(ROOT, 'output', 'masters', 'kelvin');
const SEED_ASSETS_DIR = path.join(WORKSPACE_ROOT, 'Copa_Esperanca_Fighter_Generator_Seed_v1', 'assets', 'participants', 'kelvin');
const SEED_FIGHTER_DIR = path.join(SEED_ASSETS_DIR, 'fighter');
const APP_FIGHTER_DIR = path.join(WORKSPACE_ROOT, 'app', 'public', 'assets', 'participants', 'kelvin', 'fighter');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const BACKUPS_ROOT = path.join(ROOT, 'output', 'backups');

const IDLE01_PATH = path.join(FRAMES_DIR, 'idle_01.png');
const VICTORY_TEMPLATE = path.join(TEMPLATES_DIR, 'victory.png');
const BODY_MASTER = path.join(SEED_ASSETS_DIR, 'body_master.png');
const FACE_MASTER = path.join(SEED_ASSETS_DIR, 'face_master_360.png');
const SOURCE_CARD = path.join(SEED_ASSETS_DIR, 'source_card.jpeg');

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
      const magenta = Math.abs(r - 255) <= 40 && g <= 40 && Math.abs(b - 255) <= 40;
      if (a < 10 || magenta) continue;
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

async function createBackup() {
  const timestamp = '20260821_092500';
  const backupDir = path.join(BACKUPS_ROOT, `kelvin_pre_victory_youthful_qa_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const currentVictory = path.join(FRAMES_DIR, 'victory.png');
  const currentRaw = path.join(FRAMES_DIR, 'victory_raw_provider_output.jpg');
  const currentContact = path.join(ROOT, 'review', 'kelvin_frames_contact_sheet.png');
  const seedVictory = path.join(SEED_FIGHTER_DIR, 'victory.png');

  if (fs.existsSync(currentVictory)) {
    fs.copyFileSync(currentVictory, path.join(backupDir, 'victory.png'));
  }
  if (fs.existsSync(currentRaw)) {
    fs.copyFileSync(currentRaw, path.join(backupDir, 'victory_raw_provider_output.jpg'));
  }
  if (fs.existsSync(currentContact)) {
    fs.copyFileSync(currentContact, path.join(backupDir, 'kelvin_frames_contact_sheet.png'));
  }
  if (fs.existsSync(seedVictory)) {
    fs.copyFileSync(seedVictory, path.join(backupDir, 'seed_victory.png'));
  }

  console.log(`[+] Backup created at: ${backupDir}`);
  return backupDir;
}

async function generateYouthfulVictory() {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');

  const parts: any[] = [
    {
      text: 'IMAGE 1 (POSE SKELETON ONLY — DINARTE VICTORY): Copy ONLY the victory pose and limb positions from this image. DO NOT copy the adult bodybuilder physique, DO NOT copy the tank top, DO NOT copy the muscles or face. This is STRICTLY a pose template: RIGHT arm raised straight UP above the head with clenched fist, LEFT arm bent at waist with clenched fist, legs spread wide in celebration stance, mouth open shouting in victory.',
    },
    pngPart(VICTORY_TEMPLATE),
    {
      text: 'IMAGE 2 (CRITICAL IDENTITY + YOUTHFUL TEEN BODY PROPORTIONS LOCK — IDLE_01): Kelvin is a SLENDER, LEAN, YOUNG TEENAGER / YOUTH (15-18 years old build). Study his youthful proportions in this image: narrow shoulders, slim torso, slender smooth arms with NO adult biceps/bulges, slim legs, slightly larger head-to-body ratio (youthful teen sprite proportions). He wears: (1) WHITE short-sleeve polo with red AND navy striped collar AND matching striped sleeve cuffs; (2) Dark navy/black trousers; (3) White athletic sneakers with red accents on tongue/heel; (4) Round thick BLACK-rimmed glasses ALWAYS; (5) White wireless earbuds (AirPods) in BOTH ears ALWAYS; (6) Short dark curly taper-fade hair; (7) Silver/dark watch on LEFT wrist.',
    },
    pngPart(IDLE01_PATH),
    {
      text: 'IMAGE 3 (FACE & TEEN APPEARANCE REFERENCE): Real photo showing Kelvin is a young teenager/boy with round black glasses, white polo, and AirPods.',
    },
    fs.existsSync(BODY_MASTER) ? pngPart(BODY_MASTER) : jpegPart(SOURCE_CARD),
    {
      text: `KELVIN VICTORY FRAME GENERATION (CRITICAL QA FIX):
Draw Kelvin celebrating in the Dinarte VICTORY pose (from Image 1), but with Kelvin's EXACT youthful/teen body mass, scale, and proportions from Image 2 (idle_01).

CRITICAL PROPORTIONS & BODY LOCK:
- Kelvin is a SLENDER, LEAN TEENAGER (NOT an adult man, NOT buff, NOT broad-shouldered).
- BODY PROPORTIONS MUST MATCH IDLE_01 EXACTLY: narrow shoulders, slim waist, slender non-muscular arms, thin wrists, youthful head-to-body ratio.
- HARD FAIL: Adult bodybuilder physique, broad muscular adult chest/shoulders, thick adult bicep/forearm muscles, looking like a 30-year-old bodybuilder. Keep the body youthful, lean, and slender like idle_01!

POSE SPECIFICATION (DINARTE VICTORY):
- RIGHT arm is raised straight vertical UP, fist clenched in triumph ABOVE the head near top of canvas.
- LEFT arm is bent at waist/hip with fist clenched.
- Watch is on the LEFT wrist (waist fist). NEVER put the watch on the raised right arm.
- Legs planted in wide victory stance.
- Face: mouth open shouting/smiling in celebration, gazing 3/4 toward opponent / slightly toward camera.
- Glasses and AirPods REMAIN ON THE FACE.
- EXACTLY TWO ARMS. ZERO ghost limbs. ZERO extra arms. DO NOT draw idle guard fists.

OUTFIT (MUST MATCH IDLE_01 100%):
- WHITE short-sleeve polo shirt with red AND navy striped collar and matching striped cuffs on the short sleeves.
- Dark navy trousers / pants.
- White sneakers with red accents.
- Round black glasses.
- White wireless earbuds in both ears.
- Short dark curly taper-fade hair.

CANVAS & BACKGROUND:
- Single character centered in 576x576.
- Solid magenta background (#FF00FF).
- No text, no UI, no collage. EXACTLY ONE character.`,
    },
  ];

  console.log(`[*] Calling Gemini API (${MODEL}) for Kelvin youthful victory...`);
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
  if (!b64) throw new Error('No image returned by provider.');

  const raw = Buffer.from(b64, 'base64');
  const rawExt = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
  const rawPath = path.join(FRAMES_DIR, `victory_raw_provider_output.${rawExt}`);
  fs.writeFileSync(rawPath, raw);
  console.log(`[+] Saved raw output: ${rawPath}`);

  const normalized = await normalizeSpriteToCanvas(raw);
  const victoryPath = path.join(FRAMES_DIR, 'victory.png');
  fs.writeFileSync(victoryPath, normalized);

  const sha = crypto.createHash('sha256').update(normalized).digest('hex');
  console.log(`[+] Normalized victory.png written (SHA256: ${sha})`);
  return { sha, normalized };
}

async function rebuildContactSheet() {
  console.log(`[*] Rebuilding contact sheet for Kelvin...`);
  const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  const images: { path: string; name: string }[] = [];

  for (const frame of frames) {
    const framePath = path.join(FRAMES_DIR, `${frame}.png`);
    if (fs.existsSync(framePath)) {
      images.push({ path: framePath, name: frame });
    }
  }

  if (images.length === 0) {
    throw new Error('No frames found to build contact sheet.');
  }

  const cols = 4;
  const rows = Math.ceil(images.length / cols);
  const thumbSize = 256;
  const padding = 10;

  const width = cols * thumbSize + (cols + 1) * padding;
  const height = rows * thumbSize + (rows + 1) * padding;

  const composites = await Promise.all(
    images.map(async (img, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = padding + col * (thumbSize + padding);
      const y = padding + row * (thumbSize + padding);

      const resized = await sharp(img.path)
        .resize(thumbSize, thumbSize, { fit: 'contain', background: { r: 255, g: 0, b: 255, alpha: 1 } })
        .toBuffer();

      return { input: resized, top: y, left: x };
    })
  );

  const contactSheet = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  const outPath = path.join(ROOT, 'review', 'kelvin_frames_contact_sheet.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contactSheet);
  const sha = crypto.createHash('sha256').update(contactSheet).digest('hex');
  console.log(`[+] Contact sheet generated: ${outPath} (SHA256: ${sha})`);
  return { outPath, sha, contactSheet };
}

async function syncAssets() {
  console.log(`[*] Syncing Kelvin assets to seed and runtime SoT...`);
  fs.mkdirSync(SEED_FIGHTER_DIR, { recursive: true });
  fs.mkdirSync(APP_FIGHTER_DIR, { recursive: true });

  const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  const hashes: Record<string, string> = {};

  for (const frame of frames) {
    const src = path.join(FRAMES_DIR, `${frame}.png`);
    if (fs.existsSync(src)) {
      const buf = fs.readFileSync(src);
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      hashes[frame] = sha;

      // Sync to seed
      const seedDest = path.join(SEED_FIGHTER_DIR, `${frame}.png`);
      fs.copyFileSync(src, seedDest);

      // Sync to app public runtime SoT
      const appDest = path.join(APP_FIGHTER_DIR, `${frame}.png`);
      fs.copyFileSync(src, appDest);
    }
  }

  // Also sync contact sheet to app public if needed
  const contactSrc = path.join(ROOT, 'review', 'kelvin_frames_contact_sheet.png');
  if (fs.existsSync(contactSrc)) {
    const contactBuf = fs.readFileSync(contactSrc);
    hashes['contact_sheet'] = crypto.createHash('sha256').update(contactBuf).digest('hex');
    fs.copyFileSync(contactSrc, path.join(APP_FIGHTER_DIR, 'kelvin_frames_contact_sheet.png'));
    fs.copyFileSync(contactSrc, path.join(SEED_FIGHTER_DIR, 'kelvin_frames_contact_sheet.png'));
  }

  console.log(`[+] Assets synced successfully.`);
  return hashes;
}

async function main() {
  await createBackup();
  await generateYouthfulVictory();
  await rebuildContactSheet();
  const hashes = await syncAssets();

  console.log('\n=== KELVIN ASSET HASHES ===');
  for (const [k, v] of Object.entries(hashes)) {
    console.log(`${k}: ${v}`);
  }
}

main().catch((err) => {
  console.error('[!] Error in Kelvin QA script:', err);
  process.exit(1);
});
