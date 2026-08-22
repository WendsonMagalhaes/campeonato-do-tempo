import { describe, expect, it } from 'vitest'
import {
  DUO_NAME_SEPARATOR,
  formatDuoName,
  formatRaceTime,
  formatSeconds,
  parseRaceTime,
  RANDOM_TARGET_MAX_MS,
  RANDOM_TARGET_MIN_MS,
  randomRaceTargetFormatted,
  randomRaceTargetMs,
  RACE_TIME_PLACEHOLDER,
  secondsToMs,
} from './time.ts'

describe('formatRaceTime', () => {
  it('formats ms as MM:SS:CS (centiseconds)', () => {
    expect(formatRaceTime(0)).toBe('00:00:00')
    expect(formatRaceTime(1510)).toBe('00:01:51')
    expect(formatRaceTime(1500)).toBe('00:01:50')
    expect(formatRaceTime(61_230)).toBe('01:01:23')
    expect(formatRaceTime(secondsToMs(1.56))).toBe('00:01:56')
  })

  it('uses absolute value for differences', () => {
    expect(formatRaceTime(-50)).toBe('00:00:05')
  })

  it('formatSeconds aliases formatRaceTime (no comma-decimal)', () => {
    expect(formatSeconds(1510)).toBe('00:01:51')
    expect(formatSeconds(1510)).not.toContain(',')
  })
})

describe('parseRaceTime', () => {
  it('parses MM:SS:CS into seconds', () => {
    expect(parseRaceTime('00:01:51')).toBeCloseTo(1.51, 5)
    expect(parseRaceTime('01:01:23')).toBeCloseTo(61.23, 5)
    expect(parseRaceTime('0:1:5')).toBeCloseTo(1.05, 5)
  })

  it('rejects invalid race fields', () => {
    expect(parseRaceTime('00:60:00')).toBeNull()
    expect(parseRaceTime('00:00:100')).toBeNull()
    expect(parseRaceTime('')).toBeNull()
    expect(parseRaceTime('abc')).toBeNull()
  })

  it('accepts legacy decimal seconds', () => {
    expect(parseRaceTime('1.50')).toBeCloseTo(1.5, 5)
    expect(parseRaceTime('1,56')).toBeCloseTo(1.56, 5)
  })
})

describe('formatDuoName', () => {
  it('normalizes + to &', () => {
    expect(formatDuoName('Icaro + Joao')).toBe(`Icaro${DUO_NAME_SEPARATOR}Joao`)
    expect(formatDuoName('Iris & Jonas')).toBe('Iris & Jonas')
  })
})

describe('RACE_TIME_PLACEHOLDER', () => {
  it('matches MM:SS:CS shape', () => {
    expect(RACE_TIME_PLACEHOLDER).toBe('--:--:--')
  })
})

describe('randomRaceTargetMs', () => {
  it('samples within 00:01:20–00:02:40 snapped to CS', () => {
    expect(randomRaceTargetMs(() => 0)).toBe(RANDOM_TARGET_MIN_MS)
    expect(randomRaceTargetMs(() => 1)).toBe(RANDOM_TARGET_MAX_MS)
    expect(randomRaceTargetFormatted(() => 0.5)).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})
