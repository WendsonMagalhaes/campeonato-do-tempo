/**
 * Geometrically reduce an overly round / protruding midsection on a magenta-BG
 * fighter sprite while keeping pose, face, outfit, and scale.
 *
 * Preferentially pulls the LEFT silhouette edge inward (front belly for
 * right-facing 3/4 idle poses). Cosine falloff across a torso band.
 *
 * Usage:
 *   node scripts/flatten-belly.mjs <input.png> <output.png> [--pull=0.26]
 */
import sharp from 'sharp';
import fs from 'fs';
import crypto from 'crypto';

function parseArgs(argv) {
  const positional = [];
  let pull = 0.26;
  let bandTop = 0.40;
  let bandBottom = 0.54;
  for (const a of argv) {
    if (a.startsWith('--pull=')) pull = Number(a.slice(7));
    else if (a.startsWith('--band-top=')) bandTop = Number(a.slice(11));
    else if (a.startsWith('--band-bottom=')) bandBottom = Number(a.slice(14));
    else positional.push(a);
  }
  return { input: positional[0], output: positional[1], pull, bandTop, bandBottom };
}

async function flattenBellyFront(inputPath, outputPath, opts) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const out = Buffer.from(data);
  const isMagenta = (buf, i) => buf[i] > 200 && buf[i + 2] > 200 && buf[i + 1] < 90;
  const setMagenta = (buf, i) => {
    buf[i] = 255;
    buf[i + 1] = 0;
    buf[i + 2] = 255;
    buf[i + 3] = 255;
  };

  const y0 = Math.floor(h * opts.bandTop);
  const y1 = Math.floor(h * opts.bandBottom);
  const midY = (y0 + y1) / 2;
  const half = Math.max(1, (y1 - y0) / 2);

  for (let y = y0; y < y1; y++) {
    const t = (y - midY) / half;
    const falloff = Math.cos((Math.min(1, Math.abs(t)) * Math.PI) / 2);
    const pull = opts.pull * falloff;
    if (pull < 0.01) continue;

    let minX = w;
    let maxX = -1;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!isMagenta(data, i)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    if (maxX < minX) continue;

    const width = maxX - minX + 1;
    const leftPullPx = Math.round(width * pull * 0.85);
    const rightPullPx = Math.round(width * pull * 0.15);
    const newMin = minX + leftPullPx;
    const newMax = maxX - rightPullPx;
    if (newMax <= newMin + 8) continue;

    for (let x = minX; x <= maxX; x++) setMagenta(out, (y * w + x) * 4);

    const oldSpan = maxX - minX;
    const newSpan = newMax - newMin;
    for (let x = newMin; x <= newMax; x++) {
      const nx = (x - newMin) / newSpan;
      const srcX = minX + nx * oldSpan;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(w - 1, x0 + 1);
      const frac = srcX - x0;
      const i0 = (y * w + x0) * 4;
      const i1 = (y * w + x1) * 4;
      const oi = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        out[oi + c] = Math.round(data[i0 + c] * (1 - frac) + data[i1 + c] * frac);
      }
    }
  }

  const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  fs.writeFileSync(outputPath, png);
  return crypto.createHash('sha256').update(png).digest('hex');
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  console.error('Usage: node scripts/flatten-belly.mjs <input.png> <output.png> [--pull=0.26]');
  process.exit(1);
}
if (!fs.existsSync(args.input)) {
  console.error(`Input not found: ${args.input}`);
  process.exit(1);
}

const tmp = `${args.output}.tmp.png`;
const hash = await flattenBellyFront(args.input, tmp, args);
fs.copyFileSync(tmp, args.output);
fs.unlinkSync(tmp);
console.log(`[+] Flattened belly: ${args.output}`);
console.log(`    sha256: ${hash}`);
console.log(`    pull=${args.pull} band=${args.bandTop}-${args.bandBottom}`);
