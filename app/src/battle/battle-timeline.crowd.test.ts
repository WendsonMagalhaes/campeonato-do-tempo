import { describe, expect, it } from 'vitest'
import { buildMatchFinishTimeline, buildRoundWinTimeline, WALK_IN_MS } from '../battle/battle-timeline.ts'

describe('battle timelines — crowd cues', () => {
  it('round win fires crowd.cheerShort with score reveal', () => {
    const cues = buildRoundWinTimeline('left')
    expect(cues.some((c) => c.type === 'audio' && c.event === 'crowd.cheerShort')).toBe(true)
  })

  it('match finish fires crowd cheer on victory', () => {
    const cues = buildMatchFinishTimeline('right', '2-0')
    const cheer = cues.find((c) => c.type === 'audio' && c.event === 'crowd.cheerBig')
    expect(cheer).toBeDefined()
    // Victory follows walk-back after KO announce (relative to WALK_IN_MS).
    expect(cheer?.at).toBe(WALK_IN_MS + 720 + 450 + WALK_IN_MS + 60)
  })
})

describe('battle timelines — callout assets', () => {
  it('match finish uses ko.png callout instead of BitmapText K.O.', () => {
    const cues = buildMatchFinishTimeline('left', '2-1')
    const ko = cues.find((c) => c.type === 'callout' && c.src?.includes('ko.png'))
    expect(ko).toBeDefined()
    expect(ko?.at).toBe(WALK_IN_MS + 720)
    expect(cues.some((c) => c.type === 'overlay' && c.text === 'K.O.')).toBe(false)
  })

  it('2-0 clears KO callout then shows PERFECT BitmapText', () => {
    const cues = buildMatchFinishTimeline('right', '2-0')
    const perfectAt = WALK_IN_MS + 720 + 380
    const clear = cues.find((c) => c.type === 'callout' && c.src === null && c.at === perfectAt)
    const perfect = cues.find((c) => c.type === 'overlay' && c.text === 'PERFECT')
    expect(clear).toBeDefined()
    expect(perfect).toBeDefined()
  })

  it('round win does not emit KO callout', () => {
    const cues = buildRoundWinTimeline('left')
    expect(cues.some((c) => c.type === 'callout')).toBe(false)
  })
})
