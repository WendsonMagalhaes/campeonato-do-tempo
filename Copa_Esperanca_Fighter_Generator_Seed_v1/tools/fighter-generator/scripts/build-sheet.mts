import sharp, { OverlayOptions } from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

export async function buildSheet(slug: string) {
  const framesDir = path.join(ROOT, 'output', 'frames', slug);
  const width = 576;
  const height = 576;
  const cols = 4;
  const rows = 2;
  const padding = 10;

  const totalWidth = (width + padding) * cols + padding;
  const totalHeight = (height + padding) * rows + padding;

  const composites: OverlayOptions[] = [];

  for (let i = 0; i < FRAMES.length; i++) {
    const frameName = FRAMES[i];
    const framePath = path.join(framesDir, `${frameName}.png`);

    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = padding + col * (width + padding);
    const top = padding + row * (height + padding);

    composites.push({
      input: framePath,
      left,
      top,
    });

    const textSvg = `
      <svg width="${width}" height="40">
        <rect width="100%" height="100%" fill="black" fill-opacity="0.7"/>
        <text x="50%" y="28" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
          ${frameName}
        </text>
      </svg>
    `;
    composites.push({
      input: Buffer.from(textSvg),
      left,
      top: top + height - 40,
    });
  }

  const outPath = path.join(ROOT, 'review', `${slug}_frames_contact_sheet.png`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log(`[+] Contact sheet generated: ${outPath}`);
}

buildSheet(process.argv[2] || 'leandro').catch(console.error);
