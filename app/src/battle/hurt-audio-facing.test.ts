import { describe, expect, it } from 'vitest'
import { shouldMirrorFighter } from './fighterFacing.ts'

describe('battle hurt audio / facing contracts', () => {
  it('keeps blue unmirrored on hurt after female_blue hurt normalize-to-right', () => {
    expect(shouldMirrorFighter('blue', 'female', 'idle')).toBe(false)
    expect(shouldMirrorFighter('blue', 'female', 'hurt')).toBe(false)
    expect(shouldMirrorFighter('red', 'female', 'attack')).toBe(true)
  })

  it('maps hurt vocal event from fighterVariant', () => {
    const eventFor = (variant: 'male' | 'female') =>
      variant === 'female' ? 'fighter.female.hurt' : 'fighter.male.hurt'
    expect(eventFor('female')).toBe('fighter.female.hurt')
    expect(eventFor('male')).toBe('fighter.male.hurt')
  })
})
