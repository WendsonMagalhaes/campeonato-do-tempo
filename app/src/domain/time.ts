import { PRIZE } from './constants.ts'
import type { Stage } from './types.ts'

export function startingPrize(): number {
  return PRIZE.oitavas
}

export function prizeAfterWinning(stage: Stage): number {
  switch (stage) {
    case 'oitavas':
      return PRIZE.quartas
    case 'quartas':
      return PRIZE.semifinais
    case 'semifinais':
      return PRIZE.finalist
    case 'final':
      return PRIZE.champion
  }
}

export function secondsToMs(seconds: number): number {
  return Math.round(seconds * 1000)
}

export function msToSeconds(ms: number): number {
  return ms / 1000
}

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0')
}

/**
 * Canonical race-timer presentation: `MM:SS:CS`.
 *
 * Domain stores integer milliseconds. Display uses centiseconds (hundredths)
 * in the third group — same precision as the former `toFixed(2)` labels,
 * without inventing a new tournament precision.
 *
 * Example: 1510 ms → `00:01:51`
 */
export function formatRaceTime(ms: number): string {
  const totalCs = Math.round(Math.abs(ms) / 10)
  const cs = totalCs % 100
  const totalSec = Math.floor(totalCs / 100)
  const ss = totalSec % 60
  const mm = Math.floor(totalSec / 60)
  return `${pad2(mm)}:${pad2(ss)}:${pad2(cs)}`
}

/** Empty / unknown race time placeholder (same shape as formatRaceTime). */
export const RACE_TIME_PLACEHOLDER = '--:--:--' as const

/** Inclusive lower bound for operator "Aleatório" race target (~1m20s). */
export const RANDOM_TARGET_MIN_MS = 80_000

/** Inclusive upper bound for operator "Aleatório" race target (~2m40s). */
export const RANDOM_TARGET_MAX_MS = 160_000

/**
 * Plausible live-event target in ms, snapped to centiseconds (10 ms).
 * Default range: 00:01:20–00:02:40. Inject `rng` for tests.
 */
export function randomRaceTargetMs(
  rng: () => number = Math.random,
  minMs: number = RANDOM_TARGET_MIN_MS,
  maxMs: number = RANDOM_TARGET_MAX_MS,
): number {
  if (!(maxMs >= minMs) || !Number.isFinite(minMs) || !Number.isFinite(maxMs)) {
    return Math.round(RANDOM_TARGET_MIN_MS / 10) * 10
  }
  const span = maxMs - minMs
  const raw = minMs + rng() * span
  return Math.round(raw / 10) * 10
}

/** Canonical `MM:SS:CS` string for a random race target (fills operator input). */
export function randomRaceTargetFormatted(rng: () => number = Math.random): string {
  return formatRaceTime(randomRaceTargetMs(rng))
}

/**
 * Parse operator / UI time entry into seconds (float).
 * Accepts `MM:SS:CS` (canonical) and legacy decimal seconds (`1.50` / `1,50`).
 * Returns null when the string is not a finite non-negative duration.
 */
export function parseRaceTime(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const race = /^(\d{1,3}):(\d{1,2}):(\d{1,2})$/.exec(trimmed)
  if (race) {
    const mm = Number(race[1])
    const ss = Number(race[2])
    const cs = Number(race[3])
    if (!Number.isFinite(mm) || !Number.isFinite(ss) || !Number.isFinite(cs)) return null
    if (ss >= 60 || cs >= 100) return null
    return mm * 60 + ss + cs / 100
  }

  const legacy = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(legacy) || legacy < 0) return null
  return legacy
}

/**
 * @deprecated Prefer `formatRaceTime`. Alias kept so call sites migrate cleanly.
 * Still returns the canonical `MM:SS:CS` string (not comma-decimal).
 */
export function formatSeconds(ms: number): string {
  return formatRaceTime(ms)
}

export function formatPrize(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

export function absoluteDifference(observedMs: number, targetMs: number): number {
  return Math.abs(observedMs - targetMs)
}

/** Default duo label separator for new teams / display normalization. */
export const DUO_NAME_SEPARATOR = ' & ' as const

/** Normalize stored duo labels that still use legacy ` + ` to ` & `. */
export function formatDuoName(name: string): string {
  return name.replace(/\s\+\s/g, DUO_NAME_SEPARATOR)
}
