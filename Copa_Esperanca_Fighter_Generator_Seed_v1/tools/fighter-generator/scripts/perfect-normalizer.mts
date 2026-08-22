import sharp from 'sharp';

export interface PerfectNormalizeOptions {
  targetHeight: number; // e.g. 554 (Leandro/Lailson), 493 (Radja), 471 (Joao)
  frameName: string; // 'idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'
  targetCanvasWidth?: number; // 576
  targetCanvasHeight?: number; // 576
  anchorBottomY?: number; // 575
}

export function extractForegroundMask(
  data: Uint8Array,
  w: number,
  h: number
): { mask: Uint8Array; minX: number; minY: number; maxX: number; maxY: number; fgCount: number } {
  function isMagentaLike(r: number, g: number, b: number, a: number): boolean {
    if (a < 20) return true;
    const distToMagenta = Math.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2);
    if (distToMagenta < 140) return true;
    if (r > 150 && b > 150 && (r + b) / 2 - g > 65) return true;
    return false;
  }

  const bg = new Uint8Array(w * h);
  const queue: number[] = [];

  // Seed top and bottom borders
  for (let x = 0; x < w; x++) {
    const topIdx = x * 4;
    if (isMagentaLike(data[topIdx], data[topIdx + 1], data[topIdx + 2], data[topIdx + 3])) {
      bg[x] = 1;
      queue.push(x);
    }
    const bPixel = (h - 1) * w + x;
    const bIdx = bPixel * 4;
    if (isMagentaLike(data[bIdx], data[bIdx + 1], data[bIdx + 2], data[bIdx + 3])) {
      bg[bPixel] = 1;
      queue.push(bPixel);
    }
  }

  // Seed left and right borders
  for (let y = 0; y < h; y++) {
    const lPixel = y * w;
    const lIdx = lPixel * 4;
    if (!bg[lPixel] && isMagentaLike(data[lIdx], data[lIdx + 1], data[lIdx + 2], data[lIdx + 3])) {
      bg[lPixel] = 1;
      queue.push(lPixel);
    }
    const rPixel = y * w + (w - 1);
    const rIdx = rPixel * 4;
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

export async function normalizeSpritePerfect(
  imageBuffer: Buffer,
  options: PerfectNormalizeOptions
): Promise<{ buffer: Buffer; bbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } }> {
  const targetW = options.targetCanvasWidth ?? 576;
  const targetH = options.targetCanvasHeight ?? 576;
  const anchorY = options.anchorBottomY ?? (targetH - 1); // 575
  const MAGENTA = { r: 255, g: 0, b: 255, alpha: 1 };

  const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  const { mask, minX, minY, maxX, maxY, fgCount } = extractForegroundMask(data, w, h);

  if (fgCount < 50 || maxX < minX || maxY < minY) {
    const buf = await sharp(imageBuffer)
      .resize(targetW, targetH, { fit: 'contain', background: MAGENTA })
      .flatten({ background: MAGENTA })
      .png()
      .toBuffer();
    return { buffer: buf, bbox: { minX: 0, minY: 0, maxX: targetW - 1, maxY: targetH - 1, width: targetW, height: targetH } };
  }

  let cropMinX = minX;
  let cropMinY = minY;
  let cropMaxX = maxX;
  let cropMaxY = maxY;

  if (options.frameName === 'lying') {
    // If raw image has standing figure + lying figure:
    if (cropMaxY - cropMinY > h * 0.40) {
      // Find lying figure strictly in bottom section (Y >= h * 0.72)
      let bottomMinY = h;
      for (let y = Math.floor(h * 0.72); y <= cropMaxY; y++) {
        for (let x = 0; x < w; x++) {
          if (mask[y * w + x] === 1) {
            if (y < bottomMinY) bottomMinY = y;
          }
        }
      }
      if (bottomMinY < cropMaxY) {
        cropMinY = bottomMinY;
      }
    }

    // Recompute cropMinX, cropMaxX for lying
    cropMinX = w;
    cropMaxX = 0;
    for (let y = cropMinY; y <= cropMaxY; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x] === 1) {
          if (x < cropMinX) cropMinX = x;
          if (x > cropMaxX) cropMaxX = x;
        }
      }
    }
  }

  const pad = 1;
  const extractLeft = Math.max(0, cropMinX - pad);
  const extractTop = Math.max(0, cropMinY - pad);
  const extractWidth = Math.min(w - extractLeft, (cropMaxX - cropMinX + 1) + pad * 2);
  const extractHeight = Math.min(h - extractTop, (cropMaxY - cropMinY + 1) + pad * 2);

  // Extract raw cropped RGBA
  const rawCropped = await sharp(imageBuffer)
    .extract({ left: extractLeft, top: extractTop, width: extractWidth, height: extractHeight })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cw = rawCropped.info.width;
  const ch = rawCropped.info.height;
  const cData = rawCropped.data;

  // Clean background within crop (replace background pixels with solid magenta #FF00FF based on BFS mask)
  for (let cy = 0; cy < ch; cy++) {
    const origY = extractTop + cy;
    for (let cx = 0; cx < cw; cx++) {
      const origX = extractLeft + cx;
      const i = (cy * cw + cx) * 4;
      const isFg = origY >= 0 && origY < h && origX >= 0 && origX < w && mask[origY * w + origX] === 1;
      const a = cData[i + 3];
      if (!isFg || a < 20) {
        cData[i] = 255;
        cData[i + 1] = 0;
        cData[i + 2] = 255;
        cData[i + 3] = 255;
      }
    }
  }

  const cleanedCroppedPng = await sharp(cData, { raw: { width: cw, height: ch, channels: 4 } })
    .png()
    .toBuffer();

  // Compute exact scale
  let scale = 1.0;
  if (options.frameName === 'lying') {
    // In lying, width should be ~86-90% of targetHeight (e.g. ~480px for 554, ~430px for 493, ~410px for 471)
    const targetLyingWidth = Math.min(500, Math.round(options.targetHeight * 0.88));
    scale = targetLyingWidth / cw;
  } else if (options.frameName === 'victory') {
    // Victory fist reaches higher: scale so body matches idle (~1.08 * targetHeight)
    scale = Math.min(targetH / ch, (options.targetHeight * 1.05) / ch);
  } else if (options.frameName === 'hurt' || options.frameName === 'attack') {
    scale = options.targetHeight / ch;
  } else {
    // idle_01, idle_02, walk_01, walk_02
    scale = options.targetHeight / ch;
  }

  // Ensure does not exceed canvas bounds
  if (cw * scale > targetW) scale = targetW / cw;
  if (ch * scale > targetH) scale = targetH / ch;

  const finalW = Math.max(1, Math.round(cw * scale));
  const finalH = Math.max(1, Math.round(ch * scale));

  const scaledBuffer = await sharp(cleanedCroppedPng)
    .resize(finalW, finalH, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();

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

  return {
    buffer: finalCanvas,
    bbox: {
      minX: left,
      minY: top,
      maxX: left + finalW - 1,
      maxY: top + finalH - 1,
      width: finalW,
      height: finalH,
    },
  };
}
