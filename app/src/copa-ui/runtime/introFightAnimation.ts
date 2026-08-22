/**
 * Intro / company-front fighters loop (pack Crowd Feature v2).
 * Idle ↔ green attack ↔ idle ↔ red attack with fixed hold times.
 */

export const INTRO_FIGHT_FRAMES = {
  idle: '/assets/runtime/intro/fighters/intro_fighters_frame_01_idle.png',
  greenAttack: '/assets/runtime/intro/fighters/intro_fighters_frame_02_green_attack.png',
  redAttack: '/assets/runtime/intro/fighters/intro_fighters_frame_03_red_attack.png',
} as const

export type IntroFightStep = {
  src: string
  holdMs: number
}

/** Pack SPEC timing: idle 700 → attack 180 → idle 500 → attack 180 → repeat. */
export const INTRO_FIGHT_TIMELINE: readonly IntroFightStep[] = [
  { src: INTRO_FIGHT_FRAMES.idle, holdMs: 700 },
  { src: INTRO_FIGHT_FRAMES.greenAttack, holdMs: 180 },
  { src: INTRO_FIGHT_FRAMES.idle, holdMs: 500 },
  { src: INTRO_FIGHT_FRAMES.redAttack, holdMs: 180 },
]

export function introFightStepAt(elapsedMs: number): IntroFightStep {
  const cycle = INTRO_FIGHT_TIMELINE.reduce((sum, step) => sum + step.holdMs, 0)
  let t = ((elapsedMs % cycle) + cycle) % cycle
  for (const step of INTRO_FIGHT_TIMELINE) {
    if (t < step.holdMs) return step
    t -= step.holdMs
  }
  return INTRO_FIGHT_TIMELINE[0]
}
