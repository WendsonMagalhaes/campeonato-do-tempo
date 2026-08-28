import type { ScoreboardProjection } from '../../domain/projections.ts'

/** Match-finish walk-in + KO timeline ends ~4220ms; hold battle before duo-qualified UI. */
export const MATCH_KO_HOLD_MS = 2500

/** Round-win walk-in + hit timeline ends ~3140ms; hold battle before Round 3 selection. */
export const ROUND_WIN_HOLD_MS = 1300

export type ScoreboardLayerFlags = {
  showBattle: boolean
  /** Versus intro (VersusScene) — not BattleScene. */
  showVersus: boolean
  showRound3Selection: boolean
  showDuoQualified: boolean
  /** Screen passed to BattleScene (never `match_win` / raw `round3` during holds). */
  battleScreen: ScoreboardProjection['screen']
  forceMatchFinish: boolean
  /** Drive round-win punch (not KO) while holding before Round 3 selection. */
  forceRoundWin: boolean
}

/**
 * Pure layer sequencing for the scoreboard.
 * Versus intro uses VersusScene; BattleScene mounts for fight + punch/KO holds.
 */
export function resolveScoreboardLayers(input: {
  screen: ScoreboardProjection['screen']
  hasVersus: boolean
  koHold: boolean
  round3Hold: boolean
}): ScoreboardLayerFlags {
  const { screen, hasVersus, koHold, round3Hold } = input

  const showVersus = hasVersus && screen === 'versus'

  const showBattle =
    hasVersus &&
    (screen === 'round' ||
      (screen === 'match_win' && koHold) ||
      (screen === 'round3' && round3Hold))

  const showRound3Selection = hasVersus && screen === 'round3' && !round3Hold
  const showDuoQualified = hasVersus && screen === 'match_win' && !koHold

  let battleScreen: ScoreboardProjection['screen'] = screen
  if (screen === 'match_win' && koHold) battleScreen = 'round'
  if (screen === 'round3' && round3Hold) battleScreen = 'round'

  return {
    showBattle,
    showVersus,
    showRound3Selection,
    showDuoQualified,
    battleScreen,
    forceMatchFinish: screen === 'match_win' && koHold,
    forceRoundWin: screen === 'round3' && round3Hold,
  }
}
