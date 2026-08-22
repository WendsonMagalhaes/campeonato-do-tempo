import sharp from 'sharp';

export interface NormalizeOptions {
  targetHeight?: number; // e.g. 554 for Leandro/Lailson, 493 for Radja, 471 for Joao
  isLying?: boolean;
  isVictory?: boolean;
  isAttack?: boolean;
  isHurt?: boolean;
  targetCanvasWidth?: number; // default 576
  targetCanvasHeight?: number; // default 576
  anchorBottomY?: number; // default 575
  centerHorizontal?: boolean; // default true
}

export async function smartNormalizeSprite(
  imageBuffer: Buffer,
  options: NormalizeOptions = {}
): Promise<{ buffer: Buffer; bbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } }> {
  const targetW = options.targetCanvasWidth ?? 576;
  const targetH = options.targetCanvasHeight ?? 576;
  const anchorY = options.anchorBottomY ?? (targetH - 1);
  const MAGENTA = { r: 255, g: 0, b: 255, alpha: 1 };

  const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Mask foreground pixels
  const fgMask = new Uint8Array(w * h);
  let rawMinX = w, rawMinY = h, rawMaxX = 0, rawMaxY = 0;
  let totalFg = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Pure/near magenta or transparent is background
      const isMagenta = (Math.abs(r - 255) <= 40 && g <= 45 && Math.abs(b - 255) <= 40) || a < 15;
      if (!isMagenta) {
        fgMask[y * w + x] = 1;
        totalFg++;
        if (x < rawMinX) rawMinX = x;
        if (x > rawMaxX) rawMaxX = x;
        if (y < rawMinY) rawMinY = y;
        if (y > rawMaxY) rawMaxY = y;
      }
    }
  }

  if (totalFg < 50 || rawMaxX < rawMinX || rawMaxY < rawMinY) {
    const buf = await sharp(imageBuffer)
      .resize(targetW, targetH, { fit: 'contain', background: MAGENTA })
      .flatten({ background: MAGENTA })
      .png()
      .toBuffer();
    return { buffer: buf, bbox: { minX: 0, minY: 0, maxX: targetW - 1, maxY: targetH - 1, width: targetW, height: targetH } };
  }

  // Detect vertical bands (for collage / multi-figure detection)
  const rowCounts = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (fgMask[y * w + x] === 1) rowCounts[y]++;
    }
  }

  type Band = { y0: number; y1: number; fgCount: number; maxRowWidth: number };
  const bands: Band[] = [];
  let inBand = false;
  let currentBandY0 = 0;
  let currentBandFg = 0;
  let currentBandMaxWidth = 0;

  for (let y = 0; y < h; y++) {
    if (rowCounts[y] > 5) {
      if (!inBand) {
        inBand = true;
        currentBandY0 = y;
        currentBandFg = 0;
        currentBandMaxWidth = 0;
      }
      currentBandFg += rowCounts[y];
      if (rowCounts[y] > currentBandMaxWidth) currentBandMaxWidth = rowCounts[y];
    } else {
      if (inBand) {
        // Only close if at least 10 consecutive empty rows or end
        let emptyAhead = 0;
        for (let ny = y; ny < Math.min(h, y + 12); ny++) {
          if (rowCounts[ny] <= 5) emptyAhead++;
        }
        if (emptyAhead >= 8 || y >= h - 1) {
          bands.push({ y0: currentBandY0, y1: y - 1, fgCount: currentBandFg, maxRowWidth: currentBandMaxWidth });
          inBand = false;
        }
      }
    }
  }
  if (inBand) {
    bands.push({ y0: currentBandY0, y1: h - 1, fgCount: currentBandFg, maxRowWidth: currentBandMaxWidth });
  }

  let cropMinY = rawMinY;
  let cropMaxY = rawMaxY;
  let cropMinX = rawMinX;
  let cropMaxX = rawMaxX;

  if (options.isLying) {
    // For lying, if there are multiple bands or a tall standing figure + bottom lying figure:
    if (bands.length >= 2) {
      // Pick the bottom-most band (lying on the floor)
      const bottomBand = bands[bands.length - 1];
      cropMinY = bottomBand.y0;
      cropMaxY = bottomBand.y1;
    } else if (rawMaxY - rawMinY > h * 0.5) {
      // If single band spans entire height, find the horizontal density peak in bottom 40%
      const bottomCutoff = Math.floor(rawMinY + (rawMaxY - rawMinY) * 0.55);
      // Check if bottom half has substantial horizontal width
      let bottomFg = 0;
      let bottomMinY = h;
      for (let y = bottomCutoff; y <= rawMaxY; y++) {
        if (rowCounts[y] > 20) {
          bottomFg += rowCounts[y];
          if (y < bottomMinY) bottomMinY = y;
        }
      }
      if (bottomFg > 5000) {
        cropMinY = bottomMinY;
        cropMaxY = rawMaxY;
      }
    }

    // Recompute X bounds within cropMinY..cropMaxY
    cropMinX = w;
    cropMaxX = 0;
    for (let y = cropMinY; y <= cropMaxY; y++) {
      for (let x = 0; x < w; x++) {
        if (fgMask[y * w + x] === 1) {
          if (x < cropMinX) cropMinX = x;
          if (x > cropMaxX) cropMaxX = x;
        }
      }
    }
    if (cropMaxX < cropMinX) {
      cropMinX = rawMinX;
      cropMaxX = rawMaxX;
    }
  } else {
    // For standing frames, if multiple bands exist, pick the largest one by fgCount
    if (bands.length >= 2) {
      let largest = bands[0];
      for (const b of bands) {
        if (b.fgCount > largest.fgCount) largest = b;
      }
      cropMinY = largest.y0;
      cropMaxY = largest.y1;
      cropMinX = w;
      cropMaxX = 0;
      for (let y = cropMinY; y <= cropMaxY; y++) {
        for (let x = 0; x < w; x++) {
          if (fgMask[y * w + x] === 1) {
            if (x < cropMinX) cropMinX = x;
            if (x > cropMaxX) cropMaxX = x;
          }
        }
      }
      if (cropMaxX < cropMinX) {
        cropMinX = rawMinX;
        cropMaxX = rawMaxX;
      }
    }
  }

  // Extract the cropped figure with 2px safety padding
  const pad = 2;
  const extractLeft = Math.max(0, cropMinX - pad);
  const extractTop = Math.max(0, cropMinY - pad);
  const extractWidth = Math.min(w - extractLeft, (cropMaxX - cropMinX + 1) + pad * 2);
  const extractHeight = Math.min(h - extractTop, (cropMaxY - cropMinY + 1) + pad * 2);

  const croppedBuffer = await sharp(imageBuffer)
    .extract({ left: extractLeft, top: extractTop, width: extractWidth, height: extractHeight })
    .png()
    .toBuffer();

  const croppedW = extractWidth;
  const croppedH = extractHeight;

  // Determine scaling factor
  let scale = 1.0;
  if (options.targetHeight) {
    if (options.isLying) {
      // In lying, the character length (croppedW) should match ~85-92% of targetHeight or ~460-490px
      const targetLyingWidth = Math.min(500, Math.round(options.targetHeight * 0.90));
      scale = targetLyingWidth / croppedW;
    } else if (options.isVictory) {
      // Victory fist extends up ~15-20% higher than idle, so total height is ~1.15 * targetHeight
      // Scale based on body proportion
      scale = (options.targetHeight * 1.12) / croppedH;
    } else if (options.isHurt) {
      // Hurt pose might be slightly hunched/recoiled (height ~95-100% of idle)
      scale = options.targetHeight / croppedH;
    } else if (options.isAttack) {
      // Punch attack: height matches idle height
      scale = options.targetHeight / croppedH;
    } else {
      // Upright (idle_01, idle_02, walk_01, walk_02): exact targetHeight
      scale = options.targetHeight / croppedH;
    }
  } else {
    // If no targetHeight specified, fit inside canvas with margin
    scale = Math.min((targetW - 20) / croppedW, (targetH - 20) / croppedH);
  }

  // Ensure scale doesn't exceed canvas limits
  if (croppedW * scale > targetW) scale = targetW / croppedW;
  if (croppedH * scale > targetH) scale = targetH / croppedH;

  const finalW = Math.max(1, Math.round(croppedW * scale));
  const finalH = Math.max(1, Math.round(croppedH * scale));

  const scaledBuffer = await sharp(croppedBuffer)
    .resize(finalW, finalH, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  // Position on canvas:
  // Feet at anchorY (575)
  // Horizontal center at targetW / 2 (288)
  const left = Math.max(0, Math.min(targetW - finalW, Math.round((targetW - finalW) / 2)));
  const top = Math.max(0, Math.min(targetH - finalH, anchorY - finalH + 1));

  const finalCanvas = await sharp({
    create: {
      width: targetW,
      height: targetH,
      channels: 4,
      background: MAGENTA,
    },
  })
    .composite([{ input: scaledBuffer, left, top }])
    .flatten({ background: MAGENTA })
    .png()
    .toBuffer();

  // Compute final bbox
  const finalMinX = left;
  const finalMinY = top;
  const finalMaxX = left + finalW - 1;
  const finalMaxY = top + finalH - 1;

  return {
    buffer: finalCanvas,
    bbox: {
      minX: finalMinX,
      minY: finalMinY,
      maxX: finalMaxX,
      maxY: finalMaxY,
      width: finalW,
      height: finalH,
    },
  };
}
