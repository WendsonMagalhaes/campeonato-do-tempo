/**
 * Intro Cinematic Pack v2 — runtime URLs under app/public/assets/runtime/intro/.
 *
 * Camera architecture: one tall continuous sky→street strip scrolled via
 * translateY. Interim uses far sky + street panels only (no mid/logo sky swaps).
 * When a single tall strip PNG arrives, set `tallStrip` and bump INTRO_STRIP.
 */

export const INTRO_CINEMATIC_ASSETS = {
  /**
   * Continuous scroll panels (top → bottom). Single tall strip PNG.
   */
  tallStrip: '/assets/runtime/intro/background/intro_street_tall_bg_v2.png' as string | null,
  /** Interim top panel — continuous sky (do not hard-cut to mid/logo skies). */
  skyFar: '/assets/runtime/intro/sky/01_intro_sky_far.png',
  /**
   * Pack mid/logo skies exist but are discontinuous art — not used as camera
   * panels. Logo is a separate overlay during descent (or baked into tallStrip).
   */
  skyMid: '/assets/runtime/intro/sky/02_intro_sky_mid.png',
  skyLogo: '/assets/runtime/intro/sky/03_intro_sky_logo_2026.png',
  /**
   * Cutout logo overlay during descent in the upper sky.
   */
  logoOverlay: '/assets/runtime/intro/sky/03_intro_sky_logo_2026.png' as string | null,
  /**
   * Settled street BG reference.
   * MUST be the clean street (no baked COPA / 16 DUPLAS / PRESS START).
   */
  street: '/assets/runtime/intro/background/opening_street_bg.png',
  crowd: {
    upperLeft: [
      '/assets/runtime/intro/crowd/layered/10_intro_crowd_upper_left_frame_01.png',
      '/assets/runtime/intro/crowd/layered/11_intro_crowd_upper_left_frame_02.png',
    ],
    upperRight: [
      '/assets/runtime/intro/crowd/layered/20_intro_crowd_upper_right_frame_01.png',
      '/assets/runtime/intro/crowd/layered/21_intro_crowd_upper_right_frame_02.png',
    ],
    foreground: [
      '/assets/runtime/intro/crowd/layered/30_intro_crowd_foreground_frame_01.png',
      '/assets/runtime/intro/crowd/layered/31_intro_crowd_foreground_frame_02.png',
    ],
  },
} as const

/**
 * Ordered panels for the interim dual-panel strip (top → bottom).
 * When `tallStrip` is set, OpeningScene uses that single image instead.
 */
export const INTRO_SCROLL_PANELS = [
  INTRO_CINEMATIC_ASSETS.skyFar,
  INTRO_CINEMATIC_ASSETS.street,
] as const

/** Pack layer guide → FixedCanvas 1920×1080 slots (aspect from 2172×724 frames = 3.0). */
export const INTRO_CROWD_LAYOUT = {
  upperLeft: { x: 300, y: 730, w: 610, h: 204 },
  upperRight: { x: 1000, y: 730, w: 610, h: 204 },
  foreground: { x: 77, y: 880, w: 1766, h: 497 },
} as const

export type IntroCrowdGroupId = keyof typeof INTRO_CROWD_LAYOUT
