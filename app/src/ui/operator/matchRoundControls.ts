import { formatRaceTime } from '../../domain/time.ts'
import type { Round, RoundStatus } from '../../domain/types.ts'

/** Human-readable round phases for the operator console (never dump raw enums). */
export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  awaiting_target: 'Aguardando tempo-alvo',
  awaiting_attempts: 'Aguardando tempos A/B',
  ready_to_calculate: 'Pronto para calcular',
  calculated: 'Calculado — conferir',
  revealed: 'Revelado no telão',
  confirmed: 'Rodada confirmada',
  tie: 'Empate de diferença',
}

export interface MatchRoundControls {
  statusLabel: string
  hint: string
  canSetTarget: boolean
  canAssignManual: boolean
  canAssignA: boolean
  canAssignB: boolean
  canAssignFromCapture: boolean
  canResolveRound: boolean
  canStartTiebreaker: boolean
  hasAttemptA: boolean
  hasAttemptB: boolean
  targetLabel: string | null
}

/**
 * UI enablement / hints derived from domain round state.
 * Domain still validates every command; this only prevents confusing clicks.
 */
export function deriveMatchRoundControls(round: Round | null | undefined): MatchRoundControls {
  if (!round) {
    return {
      statusLabel: 'Sem rodada ativa',
      hint: 'Inicie o confronto e confirme os jogadores da rodada.',
      canSetTarget: false,
      canAssignManual: false,
      canAssignA: false,
      canAssignB: false,
      canAssignFromCapture: false,
      canResolveRound: false,
      canStartTiebreaker: false,
      hasAttemptA: false,
      hasAttemptB: false,
      targetLabel: null,
    }
  }

  const hasTarget = round.targetTimeMs !== null
  const hasAttemptA = Boolean(round.attemptA)
  const hasAttemptB = Boolean(round.attemptB)
  const canSetTarget =
    round.status === 'awaiting_target' || round.status === 'awaiting_attempts'
  const assignPhase =
    round.status === 'awaiting_attempts' || round.status === 'ready_to_calculate'
  const canAssignManual = assignPhase && hasTarget

  return {
    statusLabel: ROUND_STATUS_LABEL[round.status] ?? round.status,
    hint: buildRoundHint(round, hasTarget, hasAttemptA, hasAttemptB),
    canSetTarget,
    canAssignManual,
    canAssignA: canAssignManual && Boolean(round.participantAId),
    canAssignB: canAssignManual && Boolean(round.participantBId),
    canAssignFromCapture: canAssignManual,
    canResolveRound: round.status === 'ready_to_calculate',
    canStartTiebreaker: round.status === 'tie',
    hasAttemptA,
    hasAttemptB,
    targetLabel: hasTarget && round.targetTimeMs !== null
      ? formatRaceTime(round.targetTimeMs)
      : null,
  }
}

function buildRoundHint(
  round: Round,
  hasTarget: boolean,
  hasAttemptA: boolean,
  hasAttemptB: boolean,
): string {
  switch (round.status) {
    case 'awaiting_target':
      return 'Defina o tempo-alvo (ou use Aleatório) antes de atribuir tentativas.'
    case 'awaiting_attempts': {
      if (!hasTarget) return 'Defina o tempo-alvo antes de atribuir tentativas.'
      const missing: string[] = []
      if (!hasAttemptA) missing.push('A')
      if (!hasAttemptB) missing.push('B')
      if (missing.length === 0) return 'Tempos atribuídos — liberando cálculo…'
      if (missing.length === 2) return 'Falta atribuir tempo aos lados A e B.'
      return `Falta atribuir tempo ao lado ${missing[0]}.`
    }
    case 'ready_to_calculate':
      return 'Ambos os tempos atribuídos. Calcular revela no telão e confirma a rodada.'
    case 'tie':
      return 'Empate de diferença: placar não muda. Use Desempate para nova tentativa.'
    case 'calculated':
      return 'Resultado calculado — confirme no fluxo unificado ou revise antes.'
    case 'revealed':
      return 'Tempos revelados no telão — confirme a rodada se ainda não confirmou.'
    case 'confirmed':
      return 'Rodada confirmada. Avance para a próxima etapa do confronto.'
    default:
      return ''
  }
}

/** Validate with domain parse; returns error string or null when ok and > 0. */
export function validatePositiveRaceTimeInput(
  input: string,
  parse: (value: string) => number | null,
): { seconds: number; error: null } | { seconds: null; error: string } {
  const seconds = parse(input)
  if (seconds === null) {
    return { seconds: null, error: 'Formato inválido. Use MM:SS:CS (ex.: 00:01:50).' }
  }
  if (!(seconds > 0)) {
    return { seconds: null, error: 'Tempo deve ser maior que zero.' }
  }
  return { seconds, error: null }
}
