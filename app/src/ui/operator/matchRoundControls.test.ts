import { describe, expect, it } from 'vitest'
import {
  RANDOM_TARGET_MAX_MS,
  RANDOM_TARGET_MIN_MS,
  formatRaceTime,
  parseRaceTime,
  randomRaceTargetFormatted,
  randomRaceTargetMs,
} from '../../domain/time.ts'
import type { Round } from '../../domain/types.ts'
import {
  deriveMatchRoundControls,
  validatePositiveRaceTimeInput,
} from './matchRoundControls.ts'

function baseRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'r1',
    matchId: 'm1',
    number: 1,
    targetTimeMs: null,
    participantAId: 'pA',
    participantBId: 'pB',
    attemptA: null,
    attemptB: null,
    status: 'awaiting_target',
    winnerTeamId: null,
    differenceAMs: null,
    differenceBMs: null,
    ...overrides,
  }
}

describe('randomRaceTargetMs', () => {
  it('stays within the live-event range and snaps to centiseconds', () => {
    for (const sample of [0, 0.25, 0.5, 0.75, 1]) {
      const ms = randomRaceTargetMs(() => sample)
      expect(ms).toBeGreaterThanOrEqual(RANDOM_TARGET_MIN_MS)
      expect(ms).toBeLessThanOrEqual(RANDOM_TARGET_MAX_MS)
      expect(ms % 10).toBe(0)
    }
  })

  it('formats as canonical MM:SS:CS', () => {
    const formatted = randomRaceTargetFormatted(() => 0)
    expect(formatted).toBe(formatRaceTime(RANDOM_TARGET_MIN_MS))
    expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(parseRaceTime(formatted)).not.toBeNull()
  })
})

describe('deriveMatchRoundControls', () => {
  it('blocks assign/resolve/tiebreaker while awaiting target', () => {
    const controls = deriveMatchRoundControls(baseRound())
    expect(controls.statusLabel).toBe('Aguardando tempo-alvo')
    expect(controls.canSetTarget).toBe(true)
    expect(controls.canAssignManual).toBe(false)
    expect(controls.canAssignA).toBe(false)
    expect(controls.canAssignB).toBe(false)
    expect(controls.canResolveRound).toBe(false)
    expect(controls.canStartTiebreaker).toBe(false)
    expect(controls.hint).toContain('tempo-alvo')
  })

  it('enables assign after target and reports which side is missing', () => {
    const controls = deriveMatchRoundControls(
      baseRound({
        status: 'awaiting_attempts',
        targetTimeMs: 110_000,
        attemptA: {
          id: 'a1',
          detectedValueId: null,
          participantId: 'pA',
          valueMs: 111_000,
          source: 'manual',
        },
      }),
    )
    expect(controls.canAssignManual).toBe(true)
    expect(controls.canAssignA).toBe(true)
    expect(controls.canAssignB).toBe(true)
    expect(controls.hasAttemptA).toBe(true)
    expect(controls.hasAttemptB).toBe(false)
    expect(controls.hint).toBe('Falta atribuir tempo ao lado B.')
    expect(controls.canResolveRound).toBe(false)
  })

  it('enables resolve only when ready_to_calculate', () => {
    const controls = deriveMatchRoundControls(
      baseRound({
        status: 'ready_to_calculate',
        targetTimeMs: 110_000,
        attemptA: {
          id: 'a1',
          detectedValueId: null,
          participantId: 'pA',
          valueMs: 111_000,
          source: 'manual',
        },
        attemptB: {
          id: 'a2',
          detectedValueId: null,
          participantId: 'pB',
          valueMs: 112_000,
          source: 'manual',
        },
      }),
    )
    expect(controls.canResolveRound).toBe(true)
    expect(controls.canStartTiebreaker).toBe(false)
    expect(controls.canAssignFromCapture).toBe(true)
  })

  it('enables desempate only on tie', () => {
    const controls = deriveMatchRoundControls(baseRound({ status: 'tie', targetTimeMs: 100_000 }))
    expect(controls.canStartTiebreaker).toBe(true)
    expect(controls.canResolveRound).toBe(false)
    expect(controls.canAssignManual).toBe(false)
  })
})

describe('validatePositiveRaceTimeInput', () => {
  it('rejects bad format and zero', () => {
    expect(validatePositiveRaceTimeInput('abc', parseRaceTime).error).toMatch(/inválido/i)
    expect(validatePositiveRaceTimeInput('00:00:00', parseRaceTime).error).toMatch(/maior que zero/i)
  })

  it('accepts canonical race time', () => {
    const ok = validatePositiveRaceTimeInput('00:01:50', parseRaceTime)
    expect(ok.error).toBeNull()
    expect(ok.seconds).toBeCloseTo(1.5, 5)
  })
})
