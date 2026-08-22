/**

 * Battle / versus geometry for FixedCanvas 1920×1080.

 *

 * Score plate uses object-fit:contain with measured PNG holes for digits/round.

 * Duo names sit beside portrait clusters (no name_plate chrome on battle).

 * HUD text metrics live here — do not scatter magic values in BattleScene.

 */



export const DESIGN = { width: 1920, height: 1080 } as const



export type Box = { x: number; y: number; w: number; h: number }



export type FighterBox = Box & { baselineY: number }



export const BATTLE_BG = '/assets/backgrounds/battle_dock_coldroom_bg.png' as const



/**
 * Shared draw size so male/female share the same ground box.
 * Bumped 460→600 after coldroom full-BG photoreal mezanino crowd (Crowd Feature v2)
 * so pixel fighters read in proportion without covering the railing crowd awkwardly.
 */

export const FIGHTER_DRAW = { w: 600, h: 600 } as const



/**

 * Opaque-content aspect (cw/ch) of decorative plate PNGs.

 * name_plate_base ≈ 1464×615 (Versus / other screens); score_panel_base ≈ 1482×702.

 */

export const PLATE_ASPECT = {

  name: 1464 / 615,

  score: 1482 / 702,

} as const



/** Intrinsic size of `score_panel_base.png` (runtime SoT). */

export const SCORE_PANEL_PNG = { w: 1482, h: 702 } as const



/**

 * Measured navy slots inside `score_panel_base.png` (1482×702).

 * Do not invent geometry — map these through object-fit:contain into the HUD box.

 */

export const SCORE_PANEL_HOLES_PX = {

  leftScore: { x: 85, y: 288, w: 172, h: 159 },

  centerRound: { x: 404, y: 264, w: 676, h: 212 },

  rightScore: { x: 1219, y: 288, w: 174, h: 159 },

} as const



/**

 * Map a PNG-space hole into a panel box that draws the score art with object-fit:contain.

 */

export function scorePanelHoleInBox(hole: Box, panel: Box): Box {

  const imgAspect = SCORE_PANEL_PNG.w / SCORE_PANEL_PNG.h

  const boxAspect = panel.w / panel.h

  let drawW: number

  let drawH: number

  let ox: number

  let oy: number

  if (boxAspect > imgAspect) {

    drawH = panel.h

    drawW = panel.h * imgAspect

    ox = (panel.w - drawW) / 2

    oy = 0

  } else {

    drawW = panel.w

    drawH = panel.w / imgAspect

    ox = 0

    oy = (panel.h - drawH) / 2

  }

  const sx = drawW / SCORE_PANEL_PNG.w

  const sy = drawH / SCORE_PANEL_PNG.h

  return {

    x: ox + hole.x * sx,

    y: oy + hole.y * sy,

    w: hole.w * sx,

    h: hole.h * sy,

  }

}



/**

 * BitmapText metrics for top HUD — single source of truth (Font Fix v4 only).

 *

 * Hierarchy via size + scale (no second proprietary font):

 * - Scores (side squares): medium, largest scale — placar hero

 * - Duo names: medium, mid scale — identity beside portraits

 * - Round label (center hole): small, tighter — secondary chrome

 * - TEMPO ALVO label: small; value medium/smaller beside it

 * - Plate times + overhead hit times: large digits for MM:SS:CS

 *

 * `scale` multiplies the v4 spec line height (small 64 / medium 96 / large 128).

 */

export const BATTLE_HUD = {

  nameText: {

    size: 'medium' as const,

    scale: 0.26,

    maxWidthRatio: 0.98,

  },

  /** Digit inside each side square of score_panel — strongest HUD signal. */

  scoreDigit: {

    size: 'medium' as const,

    scale: 0.4,

    maxWidthRatio: 0.86,

  },

  /** Stage label inside the wide center hole (e.g. OITAVAS — no R1/R2) — quieter. */

  scoreRound: {

    size: 'small' as const,

    scale: 0.24,

    maxWidthRatio: 0.92,

  },

  /** "TEMPO ALVO" label (small) mid-lower plaque. */

  targetLabel: {

    size: 'small' as const,

    scale: 0.2,

    maxWidthRatio: 0.42,

  },

  /** Target race time value beside the label. */

  targetValue: {

    size: 'medium' as const,

    scale: 0.22,

    maxWidthRatio: 0.52,

  },

  /** Legacy single-line target (fallback / TimePanel plates). */

  targetText: {

    size: 'small' as const,

    scale: 0.22,

    maxWidthRatio: 0.98,

  },

  timeText: {

    size: 'large' as const,

    scale: 0.3,

    maxWidthRatio: 0.86,

  },

  /** Reveal/KO MM:SS:CS in bottom corner frames. */

  fighterTime: {

    size: 'large' as const,

    scale: 0.34,

    maxWidthRatio: 0.9,

  },

} as const




/**

 * Usable text width inside a plate slot (object-fit:contain).

 * When the slot is wider than the plate aspect, effective art width shrinks.

 * For plate-free name labels, pass aspect ≈ box.w/box.h (or 12) so ratio applies to box.w.

 */

export function battleTextMaxWidth(box: Box, ratio: number, aspect: number) {

  const boxAspect = box.w / box.h

  const effectiveW = boxAspect > aspect ? Math.round(box.h * aspect) : box.w

  return Math.max(48, Math.floor(effectiveW * ratio))

}



/**

 * Top bar: portraits + plain names beside each cluster; score plate center.

 * TEMPO ALVO sits mid-lower (above head gap) to clear mezanino crowd faces.

 */

export const BATTLE = {

  background: { x: 0, y: 0, w: 1920, h: 1080 },

  leftHudPortrait: { x: 48, y: 24, w: 118, h: 118 },

  leftHudPortrait2: { x: 178, y: 24, w: 118, h: 118 },

  /** Duo name — to the right of left portrait pair. */

  leftName: { x: 308, y: 40, w: 420, h: 88 },

  rightHudPortrait: { x: 1754, y: 24, w: 118, h: 118 },

  rightHudPortrait2: { x: 1624, y: 24, w: 118, h: 118 },

  /** Duo name — to the left of right portrait pair. */

  rightName: { x: 1192, y: 40, w: 420, h: 88 },

  /**
   * Central score plate — ~20% smaller than pre-mezanino layout so coldroom
   * crowd faces stay readable behind chrome (not full-screen vignette).
   */
  score: { x: 798, y: 8, w: 324, h: 152 },

  /**
   * TEMPO ALVO — mid-lower band just above the fighter head gap / under mezanino
   * railing, with local arcade plaque. Cleared from top crowd faces.
   */
  target: { x: 700, y: 358, w: 520, h: 52 },

  leftTime: { x: 48, y: 180, w: 300, h: 72 },

  rightTime: { x: 1572, y: 180, w: 300, h: 72 },

  // Wider rest stance after 600px fighters (centers ~600 / 1320); feet on baselineY.
  // Edge gap ≈120px; APPROACH_PX closes to punch contact.

  leftFighter: { x: 300, y: 408, w: FIGHTER_DRAW.w, h: FIGHTER_DRAW.h, baselineY: 1008 },

  rightFighter: { x: 1020, y: 408, w: FIGHTER_DRAW.w, h: FIGHTER_DRAW.h, baselineY: 1008 },

  /** Contact point between mid-stage fighters (chest height). */

  impactCenter: { x: 960, y: 700 },

  impactSize: { w: 280, h: 240 },

  /**
   * Reveal/KO race times — bottom corners with arcade frame (not above heads).
   * Pinned to rest-stance home X; do NOT follow walk-in translateX.
   */

  leftFighterTime: { x: 36, y: 920, w: 340, h: 96 },

  rightFighterTime: { x: 1544, y: 920, w: 340, h: 96 },

  /**
   * Primary BitmapText status (VENCE A RODADA / PERFECT / EMPATE) — between
   * shrunk score and lowered TEMPO ALVO. No "tempos ocultos" banner.
   */
  roundTitle: { x: 560, y: 248, w: 800, h: 88 },

  /**
   * Large PNG announcer callouts (ROUND / FIGHT / KO) — ~750px-wide assets at ~0.85 scale.
   * Do NOT reuse roundTitle (540×72); keep aspect with object-fit:contain.
   */
  calloutOverlay: { x: 400, y: 220, w: 1120, h: 400 },

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



/**

 * Ground fighter feet on baselineY using runtime 576×576 frames

 * (anchor bottom-center per SPRITE_RUNTIME.md).

 */

export function fighterPlacement(box: FighterBox) {

  return {

    left: box.x,

    top: box.baselineY - box.h,

    width: box.w,

    height: box.h,

  }

}


