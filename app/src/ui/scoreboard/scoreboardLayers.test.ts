import { describe, expect, it } from 'vitest'
import { resolveScoreboardLayers } from './scoreboardLayers.ts'

describe('resolveScoreboardLayers', () => {
  it('holds battle on round3 until round3Hold clears (R2 punch before selection)', () => {
    const holding = resolveScoreboardLayers({
      screen: 'round3',
      hasVersus: true,
      koHold: false,
      round3Hold: true,
    })
    expect(holding.showBattle).toBe(true)
    expect(holding.showRound3Selection).toBe(false)
    expect(holding.forceRoundWin).toBe(true)
    expect(holding.forceMatchFinish).toBe(false)
    expect(holding.battleScreen).toBe('round')

    const after = resolveScoreboardLayers({
      screen: 'round3',
      hasVersus: true,
      koHold: false,
      round3Hold: false,
    })
    expect(after.showBattle).toBe(false)
    expect(after.showRound3Selection).toBe(true)
    expect(after.forceRoundWin).toBe(false)
  })

  it('holds battle on match_win until koHold clears (KO before duo-qualified)', () => {
    const holding = resolveScoreboardLayers({
      screen: 'match_win',
      hasVersus: true,
      koHold: true,
      round3Hold: false,
    })
    expect(holding.showBattle).toBe(true)
    expect(holding.showDuoQualified).toBe(false)
    expect(holding.forceMatchFinish).toBe(true)
    expect(holding.forceRoundWin).toBe(false)

    const after = resolveScoreboardLayers({
      screen: 'match_win',
      hasVersus: true,
      koHold: false,
      round3Hold: false,
    })
    expect(after.showBattle).toBe(false)
    expect(after.showDuoQualified).toBe(true)
  })

  it('keeps VersusScene on versus and BattleScene on round (tempos ocultos)', () => {
    const versus = resolveScoreboardLayers({
      screen: 'versus',
      hasVersus: true,
      koHold: false,
      round3Hold: false,
    })
    expect(versus.showVersus).toBe(true)
    expect(versus.showBattle).toBe(false)

    const round = resolveScoreboardLayers({
      screen: 'round',
      hasVersus: true,
      koHold: false,
      round3Hold: false,
    })
    expect(round.showVersus).toBe(false)
    expect(round.showBattle).toBe(true)
    expect(round.showRound3Selection).toBe(false)
  })
})
