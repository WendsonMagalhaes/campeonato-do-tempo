import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.resolve(ROOT, '..', '..');

async function inspectLeandroLying() {
  const p = path.join(ROOT, 'output', 'frames', 'leandro', 'lying.png');
  const rawP = path.join(ROOT, 'output', 'frames', 'leandro', 'lying_raw_provider_output.png');
  console.log(`Inspecting Leandro lying at ${p}`);
  
  if (fs.existsSync(p)) {
    const meta = await sharp(p).metadata();
    console.log(`Dimensions: ${meta.width}x${meta.height}`);
  }
  if (fs.existsSync(rawP)) {
    const meta = await sharp(rawP).metadata();
    console.log(`Raw dimensions: ${meta.width}x${meta.height}`);
  }
}

inspectLeandroLying().catch(console.error);
