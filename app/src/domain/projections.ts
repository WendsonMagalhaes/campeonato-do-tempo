import { fakeShuffleDestination } from './teams.ts'
import { formatDuoName, formatPrize, formatRaceTime } from './time.ts'
import { getParticipantAvatar, getParticipantBodyImage } from './participants.ts'
import { winsToTakeMatch, maxRoundsForMatch } from './constants.ts'
import type {
  FighterVariant,
  Match,
  Participant,
  Round,
  Team,
  TournamentState,
} from './types.ts'

export interface ScoreboardProjection {
  tournamentName: string
  status: TournamentState['status']
  participants: PortraitView[]
  screen:
    | 'opening'
    | 'fake_shuffle'
    | 'bracket'
    | 'versus'
    | 'round'
    | 'round3'
    | 'match_win'
    | 'champion'
  revealedTeams: Array<{
    id: string
    name: string
    member1: string
    member2: string
    photo1: string | null
    photo2: string | null
    firstRevealParticipantId: string
    destinationParticipantId: string
    prize: string
  }>
  /**
   * Ids of participants who already belong to a revealed team (status !==
   * 'registered'), persisted in `state.teams`. Survives a screen refresh --
   * unlike the runtime "just landed" tracker kept in ScoreboardApp, which
   * only covers the current fake-shuffle animation run.
   */
  usedParticipantIds: string[]
  matches: Array<{
    id: string
    stage: Match['stage']
    position: number
    teamA: string
    teamB: string
    membersA: [PortraitView, PortraitView] | null
    membersB: [PortraitView, PortraitView] | null
    scoreA: number
    scoreB: number
    status: Match['status']
  }>
  versus: {
    stage: Match['stage']
    teamAName: string
    teamBName: string
    membersA: [PortraitView, PortraitView]
    membersB: [PortraitView, PortraitView]
    activeAId: string | null
    activeBId: string | null
    scoreA: number
    scoreB: number
    roundNumber: number | null
    targetLabel: string | null
    prizeA: string
    prizeB: string
    timesHidden: boolean
    timeA: string | null
    timeB: string | null
    diffA: string | null
    diffB: string | null
    roundWinner: string | null
    /** Which battle side won the round: left=teamA/blue, right=teamB/red */
    roundWinnerSide: 'left' | 'right' | null
    /** True when confirmed scores indicate the match is decided. */
    matchPoint: boolean
    finalScoreLabel: '2-0' | '2-1' | null
    /** Match winner side when status is awaiting_confirmation / completed. */
    matchWinnerSide: 'left' | 'right' | null
    tie: boolean
  } | null
  champion: {
    name: string
    memberIds: [string, string]
    members: [string, string]
    memberPhotoAssetIds: [string | null, string | null]
    memberAvatarUrls: [string | null, string | null]
    memberBodyImageUrls: [string | null, string | null]
    memberFighterVariants: [FighterVariant, FighterVariant]
    prize: string
  } | null
}

export interface PortraitView {
  id: string
  name: string
  photoAssetId: string | null
  avatarUrl?: string | null
  bodyImageUrl?: string | null
  fighterVariant: FighterVariant
}

export interface OperatorProjection {
  state: TournamentState
  eligibleR1: { teamA: PortraitView[]; teamB: PortraitView[] } | null
  automaticR2: { participantA: PortraitView | null; participantB: PortraitView | null } | null
  /** Representantes da próxima rodada decisiva (3, 4 ou 5, conforme a fase). */
  eligibleRepresentatives: { roundNumber: number; teamA: PortraitView[]; teamB: PortraitView[] } | null
  canCalculate: boolean
  /** Same gate as canCalculate — enables unified calculate+reveal+confirm. */
  canResolveRound: boolean
  canStartTiebreaker: boolean
  pendingCandidates: TournamentState['detectedValues']
  persistenceLabel: string
}

function participantMap(state: TournamentState): Map<string, Participant> {
  return new Map(state.participants.map((item) => [item.id, item]))
}

function toPortrait(person: Participant): PortraitView {
  const avatar = person.avatar ?? getParticipantAvatar(person) ?? null
  const bodyImage = person.bodyImage ?? getParticipantBodyImage(person) ?? null
  return {
    id: person.id,
    name: person.name,
    photoAssetId: person.photoAssetId,
    avatarUrl: avatar,
    bodyImageUrl: bodyImage,
    // Preserve explicit female; default only when field is missing/invalid.
    fighterVariant:
      person.fighterVariant === 'female'
        ? 'female'
        : person.fighterVariant === 'male'
          ? 'male'
          : 'male',
  }
}

function teamName(state: TournamentState, teamId: string | null): string {
  // Display always normalizes legacy "A + B" labels to "A & B".
  if (!teamId) return 'A definir'
  const raw = state.teams.find((team) => team.id === teamId)?.name ?? 'A definir'
  return formatDuoName(raw)
}

function portraits(state: TournamentState, team: Team | undefined): [PortraitView, PortraitView] | null {
  if (!team) return null
  const people = participantMap(state)
  const a = people.get(team.participant1Id)
  const b = people.get(team.participant2Id)
  if (!a || !b) return null
  return [toPortrait(a), toPortrait(b)]
}

function currentRound(state: TournamentState): Round | undefined {
  return state.rounds.find((round) => round.id === state.activeRoundId)
}

function currentMatch(state: TournamentState): Match | undefined {
  return state.matches.find((match) => match.id === state.activeMatchId)
}

/**
 * Número da próxima rodada decisiva (3, 4 ou 5) disponível para este
 * confronto agora, ou null se nenhuma estiver disponível: placar já
 * decidido, rodada anterior ainda não confirmada, ou limite de rodadas da
 * fase já atingido. Em fases melhor-de-3 isso nunca passa de 3 -- o mesmo
 * comportamento de antes.
 */
function nextDecisiveRoundNumber(state: TournamentState, match: Match): number | null {
  const wins = winsToTakeMatch(match.stage)
  if (match.scoreA >= wins || match.scoreB >= wins) return null
  const rounds = state.rounds.filter((round) => round.matchId === match.id)
  const nextNumber = rounds.length + 1
  if (nextNumber < 3) return null
  if (nextNumber > maxRoundsForMatch(match.stage)) return null
  const previous = rounds.find((round) => round.number === nextNumber - 1)
  if (!previous || previous.status !== 'confirmed') return null
  return nextNumber
}

function screenFor(state: TournamentState): ScoreboardProjection['screen'] {
  if (state.status === 'setup') return 'opening'
  if (state.status === 'revealing_teams') return 'fake_shuffle'
  if (state.status === 'drawing_bracket' || state.status === 'bracket_drawn') return 'bracket'
  if (state.status === 'finished') return 'champion'
  const match = currentMatch(state)
  const round = currentRound(state)
  if (match?.status === 'awaiting_confirmation') return 'match_win'
  if (match && !round) return 'versus'

  // Seleção de representantes (rodada decisiva 3/4/5), antes de
  // SelectRepresentatives criar a rodada.
  if (match && nextDecisiveRoundNumber(state, match) !== null) {
    return 'round3'
  }

  if (round) return 'round'
  if (state.matches.some((item) => item.stage === 'oitavas')) return 'bracket'
  return 'versus'
}

export function projectScoreboard(state: TournamentState): ScoreboardProjection {
  const people = participantMap(state)
  const match = currentMatch(state)
  const round = currentRound(state)
  const teamA = match?.teamAId ? state.teams.find((team) => team.id === match.teamAId) : undefined
  const teamB = match?.teamBId ? state.teams.find((team) => team.id === match.teamBId) : undefined
  const membersA = portraits(state, teamA)
  const membersB = portraits(state, teamB)
  const revealed = round?.status === 'revealed' || round?.status === 'confirmed' || round?.status === 'tie'
  const timesHidden = !revealed

  let roundWinnerSide: 'left' | 'right' | null = null
  if (round?.winnerTeamId && match) {
    if (round.winnerTeamId === match.teamAId) roundWinnerSide = 'left'
    else if (round.winnerTeamId === match.teamBId) roundWinnerSide = 'right'
  }
  // Round de seleção seguinte: rodada ativa pode ainda ser a última confirmada — mantém o lado vencedor para o hold visual.
  if (!roundWinnerSide && match) {
    const lastConfirmed = [...state.rounds]
      .filter((item) => item.matchId === match.id && item.status === 'confirmed' && item.winnerTeamId)
      .sort((a, b) => b.number - a.number)[0]
    if (lastConfirmed?.winnerTeamId === match.teamAId) roundWinnerSide = 'left'
    else if (lastConfirmed?.winnerTeamId === match.teamBId) roundWinnerSide = 'right'
  }

  // Score increments on ConfirmRound; while status is `revealed`, project the pending win for presentation.
  let projectedA = match?.scoreA ?? 0
  let projectedB = match?.scoreB ?? 0
  if (round?.status === 'revealed' && round.winnerTeamId && match) {
    if (round.winnerTeamId === match.teamAId) projectedA += 1
    if (round.winnerTeamId === match.teamBId) projectedB += 1
  }
  const winsNeeded = match ? winsToTakeMatch(match.stage) : 2
  let finalScoreLabel: '2-0' | '2-1' | null = null
  if (projectedA >= winsNeeded || projectedB >= winsNeeded) {
    const loserScore = projectedA >= winsNeeded ? projectedB : projectedA
    finalScoreLabel = loserScore === 0 ? '2-0' : '2-1'
  }

  let matchWinnerSide: 'left' | 'right' | null = null
  if (match?.winnerTeamId) {
    if (match.winnerTeamId === match.teamAId) matchWinnerSide = 'left'
    else if (match.winnerTeamId === match.teamBId) matchWinnerSide = 'right'
  } else if (finalScoreLabel) {
    matchWinnerSide = projectedA > projectedB ? 'left' : 'right'
  }

  // Prefer confirmed match scores for presentation once a side has reached the required wins (incl. awaiting_confirmation).
  const displayScoreA =
    match?.status === 'awaiting_confirmation' || match?.status === 'completed'
      ? (match.scoreA)
      : projectedA
  const displayScoreB =
    match?.status === 'awaiting_confirmation' || match?.status === 'completed'
      ? (match.scoreB)
      : projectedB

  return {
    tournamentName: state.name,
    status: state.status,
    participants: state.participants.map(toPortrait),
    screen: screenFor(state),
    revealedTeams: state.teams
      .filter((team) => team.status !== 'registered')
      .sort((a, b) => a.revealOrder - b.revealOrder)
      .map((team) => {
        const m1 = people.get(team.participant1Id)
        const m2 = people.get(team.participant2Id)
        return {
          id: team.id,
          name: formatDuoName(team.name),
          member1: m1?.name ?? '',
          member2: m2?.name ?? '',
          photo1: m1?.photoAssetId ?? null,
          photo2: m2?.photoAssetId ?? null,
          firstRevealParticipantId: team.firstRevealParticipantId,
          destinationParticipantId: fakeShuffleDestination(team),
          prize: formatPrize(team.guaranteedPrize),
        }
      }),
    // Persisted "already drawn" participants -- any team whose status moved
    // past `registered` (i.e. actually revealed on screen at some point).
    // Recomputed fresh from `state.teams` on every projection, so a screen
    // refresh mid fake-shuffle-run still shows the correct grayed-out grid.
    usedParticipantIds: state.teams
      .filter((team) => team.status !== 'registered')
      .flatMap((team) => [team.participant1Id, team.participant2Id]),
    matches: state.matches.map((item) => {
      const tA = item.teamAId ? state.teams.find((team) => team.id === item.teamAId) : undefined
      const tB = item.teamBId ? state.teams.find((team) => team.id === item.teamBId) : undefined
      return {
        id: item.id,
        stage: item.stage,
        position: item.position,
        teamA: teamName(state, item.teamAId),
        teamB: teamName(state, item.teamBId),
        membersA: portraits(state, tA),
        membersB: portraits(state, tB),
        scoreA: item.scoreA,
        scoreB: item.scoreB,
        status: item.status,
      }
    }),
    versus:
      match && membersA && membersB && teamA && teamB
        ? {
            stage: match.stage,
            teamAName: formatDuoName(teamA.name),
            teamBName: formatDuoName(teamB.name),
            membersA,
            membersB,
            activeAId: round?.participantAId ?? null,
            activeBId: round?.participantBId ?? null,
            scoreA: displayScoreA,
            scoreB: displayScoreB,
            roundNumber: round?.number ?? null,
            targetLabel: round?.targetTimeMs !== null && round?.targetTimeMs !== undefined
              ? formatRaceTime(round.targetTimeMs)
              : null,
            prizeA: formatPrize(teamA.guaranteedPrize),
            prizeB: formatPrize(teamB.guaranteedPrize),
            timesHidden,
            timeA: !timesHidden && round?.attemptA ? formatRaceTime(round.attemptA.valueMs) : null,
            timeB: !timesHidden && round?.attemptB ? formatRaceTime(round.attemptB.valueMs) : null,
            diffA: !timesHidden && round?.differenceAMs !== null && round?.differenceAMs !== undefined
              ? formatRaceTime(round.differenceAMs)
              : null,
            diffB: !timesHidden && round?.differenceBMs !== null && round?.differenceBMs !== undefined
              ? formatRaceTime(round.differenceBMs)
              : null,
            roundWinner: round?.winnerTeamId ? teamName(state, round.winnerTeamId) : null,
            roundWinnerSide,
            matchPoint: Boolean(finalScoreLabel),
            finalScoreLabel,
            matchWinnerSide,
            tie: round?.status === 'tie',
          }
        : null,
    champion: state.championTeamId
      ? (() => {
          const team = state.teams.find((item) => item.id === state.championTeamId)
          if (!team) return null
          const m1 = people.get(team.participant1Id)
          const m2 = people.get(team.participant2Id)
          return {
            name: formatDuoName(team.name),
            memberIds: [m1?.id ?? '', m2?.id ?? ''] as [string, string],
            members: [m1?.name ?? '', m2?.name ?? ''] as [string, string],
            memberPhotoAssetIds: [m1?.photoAssetId ?? null, m2?.photoAssetId ?? null] as [
              string | null,
              string | null,
            ],
            memberAvatarUrls: [
              (m1?.avatar ?? (m1 ? getParticipantAvatar(m1) : null)) ?? null,
              (m2?.avatar ?? (m2 ? getParticipantAvatar(m2) : null)) ?? null,
            ] as [string | null, string | null],
            memberBodyImageUrls: [
              (m1?.bodyImage ?? (m1 ? getParticipantBodyImage(m1) : null)) ?? null,
              (m2?.bodyImage ?? (m2 ? getParticipantBodyImage(m2) : null)) ?? null,
            ] as [string | null, string | null],
            memberFighterVariants: [
              m1?.fighterVariant === 'female' ? 'female' : 'male',
              m2?.fighterVariant === 'female' ? 'female' : 'male',
            ] as [FighterVariant, FighterVariant],
            prize: formatPrize(team.guaranteedPrize),
          }
        })()
      : null,
  }
}

export function projectOperator(state: TournamentState, persistenceLabel: string): OperatorProjection {
  const match = currentMatch(state)
  const round = currentRound(state)
  const people = participantMap(state)
  const view = (id: string): PortraitView | null => {
    const person = people.get(id)
    return person ? toPortrait(person) : null
  }
  const teamA = match?.teamAId ? state.teams.find((team) => team.id === match.teamAId) : undefined
  const teamB = match?.teamBId ? state.teams.find((team) => team.id === match.teamBId) : undefined
  const r1 = match ? state.rounds.find((item) => item.matchId === match.id && item.number === 1) : undefined

  return {
    state,
    eligibleR1:
      match && teamA && teamB && !r1
        ? {
            teamA: [view(teamA.participant1Id), view(teamA.participant2Id)].filter(
              (item): item is PortraitView => Boolean(item),
            ),
            teamB: [view(teamB.participant1Id), view(teamB.participant2Id)].filter(
              (item): item is PortraitView => Boolean(item),
            ),
          }
        : null,
    automaticR2:
      match && teamA && teamB && r1?.participantAId && r1.participantBId && r1.status === 'confirmed'
        && !state.rounds.some((item) => item.matchId === match.id && item.number === 2)
        ? {
            participantA: view(teamA.participant1Id === r1.participantAId ? teamA.participant2Id : teamA.participant1Id),
            participantB: view(teamB.participant1Id === r1.participantBId ? teamB.participant2Id : teamB.participant1Id),
          }
        : null,
    eligibleRepresentatives: (() => {
      if (!match || !teamA || !teamB) return null
      const roundNumber = nextDecisiveRoundNumber(state, match)
      if (roundNumber === null) return null
      return {
        roundNumber,
        teamA: [view(teamA.participant1Id), view(teamA.participant2Id)].filter(
          (item): item is PortraitView => Boolean(item),
        ),
        teamB: [view(teamB.participant1Id), view(teamB.participant2Id)].filter(
          (item): item is PortraitView => Boolean(item),
        ),
      }
    })(),
    canCalculate: round?.status === 'ready_to_calculate',
    canResolveRound: round?.status === 'ready_to_calculate',
    canStartTiebreaker: round?.status === 'tie',
    pendingCandidates: state.detectedValues.filter((item) => item.status === 'pending'),
    persistenceLabel,
  }
}