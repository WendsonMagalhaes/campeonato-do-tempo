/**
 * Arcade cinematic opening — visual timeline (ms from intro / BGM start).
 *
 * Camera is designed for a **single tall continuous background strip**
 * (sky → street). `cameraY` is a scroll offset into that strip.
 *
 * Musical kick (`KICK_TIMESTAMP_MS` ≈ 17.5s) is retained for audio docs /
 * future retiming. Visual drop is capped by `PRE_DROP_MAX_MS` so the
 * arcade intro does not sit on a static sky for the full pad.
 */

/** BGM first strong kick (reference only — visual drop may lead). */
export const KICK_TIMESTAMP_MS = 17557

/**
 * Visual SoT — capped pre-drop and majestic 4.5s camera descent.
 */
export const INTRO_TIMELINE = {
  start: 0,
  /** Slow sky drift during hold (same as start). */
  musicalRise: 9824,
  /** Visual camera drop start (holds on sky logo for 3s). */
  cameraDropStart: 9824,
  /** Mid-descent waypoint where logo passes upper viewport. */
  logoCenter: 14774,
  /** Camera arrives and smoothly rests at street band (9.9s descent to preserve 133px/s speed of original 600px/4.5s). */
  streetSettle: 19724,
  /** Full street settled beat / PRESS START appearance. */
  crowdReveal: 20224,
  /** Full energy / scene fully alive. */
  crowdFullEnergy: 21724,
} as const

export const INTRO_VIEW = {
  width: 1920,
  height: 1080,
} as const

/**
 * Tall continuous strip height in design px.
 * Single continuous sky→street background strip (1920×1680).
 * Camera math scrolls `cameraY` over `streetY` (600px).
 */
export const INTRO_STRIP = {
  /** Design dimensions of the single continuous tall background strip. */
  width: 1920,
  height: 2400,
  /** Y where the street band fills the viewport (bottom region). */
  get streetY() {
    return this.height - INTRO_VIEW.height
  },
  /** Viewport panels stacked in the interim dual-panel strip. */
  panelCount: 2,
} as const

/** @deprecated Use INTRO_STRIP.panelCount — kept for older tests/imports. */
export const INTRO_STRIP_PANEL_COUNT = INTRO_STRIP.panelCount

export type IntroPhase = 'skyHold' | 'cameraDrop' | 'streetSettled' | 'crowdReveal' | 'fullEnergy'

export type IntroFrameState = {
  elapsedMs: number
  phase: IntroPhase
  /** Eased drop progress 0..1 between cameraDropStart and streetSettle. */
  dropProgress: number
  /**
   * Vertical scroll into the tall strip (design px).
   * Applied as translateY(-cameraY). 0 = top of sky; streetY = settled street.
   */
  cameraY: number
  /** Subtle pre-drop / in-drop parallax drift on the continuous sky (px). */
  skyDriftY: number
  /** Logo overlay opacity 0..1 (0 when logo is baked into the tall strip). */
  logoOpacity: number
  /** Logo overlay vertical offset relative to viewport center (px). */
  logoOffsetY: number
  /** True while scrolling the strip (before street settle). */
  showSkyStrip: boolean
  /** Stable street BG after settle (never swaps). */
  showStreetStable: boolean
  /** Company-front fighters after street settle. */
  showFighters: boolean
  /** Crowd opacity 0..1 after crowdReveal. */
  crowdOpacity: number
  /** PRESS START visible. */
  showPressStart: boolean
}

function clamp01(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t
}

/** Smoothstep / ease-in-out cubic for camera motion. */
export function easeInOutCubic(t: number): number {
  const u = clamp01(t)
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}

/**
 * Camera Y keyed to visual timestamps — single continuous smooth scroll.
 * Uses easeInOutCubic across the full descent [cameraDropStart, streetSettle].
 */
export function introCameraYAt(elapsedMs: number, _viewH: number = INTRO_VIEW.height): number {
  const { cameraDropStart, streetSettle } = INTRO_TIMELINE
  const endY = INTRO_STRIP.streetY

  if (elapsedMs <= cameraDropStart) return 0
  if (elapsedMs >= streetSettle) return endY

  const u = easeInOutCubic((elapsedMs - cameraDropStart) / (streetSettle - cameraDropStart))
  return u * endY
}

/** Slow vertical drift during sky hold so the pre-drop beat is not a still. */
export function introSkyDriftYAt(elapsedMs: number): number {
  const { cameraDropStart } = INTRO_TIMELINE
  if (elapsedMs >= cameraDropStart) return 0
  const t = elapsedMs / Math.max(1, cameraDropStart)
  return -Math.sin(t * Math.PI) * 28 - t * 36
}

/**
 * Logo overlay: rises through center near logoCenter, fades before street.
 * When the tall strip has a baked logo, set logoOpacity consumer to ignore
 * (or keep INTRO_CINEMATIC_ASSETS.logoOverlay = null).
 */
export function introLogoPassAt(elapsedMs: number): { opacity: number; offsetY: number } {
  const { cameraDropStart, logoCenter, streetSettle } = INTRO_TIMELINE
  if (elapsedMs <= cameraDropStart || elapsedMs >= streetSettle) {
    return { opacity: 0, offsetY: 0 }
  }

  const dropStart = cameraDropStart
  const peak = logoCenter
  const end = streetSettle
  let opacity = 0
  if (elapsedMs <= peak) {
    opacity = easeInOutCubic((elapsedMs - dropStart) / (peak - dropStart))
  } else {
    opacity = 1 - easeInOutCubic((elapsedMs - peak) / (end - peak))
  }

  const u = clamp01((elapsedMs - dropStart) / (end - dropStart))
  // Sweep from above viewport center toward below as camera descends.
  const offsetY = (0.5 - u) * INTRO_VIEW.height * 0.85
  return { opacity: clamp01(opacity), offsetY }
}

export function introPhaseAt(elapsedMs: number): IntroPhase {
  const t = INTRO_TIMELINE
  if (elapsedMs < t.cameraDropStart) return 'skyHold'
  if (elapsedMs < t.streetSettle) return 'cameraDrop'
  if (elapsedMs < t.crowdReveal) return 'streetSettled'
  if (elapsedMs < t.crowdFullEnergy) return 'crowdReveal'
  return 'fullEnergy'
}

export function introFrameStateAt(
  elapsedMs: number,
  _viewH: number = INTRO_VIEW.height,
): IntroFrameState {
  const t = INTRO_TIMELINE
  const phase = introPhaseAt(elapsedMs)
  const dropSpan = t.streetSettle - t.cameraDropStart
  const dropProgress =
    elapsedMs <= t.cameraDropStart
      ? 0
      : elapsedMs >= t.streetSettle
        ? 1
        : clamp01((elapsedMs - t.cameraDropStart) / dropSpan)

  const logo = introLogoPassAt(elapsedMs)

  return {
    elapsedMs,
    phase,
    dropProgress,
    cameraY: introCameraYAt(elapsedMs),
    skyDriftY: introSkyDriftYAt(elapsedMs),
    logoOpacity: logo.opacity,
    logoOffsetY: logo.offsetY,
    showSkyStrip: true,
    showStreetStable: false,
    showFighters: true,
    crowdOpacity: 1,
    showPressStart: elapsedMs >= t.crowdReveal,
  }
}
