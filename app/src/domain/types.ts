export type ParticipantId = string
export type TeamId = string
export type MatchId = string
export type RoundId = string
export type DetectedValueId = string
export type AttemptId = string

export type Stage = 'oitavas' | 'quartas' | 'semifinais' | 'final'

export type TournamentStatus =
  | 'setup'
  | 'revealing_teams'
  | 'drawing_bracket'
  | 'bracket_drawn'
  | 'in_progress'
  | 'finished'

export type TeamStatus = 'registered' | 'revealed' | 'active' | 'eliminated' | 'champion'

export type MatchStatus = 'pending' | 'active' | 'awaiting_confirmation' | 'completed'

export type RoundStatus =
  | 'awaiting_target'
  | 'awaiting_attempts'
  | 'ready_to_calculate'
  | 'calculated'
  | 'revealed'
  | 'confirmed'
  | 'tie'

export type DetectedStatus = 'pending' | 'assigned' | 'discarded'

export type AttemptSource = 'timer_capture' | 'manual'

/** Explicit sprite body type for battle scene. Never infer from participant name. */
export type FighterVariant = 'male' | 'female'

export interface Participant {
  id: ParticipantId
  name: string
  photoAssetId: string | null
  fighterVariant: FighterVariant
  slug?: string
  displayName?: string
  avatar?: string | null
  bodyImage?: string | null
}

export interface Team {
  id: TeamId
  name: string
  participant1Id: ParticipantId
  participant2Id: ParticipantId
  firstRevealParticipantId: ParticipantId
  revealOrder: number
  status: TeamStatus
  guaranteedPrize: number
}

export interface Match {
  id: MatchId
  stage: Stage
  position: number
  teamAId: TeamId | null
  teamBId: TeamId | null
  scoreA: number
  scoreB: number
  status: MatchStatus
  winnerTeamId: TeamId | null
}

export interface AssignedAttempt {
  id: AttemptId
  detectedValueId: DetectedValueId | null
  participantId: ParticipantId
  valueMs: number
  source: AttemptSource
}

export interface Round {
  id: RoundId
  matchId: MatchId
  number: 1 | 2 | 3
  targetTimeMs: number | null
  participantAId: ParticipantId | null
  participantBId: ParticipantId | null
  attemptA: AssignedAttempt | null
  attemptB: AssignedAttempt | null
  status: RoundStatus
  winnerTeamId: TeamId | null
  differenceAMs: number | null
  differenceBMs: number | null
}

export interface DetectedTimerValue {
  id: DetectedValueId
  valueMs: number
  confidence: number
  capturedAt: string
  status: DetectedStatus
  frameId: string | null
}

export interface TournamentState {
  schemaVersion: number
  id: string
  name: string
  status: TournamentStatus
  participants: Participant[]
  teams: Team[]
  matches: Match[]
  rounds: Round[]
  detectedValues: DetectedTimerValue[]
  activeMatchId: MatchId | null
  activeRoundId: RoundId | null
  bracketSeed: string | null
  bracketConfirmed: boolean
  championTeamId: TeamId | null
}

export interface RandomPort {
  shuffle: <T>(items: readonly T[]) => T[]
  seedLabel: () => string
}

export interface IdPort {
  next: (prefix: string) => string
}

export interface ClockPort {
  now: () => string
}

export interface EngineDeps {
  random: RandomPort
  ids: IdPort
  clock: ClockPort
}
