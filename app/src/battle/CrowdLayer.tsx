/**
 * Battle ground-crowd overlay — RETIRED (Crowd Feature v2 / coldroom full-BG).
 *
 * Photoreal mezanino crowd is baked into `coldroom_bg_anim_f0*.png` via
 * ColdroomAnimatedBackground. Do not mount this layer on BattleScene.
 *
 * Kept as a thin module so CelebrationCrowd / historical docs can still
 * reference sheet size constants. Runtime PNGs under
 * `app/public/assets/runtime/crowd/` remain on disk but are unused in battle.
 */

export type CrowdMood = 'ambient' | 'cheer'

/** Sheet size kept for CelebrationCrowd / tooling that import layout constants. */
export const CROWD_SHEET = { w: 1536, h: 1024 } as const

/**
 * Former ground groups (stairs / chair) — empty: battle no longer draws them.
 * Tests assert this stays empty so old overlays do not regress.
 */
export const BATTLE_CROWD_GROUPS: readonly never[] = []
