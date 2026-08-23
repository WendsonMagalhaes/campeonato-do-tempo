import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../domain/constants.ts'
import { DEMO_PARTICIPANTS } from '../domain/seed.ts'
import type { TournamentState } from '../domain/types.ts'
import { migrateTournamentState } from './migrateState.ts'

/** Shape de participante salvo antes de campos serem adicionados (ex: fightPhotoAssetId, fighterVariant).
 *  Usado só nos testes de migração — dado real legado pode não ter esses campos. */
type LegacyParticipant = Partial<TournamentState['participants'][number]> &
  Pick<TournamentState['participants'][number], 'id' | 'name'>

function baseState(participants: LegacyParticipant[]): TournamentState {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'tour-test',
    name: 'Teste',
    status: 'setup',
    participants: participants as TournamentState['participants'],
    teams: [],
    matches: [],
    rounds: [],
    detectedValues: [],
    activeMatchId: null,
    activeRoundId: null,
    championTeamId: null,
    bracketSeed: null,
    bracketConfirmed: false,
  }
}

describe('migrateTournamentState / fighterVariant', () => {
  it('só preenche campo ausente — não sobrescreve female salva', () => {
    const migrated = migrateTournamentState(
      baseState([
        { id: 'p1', name: 'Custom', photoAssetId: null, fighterVariant: 'female' },
        { id: 'p2', name: 'SemCampo', photoAssetId: null },
      ]),
    )
    expect(migrated.participants[0]?.fighterVariant).toBe('female')
    expect(migrated.participants[1]?.fighterVariant).toBe('male')
  })

  it('repara roster demo legado index%2 (Ana deixa de ser male)', () => {
    const legacy = DEMO_PARTICIPANTS.map((entry, index) => ({
      id: `p_${index}`,
      name: entry.name,
      photoAssetId: null,
      fighterVariant: (index % 2 === 0 ? 'male' : 'female') as 'male' | 'female',
    }))
    expect(legacy.find((p) => p.name === 'Ana')?.fighterVariant).toBe('male')
    expect(legacy.find((p) => p.name === 'Alexandre')?.fighterVariant).toBe('female')

    const migrated = migrateTournamentState(baseState(legacy))
    const byName = Object.fromEntries(migrated.participants.map((p) => [p.name, p.fighterVariant]))
    expect(byName.Ana).toBe('female')
    expect(byName.Alexandre).toBe('male')
    expect(byName.João).toBe('male')
    expect(byName.Livia).toBe('female')
  })

  it('repara demo todo-male (soft-migrate antigo) sem forçar male sobre female curada', () => {
    const allMale = DEMO_PARTICIPANTS.map((entry, index) => ({
      id: `p_${index}`,
      name: entry.name,
      photoAssetId: null,
      fighterVariant: 'male' as const,
    }))
    const migrated = migrateTournamentState(baseState(allMale))
    expect(migrated.participants.find((p) => p.name === 'Livia')?.fighterVariant).toBe('female')
    expect(migrated.participants.find((p) => p.name === 'Ana')?.fighterVariant).toBe('female')
    expect(migrated.participants.find((p) => p.name === 'João')?.fighterVariant).toBe('male')
  })

  it('não altera roster custom com female salva', () => {
    const custom = migrateTournamentState(
      baseState([
        { id: 'a', name: 'Alex', photoAssetId: null, fighterVariant: 'female' },
        { id: 'b', name: 'Blake', photoAssetId: null, fighterVariant: 'male' },
      ]),
    )
    expect(custom.participants[0]?.fighterVariant).toBe('female')
    expect(custom.participants[1]?.fighterVariant).toBe('male')
  })

  it('repara chave com awaiting_confirmation órfão ao carregar', () => {
    const state = baseState([])
    state.status = 'in_progress'
    state.teams = [
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
    ]
    state.matches = [
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
    ]
    const migrated = migrateTournamentState(state)
    expect(migrated.matches.find((m) => m.id === 'oitavas-0')?.status).toBe('completed')
    expect(migrated.matches.find((m) => m.id === 'quartas-0')?.teamAId).toBe('w1')
  })
})