import { describe, expect, it } from 'vitest'
import { BATTLE_CROWD_GROUPS } from './CrowdLayer.tsx'
import { FIGHTER_DRAW } from '../copa-ui/layouts/battleGeometry.ts'

/**
 * After coldroom full-BG crowd (Crowd Feature v2), battle must NOT overlay
 * the old pixel ground groups (stairs / chair). Mezanino crowd lives in BG.
 */
describe('battle crowd layout (retired ground overlays)', () => {
  it('does not register ground crowd groups for BattleScene', () => {
    expect(BATTLE_CROWD_GROUPS).toEqual([])
  })

  it('keeps fighter draw large enough vs photoreal mezanino crowd', () => {
    expect(FIGHTER_DRAW.w).toBeGreaterThanOrEqual(560)
    expect(FIGHTER_DRAW.h).toBe(FIGHTER_DRAW.w)
  })
})
