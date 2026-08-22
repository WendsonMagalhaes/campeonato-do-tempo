import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { smartNormalizeSprite } from './smart-sprite-normalizer.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function testLyingNormalize() {
  const rawP = path.join(ROOT, 'output', 'frames', 'leandro', 'lying_raw_provider_output.png');
  if (!fs.existsSync(rawP)) {
    console.log('No raw lying found');
    return;
  }
  const rawBuf = fs.readFileSync(rawP);
  const result = await smartNormalizeSprite(rawBuf, {
    targetHeight: 554,
    isLying: true,
  });

  const outP = path.join(ROOT, 'output', 'frames', 'leandro', '_test_lying_normalized.png');
  fs.writeFileSync(outP, result.buffer);
  console.log(`Normalized lying saved to ${outP}`);
  console.log(`Bbox:`, result.bbox);
}

testLyingNormalize().catch(console.error);
