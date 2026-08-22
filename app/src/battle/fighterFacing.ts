import type { FighterAnim, FighterVariant, TeamSide } from './battle-assets.ts'
import { fighterRuntimeKey } from './battle-assets.ts'

export type FacingDir = 'left' | 'right'

/**
 * Desired on-screen facing: always look at the opponent.
 * Blue (left) → right; red (right) → left.
 */
export function desiredFacing(side: TeamSide): FacingDir {
  return side === 'blue' ? 'right' : 'left'
}

/**
 * Baked facing in runtime PNGs (authoring direction before CSS mirror).
 *
 * Convention: standing/combat frames face RIGHT. Hurt frames are right-baked =
 * the incoming fist enters from the RIGHT and the victim recoils LEFT.
 * Sheets author hurt rows left-baked; runtime PNGs are flipped ONCE at extraction
 * (female_blue via scripts/_normalize_female_blue_hurt.py; male_blue / male_red /
 * female_red hurt_01 via scripts/_fix_battle_frames_and_crowd.py; female_red
 * hurt_02 re-normalized 2026-08-15 — was left-baked and flipped mid-hurt when
 * red's side mirror ran, making the victim face away from the attacker).
 * lying poses are horizontal KO silhouettes (head baked LEFT); treat as right so the
 * side mirror puts the head away from the attacker on both sides.
 *
 * If a future sheet reintroduces left-baked runtime frames, add them here — mirror must
 * stay constant for the whole hurt→fall→lying family to avoid flicker.
 */
const BAKED_LEFT: ReadonlySet<string> = new Set([
  // intentionally empty — all runtime frames are normalized right-baked
])

export function bakedFacing(
  side: TeamSide,
  variant: FighterVariant,
  anim: FighterAnim,
): FacingDir {
  const key = `${fighterRuntimeKey(side, variant)}:${anim}`
  if (BAKED_LEFT.has(key)) return 'left'
  return 'right'
}

/**
 * Apply scaleX(-1) when baked art does not already face the opponent.
 * With current assets this is side-only (red mirrors). The (variant, anim)
 * parameters exist so left-baked exceptions can be registered without flicker.
 */
export function shouldMirrorFighter(
  side: TeamSide,
  variant: FighterVariant = 'male',
  anim: FighterAnim = 'idle',
): boolean {
  return desiredFacing(side) !== bakedFacing(side, variant, anim)
}
