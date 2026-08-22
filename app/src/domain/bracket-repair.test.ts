import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from './constants.ts'
import { repairBracketProgression } from './bracket-repair.ts'
import type { TournamentState } from './types.ts'

function emptyState(overrides: Partial<TournamentState> = {}): TournamentState {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 't',
    name: 'Teste',
    status: 'in_progress',
    participants: [],
    teams: [
      {
        id: 'w1',
        name: 'W1',
        participant1Id: 'a',
        participant2Id: 'b',
        firstRevealParticipantId: 'a',
        revealOrder: 1,
        status: 'active',
        guaranteedPrize: 100,
      },
      {
        id: 'l1',
        name: 'L1',
        participant1Id: 'c',
        participant2Id: 'd',
        firstRevealParticipantId: 'c',
        revealOrder: 2,
        status: 'active',
        guaranteedPrize: 100,
      },
      {
        id: 'w2',
        name: 'W2',
        participant1Id: 'e',
        participant2Id: 'f',
        firstRevealParticipantId: 'e',
        revealOrder: 3,
        status: 'active',
        guaranteedPrize: 100,
      },
      {
        id: 'l2',
        name: 'L2',
        participant1Id: 'g',
        participant2Id: 'h',
        firstRevealParticipantId: 'g',
        revealOrder: 4,
        status: 'active',
        guaranteedPrize: 100,
      },
    ],
    matches: [],
    rounds: [],
    detectedValues: [],
    activeMatchId: null,
    activeRoundId: null,
    bracketSeed: 'x',
    bracketConfirmed: true,
    championTeamId: null,
    ...overrides,
  }
}

describe('repairBracketProgression', () => {
  it('finaliza awaiting_confirmation órfãos e preenche slots das quartas', () => {
    const state = emptyState({
      activeMatchId: null,
      matches: [
        {
          id: 'oitavas-0',
          stage: 'oitavas',
          position: 0,
          teamAId: 'w1',
          teamBId: 'l1',
          scoreA: 2,
          scoreB: 0,
          status: 'awaiting_confirmation',
          winnerTeamId: 'w1',
        },
        {
          id: 'oitavas-1',
          stage: 'oitavas',
          position: 1,
          teamAId: 'w2',
          teamBId: 'l2',
          scoreA: 0,
          scoreB: 2,
          status: 'awaiting_confirmation',
          winnerTeamId: 'w2',
        },
        {
          id: 'quartas-0',
          stage: 'quartas',
          position: 0,
          teamAId: null,
          teamBId: null,
          scoreA: 0,
          scoreB: 0,
          status: 'pending',
          winnerTeamId: null,
        },
      ],
    })

    const repaired = repairBracketProgression(state)
    expect(repaired.matches.find((m) => m.id === 'oitavas-0')?.status).toBe('completed')
    expect(repaired.matches.find((m) => m.id === 'oitavas-1')?.status).toBe('completed')
    expect(repaired.matches.find((m) => m.id === 'quartas-0')?.teamAId).toBe('w1')
    expect(repaired.matches.find((m) => m.id === 'quartas-0')?.teamBId).toBe('w2')
    expect(repaired.teams.find((t) => t.id === 'l1')?.status).toBe('eliminated')
    expect(repaired.teams.find((t) => t.id === 'l2')?.status).toBe('eliminated')
  })

  it('reaplica placeWinner em confrontos já completed com slot pai vazio', () => {
    const state = emptyState({
      matches: [
        {
          id: 'oitavas-0',
          stage: 'oitavas',
          position: 0,
          teamAId: 'w1',
          teamBId: 'l1',
          scoreA: 2,
          scoreB: 0,
          status: 'completed',
          winnerTeamId: 'w1',
        },
        {
          id: 'quartas-0',
          stage: 'quartas',
          position: 0,
          teamAId: null,
          teamBId: 'w2',
          scoreA: 0,
          scoreB: 0,
          status: 'pending',
          winnerTeamId: null,
        },
      ],
    })
    const repaired = repairBracketProgression(state)
    expect(repaired.matches.find((m) => m.id === 'quartas-0')?.teamAId).toBe('w1')
    expect(repaired.matches.find((m) => m.id === 'quartas-0')?.teamBId).toBe('w2')
  })
})
