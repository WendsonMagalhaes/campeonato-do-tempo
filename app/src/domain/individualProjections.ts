import { formatRaceTime } from './time.ts'
import {
  getParticipantAvatar,
  getParticipantBodyImage,
} from './participants.ts'

import type {
  FighterVariant,
  Participant,
} from './types.ts'

import type {
  IndividualTournamentState,
} from './individualTypes.ts'

export interface IndividualPortraitView {
  id: string
  name: string
  photoAssetId: string | null
  avatarUrl: string | null
  bodyImageUrl: string | null
  fighterVariant: FighterVariant
}

export interface IndividualScoreboardProjection {
  tournamentName: string

  status: IndividualTournamentState['status']

  participants: IndividualPortraitView[]

  screen:
    | 'opening'
    | 'lineup'
    | 'versus'
    | 'round'
    | 'match_win'
    | 'finished'

  matches: Array<{
    id: string
    label: string
    position: number

    participantA: IndividualPortraitView | null
    participantB: IndividualPortraitView | null

    scoreA: number
    scoreB: number

    status: IndividualTournamentState['matches'][number]['status']

    revealed: boolean
  }>

  /**
   * Próximo confronto pendente de revelação.
   */
  nextToReveal: {
    id: string
    label: string
    participantA: IndividualPortraitView
    participantB: IndividualPortraitView
  } | null

  versus: {
    matchId: string
    label: string

    participantA: IndividualPortraitView
    participantB: IndividualPortraitView

    scoreA: number
    scoreB: number

    roundNumber: number | null

    targetLabel: string | null

    timesHidden: boolean

    timeA: string | null
    timeB: string | null

    diffA: string | null
    diffB: string | null

    roundWinnerSide:
      | 'left'
      | 'right'
      | null

    tie: boolean

    matchWinnerSide:
      | 'left'
      | 'right'
      | null

    finalScoreLabel:
      | '2-0'
      | '2-1'
      | null
  } | null
}

export interface IndividualOperatorProjection {
  state: IndividualTournamentState

  canResolveRound: boolean

  canStartTiebreaker: boolean

  pendingCandidates:
    IndividualTournamentState['detectedValues']

  persistenceLabel: string
}

/**
 * Converte um participante do domínio
 * para o formato usado pelo operador/telão.
 *
 * IMPORTANTE:
 * Não substituímos nem removemos o personagem.
 * Mantemos:
 * - photoAssetId
 * - avatar
 * - bodyImage
 * - fighterVariant
 */
function toPortrait(
  person: Participant,
): IndividualPortraitView {
  return {
    id: person.id,

    name: person.name,

    photoAssetId:
      person.photoAssetId ?? null,

    avatarUrl:
      person.avatar ??
      getParticipantAvatar(person) ??
      null,

    bodyImageUrl:
      person.bodyImage ??
      getParticipantBodyImage(person) ??
      null,

    fighterVariant:
      person.fighterVariant === 'female'
        ? 'female'
        : 'male',
  }
}

/**
 * Mapa rápido dos participantes.
 */
function participantMap(
  state: IndividualTournamentState,
) {
  return new Map(
    state.participants.map(
      (participant) => [
        participant.id,
        participant,
      ],
    ),
  )
}

function currentMatch(
  state: IndividualTournamentState,
) {
  if (!state.activeMatchId) {
    return undefined
  }

  return state.matches.find(
    (match) =>
      match.id === state.activeMatchId,
  )
}

function currentRound(
  state: IndividualTournamentState,
) {
  if (!state.activeRoundId) {
    return undefined
  }

  return state.rounds.find(
    (round) =>
      round.id === state.activeRoundId,
  )
}

/**
 * Define qual tela o telão deve mostrar.
 */
function screenFor(
  state: IndividualTournamentState,
): IndividualScoreboardProjection['screen'] {
  if (state.status === 'setup') {
    return 'opening'
  }

  if (
    state.status ===
    'revealing_matchups'
  ) {
    return 'lineup'
  }

  if (state.status === 'finished') {
    return 'finished'
  }

  const match = currentMatch(state)

  if (
    match?.status ===
    'awaiting_confirmation'
  ) {
    return 'match_win'
  }

  const round = currentRound(state)

  /**
   * Existe confronto ativo, mas ainda
   * não existe rodada.
   */
  if (match && !round) {
    return 'versus'
  }

  if (round) {
    return 'round'
  }

  return 'lineup'
}

export function projectIndividualScoreboard(
  state: IndividualTournamentState,
): IndividualScoreboardProjection {
  const people = participantMap(state)

  const match = currentMatch(state)

  const round = currentRound(state)

  /**
   * Participantes do confronto atual.
   */
  const participantA = match
    ? people.get(match.participantAId)
    : undefined

  const participantB = match
    ? people.get(match.participantBId)
    : undefined

  /**
   * A rodada só revela os tempos/diferenças
   * depois de ser confirmada ou empatada.
   */
  const revealed =
    round?.status === 'confirmed' ||
    round?.status === 'tie'

  const timesHidden = !revealed

  /**
   * Vencedor da rodada.
   */
  let roundWinnerSide:
    | 'left'
    | 'right'
    | null = null

  if (
    round?.winnerParticipantId &&
    match
  ) {
    if (
      round.winnerParticipantId ===
      match.participantAId
    ) {
      roundWinnerSide = 'left'
    } else if (
      round.winnerParticipantId ===
      match.participantBId
    ) {
      roundWinnerSide = 'right'
    }
  }

  /**
   * Vencedor do confronto.
   */
  let matchWinnerSide:
    | 'left'
    | 'right'
    | null = null

  if (
    match?.winnerParticipantId
  ) {
    matchWinnerSide =
      match.winnerParticipantId ===
      match.participantAId
        ? 'left'
        : 'right'
  }

  /**
   * Placar final.
   */
  let finalScoreLabel:
    | '2-0'
    | '2-1'
    | null = null

  if (
    match &&
    (
      match.status ===
        'awaiting_confirmation' ||
      match.status ===
        'completed'
    )
  ) {
    const loserScore = Math.min(
      match.scoreA,
      match.scoreB,
    )

    finalScoreLabel =
      loserScore === 0
        ? '2-0'
        : '2-1'
  }

  /**
   * Próximo confronto ainda não revelado.
   */
  const nextToRevealMatch =
    [...state.matches]
      .filter(
        (item) => !item.revealed,
      )
      .sort(
        (a, b) =>
          a.position - b.position,
      )[0]

  const nextA =
    nextToRevealMatch
      ? people.get(
          nextToRevealMatch.participantAId,
        )
      : undefined

  const nextB =
    nextToRevealMatch
      ? people.get(
          nextToRevealMatch.participantBId,
        )
      : undefined

  return {
    tournamentName:
      state.name,

    status:
      state.status,

    /**
     * TODOS os personagens cadastrados
     * continuam disponíveis para o telão.
     */
    participants:
      state.participants.map(
        toPortrait,
      ),

    screen:
      screenFor(state),

    matches:
      state.matches.map(
        (item) => {
          const personA =
            people.get(
              item.participantAId,
            )

          const personB =
            people.get(
              item.participantBId,
            )

          return {
            id: item.id,

            label: item.label,

            position:
              item.position,

            participantA:
              personA
                ? toPortrait(personA)
                : null,

            participantB:
              personB
                ? toPortrait(personB)
                : null,

            scoreA:
              item.scoreA,

            scoreB:
              item.scoreB,

            status:
              item.status,

            revealed:
              item.revealed,
          }
        },
      ),

    /**
     * Próximo confronto da animação.
     *
     * Aqui também usamos o participante
     * original do state, preservando
     * avatar/body/fighterVariant.
     */
    nextToReveal:
      nextToRevealMatch &&
      nextA &&
      nextB
        ? {
            id:
              nextToRevealMatch.id,

            label:
              nextToRevealMatch.label,

            participantA:
              toPortrait(nextA),

            participantB:
              toPortrait(nextB),
          }
        : null,

    /**
     * Dados do confronto atual.
     */
    versus:
      match &&
      participantA &&
      participantB
        ? {
            matchId:
              match.id,

            label:
              match.label,

            participantA:
              toPortrait(
                participantA,
              ),

            participantB:
              toPortrait(
                participantB,
              ),

            scoreA:
              match.scoreA,

            scoreB:
              match.scoreB,

            roundNumber:
              round?.number ??
              null,

            targetLabel:
              round?.targetTimeMs !==
                null &&
              round?.targetTimeMs !==
                undefined
                ? formatRaceTime(
                    round.targetTimeMs,
                  )
                : null,

            timesHidden,

            timeA:
              !timesHidden &&
              round?.attemptA
                ? formatRaceTime(
                    round.attemptA
                      .valueMs,
                  )
                : null,

            timeB:
              !timesHidden &&
              round?.attemptB
                ? formatRaceTime(
                    round.attemptB
                      .valueMs,
                  )
                : null,

            diffA:
              !timesHidden &&
              round?.differenceAMs !==
                null &&
              round?.differenceAMs !==
                undefined
                ? formatRaceTime(
                    round.differenceAMs,
                  )
                : null,

            diffB:
              !timesHidden &&
              round?.differenceBMs !==
                null &&
              round?.differenceBMs !==
                undefined
                ? formatRaceTime(
                    round.differenceBMs,
                  )
                : null,

            roundWinnerSide,

            tie:
              round?.status === 'tie',

            matchWinnerSide,

            finalScoreLabel,
          }
        : null,
  }
}

export function projectIndividualOperator(
  state: IndividualTournamentState,
  persistenceLabel: string,
): IndividualOperatorProjection {
  const round =
    currentRound(state)

  return {
    state,

    canResolveRound:
      round?.status ===
      'ready_to_calculate',

    canStartTiebreaker:
      round?.status === 'tie',

    pendingCandidates:
      state.detectedValues.filter(
        (item) =>
          item.status === 'pending',
      ),

    persistenceLabel,
  }
}
