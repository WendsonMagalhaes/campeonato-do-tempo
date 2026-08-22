import { describe, expect, it } from 'vitest'
import { bakedFacing, desiredFacing, shouldMirrorFighter } from './fighterFacing.ts'
import type { FighterAnim } from './battle-assets.ts'

const ANIMS: FighterAnim[] = ['idle', 'walk', 'attack', 'hurt', 'fall', 'lying', 'victory']

describe('fighter facing', () => {
  it('desires blue→right and red→left (toward opponent)', () => {
    expect(desiredFacing('blue')).toBe('right')
    expect(desiredFacing('red')).toBe('left')
  })

  it('mirrors only red when art is right-baked (incl. female_blue hurt)', () => {
    for (const anim of ANIMS) {
      expect(bakedFacing('blue', 'female', anim)).toBe('right')
      expect(shouldMirrorFighter('blue', 'female', anim)).toBe(false)
      expect(shouldMirrorFighter('blue', 'male', anim)).toBe(false)
      expect(shouldMirrorFighter('red', 'female', anim)).toBe(true)
      expect(shouldMirrorFighter('red', 'male', anim)).toBe(true)
    }
  })

  it('keeps mirror stable across female_blue hurt→fall→lying (no flicker)', () => {
    const mirrors = (['hurt', 'fall', 'lying'] as FighterAnim[]).map((anim) =>
      shouldMirrorFighter('blue', 'female', anim),
    )
    expect(new Set(mirrors).size).toBe(1)
    expect(mirrors[0]).toBe(false)
  })

  it('keeps mirror stable across female_red hurt→fall→lying (right-baked hurt_02)', () => {
    const mirrors = (['hurt', 'fall', 'lying'] as FighterAnim[]).map((anim) =>
      shouldMirrorFighter('red', 'female', anim),
    )
    expect(new Set(mirrors).size).toBe(1)
    expect(mirrors[0]).toBe(true)
  })
})
