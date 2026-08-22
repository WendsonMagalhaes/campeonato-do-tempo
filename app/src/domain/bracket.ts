import type { Match, Stage, TeamId } from './types.ts'

export function nextStage(stage: Stage): Stage | null {
  switch (stage) {
    case 'oitavas':
      return 'quartas'
    case 'quartas':
      return 'semifinais'
    case 'semifinais':
      return 'final'
    case 'final':
      return null
  }
}

export function parentMatchId(stage: Stage, position: number): string | null {
  const upcoming = nextStage(stage)
  if (!upcoming) return null
  return `${upcoming}-${Math.floor(position / 2)}`
}

export function slotForWinner(position: number): 'A' | 'B' {
  return position % 2 === 0 ? 'A' : 'B'
}

export function placeWinner(matches: Match[], from: Match, winnerTeamId: TeamId): void {
  const parentId = parentMatchId(from.stage, from.position)
  if (!parentId) return
  const parent = matches.find((match) => match.id === parentId)
  if (!parent) return
  if (slotForWinner(from.position) === 'A') {
    parent.teamAId = winnerTeamId
  } else {
    parent.teamBId = winnerTeamId
  }
}
