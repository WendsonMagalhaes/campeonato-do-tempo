import sharp from 'sharp';
import fs from 'fs';
import crypto from 'crypto';

async function convert(raw, out) {
  const buf = await sharp(raw)
    .resize(576, 576, {
      fit: 'contain',
      background: { r: 255, g: 0, b: 255, alpha: 1 },
      kernel: 'nearest',
    })
    .png()
    .toBuffer();
  fs.writeFileSync(out, buf);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  console.log(out, sha, buf.length);
}

await convert(
  'output/masters/livia/raw_provider_output.jpg',
  'output/masters/livia/fighter_master.png'
);
await convert(
  'output/frames/livia/raw_provider_output.jpg',
  'output/frames/livia/attack.png'
);
