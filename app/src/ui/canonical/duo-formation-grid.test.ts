import { describe, expect, it } from 'vitest'
import { buildFormationGrid, shuffleFormationOccupants } from './duo-formation-grid.ts'

describe('duo-formation-grid', () => {
  it('buildFormationGrid has 32 participant cells and fixed ? at 2,6', () => {
    const cells = buildFormationGrid()
    expect(cells).toHaveLength(33)
    const random = cells.find((c) => c.kind === 'random')
    expect(random).toEqual({ kind: 'random', row: 2, col: 6, label: '?' })
    const participants = cells.filter((c) => c.kind === 'participant')
    expect(participants).toHaveLength(32)
    expect(participants.map((c) => (c.kind === 'participant' ? c.participantIndex : -1))).toEqual(
      Array.from({ length: 32 }, (_, i) => i),
    )
  })

  it('shuffleFormationOccupants is presentation-only permutation of 32', () => {
    const ids = Array.from({ length: 32 }, (_, i) => `p${i}`)
    let seq = 0
    const random = () => {
      seq += 1
      return (seq % 7) / 7
    }
    const shuffled = shuffleFormationOccupants(ids, random)
    expect(shuffled).toHaveLength(32)
    expect([...shuffled].sort()).toEqual([...ids].sort())
    expect(shuffled).not.toEqual(ids)
  })

  it('shuffleFormationOccupants rejects non-32', () => {
    expect(() => shuffleFormationOccupants(['a', 'b'])).toThrow(/32/)
  })
})
