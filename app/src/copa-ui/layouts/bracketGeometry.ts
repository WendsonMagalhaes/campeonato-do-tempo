/**
 * Bracket / Chave — layered geometry from EXACT_SCREEN_GEOMETRY.json `bracket`.
 * Bilateral 16-team tree (8 per side). Deterministic HTML/SVG — never a baked bracket PNG.
 */

export const DESIGN = { width: 1920, height: 1080 } as const

export type Box = { x: number; y: number; w: number; h: number }

export const BRACKET_BG = '/assets/backgrounds/bracket_city_plaza_bg.png' as const

/**
 * EXACT_SCREEN_GEOMETRY.bracket
 *
 * Center columns (SEMIS + finalists) are spaced so left/right SF cards do not
 * overlap; SF→final connectors use an outward stem in the center gap (never a
 * vertical drawn on the card edge through the boxes).
 */
export const BRACKET = {
  card: { w: 200, h: 84 },
  leftColumns: [40, 260, 480] as const,
  rightColumns: [1680, 1460, 1240] as const,
  round16Ys: [98, 218, 338, 458, 578, 698, 818, 938] as const,
  quarterYs: [158, 398, 638, 878] as const,
  semiYs: [278, 758] as const,
  finalLeft: { x: 700, y: 518 },
  finalRight: { x: 1020, y: 518 },
  vs: { x: 900, y: 500, w: 120, h: 120 },
  trophy: { x: 840, y: 220, w: 240, h: 240 },
  logo: { x: 750, y: 72, w: 420, h: 124 },
  roundLabel: { y: 38, h: 28 },
} as const

export const BRACKET_LOGO = '/assets/brand/esperanca_distribuidora_logo.png' as const

/** `scale` multiplies the v4 spec line height (small 64 / medium 96 / large 128). */
export const BRACKET_HUD = {
  roundLabel: { size: 'small' as const, scale: 0.21 },
  teamName: { size: 'small' as const, scale: 0.24, maxWidth: 140 },
  tbdLabel: { size: 'small' as const, scale: 0.24, maxWidth: 170 },
} as const

/** Horizontal center of the FINAL / VS cluster (for FINAL label). */
const FINAL_LABEL_W = 100
const FINAL_CENTER_X =
  (BRACKET.finalLeft.x + BRACKET.card.w + BRACKET.finalRight.x) / 2

/** Round column labels — each box is column-width (or FINAL_LABEL_W), centered on its column. */
export const BRACKET_ROUND_LABELS: { text: string; x: number; w?: number }[] = [
  { text: 'OITAVAS', x: BRACKET.leftColumns[0] },
  { text: 'QUARTAS', x: BRACKET.leftColumns[1] },
  { text: 'SEMIS', x: BRACKET.leftColumns[2] },
  { text: 'FINAL', x: FINAL_CENTER_X - FINAL_LABEL_W / 2, w: FINAL_LABEL_W },
  { text: 'SEMIS', x: BRACKET.rightColumns[2] },
  { text: 'QUARTAS', x: BRACKET.rightColumns[1] },
  { text: 'OITAVAS', x: BRACKET.rightColumns[0] },
]

export function absoluteBox(box: Box) {
  return {
    position: 'absolute' as const,
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
  }
}

export function cardBox(x: number, y: number): Box {
  return { x, y, w: BRACKET.card.w, h: BRACKET.card.h }
}

export function cardCenter(box: Box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

/**
 * Stem X for SF → finalist when both share a column: sit in the center gap
 * between left SF right-edge and right SF left-edge (never on the card edge).
 */
export function semiFinalStemX(side: 'left' | 'right'): number {
  const leftEdge = BRACKET.leftColumns[2] + BRACKET.card.w
  const rightEdge = BRACKET.rightColumns[2]
  const gapMid = (leftEdge + rightEdge) / 2
  // Bias slightly toward each side so left/right stems do not paint as one bar.
  return side === 'left' ? gapMid - 18 : gapMid + 18
}

/** Elbow or vertical connector between two card boxes. */
export function elbowPath(
  from: Box,
  to: Box,
  side: 'left' | 'right',
): string {
  const a = cardCenter(from)
  const b = cardCenter(to)
  // Same column (SF → finalist): stem in the center gap, then back into the card.
  if (Math.abs(from.x - to.x) < 2) {
    const xEdge = side === 'left' ? from.x + from.w : from.x
    const stemX = semiFinalStemX(side)
    return `M ${xEdge} ${a.y} L ${stemX} ${a.y} L ${stemX} ${b.y} L ${xEdge} ${b.y}`
  }
  const xOut = side === 'left' ? from.x + from.w : from.x
  const xIn = side === 'left' ? to.x : to.x + to.w
  const midX = (xOut + xIn) / 2
  return `M ${xOut} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${xIn} ${b.y}`
}

/**
 * Get the logical center of a match in the bracket.
 * This can be used for camera focus.
 */
export function getMatchCenter(
  stage: 'oitavas' | 'quartas' | 'semifinais' | 'final',
  position: number,
): { x: number; y: number } {
  // position is 0-7 for oitavas, 0-3 for quartas, 0-1 for semis, 0 for final
  if (stage === 'final') {
    // Center between finalLeft and finalRight
    return {
      x: (BRACKET.finalLeft.x + BRACKET.card.w + BRACKET.finalRight.x) / 2,
      y: BRACKET.finalLeft.y + BRACKET.card.h / 2,
    }
  }

  const side = position < (stage === 'oitavas' ? 4 : stage === 'quartas' ? 2 : 1) ? 'left' : 'right'
  const cols = side === 'left' ? BRACKET.leftColumns : BRACKET.rightColumns
  const localIndex = side === 'left' ? position : position - (stage === 'oitavas' ? 4 : stage === 'quartas' ? 2 : 1)

  if (stage === 'oitavas') {
    // Oitavas center is between its two cards
    const y1 = BRACKET.round16Ys[localIndex * 2]!
    const y2 = BRACKET.round16Ys[localIndex * 2 + 1]!
    return {
      x: cols[0] + BRACKET.card.w / 2,
      y: (y1 + y2 + BRACKET.card.h) / 2,
    }
  }

  if (stage === 'quartas') {
    // Quartas center is its card center
    const y = BRACKET.quarterYs[localIndex]!
    return {
      x: cols[1] + BRACKET.card.w / 2,
      y: y + BRACKET.card.h / 2,
    }
  }

  // Semifinais
  const y = BRACKET.semiYs[localIndex]!
  return {
    x: cols[2] + BRACKET.card.w / 2,
    y: y + BRACKET.card.h / 2,
  }
}
