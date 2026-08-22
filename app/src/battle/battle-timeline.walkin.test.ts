import { describe, expect, it } from 'vitest'
import {
  APPROACH_PX,
  WALK_IN_MS,
  buildMatchFinishTimeline,
  buildRoundWinTimeline,
} from './battle-timeline.ts'

/** Walk-in attack contract: walk + advance → punch → walk back to rest. */
describe('battle timelines — walk-in attack', () => {
  it('exports sane movement constants (~6 walk steps across the widened gap)', () => {
    expect(APPROACH_PX).toBeGreaterThanOrEqual(250)
    // 5fps walk → 200ms/frame; ~6 steps ≈ 1680ms.
    expect(WALK_IN_MS).toBeGreaterThanOrEqual(1600)
    expect(WALK_IN_MS).toBeLessThanOrEqual(1800)
  })

  for (const build of [buildRoundWinTimeline, (w: 'left' | 'right') => buildMatchFinishTimeline(w, '2-1')]) {
    it(`${build === buildRoundWinTimeline ? 'round win' : 'match finish'}: attacker walks in before punching and returns`, () => {
      const cues = build('left')

      const walkIn = cues.find((c) => c.type === 'fighter' && c.side === 'left' && c.state === 'walk')
      const advanceIn = cues.find((c) => c.type === 'advance' && c.side === 'left')
      const attack = cues.find((c) => c.type === 'fighter' && c.side === 'left' && c.state === 'attack')
      const impact = cues.find((c) => c.type === 'fx' && c.name === 'impact.heavy')
      const hurt = cues.find((c) => c.type === 'fighter' && c.side === 'right' && c.state === 'hurt')
      const advanceBack = cues.find((c) => c.type === 'advance' && c.side === null)

      expect(walkIn?.at).toBe(0)
      expect(advanceIn?.at).toBe(0)
      // Punch only lands after the walk-in completes.
      expect(attack?.at).toBe(WALK_IN_MS)
      expect(impact!.at).toBeGreaterThan(WALK_IN_MS)
      expect(hurt!.at).toBeGreaterThan(WALK_IN_MS)
      // Attacker resets to rest position after the exchange.
      expect(advanceBack).toBeDefined()
      expect(advanceBack!.at).toBeGreaterThan(impact!.at)
    })
  }
})
