import type {
  Participant,
  ParticipantId,
  AssignedAttempt,
  DetectedTimerValue,
} from './types.ts'

export type IndividualMatchId = string
export type IndividualRoundId = string

export type IndividualTournamentStatus =
  | 'setup'
  | 'revealing_matchups'
  | 'in_progress'
  | 'finished'

export type IndividualMatchStatus = 'pending' | 'active' | 'awaiting_confirmation' | 'completed'

export type IndividualRoundStatus =
  | 'awaiting_target'
  | 'awaiting_attempts'
  | 'ready_to_calculate'
  | 'revealed'
  | 'confirmed'
  | 'tie'

/** Confronto 1x1 pré-definido manualmente pelo operador (nunca sorteado ao vivo). */
export interface IndividualMatch {
  id: IndividualMatchId
  /** Rótulo livre (ex.: "Confronto 1", "Chave A x B"). Não representa fase de mata-mata. */
  label: string
  /** Ordem de exibição/revelação no telão. */
  position: number
  participantAId: ParticipantId
  participantBId: ParticipantId
  scoreA: number
  scoreB: number
  status: IndividualMatchStatus
  winnerParticipantId: ParticipantId | null
  /** true depois que o telão já encenou a revelação deste confronto. */
  revealed: boolean
}

/** Rodada de um confronto individual. Sempre os mesmos 2 participantes do match (sem rotação de dupla). */
export interface IndividualRound {
  id: IndividualRoundId
  matchId: IndividualMatchId
  /** Melhor de 3 fixo: nunca passa de 3. */
  number: 1 | 2 | 3
  targetTimeMs: number | null
  attemptA: AssignedAttempt | null
  attemptB: AssignedAttempt | null
  status: IndividualRoundStatus
  winnerParticipantId: ParticipantId | null
  differenceAMs: number | null
  differenceBMs: number | null
}

export interface IndividualTournamentState {
  schemaVersion: number
  id: string
  name: string
  status: IndividualTournamentStatus
  participants: Participant[]
  matches: IndividualMatch[]
  rounds: IndividualRound[]
  detectedValues: DetectedTimerValue[]
  activeMatchId: IndividualMatchId | null
  activeRoundId: IndividualRoundId | null
  /** null enquanto não houver um encerramento explícito (modo individual não tem "campeã" automática). */
  championParticipantId: ParticipantId | null
}

export const INDIVIDUAL_WINS_TO_TAKE_MATCH = 2
export const INDIVIDUAL_MAX_ROUNDS = 3