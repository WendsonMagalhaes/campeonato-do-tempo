import { describe, expect, it } from 'vitest'
import { battleCallouts } from './battle-assets.ts'
import { buildRoundIntroPlan } from './useBattleDirector.ts'

describe('buildRoundIntroPlan', () => {
  it('schedules ROUND → FIGHT → clear for R1, R2, and final', () => {
    for (const n of [1, 2, 3] as const) {
      const plan = buildRoundIntroPlan(n)
      expect(plan.roundCalloutSrc).toMatch(/round_|final_round/)
      expect(plan.fightCalloutSrc).toBe(battleCallouts.fight)
      expect(plan.fightAtMs).toBeGreaterThan(1000)
      expect(plan.clearAtMs).toBe(plan.fightAtMs + 1400)
      expect(plan.roundEvent).toMatch(/^announcer\.(round1|round2|finalRound)$/)
    }
  })

  it('maps events and callouts per round number', () => {
    expect(buildRoundIntroPlan(1)).toMatchObject({
      roundEvent: 'announcer.round1',
      roundCalloutSrc: '/assets/ui/round_1.png',
    })
    expect(buildRoundIntroPlan(2)).toMatchObject({
      roundEvent: 'announcer.round2',
      roundCalloutSrc: '/assets/ui/round_2.png',
    })
    expect(buildRoundIntroPlan(3)).toMatchObject({
      roundEvent: 'announcer.finalRound',
      roundCalloutSrc: '/assets/ui/final_round.png',
    })
  })
})
