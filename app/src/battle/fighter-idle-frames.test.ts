import { describe, expect, it } from 'vitest'
import { CUSTOM_ANIMATIONS, fighterAnimation } from './FighterSprite.tsx'

describe('fighter idle frames', () => {
  it('all four variants breathe on a two-frame fight-pose idle', () => {
    for (const key of ['male_blue', 'male_red', 'female_blue', 'female_red']) {
      const idle = fighterAnimation(key, 'idle')
      expect(idle.frames).toEqual(['idle_01', 'idle_02'])
      expect(idle.loop).toBe(true)
      expect(idle.fps).toBe(3)
    }
  })

  it('custom participant animations have stable two-frame idle and walk definitions', () => {
    expect(CUSTOM_ANIMATIONS.idle.frames).toEqual(['idle_01', 'idle_02'])
    expect(CUSTOM_ANIMATIONS.idle.loop).toBe(true)
    expect(CUSTOM_ANIMATIONS.idle.fps).toBe(3)
    expect(CUSTOM_ANIMATIONS.walk.frames).toEqual(['walk_01', 'walk_02'])
    expect(CUSTOM_ANIMATIONS.walk.loop).toBe(true)
    expect(CUSTOM_ANIMATIONS.walk.fps).toBe(5)
  })

  it('idle never borrows walk frames (walk-in-place regression guard)', () => {
    for (const key of ['male_blue', 'male_red', 'female_blue', 'female_red']) {
      const idle = fighterAnimation(key, 'idle')
      expect(idle.frames.some((frame) => frame.startsWith('walk_'))).toBe(false)
    }
  })
})
