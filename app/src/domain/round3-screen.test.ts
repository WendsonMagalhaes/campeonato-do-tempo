import { describe, expect, it } from 'vitest'
import { handleCommand } from './engine.ts'
import { projectScoreboard } from './projections.ts'
import { applyDemoSetup, applyFullReveal } from './seed.ts'
import { createSeededRandom } from './state.ts'
import type { EngineDeps, TournamentState } from './types.ts'

function deps(seed = 7): EngineDeps {
  let n = 0
  return {
    random: createSeededRandom(seed),
    ids: {
      next(prefix: string) {
        n += 1
        return `${prefix}_${n}`
      },
    },
    clock: { now: () => '2026-08-13T00:00:00.000Z' },
  }
}

function playRound(
  state: TournamentState,
  d: EngineDeps,
  secondsA: number,
  secondsB: number,
  participantAId: string,
  participantBId: string,
): TournamentState {
  let next = handleCommand(state, { type: 'RegisterTargetTime', seconds: 1.5 }, d)
  next = handleCommand(next, { type: 'RegisterManualTime', participantId: participantAId, seconds: secondsA }, d)
  next = handleCommand(next, { type: 'RegisterManualTime', participantId: participantBId, seconds: secondsB }, d)
  next = handleCommand(next, { type: 'ResolveRound' }, d)
  return next
}

describe('scoreboard round3 selection screen', () => {
  it('projects round3 when match is 1-1 after R2 and R3 not created yet', () => {
    const d = deps()
    let state = applyFullReveal(applyDemoSetup(d), d)
    state = handleCommand(state, { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)
    const match = state.matches.find((item) => item.id === 'oitavas-0')
    if (!match?.teamAId || !match.teamBId) throw new Error('bracket incompleto')
    state = handleCommand(state, { type: 'StartMatch', matchId: match.id }, d)
    const teamA = state.teams.find((team) => team.id === match.teamAId)!
    const teamB = state.teams.find((team) => team.id === match.teamBId)!

    state = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    state = playRound(state, d, 1.4, 1.7, teamA.participant1Id, teamB.participant1Id)
    state = handleCommand(state, { type: 'StartRound2' }, d)
    state = playRound(state, d, 1.7, 1.4, teamA.participant2Id, teamB.participant2Id)

    expect(state.matches.find((m) => m.id === match.id)?.scoreA).toBe(1)
    expect(state.matches.find((m) => m.id === match.id)?.scoreB).toBe(1)

    const projection = projectScoreboard(state)
    expect(projection.screen).toBe('round3')
    expect(projection.versus).not.toBeNull()
    expect(projection.versus?.scoreA).toBe(1)
    expect(projection.versus?.scoreB).toBe(1)
    // R2 winner side must remain available so scoreboard can play round-win punch before R3 UI.
    expect(projection.versus?.roundWinnerSide).toBe('right')
    expect(projection.versus?.matchPoint).toBe(false)
    expect(projection.versus?.matchWinnerSide).toBeNull()
  })

  it('projects final match score and winner side on match_win', () => {
    const d = deps(11)
    let state = applyFullReveal(applyDemoSetup(d), d)
    state = handleCommand(state, { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)
    const match = state.matches.find((item) => item.id === 'oitavas-0')
    if (!match?.teamAId || !match.teamBId) throw new Error('bracket incompleto')
    state = handleCommand(state, { type: 'StartMatch', matchId: match.id }, d)
    const teamA = state.teams.find((team) => team.id === match.teamAId)!
    const teamB = state.teams.find((team) => team.id === match.teamBId)!

    state = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    state = playRound(state, d, 1.4, 1.7, teamA.participant1Id, teamB.participant1Id)
    state = handleCommand(state, { type: 'StartRound2' }, d)
    state = playRound(state, d, 1.4, 1.7, teamA.participant2Id, teamB.participant2Id)

    const projection = projectScoreboard(state)
    expect(projection.screen).toBe('match_win')
    expect(projection.versus?.scoreA).toBe(2)
    expect(projection.versus?.scoreB).toBe(0)
    expect(projection.versus?.matchWinnerSide).toBe('left')
    expect(projection.versus?.finalScoreLabel).toBe('2-0')
  })
})
