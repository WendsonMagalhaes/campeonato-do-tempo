import sharp from 'sharp';

export type ForwardLeg = 'left' | 'right' | 'unknown';

function isBackground(r: number, g: number, b: number, a: number): boolean {
  if (a < 32) return true;
  if (r > 200 && g < 80 && b > 200) return true;
  return false;
}

/**
 * Estimates which leg is forward in a side-view walk frame (character faces right).
 * Uses foot-contact mass in the lower quarter of the image.
 */
export async function detectForwardLeg(imagePath: string): Promise<ForwardLeg> {
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const footBandTop = Math.floor(height * 0.72);
  const midX = Math.floor(width / 2);

  let leftFootMass = 0;
  let rightFootMass = 0;
  let leftMaxX = -1;
  let rightMaxX = -1;

  for (let y = footBandTop; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (isBackground(r, g, b, a)) continue;

      if (x < midX) {
        leftFootMass++;
        leftMaxX = Math.max(leftMaxX, x);
      } else {
        rightFootMass++;
        rightMaxX = Math.max(rightMaxX, x);
      }
    }
  }

  if (leftFootMass === 0 && rightFootMass === 0) {
    return 'unknown';
  }

  // Facing right: forward foot usually extends further right (higher max X).
  if (leftMaxX >= 0 && rightMaxX >= 0) {
    const xGap = rightMaxX - leftMaxX;
    if (xGap > 8) return 'right';
    if (xGap < -8) return 'left';
  }

  const massRatio = rightFootMass / Math.max(1, leftFootMass);
  if (massRatio > 1.25) return 'right';
  if (massRatio < 0.8) return 'left';

  return 'unknown';
}

export function oppositeLeg(leg: ForwardLeg): ForwardLeg {
  if (leg === 'left') return 'right';
  if (leg === 'right') return 'left';
  return 'left';
}

export function formatLegHint(walk01Forward: ForwardLeg, walk02Required: ForwardLeg): string {
  const w01 = walk01Forward === 'unknown' ? 'unknown leg' : `${walk01Forward.toUpperCase()} leg`;
  const w02 = `${walk02Required.toUpperCase()} leg`;
  return `walk_01 has ${w01} forward (text-only hint; walk_01 image is NOT shown). walk_02 MUST have ${w02} forward and the opposite leg back.`;
}

/**
 * Returns true when walk_02 leg region is too similar to walk_01 (likely duplicated stride).
 */
export async function legsAppearDuplicated(walk01Path: string, walk02Path: string): Promise<boolean> {
  const legRegionTop = 0.42;

  async function legSignature(imagePath: string): Promise<number[]> {
    const { data, info } = await sharp(imagePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const top = Math.floor(height * legRegionTop);
    const gridW = 16;
    const gridH = 12;
    const sig = new Array(gridW * gridH).fill(0);

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const x0 = Math.floor((gx / gridW) * width);
        const x1 = Math.floor(((gx + 1) / gridW) * width);
        const y0 = top + Math.floor((gy / gridH) * (height - top));
        const y1 = top + Math.floor(((gy + 1) / gridH) * (height - top));
        let count = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const idx = (y * width + x) * channels;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            if (!isBackground(r, g, b, a)) count++;
          }
        }
        sig[gy * gridW + gx] = count > 0 ? 1 : 0;
      }
    }
    return sig;
  }

  const [a, b] = await Promise.all([legSignature(walk01Path), legSignature(walk02Path)]);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) matches++;
  }
  const similarity = matches / a.length;
  return similarity >= 0.88;
}
