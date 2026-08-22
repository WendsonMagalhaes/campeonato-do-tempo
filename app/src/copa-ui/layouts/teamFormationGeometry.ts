/**
 * Team Formation geometry for `team_formation_variant_03.png`.
 *
 * Human hybrid rule (2026-08-15): Team Formation KEEPS baked screen art as
 * structural UI. Other screens use canonical layers + EXACT_SCREEN_GEOMETRY.
 *
 * Measurement method (recalibrated 2026-08-15 QA — slot hug):
 * 1. Native PNG is 1672×941 (not 1920×1080). Aspect ≈ 16:9; logical =
 *    round(native * sx/sy) with sx=1920/1672, sy=1080/941 (matches object-fit:fill).
 * 2. Inner photo holes = connected dark (lum < 42) regions between green corner LEDs.
 * 3. Horizontal pitch is NOT uniform: native ~88px for cols 1–8, then compresses
 *    (~86 / ~81) on cols 10–11 — uniform pitchX drifted col11 by ≈ −12 logical px.
 * 4. Per-column left/width (logical) from mid-row dark spans; rowYs/cellH from
 *    mid-col vertical spans → rowYs [305, 450, 593], cellH 85.
 * 5. CSS `.ce-slot-highlight` uses outline (like Round 3) on these exact boxes.
 * 6. EXACT_SCREEN_GEOMETRY.json teamFormation layout is NOT used here — it targets a
 *    different composition (stacked right-side portraits + VS), not variant_03.
 */

export const DESIGN = { width: 1920, height: 1080 } as const

/** Full-screen structural art (scaled to logical canvas, aspect preserved). */
export const TEAM_FORMATION_BG = '/assets/screens/team_formation_variant_03.png' as const

export type Box = { x: number; y: number; w: number; h: number }

/** Fixed "?" slot — never receives a participant photo. */
export const RANDOM_SLOT = { row: 2, col: 6 } as const

/**
 * Grid photo slots measured on variant_03 (logical 1920×1080).
 * Photos / CSS highlight must cover the baked checkerboard buracos exactly.
 * Prefer `colXs` / `colWs` via `gridSlotBox` — do not assume uniform pitch.
 */
export const GRID = {
  /** Left X of each column's inner photo hole (1-based col → index col-1). */
  colXs: [436, 537, 638, 738, 839, 942, 1043, 1144, 1244, 1342, 1435] as const,
  /** Width of each column's inner photo hole (cols 10–11 narrower in the art). */
  colWs: [76, 75, 75, 75, 76, 75, 75, 75, 74, 69, 69] as const,
  /** Top Y of the inner photo area for rows 1..3 */
  rowYs: [305, 450, 593] as const,
  cellH: 85,
  rows: 3,
  cols: 11,
  /** Legacy uniform approx (cols 1–8 only). Prefer colXs/colWs. */
  originX: 436,
  pitchX: 101,
  cellW: 75,
} as const

export const LEFT_PORTRAIT: Box = { x: 41, y: 267, w: 354, h: 485 }
export const RIGHT_PORTRAIT: Box = { x: 1526, y: 267, w: 355, h: 485 }

export const LEFT_NAMEPLATE: Box = { x: 42, y: 785, w: 349, h: 57 }
export const RIGHT_NAMEPLATE: Box = { x: 1527, y: 785, w: 349, h: 57 }

/** Dynamic duo status / duo name text area inside the lower gold panel. */
export const LOWER_PANEL: Box = { x: 580, y: 914, w: 764, h: 131 }

/**
 * Photo-hole size (legacy moldura fit math; TF now uses CSS slot highlight).
 * Do not use lateral triangular pointer offsets — rejected.
 */
export const CURSOR_PHOTO_HOLE = {
  w: GRID.cellW,
  h: GRID.cellH,
} as const

/**
 * Square moldura display size (logical px), centered on the photo hole.
 * Keep aspect square — never stretch to the rectangular buraco (avoids "torto").
 * outer ≈ pitchX so glow stays mostly in the inter-cell gutter.
 * IDLE = waiting + navigating; LOCK = confirmed (no MOVE/SELECTED).
 */
export const CURSOR_FIT = {
  idle: { outer: 99, offsetX: 0, offsetY: 0 },
  lock: { outer: 103, offsetX: 0, offsetY: 0 },
} as const

export function absoluteBox(box: Box) {
  return {
    position: 'absolute' as const,
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
  }
}

export function isRandomSlot(row: number, col: number): boolean {
  return row === RANDOM_SLOT.row && col === RANDOM_SLOT.col
}

/** Inner photo rectangle for a 1-based grid cell. */
export function gridSlotBox(row: number, col: number): Box {
  if (row < 1 || row > GRID.rows || col < 1 || col > GRID.cols) {
    throw new Error(`gridSlotBox out of range: row=${row} col=${col}`)
  }
  return {
    x: GRID.colXs[col - 1]!,
    y: GRID.rowYs[row - 1]!,
    w: GRID.colWs[col - 1]!,
    h: GRID.cellH,
  }
}

/** All 33 slot boxes (including the excluded "?" cell). */
export function allGridSlots(): Array<Box & { row: number; col: number; exclude: boolean }> {
  const out: Array<Box & { row: number; col: number; exclude: boolean }> = []
  for (let row = 1; row <= GRID.rows; row++) {
    for (let col = 1; col <= GRID.cols; col++) {
      out.push({
        ...gridSlotBox(row, col),
        row,
        col,
        exclude: isRandomSlot(row, col),
      })
    }
  }
  return out
}
