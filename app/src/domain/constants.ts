export const SCHEMA_VERSION = 1
export const PARTICIPANT_COUNT = 32
export const MAX_REGISTERED_PARTICIPANTS = 64
export const TEAM_COUNT = 16
export const MEMBERS_PER_TEAM = 2
export const OITAVAS_MATCH_COUNT = 8
export const WINS_TO_TAKE_MATCH = 2
export const MAX_ROUNDS = 3

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
