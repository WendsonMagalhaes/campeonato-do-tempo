/**
 * Round 3 selection — layered geometry (hybrid human rule 2026-08-15).
 * `assets/screens/round3_selection_screen.png` is a visual reference only.
 * Aligns with SCREEN_LAYOUTS.round3Selection: 4 candidates, VS.
 * Selection feedback = CSS border on candidate slots (no sprite cursor / no bottom "SELECIONADOS" row).
 * Source of truth mirrored in EXACT_SCREEN_GEOMETRY.round3Selection (layered).
 *
 * Layout note (2026-08-16): no score banner / duo labels — each candidate name sits under its portrait.
 * Portraits are selection-scale (360×360 + portrait_frame_base), matching Versus.
 */

export const DESIGN = { width: 1920, height: 1080 } as const

export type Box = { x: number; y: number; w: number; h: number }

export const ROUND3_BG_PREFERRED = '/assets/backgrounds/battle_dock_coldroom_bg.png' as const
export const ROUND3_BG_FALLBACK = '/assets/backgrounds/opening_street_bg.png' as const

/** BitmapText metrics for Round 3 labels (plain text — no plate padding). */
export const ROUND3_HUD = {
  title: {
    size: 'large' as const,
    scale: 0.36,
  },
  candidateName: {
    size: 'medium' as const,
    /** ~3× the old small@0.26 (~17px) — primary label after duo names removed. */
    scale: 0.5,
  },
} as const

/** Selection-scale portrait outer box (includes portrait_frame_base). */
export const ROUND3_PORTRAIT = 360 as const

export const ROUND3 = {
  title: { x: 160, y: 42, w: 1600, h: 80 },
  leftCandidate1: { x: 48, y: 200, w: ROUND3_PORTRAIT, h: ROUND3_PORTRAIT },
  leftCandidate2: { x: 432, y: 200, w: ROUND3_PORTRAIT, h: ROUND3_PORTRAIT },
  rightCandidate1: { x: 1128, y: 200, w: ROUND3_PORTRAIT, h: ROUND3_PORTRAIT },
  rightCandidate2: { x: 1512, y: 200, w: ROUND3_PORTRAIT, h: ROUND3_PORTRAIT },
  leftName1: { x: 32, y: 576, w: 392, h: 88 },
  leftName2: { x: 416, y: 576, w: 392, h: 88 },
  rightName1: { x: 1112, y: 576, w: 392, h: 88 },
  rightName2: { x: 1496, y: 576, w: 392, h: 88 },
  vs: { x: 810, y: 230, w: 300, h: 300 },
  target: { x: 735, y: 980, w: 450, h: 70 },
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

/** Legacy aliases used by older call sites. */
export const LEFT_CANDIDATE_1 = ROUND3.leftCandidate1
export const LEFT_CANDIDATE_2 = ROUND3.leftCandidate2
export const RIGHT_CANDIDATE_1 = ROUND3.rightCandidate1
export const RIGHT_CANDIDATE_2 = ROUND3.rightCandidate2
export const LEFT_NAME_1 = ROUND3.leftName1
export const LEFT_NAME_2 = ROUND3.leftName2
export const RIGHT_NAME_1 = ROUND3.rightName1
export const RIGHT_NAME_2 = ROUND3.rightName2
