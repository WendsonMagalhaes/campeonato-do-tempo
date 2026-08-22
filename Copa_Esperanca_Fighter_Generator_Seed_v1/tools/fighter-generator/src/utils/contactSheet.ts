import sharp, { OverlayOptions } from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '..', '..');

async function createContactSheet(participantId: string) {
  const seedRoot = path.join(baseDir, '..', '..');
  const idle01Candidates = [
    path.join(seedRoot, 'assets', 'participants', participantId, 'fighter', 'idle_01.png'),
    path.join(baseDir, 'output', 'masters', participantId, 'fighter_master.png'),
    path.join(seedRoot, 'assets', 'participants', participantId, 'body_master.png'),
  ];

  let idle01 = idle01Candidates[0];
  for (const candidate of idle01Candidates) {
    if (fs.existsSync(candidate)) {
      idle01 = candidate;
      break;
    }
  }

  const framesDir = path.join(baseDir, 'output', 'frames', participantId);
  const framesList = ['idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];
  
  const framePaths = [idle01];
  for (const f of framesList) {
    framePaths.push(path.join(framesDir, `${f}.png`));
  }

  const width = 576;
  const height = 576;
  const cols = 4;
  const rows = 2;
  const padding = 10;
  
  const totalWidth = (width + padding) * cols + padding;
  const totalHeight = (height + padding) * rows + padding;

  const composites: OverlayOptions[] = [];
  
  for (let i = 0; i < framePaths.length; i++) {
    if (fs.existsSync(framePaths[i])) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const left = padding + col * (width + padding);
      const top = padding + row * (height + padding);
      
      composites.push({
        input: framePaths[i],
        left,
        top
      });
      
      const frameName = i === 0 ? 'idle_01' : framesList[i - 1];
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
        top: top + height - 40
      });
    } else {
      console.log(`[!] Missing frame file: ${framePaths[i]}`);
    }
  }

  const outPath = path.join(baseDir, 'review', `${participantId}_frames_contact_sheet.png`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite(composites)
  .png()
  .toFile(outPath);

  console.log(`Contact sheet created at: ${outPath}`);
}

const participantId = process.argv[2] || 'dinarte';
createContactSheet(participantId).catch(console.error);
