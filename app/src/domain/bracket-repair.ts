import { placeWinner } from './bracket.ts'
import { prizeAfterWinning } from './time.ts'
import type { Match, Stage, TournamentState } from './types.ts'

const STAGE_ORDER: Record<Stage, number> = {
  oitavas: 0,
  quartas: 1,
  semifinais: 2,
  final: 3,
}

function stageRank(stage: Stage): number {
  return STAGE_ORDER[stage]
}

/**
 * Apply classification side-effects for a match that already has a winner
 * (awaiting_confirmation or completed). Idempotent for prizes/elimination/slots.
 */
export function applyMatchClassification(state: TournamentState, match: Match): void {
  if (!match.winnerTeamId) return
  const winner = state.teams.find((team) => team.id === match.winnerTeamId)
  if (!winner) return
  const loserId = match.teamAId === winner.id ? match.teamBId : match.teamAId
  if (!loserId) return
  const loser = state.teams.find((team) => team.id === loserId)
  if (!loser) return

  winner.guaranteedPrize = prizeAfterWinning(match.stage)
  if (loser.status !== 'champion') {
    loser.status = 'eliminated'
  }
  match.status = 'completed'
  placeWinner(state.matches, match, winner.id)

  if (match.stage === 'final') {
    winner.status = 'champion'
    state.championTeamId = winner.id
    state.status = 'finished'
  }
}

/**
 * Repair bracket after abandoned ConfirmMatchWinner (operator started another
 * match while one was awaiting_confirmation) or missing parent slots.
 * Safe to run on every IndexedDB load.
 */
export function repairBracketProgression(state: TournamentState): TournamentState {
  const next: TournamentState = {
    ...state,
    teams: state.teams.map((team) => ({ ...team })),
    matches: state.matches.map((match) => ({ ...match })),
  }

  const pendingConfirm = next.matches
    .filter((match) => match.status === 'awaiting_confirmation' && match.winnerTeamId)
    .sort(
      (a, b) => stageRank(a.stage) - stageRank(b.stage) || a.position - b.position,
    )

  for (const match of pendingConfirm) {
    applyMatchClassification(next, match)
  }

  for (const match of next.matches) {
    if (match.status === 'completed' && match.winnerTeamId) {
      placeWinner(next.matches, match, match.winnerTeamId)
    }
  }

  if (next.activeMatchId) {
    const active = next.matches.find((match) => match.id === next.activeMatchId)
    if (!active || active.status === 'completed') {
      next.activeMatchId = null
      next.activeRoundId = null
    }
  }

  return next
}

/** True when another match must finish classification before a new StartMatch. */
export function hasMatchBlockingStart(state: TournamentState): boolean {
  return state.matches.some(
    (match) => match.status === 'active' || match.status === 'awaiting_confirmation',
  )
}
