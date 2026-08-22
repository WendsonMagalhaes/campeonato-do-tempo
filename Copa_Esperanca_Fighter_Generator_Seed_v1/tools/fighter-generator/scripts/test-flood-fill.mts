import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function extractForegroundMask(
  data: Uint8Array,
  w: number,
  h: number
): { mask: Uint8Array; minX: number; minY: number; maxX: number; maxY: number; fgCount: number } {
  // We use BFS flood fill from all 4 borders to mark the background.
  // A pixel is background candidate if:
  // (1) R is high, G is low, B is high: e.g. R > 150, B > 150, G < 100, (R+B)/2 - G > 80
  // (2) Or color distance to pure magenta (255, 0, 255) < 130
  // (3) Or alpha < 20

  function isMagentaLike(r: number, g: number, b: number, a: number): boolean {
    if (a < 20) return true;
    const distToMagenta = Math.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2);
    if (distToMagenta < 140) return true;
    if (r > 150 && b > 150 && (r + b) / 2 - g > 70) return true;
    return false;
  }

  const bg = new Uint8Array(w * h); // 1 = background, 0 = foreground candidate
  const queue: number[] = [];

  // Seed with border pixels
  for (let x = 0; x < w; x++) {
    // top row
    let idx = x * 4;
    if (isMagentaLike(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
      bg[x] = 1;
      queue.push(x);
    }
    // bottom row
    let bIdx = ((h - 1) * w + x) * 4;
    let bPixel = (h - 1) * w + x;
    if (isMagentaLike(data[bIdx], data[bIdx + 1], data[bIdx + 2], data[bIdx + 3])) {
      bg[bPixel] = 1;
      queue.push(bPixel);
    }
  }

  for (let y = 0; y < h; y++) {
    // left col
    let lIdx = (y * w) * 4;
    let lPixel = y * w;
    if (!bg[lPixel] && isMagentaLike(data[lIdx], data[lIdx + 1], data[lIdx + 2], data[lIdx + 3])) {
      bg[lPixel] = 1;
      queue.push(lPixel);
    }
    // right col
    let rIdx = (y * w + (w - 1)) * 4;
    let rPixel = y * w + (w - 1);
    if (!bg[rPixel] && isMagentaLike(data[rIdx], data[rIdx + 1], data[rIdx + 2], data[rIdx + 3])) {
      bg[rPixel] = 1;
      queue.push(rPixel);
    }
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = Math.floor(curr / w);

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nPixel = ny * w + nx;
        if (!bg[nPixel]) {
          const nIdx = nPixel * 4;
          if (isMagentaLike(data[nIdx], data[nIdx + 1], data[nIdx + 2], data[nIdx + 3])) {
            bg[nPixel] = 1;
            queue.push(nPixel);
          }
        }
      }
    }
  }

  // Compute true FG mask & bounding box
  const mask = new Uint8Array(w * h);
  let minX = w, minY = h, maxX = 0, maxY = 0, fgCount = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!bg[p]) {
        mask[p] = 1;
        fgCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return { mask, minX, minY, maxX, maxY, fgCount };
}

async function testFloodFill() {
  const frames = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  console.log(`=== TRUE BOUNDING BOXES WITH FLOOD FILL ===`);
  for (const f of frames) {
    const rawP = path.join(ROOT, 'output', 'frames', 'leandro', `${f}_raw_provider_output.png`);
    if (!fs.existsSync(rawP)) continue;
    const { data, info } = await sharp(rawP).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { minX, minY, maxX, maxY, fgCount } = extractForegroundMask(data, info.width, info.height);
    console.log(`${f.padEnd(8)}: [${String(minX).padStart(4)},${String(minY).padStart(4)} -> ${String(maxX).padStart(4)},${String(maxY).padStart(4)}] size: ${String(maxX - minX + 1).padStart(4)}x${String(maxY - minY + 1).padStart(4)} in ${info.width}x${info.height} (fgPixels=${fgCount})`);
  }
}

testFloodFill().catch(console.error);
