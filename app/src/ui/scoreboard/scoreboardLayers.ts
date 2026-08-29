import type { ScoreboardProjection } from '../../domain/projections.ts'

/** Match-finish walk-in + KO timeline ends ~4220ms; hold battle before duo-qualified UI. */
export const MATCH_KO_HOLD_MS = 5600

/** Round-win walk-in + hit timeline ends ~3140ms; hold battle before Round 3 selection. */
export const ROUND_WIN_HOLD_MS = 4400

/**
 * Rodada N -> N+1 DENTRO do mesmo confronto (screen continua 'round' o tempo
 * todo): o operador pode confirmar/avançar antes da animação de resultado
 * terminar. Tempo = duração completa do buildRoundWinTimeline em
 * battle-timeline.ts (WALK_IN_MS + 900 + WALK_IN_MS = 4260ms), + folga de
 * segurança pra não cortar a cauda se os timers atrasarem um pouco.
 */
export const ROUND_RESULT_HOLD_MS = 4400

export type ScoreboardLayerFlags = {
  showBattle: boolean
  /** Seleção de quem abre a Rodada 1 -- mesmo padrão visual do round 3, sem VersusScene antes. */
  showRound1Selection: boolean
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
 * A Rodada 1 vai direto pra tela de seleção (DuoSelectionScene) assim que
 * `match && !round` -- sem VersusScene intermediária. BattleScene mounts
 * for fight + punch/KO holds.
 */
export function resolveScoreboardLayers(input: {
  screen: ScoreboardProjection['screen']
  hasVersus: boolean
  koHold: boolean
  round3Hold: boolean
}): ScoreboardLayerFlags {
  const { screen, hasVersus, koHold, round3Hold } = input

  const showRound1Selection = hasVersus && screen === 'versus'

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
    showRound1Selection,
    showRound3Selection,
    showDuoQualified,
    battleScreen,
    forceMatchFinish: screen === 'match_win' && koHold,
    forceRoundWin: screen === 'round3' && round3Hold,
  }
}