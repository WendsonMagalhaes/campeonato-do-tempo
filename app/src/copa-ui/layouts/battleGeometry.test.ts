import { describe, expect, it } from 'vitest'
import {
  BATTLE,
  SCORE_PANEL_HOLES_PX,
  SCORE_PANEL_PNG,
  scorePanelHoleInBox,
} from './battleGeometry.ts'

describe('scorePanelHoleInBox', () => {
  it('maps measured PNG holes into the battle score box', () => {
    const left = scorePanelHoleInBox(SCORE_PANEL_HOLES_PX.leftScore, {
      x: 0,
      y: 0,
      w: BATTLE.score.w,
      h: BATTLE.score.h,
    })
    const center = scorePanelHoleInBox(SCORE_PANEL_HOLES_PX.centerRound, {
      x: 0,
      y: 0,
      w: BATTLE.score.w,
      h: BATTLE.score.h,
    })
    const right = scorePanelHoleInBox(SCORE_PANEL_HOLES_PX.rightScore, {
      x: 0,
      y: 0,
      w: BATTLE.score.w,
      h: BATTLE.score.h,
    })

    expect(SCORE_PANEL_PNG).toEqual({ w: 1482, h: 702 })
    expect(left.w).toBeGreaterThan(30)
    expect(left.h).toBeGreaterThan(30)
    expect(right.w).toBeGreaterThan(30)
    expect(center.w).toBeGreaterThan(left.w)
    expect(left.x + left.w).toBeLessThan(center.x)
    expect(center.x + center.w).toBeLessThan(right.x)
    expect(right.x + right.w).toBeLessThanOrEqual(BATTLE.score.w + 1)
  })

  it('reserves a large calloutOverlay distinct from the status roundTitle HUD slot', () => {
    expect(BATTLE.roundTitle.w).toBeGreaterThanOrEqual(700)
    expect(BATTLE.roundTitle.h).toBeGreaterThanOrEqual(80)
    // Status sits between shrunk score and lowered TEMPO ALVO (mezanino clearance).
    expect(BATTLE.roundTitle.y).toBeGreaterThan(BATTLE.score.y + BATTLE.score.h)
    expect(BATTLE.roundTitle.y + BATTLE.roundTitle.h).toBeLessThanOrEqual(BATTLE.target.y + 8)
    expect(BATTLE.calloutOverlay.w).toBeGreaterThan(BATTLE.roundTitle.w)
    expect(BATTLE.calloutOverlay.h).toBeGreaterThan(BATTLE.roundTitle.h * 3)
  })

  it('shrinks the score plate and drops TEMPO ALVO to clear mezanino faces', () => {
    // ~20% smaller than the previous 404×190 score box.
    expect(BATTLE.score.w).toBeLessThanOrEqual(340)
    expect(BATTLE.score.h).toBeLessThanOrEqual(160)
    // Mid-lower band: well below score, still above fighter tops (~408).
    expect(BATTLE.target.y).toBeGreaterThan(BATTLE.score.y + BATTLE.score.h + 120)
    expect(BATTLE.target.y + BATTLE.target.h).toBeLessThanOrEqual(BATTLE.leftFighter.y + 8)
  })

  it('widens rest-stance fighter centers after the 600px draw bump', () => {
    const leftCenter = BATTLE.leftFighter.x + BATTLE.leftFighter.w / 2
    const rightCenter = BATTLE.rightFighter.x + BATTLE.rightFighter.w / 2
    expect(rightCenter - leftCenter).toBeGreaterThanOrEqual(700)
    expect(BATTLE.rightFighter.x - (BATTLE.leftFighter.x + BATTLE.leftFighter.w)).toBeGreaterThanOrEqual(100)
  })
})
