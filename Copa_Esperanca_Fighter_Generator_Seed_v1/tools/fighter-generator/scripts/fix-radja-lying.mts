import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractForegroundMask } from './perfect-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_DIR = path.join(ROOT, 'output', 'frames', 'radja');

async function fixRadjaLying() {
  const rawP = path.join(FRAMES_DIR, 'lying_raw_provider_output.png');
  const { data, info } = await sharp(rawP).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const { mask } = extractForegroundMask(data, w, h);

  // Isolate strictly the bottom lying body (Y >= 780)
  let cropMinX = w, cropMaxX = 0, cropMinY = h, cropMaxY = 0;
  for (let y = 780; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1) {
        if (x < cropMinX) cropMinX = x;
        if (x > cropMaxX) cropMaxX = x;
        if (y < cropMinY) cropMinY = y;
        if (y > cropMaxY) cropMaxY = y;
      }
    }
  }

  console.log(`Extracted lying crop: [${cropMinX}, ${cropMinY} -> ${cropMaxX}, ${cropMaxY}] size=${cropMaxX-cropMinX+1}x${cropMaxY-cropMinY+1}`);

  const rawCropped = await sharp(rawP)
    .extract({ left: cropMinX, top: cropMinY, width: cropMaxX - cropMinX + 1, height: cropMaxY - cropMinY + 1 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cw = rawCropped.info.width;
  const ch = rawCropped.info.height;
  const cData = rawCropped.data;

  for (let i = 0; i < cData.length; i += 4) {
    const r = cData[i], g = cData[i+1], b = cData[i+2], a = cData[i+3];
    const distToMagenta = Math.sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2);
    if (distToMagenta < 120 || (r > 160 && b > 160 && (r + b) / 2 - g > 65) || a < 20) {
      cData[i] = 255;
      cData[i+1] = 0;
      cData[i+2] = 255;
      cData[i+3] = 255;
    }
  }

  const cleanedPng = await sharp(cData, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();

  const targetW = 576, targetH = 576, targetHeight = 493;
  const targetLyingWidth = Math.round(targetHeight * 0.88); // 434px
  const scale = targetLyingWidth / cw;
  const finalW = Math.round(cw * scale);
  const finalH = Math.round(ch * scale);

  const scaled = await sharp(cleanedPng).resize(finalW, finalH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();

  const left = Math.round((targetW - finalW) / 2);
  const top = targetH - 1 - finalH + 1;

  const finalCanvas = await sharp({
    create: {
      width: targetW,
      height: targetH,
      channels: 4,
      background: { r: 255, g: 0, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: scaled, left, top }])
    .flatten({ background: { r: 255, g: 0, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(FRAMES_DIR, 'lying.png'), finalCanvas);
  console.log(`Saved Radja lying: bbox=[${left}, ${top} -> ${left+finalW-1}, ${top+finalH-1}] size=${finalW}x${finalH}`);
}

fixRadjaLying().catch(console.error);
