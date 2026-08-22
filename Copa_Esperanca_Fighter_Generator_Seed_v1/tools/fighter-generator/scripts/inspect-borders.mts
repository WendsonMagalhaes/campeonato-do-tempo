import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function inspectBorders() {
  const p = path.join(ROOT, 'output', 'frames', 'leandro', 'attack_raw_provider_output.png');
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  console.log(`=== CORNER & BORDER RGB IN ATTACK RAW (${w}x${h}) ===`);
  const samples = [
    [0, 0], [10, 10], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
    [0, Math.floor(h/2)], [w - 1, Math.floor(h/2)]
  ];
  for (const [x, y] of samples) {
    const idx = (y * w + x) * 4;
    console.log(`(${x}, ${y}): R=${data[idx]}, G=${data[idx+1]}, B=${data[idx+2]}, A=${data[idx+3]}`);
  }
}

inspectBorders().catch(console.error);
