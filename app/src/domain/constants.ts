import type { Stage } from './types.ts'

export const SCHEMA_VERSION = 1
export const PARTICIPANT_COUNT = 32
export const MAX_REGISTERED_PARTICIPANTS = 64
export const TEAM_COUNT = 16
export const MEMBERS_PER_TEAM = 2
export const OITAVAS_MATCH_COUNT = 8

/**
 * Vitórias necessárias para fechar o confronto.
 * Final é melhor de 5 (3 vitórias); demais fases são melhor de 3 (2 vitórias).
 */
export function winsToTakeMatch(stage: Stage): number {
  return stage === 'final' ? 3 : 2
}

/** Nº máximo de rodadas possíveis no confronto (2 * vitórias - 1). */
export function maxRoundsForMatch(stage: Stage): number {
  return winsToTakeMatch(stage) * 2 - 1
}

export const PRIZE = {
  oitavas: 100,
  quartas: 135,
  semifinais: 180,
  finalist: 285,
  champion: 500,
} as const

export const CHANNEL = {
  projection: 'cdt-scoreboard-projection',
  cinematic: 'cdt-cinematic',
} as const