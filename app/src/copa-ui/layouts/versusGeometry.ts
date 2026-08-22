/**
 * Versus screen geometry from EXACT_SCREEN_GEOMETRY.json `versus`.
 * Layered composition — do not use `versus_screen.png` as structural UI.
 *
 * Portraits are selection-scale (360×360 + portrait_frame_base), matching Round 3.
 * Duo identity = two large portraits per side with BitmapText names under each
 * (no name_plate_base chrome — same direction as Round 3 / battle HUD).
 */

export const DESIGN = { width: 1920, height: 1080 } as const

export type Box = { x: number; y: number; w: number; h: number }

/** Outdoor arena plaza — distinct from battle coldroom interior. */
export const VERSUS_BG = '/assets/backgrounds/versus_arena_exterior_bg.png' as const

/**
 * BitmapText metrics for Versus labels (plain text — no plate padding ratios).
 */
export const VERSUS_HUD = {
  memberName: {
    size: 'medium' as const,
    /** Match Round 3 candidate names (~48px) after portrait scale-up. */
    scale: 0.5,
  },
  status: {
    size: 'small' as const,
    scale: 0.32,
  },
  phase: {
    size: 'medium' as const,
    scale: 0.375,
  },
} as const

/** Selection-scale portrait outer box (includes portrait_frame_base). */
export const VERSUS_PORTRAIT = 360 as const

export const VERSUS = {
  phase: { x: 760, y: 54, w: 400, h: 60 },
  leftTeam: { x: 48, y: 200, w: 744, h: 464 },
  rightTeam: { x: 1128, y: 200, w: 744, h: 464 },
  /** Selection-scale portraits (aligned with Round 3 candidates). */
  leftPortrait1: { x: 48, y: 200, w: VERSUS_PORTRAIT, h: VERSUS_PORTRAIT },
  leftPortrait2: { x: 432, y: 200, w: VERSUS_PORTRAIT, h: VERSUS_PORTRAIT },
  rightPortrait1: { x: 1128, y: 200, w: VERSUS_PORTRAIT, h: VERSUS_PORTRAIT },
  rightPortrait2: { x: 1512, y: 200, w: VERSUS_PORTRAIT, h: VERSUS_PORTRAIT },
  leftName1: { x: 32, y: 576, w: 392, h: 88 },
  leftName2: { x: 416, y: 576, w: 392, h: 88 },
  rightName1: { x: 1112, y: 576, w: 392, h: 88 },
  rightName2: { x: 1496, y: 576, w: 392, h: 88 },
  vs: { x: 810, y: 230, w: 300, h: 300 },
  /** Status band — BitmapText only (no name_plate). */
  target: { x: 560, y: 920, w: 800, h: 56 },
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
