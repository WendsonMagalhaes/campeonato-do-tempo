import { DomainError } from './errors.ts'
import type { EngineDeps, FighterVariant } from './types.ts'
import type { IndividualCommand } from './individualCommands.ts'
import {
  INDIVIDUAL_MAX_ROUNDS,
  INDIVIDUAL_WINS_TO_TAKE_MATCH,
  type IndividualMatch,
  type IndividualRound,
  type IndividualTournamentState,
} from './individualTypes.ts'

export function createInitialIndividualState(
  deps: EngineDeps,
  name = 'Confrontos Individuais',
): IndividualTournamentState {
  return {
    schemaVersion: 1,
    id: deps.ids.next('individual_tournament'),
    name,
    status: 'setup',
    participants: [],
    matches: [],
    rounds: [],
    detectedValues: [],
    activeMatchId: null,
    activeRoundId: null,
    championParticipantId: null,
  }
}

function findParticipant(
  state: IndividualTournamentState,
  id: string,
) {
  const person = state.participants.find(
    (item) => item.id === id,
  )

  if (!person) {
    throw new DomainError(
      'PARTICIPANT_NOT_FOUND',
      `Participante ${id} não encontrado.`,
    )
  }

  return person
}

function findMatch(
  state: IndividualTournamentState,
  id: string,
) {
  const match = state.matches.find(
    (item) => item.id === id,
  )

  if (!match) {
    throw new DomainError(
      'MATCH_NOT_FOUND',
      `Confronto ${id} não encontrado.`,
    )
  }

  return match
}

function requireActiveMatch(
  state: IndividualTournamentState,
): IndividualMatch {
  if (!state.activeMatchId) {
    throw new DomainError(
      'NO_ACTIVE_MATCH',
      'Nenhum confronto ativo.',
    )
  }

  return findMatch(
    state,
    state.activeMatchId,
  )
}

function requireActiveRound(
  state: IndividualTournamentState,
): IndividualRound {
  if (!state.activeRoundId) {
    throw new DomainError(
      'NO_ACTIVE_ROUND',
      'Nenhuma rodada ativa.',
    )
  }

  const round = state.rounds.find(
    (item) => item.id === state.activeRoundId,
  )

  if (!round) {
    throw new DomainError(
      'ACTIVE_ROUND_NOT_FOUND',
      'Rodada ativa não encontrada.',
    )
  }

  return round
}

function replaceRound(
  state: IndividualTournamentState,
  round: IndividualRound,
): IndividualRound[] {
  return state.rounds.map(
    (item) =>
      item.id === round.id
        ? round
        : item,
  )
}

function replaceMatch(
  state: IndividualTournamentState,
  match: IndividualMatch,
): IndividualMatch[] {
  return state.matches.map(
    (item) =>
      item.id === match.id
        ? match
        : item,
  )
}

function secondsToMs(
  seconds: number,
): number {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    throw new DomainError(
      'INVALID_TIME',
      'Tempo inválido.',
    )
  }

  return Math.round(
    seconds * 1000,
  )
}

function createRoundForMatch(
  deps: EngineDeps,
  match: IndividualMatch,
  number: 1 | 2 | 3,
): IndividualRound {
  return {
    id: deps.ids.next('iround'),
    matchId: match.id,
    number,
    targetTimeMs: null,
    attemptA: null,
    attemptB: null,
    status: 'awaiting_target',
    winnerParticipantId: null,
    differenceAMs: null,
    differenceBMs: null,
  }
}

export function handleIndividualCommand(
  state: IndividualTournamentState,
  command: IndividualCommand,
  deps: EngineDeps,
): IndividualTournamentState {
  switch (command.type) {

    case 'RegisterIndividualParticipant': {
      const name = command.name.trim()

      if (!name) {
        throw new DomainError(
          'EMPTY_NAME',
          'Nome do participante não pode ser vazio.',
        )
      }

      const person = {
        id: deps.ids.next('participant'),
        name,
        photoAssetId: null,
        fightPhotoAssetId: null,
        fighterVariant:
          command.fighterVariant as FighterVariant,
      }

      return {
        ...state,
        participants: [
          ...state.participants,
          person,
        ],
      }
    }

    case 'EditIndividualParticipant': {
      const name = command.name.trim()

      if (!name) {
        throw new DomainError(
          'EMPTY_NAME',
          'Nome do participante não pode ser vazio.',
        )
      }

      findParticipant(
        state,
        command.participantId,
      )

      return {
        ...state,

        participants:
          state.participants.map(
            (item) =>
              item.id ===
              command.participantId
                ? {
                    ...item,
                    name,
                    fighterVariant:
                      command.fighterVariant,
                  }
                : item,
          ),
      }
    }

    case 'RemoveIndividualParticipant': {
      findParticipant(
        state,
        command.participantId,
      )

      const inUse =
        state.matches.some(
          (match) =>
            match.participantAId ===
              command.participantId ||
            match.participantBId ===
              command.participantId,
        )

      if (inUse) {
        throw new DomainError(
          'PARTICIPANT_IN_USE',
          'Participante já está em um confronto — remova o confronto primeiro.',
        )
      }

      return {
        ...state,

        participants:
          state.participants.filter(
            (item) =>
              item.id !==
              command.participantId,
          ),
      }
    }

    case 'UploadIndividualParticipantPhoto': {
      findParticipant(
        state,
        command.participantId,
      )

      return {
        ...state,

        participants:
          state.participants.map(
            (item) =>
              item.id ===
              command.participantId
                ? {
                    ...item,
                    photoAssetId:
                      command.photoAssetId,
                  }
                : item,
          ),
      }
    }

    case 'UploadIndividualParticipantFightPhoto': {
      findParticipant(
        state,
        command.participantId,
      )

      return {
        ...state,

        participants:
          state.participants.map(
            (item) =>
              item.id ===
              command.participantId
                ? {
                    ...item,
                    fightPhotoAssetId:
                      command.fightPhotoAssetId,
                  }
                : item,
          ),
      }
    }

    case 'DefineIndividualMatch': {
      if (state.status !== 'setup') {
        throw new DomainError(
          'NOT_IN_SETUP',
          'Só é possível definir confrontos na fase de preparação.',
        )
      }

      if (
        command.participantAId ===
        command.participantBId
      ) {
        throw new DomainError(
          'SAME_PARTICIPANT',
          'Os dois lados do confronto precisam ser participantes diferentes.',
        )
      }

      findParticipant(
        state,
        command.participantAId,
      )

      findParticipant(
        state,
        command.participantBId,
      )

      const match: IndividualMatch = {
        id: deps.ids.next('imatch'),
        label:
          command.label.trim() ||
          `Confronto ${state.matches.length + 1}`,
        position: command.position,
        participantAId:
          command.participantAId,
        participantBId:
          command.participantBId,
        scoreA: 0,
        scoreB: 0,
        status: 'pending',
        winnerParticipantId: null,
        revealed: false,
      }

      return {
        ...state,
        matches: [
          ...state.matches,
          match,
        ],
      }
    }

    case 'EditIndividualMatch': {
      if (state.status !== 'setup') {
        throw new DomainError(
          'NOT_IN_SETUP',
          'Só é possível editar confrontos na fase de preparação.',
        )
      }

      const match = findMatch(
        state,
        command.matchId,
      )

      if (
        command.participantAId ===
        command.participantBId
      ) {
        throw new DomainError(
          'SAME_PARTICIPANT',
          'Os dois lados do confronto precisam ser participantes diferentes.',
        )
      }

      findParticipant(
        state,
        command.participantAId,
      )

      findParticipant(
        state,
        command.participantBId,
      )

      const next: IndividualMatch = {
        ...match,
        label:
          command.label.trim() ||
          match.label,
        participantAId:
          command.participantAId,
        participantBId:
          command.participantBId,
        position:
          command.position,
      }

      return {
        ...state,
        matches:
          replaceMatch(
            state,
            next,
          ),
      }
    }

    case 'RemoveIndividualMatch': {
      if (state.status !== 'setup') {
        throw new DomainError(
          'NOT_IN_SETUP',
          'Só é possível remover confrontos na fase de preparação.',
        )
      }

      findMatch(
        state,
        command.matchId,
      )

      return {
        ...state,

        matches:
          state.matches.filter(
            (item) =>
              item.id !==
              command.matchId,
          ),
      }
    }

    case 'StartIndividualReveal': {
      if (state.status !== 'setup') {
        throw new DomainError(
          'REVEAL_ALREADY_STARTED',
          'Revelação já foi iniciada.',
        )
      }

      if (state.matches.length === 0) {
        throw new DomainError(
          'NO_MATCHES_DEFINED',
          'Defina ao menos um confronto antes de revelar.',
        )
      }

      return {
        ...state,
        status:
          'revealing_matchups',
      }
    }

    case 'RevealNextIndividualMatch': {
      if (
        state.status !==
        'revealing_matchups'
      ) {
        throw new DomainError(
          'NOT_IN_REVEAL_PHASE',
          'Fora da fase de revelação.',
        )
      }

      const pending =
        [...state.matches]
          .filter(
            (item) =>
              !item.revealed,
          )
          .sort(
            (a, b) =>
              a.position -
              b.position,
          )[0]

      if (!pending) {
        throw new DomainError(
          'ALL_REVEALED',
          'Todos os confrontos já foram revelados.',
        )
      }

      const revealedMatch = {
        ...pending,
        revealed: true,
      }

      const matches =
        replaceMatch(
          state,
          revealedMatch,
        )

      const allRevealed =
        matches.every(
          (item) =>
            item.revealed,
        )

      return {
        ...state,
        matches,
        status: allRevealed
          ? 'in_progress'
          : state.status,
      }
    }

    case 'StartIndividualMatch': {
      if (
        state.status !==
        'in_progress'
      ) {
        throw new DomainError(
          'NOT_IN_PROGRESS',
          'Torneio ainda não está em andamento.',
        )
      }

      if (state.activeMatchId) {
        throw new DomainError(
          'MATCH_ALREADY_ACTIVE',
          'Já existe um confronto em andamento.',
        )
      }

      const match = findMatch(
        state,
        command.matchId,
      )

      if (match.status !== 'pending') {
        throw new DomainError(
          'MATCH_NOT_PENDING',
          'Este confronto já foi iniciado ou concluído.',
        )
      }

      const round =
        createRoundForMatch(
          deps,
          match,
          1,
        )

      const startedMatch:
        IndividualMatch = {
          ...match,
          status: 'active',
        }

      return {
        ...state,

        matches:
          replaceMatch(
            state,
            startedMatch,
          ),

        rounds: [
          ...state.rounds,
          round,
        ],

        activeMatchId:
          startedMatch.id,

        activeRoundId:
          round.id,
      }
    }

    case 'RegisterTargetTime': {
      const round =
        requireActiveRound(
          state,
        )

      if (
        round.status !==
        'awaiting_target'
      ) {
        throw new DomainError(
          'TARGET_NOT_ALLOWED',
          'Alvo só pode ser definido no início da rodada.',
        )
      }

      const next:
        IndividualRound = {
          ...round,
          targetTimeMs:
            secondsToMs(
              command.seconds,
            ),
          status:
            'awaiting_attempts',
        }

      return {
        ...state,
        rounds:
          replaceRound(
            state,
            next,
          ),
      }
    }

    case 'RegisterManualTime': {
      const match =
        requireActiveMatch(
          state,
        )

      const round =
        requireActiveRound(
          state,
        )

      if (
        round.status !==
          'awaiting_attempts' &&
        round.status !==
          'ready_to_calculate'
      ) {
        throw new DomainError(
          'TARGET_NOT_SET',
          'Defina o alvo antes de atribuir tempos.',
        )
      }

      const valueMs =
        secondsToMs(
          command.seconds,
        )

      const attempt = {
        id: deps.ids.next(
          'attempt',
        ),
        detectedValueId:
          null,
        participantId:
          command.participantId,
        valueMs,
        source:
          'manual' as const,
      }

      let next:
        IndividualRound

      if (
        command.participantId ===
        match.participantAId
      ) {
        next = {
          ...round,
          attemptA: attempt,
        }
      } else if (
        command.participantId ===
        match.participantBId
      ) {
        next = {
          ...round,
          attemptB: attempt,
        }
      } else {
        throw new DomainError(
          'PARTICIPANT_NOT_IN_MATCH',
          'Participante não faz parte deste confronto.',
        )
      }

      next.status =
        next.attemptA &&
        next.attemptB
          ? 'ready_to_calculate'
          : 'awaiting_attempts'

      return {
        ...state,
        rounds:
          replaceRound(
            state,
            next,
          ),
      }
    }

    case 'ReceiveTimerCandidate': {
      const round =
        requireActiveRound(
          state,
        )

      if (
        round.status !==
          'awaiting_attempts' &&
        round.status !==
          'ready_to_calculate'
      ) {
        throw new DomainError(
          'ROUND_NOT_AWAITING_ATTEMPTS',
          'Nenhuma rodada aguardando tentativas no momento.',
        )
      }

      const candidate = {
        id: deps.ids.next(
          'detected',
        ),
        valueMs:
          secondsToMs(
            command.valueSeconds,
          ),
        confidence:
          command.confidence,
        capturedAt:
          deps.clock.now(),
        status:
          'pending' as const,
        frameId:
          command.frameId,
      }

      return {
        ...state,

        detectedValues: [
          ...state.detectedValues,
          candidate,
        ],
      }
    }

    case 'AssignTimerValue': {
      const match =
        requireActiveMatch(
          state,
        )

      const round =
        requireActiveRound(
          state,
        )

      const candidate =
        state.detectedValues.find(
          (item) =>
            item.id ===
            command.detectedValueId,
        )

      if (!candidate) {
        throw new DomainError(
          'CANDIDATE_NOT_FOUND',
          'Candidato de leitura não encontrado.',
        )
      }

      if (
        candidate.status !==
        'pending'
      ) {
        throw new DomainError(
          'CANDIDATE_NOT_PENDING',
          'Candidato já foi atribuído ou descartado.',
        )
      }

      const attempt = {
        id: deps.ids.next(
          'attempt',
        ),
        detectedValueId:
          candidate.id,
        participantId:
          command.participantId,
        valueMs:
          candidate.valueMs,
        source:
          'timer_capture' as const,
      }

      let next:
        IndividualRound

      if (
        command.participantId ===
        match.participantAId
      ) {
        next = {
          ...round,
          attemptA: attempt,
        }
      } else if (
        command.participantId ===
        match.participantBId
      ) {
        next = {
          ...round,
          attemptB: attempt,
        }
      } else {
        throw new DomainError(
          'PARTICIPANT_NOT_IN_MATCH',
          'Participante não faz parte deste confronto.',
        )
      }

      next.status =
        next.attemptA &&
        next.attemptB
          ? 'ready_to_calculate'
          : 'awaiting_attempts'

      return {
        ...state,

        rounds:
          replaceRound(
            state,
            next,
          ),

        detectedValues:
          state.detectedValues.map(
            (item) =>
              item.id ===
              candidate.id
                ? {
                    ...item,
                    status:
                      'assigned',
                  }
                : item,
          ),
      }
    }

    case 'DiscardTimerCandidate': {
      const candidate =
        state.detectedValues.find(
          (item) =>
            item.id ===
            command.detectedValueId,
        )

      if (!candidate) {
        throw new DomainError(
          'CANDIDATE_NOT_FOUND',
          'Candidato de leitura não encontrado.',
        )
      }

      return {
        ...state,

        detectedValues:
          state.detectedValues.map(
            (item) =>
              item.id ===
              candidate.id
                ? {
                    ...item,
                    status:
                      'discarded',
                  }
                : item,
          ),
      }
    }

    case 'ResolveIndividualRound': {
      const match =
        requireActiveMatch(
          state,
        )

      const round =
        requireActiveRound(
          state,
        )

      if (
        round.status !==
        'ready_to_calculate'
      ) {
        throw new DomainError(
          'ROUND_NOT_READY',
          'Rodada ainda não está pronta para calcular.',
        )
      }

      if (
        round.targetTimeMs ===
          null ||
        !round.attemptA ||
        !round.attemptB
      ) {
        throw new DomainError(
          'ROUND_DATA_MISSING',
          'Faltam dados para calcular a rodada.',
        )
      }

      const differenceAMs =
        Math.abs(
          round.attemptA.valueMs -
          round.targetTimeMs,
        )

      const differenceBMs =
        Math.abs(
          round.attemptB.valueMs -
          round.targetTimeMs,
        )

      if (
        differenceAMs ===
        differenceBMs
      ) {
        const tieRound:
          IndividualRound = {
            ...round,
            differenceAMs,
            differenceBMs,
            status: 'tie',
            winnerParticipantId:
              null,
          }

        return {
          ...state,
          rounds:
            replaceRound(
              state,
              tieRound,
            ),
        }
      }

      const winnerParticipantId =
        differenceAMs <
        differenceBMs
          ? match.participantAId
          : match.participantBId

      const confirmedRound:
        IndividualRound = {
          ...round,
          differenceAMs,
          differenceBMs,
          status:
            'confirmed',
          winnerParticipantId,
        }

      const scoreA =
        match.scoreA +
        (winnerParticipantId ===
        match.participantAId
          ? 1
          : 0)

      const scoreB =
        match.scoreB +
        (winnerParticipantId ===
        match.participantBId
          ? 1
          : 0)

      const matchDecided =
        scoreA >=
          INDIVIDUAL_WINS_TO_TAKE_MATCH ||
        scoreB >=
          INDIVIDUAL_WINS_TO_TAKE_MATCH

      if (matchDecided) {
        const decidedMatch:
          IndividualMatch = {
            ...match,
            scoreA,
            scoreB,
            status:
              'awaiting_confirmation',
            winnerParticipantId:
              scoreA > scoreB
                ? match.participantAId
                : match.participantBId,
          }

        return {
          ...state,

          matches:
            replaceMatch(
              state,
              decidedMatch,
            ),

          rounds:
            replaceRound(
              state,
              confirmedRound,
            ),
        }
      }

      if (
        round.number >=
        INDIVIDUAL_MAX_ROUNDS
      ) {
        throw new DomainError(
          'ROUND_LIMIT_REACHED',
          'Limite de rodadas atingido sem confronto decidido.',
        )
      }

      const nextRound =
        createRoundForMatch(
          deps,
          match,
          (round.number +
            1) as 2 | 3,
        )

      const updatedMatch:
        IndividualMatch = {
          ...match,
          scoreA,
          scoreB,
        }

      return {
        ...state,

        matches:
          replaceMatch(
            state,
            updatedMatch,
          ),

        rounds: [
          ...replaceRound(
            state,
            confirmedRound,
          ),
          nextRound,
        ],

        activeRoundId:
          nextRound.id,
      }
    }

    case 'StartIndividualTiebreaker': {
      const round =
        requireActiveRound(
          state,
        )

      if (
        round.status !==
        'tie'
      ) {
        throw new DomainError(
          'ROUND_NOT_TIE',
          'Só é possível reiniciar uma rodada empatada.',
        )
      }

      const reset:
        IndividualRound = {
          ...round,
          targetTimeMs:
            null,
          attemptA:
            null,
          attemptB:
            null,
          status:
            'awaiting_target',
          winnerParticipantId:
            null,
          differenceAMs:
            null,
          differenceBMs:
            null,
        }

      return {
        ...state,
        rounds:
          replaceRound(
            state,
            reset,
          ),
      }
    }

    case 'ConfirmIndividualMatchWinner': {
      const match =
        command.matchId
          ? findMatch(
              state,
              command.matchId,
            )
          : requireActiveMatch(
              state,
            )

      if (
        match.status !==
        'awaiting_confirmation'
      ) {
        throw new DomainError(
          'MATCH_NOT_AWAITING_CONFIRMATION',
          'Confronto não está aguardando confirmação.',
        )
      }

      const completedMatch:
        IndividualMatch = {
          ...match,
          status: 'completed',
        }

      const matches =
        replaceMatch(
          state,
          completedMatch,
        )

      const allCompleted =
        matches.every(
          (item) =>
            item.status ===
            'completed',
        )

      return {
        ...state,

        matches,

        status: allCompleted
          ? 'finished'
          : state.status,

        activeMatchId:
          null,

        activeRoundId:
          null,
      }
    }

    /**
     * RESET DO TORNEIO
     *
     * IMPORTANTE:
     * NÃO usamos createInitialIndividualState()
     * porque isso apagaria os participantes.
     *
     * O objetivo é:
     *
     * PARTICIPANTES
     *      ↓
     *      permanecem
     *
     * CONFRONTOS
     *      ↓
     *      são apagados
     *
     * RODADAS
     *      ↓
     *      são apagadas
     *
     * RESULTADOS
     *      ↓
     *      são apagados
     *
     * STATUS
     *      ↓
     *      volta para setup
     */
    case 'ResetIndividualTournament': {
      return {
        ...state,

        // Mantém todos os personagens
        participants:
          state.participants,

        // Remove todos os confrontos
        matches: [],

        // Remove todas as rodadas
        rounds: [],

        // Remove leituras pendentes do timer
        detectedValues: [],

        // Volta para a tela inicial
        status: 'setup',

        // Nenhum confronto ativo
        activeMatchId: null,

        // Nenhuma rodada ativa
        activeRoundId: null,

        // Remove campeão
        championParticipantId: null,
      }
    }

    default: {
      const exhaustive:
        never = command

      throw new DomainError(
        'UNKNOWN_COMMAND',
        `Comando individual desconhecido: ${JSON.stringify(exhaustive)}`,
      )
    }
  }
}

