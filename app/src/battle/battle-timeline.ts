import { battleCallouts } from './battle-assets.ts'

export type BattleCue =
  | { at: number; type: 'fighter'; side: 'left' | 'right'; state: string }
  | { at: number; type: 'fx'; name: string }
  | { at: number; type: 'audio'; event: string }
  | { at: number; type: 'camera'; shake: 'light' | 'heavy' | 'ko' }
  | { at: number; type: 'screen'; action: string }
  | { at: number; type: 'phase'; phase: string }
  | { at: number; type: 'overlay'; text: string | null }
  /** Large centered PNG callout (KO / intro). Null clears. */
  | { at: number; type: 'callout'; src: string | null }
  | { at: number; type: 'advance'; side: 'left' | 'right' | null }

/** How far the attacker walks toward the opponent before punching (px @1920 canvas). */
export const APPROACH_PX = 280

/**
 * Walk-in / walk-back duration — ~6 steps of the 5fps 2-frame walk cycle
 * (200ms/frame; 1680≈6 across the widened fighter gap).
 */
export const WALK_IN_MS = 1680

/** Round-win: hold after impact before walk-back + score reveal. */
const ROUND_WALK_BACK_AT = WALK_IN_MS + 900

/** Match-finish beat anchors relative to walk-in (keeps KO→PERFECT→victory spacing). */
const MATCH_KO_AT = WALK_IN_MS + 720
const MATCH_PERFECT_AT = MATCH_KO_AT + 380
const MATCH_WALK_BACK_AT = MATCH_KO_AT + 450
const MATCH_VICTORY_AT = MATCH_WALK_BACK_AT + WALK_IN_MS + 60
const MATCH_QUALIFIED_AT = MATCH_VICTORY_AT + 750

/**
 * Short reaction when a round is won but the match continues.
 * Attacker walks ~3 steps in, punches, then walks back to rest position.
 */
export function buildRoundWinTimeline(winner: 'left' | 'right'): BattleCue[] {
  const loser = winner === 'left' ? 'right' : 'left'
  const cues: BattleCue[] = [
    { at: 0, type: 'phase', phase: 'attack' },
    { at: 0, type: 'fighter', side: winner, state: 'walk' },
    { at: 0, type: 'advance', side: winner },
    { at: WALK_IN_MS, type: 'fighter', side: winner, state: 'attack' },
    { at: WALK_IN_MS + 110, type: 'fx', name: 'impact.heavy' },
    { at: WALK_IN_MS + 110, type: 'audio', event: 'combat.punchHeavy' },
    { at: WALK_IN_MS + 110, type: 'camera', shake: 'heavy' },
    { at: WALK_IN_MS + 120, type: 'fighter', side: loser, state: 'hurt' },
    { at: WALK_IN_MS + 125, type: 'audio', event: 'combat.hurtVariant' },
    { at: ROUND_WALK_BACK_AT, type: 'fighter', side: winner, state: 'walk' },
    { at: ROUND_WALK_BACK_AT, type: 'advance', side: null },
    { at: ROUND_WALK_BACK_AT, type: 'fighter', side: loser, state: 'idle' },
    { at: ROUND_WALK_BACK_AT, type: 'fx', name: 'impact.hide' },
    { at: ROUND_WALK_BACK_AT, type: 'phase', phase: 'score-reveal' },
    { at: ROUND_WALK_BACK_AT, type: 'camera', shake: 'light' },
    { at: ROUND_WALK_BACK_AT, type: 'audio', event: 'crowd.cheerShort' },
    { at: ROUND_WALK_BACK_AT + WALK_IN_MS, type: 'fighter', side: winner, state: 'idle' },
  ]
  return cues.sort((a, b) => a.at - b.at)
}

export function buildMatchFinishTimeline(
  winner: 'left' | 'right',
  finalScore: '2-0' | '2-1',
): BattleCue[] {
  const loser = winner === 'left' ? 'right' : 'left'
  const cues: BattleCue[] = [
    { at: 0, type: 'phase', phase: 'attack' },
    { at: 0, type: 'fighter', side: winner, state: 'walk' },
    { at: 0, type: 'advance', side: winner },
    { at: WALK_IN_MS, type: 'fighter', side: winner, state: 'attack' },
    { at: WALK_IN_MS + 110, type: 'fx', name: 'impact.heavy' },
    { at: WALK_IN_MS + 110, type: 'audio', event: 'combat.punchHeavy' },
    { at: WALK_IN_MS + 110, type: 'camera', shake: 'heavy' },
    { at: WALK_IN_MS + 120, type: 'fighter', side: loser, state: 'hurt' },
    { at: WALK_IN_MS + 125, type: 'audio', event: 'combat.hurtVariant' },
    { at: WALK_IN_MS + 320, type: 'phase', phase: 'fall' },
    { at: WALK_IN_MS + 320, type: 'fighter', side: loser, state: 'fall' },
    { at: WALK_IN_MS + 600, type: 'phase', phase: 'lying-ko' },
    { at: WALK_IN_MS + 600, type: 'fighter', side: loser, state: 'lying' },
    { at: WALK_IN_MS + 600, type: 'audio', event: 'combat.bodyImpact' },
    { at: WALK_IN_MS + 600, type: 'camera', shake: 'ko' },
    { at: MATCH_KO_AT, type: 'phase', phase: 'ko-announce' },
    // Large PNG callout — not BitmapText in the 540×72 HUD slot.
    { at: MATCH_KO_AT, type: 'callout', src: battleCallouts.ko },
    { at: MATCH_KO_AT, type: 'audio', event: 'announcer.ko' },
  ]

  if (finalScore === '2-0') {
    cues.push(
      { at: MATCH_PERFECT_AT, type: 'phase', phase: 'perfect-announce' },
      { at: MATCH_PERFECT_AT, type: 'callout', src: null },
      { at: MATCH_PERFECT_AT, type: 'overlay', text: 'PERFECT' },
      { at: MATCH_PERFECT_AT, type: 'audio', event: 'announcer.perfect' },
    )
  }

  // Winner walks back to rest during the K.O. announce, then strikes the victory pose
  // clear of the lying opponent (lying silhouette spans wide around the loser box).
  cues.push(
    { at: MATCH_WALK_BACK_AT, type: 'fighter', side: winner, state: 'walk' },
    { at: MATCH_WALK_BACK_AT, type: 'advance', side: null },
    { at: MATCH_WALK_BACK_AT + WALK_IN_MS, type: 'fighter', side: winner, state: 'idle' },
    { at: MATCH_VICTORY_AT, type: 'phase', phase: 'victory' },
    { at: MATCH_VICTORY_AT, type: 'fighter', side: winner, state: 'victory' },
    // 2-1: clear KO art when victory pose lands (2-0 already cleared for PERFECT).
    ...(finalScore === '2-1' ? [{ at: MATCH_VICTORY_AT, type: 'callout' as const, src: null }] : []),
    {
      at: MATCH_VICTORY_AT,
      type: 'audio',
      event: finalScore === '2-0' ? 'crowd.cheerBig' : 'crowd.cheerShort',
    },
    { at: MATCH_QUALIFIED_AT, type: 'phase', phase: 'qualified' },
    { at: MATCH_QUALIFIED_AT, type: 'screen', action: 'show-qualified' },
  )

  return cues.sort((a, b) => a.at - b.at)
}
