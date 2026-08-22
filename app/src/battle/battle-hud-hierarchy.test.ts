import { describe, expect, it } from 'vitest'
import { BATTLE, BATTLE_HUD, FIGHTER_DRAW } from '../copa-ui/layouts/battleGeometry.ts'

describe('battle fighter draw vs coldroom BG', () => {
  it('uses the bumped coldroom fighter box (not the pre-v2 460px box)', () => {
    expect(FIGHTER_DRAW.w).toBe(600)
    expect(BATTLE.leftFighter.w).toBe(FIGHTER_DRAW.w)
    expect(BATTLE.rightFighter.h).toBe(FIGHTER_DRAW.h)
    expect(BATTLE.leftFighter.baselineY).toBe(1008)
    expect(BATTLE.leftFighter.baselineY - BATTLE.leftFighter.h).toBe(BATTLE.leftFighter.y)
  })
})

describe('battle HUD typography hierarchy (Font Fix v4)', () => {
  it('scores read larger than stage label; names are medium', () => {
    expect(BATTLE_HUD.scoreDigit.size).toBe('medium')
    expect(BATTLE_HUD.scoreDigit.scale).toBeGreaterThan(BATTLE_HUD.scoreRound.scale)
    expect(BATTLE_HUD.nameText.size).toBe('medium')
    expect(BATTLE_HUD.targetLabel.size).toBe('small')
    expect(BATTLE_HUD.targetValue.size).toBe('medium')
    expect(BATTLE_HUD.fighterTime.size).toBe('large')
  })

  it('score center uses quiet small scale suitable for stage-only labels', () => {
    // BattleScene passes versus.stage only (e.g. OITAVAS) — no " R2" suffix.
    expect(BATTLE_HUD.scoreRound.size).toBe('small')
    expect(BATTLE_HUD.scoreRound.scale).toBeLessThan(BATTLE_HUD.scoreDigit.scale)
  })

  it('defines reveal fighter time slots in the bottom corners', () => {
    expect(BATTLE.leftFighterTime.y).toBeGreaterThanOrEqual(880)
    expect(BATTLE.rightFighterTime.y).toBeGreaterThanOrEqual(880)
    expect(BATTLE.leftFighterTime.x + BATTLE.leftFighterTime.w).toBeLessThan(BATTLE.leftFighter.x + 80)
    expect(BATTLE.rightFighterTime.x).toBeGreaterThan(
      BATTLE.rightFighter.x + BATTLE.rightFighter.w - 80,
    )
  })

  it('keeps corner time boxes on rest-stance home X (independent of walk-in)', () => {
    // Geometry anchors only — BattleScene must not apply walk-in translateX to these boxes.
    expect(BATTLE.leftFighterTime.x).toBeLessThan(BATTLE.leftFighter.x)
    expect(BATTLE.rightFighterTime.x + BATTLE.rightFighterTime.w).toBeGreaterThan(
      BATTLE.rightFighter.x + BATTLE.rightFighter.w,
    )
  })
})
