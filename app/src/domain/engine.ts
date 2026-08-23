import { applyMatchClassification, hasMatchBlockingStart } from './bracket-repair.ts'
import type { Command } from './commands.ts'
import {
  MAX_REGISTERED_PARTICIPANTS,
  OITAVAS_MATCH_COUNT,
  PARTICIPANT_COUNT,
  TEAM_COUNT,
  WINS_TO_TAKE_MATCH,
} from './constants.ts'
import { DomainError } from './errors.ts'
import { partnerOf, teamHasParticipant } from './teams.ts'
import { getParticipantAvatar, getParticipantBodyImage, getParticipantFightAvatar } from './participants.ts'
import { absoluteDifference, secondsToMs, startingPrize } from './time.ts'
import type {
  AssignedAttempt,
  DetectedTimerValue,
  EngineDeps,
  Match,
  Round,
  Team,
  TournamentState,
} from './types.ts'

function fail(code: string, message: string): never {
  throw new DomainError(code, message)
}

function clone(state: TournamentState): TournamentState {
  return structuredClone(state)
}

function requireMatch(state: TournamentState): Match {
  if (!state.activeMatchId) fail('NO_ACTIVE_MATCH', 'Nenhum confronto ativo.')
  const match = state.matches.find((item) => item.id === state.activeMatchId)
  if (!match) fail('MATCH_MISSING', 'Confronto ativo não encontrado.')
  return match
}

function requireRound(state: TournamentState): Round {
  if (!state.activeRoundId) fail('NO_ACTIVE_ROUND', 'Nenhuma rodada ativa.')
  const round = state.rounds.find((item) => item.id === state.activeRoundId)
  if (!round) fail('ROUND_MISSING', 'Rodada ativa não encontrada.')
  return round
}

function requireTeam(state: TournamentState, teamId: string): Team {
  const team = state.teams.find((item) => item.id === teamId)
  if (!team) fail('TEAM_MISSING', 'Dupla não encontrada.')
  return team
}

function participantOnTeam(state: TournamentState, teamId: string, participantId: string): void {
  const team = requireTeam(state, teamId)
  if (!teamHasParticipant(team, participantId)) {
    fail('PLAYER_NOT_ON_TEAM', 'Participante não pertence à dupla do confronto.')
  }
}

function occupiedParticipantIds(state: TournamentState): Set<string> {
  const used = new Set<string>()
  for (const team of state.teams) {
    used.add(team.participant1Id)
    used.add(team.participant2Id)
  }
  return used
}

function refreshCalculateReady(round: Round): void {
  if (
    round.status === 'awaiting_attempts' &&
    round.targetTimeMs !== null &&
    round.attemptA &&
    round.attemptB
  ) {
    round.status = 'ready_to_calculate'
  }
}

function createAttempt(
  deps: EngineDeps,
  participantId: string,
  valueMs: number,
  source: AssignedAttempt['source'],
  detectedValueId: string | null,
): AssignedAttempt {
  return {
    id: deps.ids.next('att'),
    detectedValueId,
    participantId,
    valueMs,
    source,
  }
}

function assignAttempt(round: Round, attempt: AssignedAttempt): void {
  if (round.participantAId === attempt.participantId) {
    round.attemptA = attempt
    return
  }
  if (round.participantBId === attempt.participantId) {
    round.attemptB = attempt
    return
  }
  fail('PLAYER_NOT_IN_ROUND', 'Participante não está ativo nesta rodada.')
}

function handleRegisterParticipant(
  state: TournamentState,
  command: Extract<Command, { type: 'RegisterParticipant' }>,
  deps: EngineDeps,
): void {
  const { name, fighterVariant, id, slug, photoAssetId, avatar, bodyImage, fightAvatar } = command
  if (state.status !== 'setup') fail('SETUP_LOCKED', 'Cadastro só é permitido na preparação.')
  if (state.participants.length >= MAX_REGISTERED_PARTICIPANTS) {
    fail('PARTICIPANT_LIMIT', 'Limite de participantes cadastrados atingido.')
  }
  const trimmed = name.trim()
  if (!trimmed) fail('NAME_REQUIRED', 'Nome do participante é obrigatório.')
  if (fighterVariant !== 'male' && fighterVariant !== 'female') {
    fail('FIGHTER_VARIANT_REQUIRED', 'Variante do lutador deve ser male ou female.')
  }
  const participantId = id && id.trim() ? id.trim() : deps.ids.next('p')
  if (state.participants.some((p) => p.id === participantId)) {
    fail('DUPLICATE_PARTICIPANT_ID', `Participante com id '${participantId}' já cadastrado.`)
  }
  state.participants.push({
    id: participantId,
    name: trimmed,
    photoAssetId: photoAssetId ?? null,
    fightPhotoAssetId: null,
    fighterVariant,
    slug: slug ?? participantId,
    displayName: trimmed,
    avatar: avatar !== undefined ? avatar : getParticipantAvatar(participantId) ?? getParticipantAvatar(trimmed),
    bodyImage: bodyImage !== undefined ? bodyImage : getParticipantBodyImage(participantId) ?? getParticipantBodyImage(trimmed),
    fightAvatar: fightAvatar !== undefined ? fightAvatar : getParticipantFightAvatar(participantId) ?? getParticipantFightAvatar(trimmed),
  })
}

function handleDefineTeam(
  state: TournamentState,
  command: Extract<Command, { type: 'DefineTeam' }>,
  deps: EngineDeps,
): void {
  if (state.status !== 'setup') fail('SETUP_LOCKED', 'Duplas só podem ser definidas na preparação.')
  if (state.teams.length >= TEAM_COUNT) fail('TEAM_LIMIT', 'Já existem 16 duplas.')
  if (command.participant1Id === command.participant2Id) {
    fail('SAME_MEMBER', 'Uma dupla precisa de 2 integrantes distintos.')
  }
  const p1 = state.participants.find((item) => item.id === command.participant1Id)
  const p2 = state.participants.find((item) => item.id === command.participant2Id)
  if (!p1 || !p2) fail('PARTICIPANT_MISSING', 'Integrante não cadastrado.')
  const used = occupiedParticipantIds(state)
  if (used.has(command.participant1Id) || used.has(command.participant2Id)) {
    fail('ALREADY_PAIRED', 'Participante já pertence a outra dupla.')
  }
  if (
    command.firstRevealParticipantId !== command.participant1Id &&
    command.firstRevealParticipantId !== command.participant2Id
  ) {
    fail('INVALID_FIRST_REVEAL', 'Quem aparece primeiro precisa ser um dos integrantes.')
  }
  if (state.teams.some((team) => team.revealOrder === command.revealOrder)) {
    fail('REVEAL_ORDER_TAKEN', 'Ordem de revelação já usada.')
  }
  state.teams.push({
    id: deps.ids.next('t'),
    name: command.name.trim() || `${p1.name} & ${p2.name}`,
    participant1Id: command.participant1Id,
    participant2Id: command.participant2Id,
    firstRevealParticipantId: command.firstRevealParticipantId,
    revealOrder: command.revealOrder,
    status: 'registered',
    guaranteedPrize: startingPrize(),
  })
}

function handleEditParticipant(
  state: TournamentState,
  participantId: string,
  name: string,
  fighterVariant: 'male' | 'female',
): void {
  if (state.status !== 'setup') fail('SETUP_LOCKED', 'Edição só é permitida na preparação.')
  const participant = state.participants.find((item) => item.id === participantId)
  if (!participant) fail('PARTICIPANT_MISSING', 'Participante não encontrado.')
  const trimmed = name.trim()
  if (!trimmed) fail('NAME_REQUIRED', 'Nome do participante é obrigatório.')
  if (fighterVariant !== 'male' && fighterVariant !== 'female') {
    fail('FIGHTER_VARIANT_REQUIRED', 'Variante do lutador deve ser male ou female.')
  }
  participant.name = trimmed
  participant.fighterVariant = fighterVariant
}

function handleRemoveParticipant(state: TournamentState, participantId: string): void {
  if (state.status !== 'setup') fail('SETUP_LOCKED', 'Remoção só é permitida na preparação.')
  const exists = state.participants.some((item) => item.id === participantId)
  if (!exists) fail('PARTICIPANT_MISSING', 'Participante não encontrado.')
  if (occupiedParticipantIds(state).has(participantId)) {
    fail('PARTICIPANT_IN_TEAM', 'Remova o participante da dupla antes de excluí-lo.')
  }
  state.participants = state.participants.filter((item) => item.id !== participantId)
}

function handleEditTeam(
  state: TournamentState,
  command: Extract<Command, { type: 'EditTeam' }>,
): void {
  if (state.status !== 'setup') fail('SETUP_LOCKED', 'Duplas só podem ser editadas na preparação.')
  const team = state.teams.find((item) => item.id === command.teamId)
  if (!team) fail('TEAM_MISSING', 'Dupla não encontrada.')
  if (command.participant1Id === command.participant2Id) {
    fail('SAME_MEMBER', 'Uma dupla precisa de 2 integrantes distintos.')
  }
  const p1 = state.participants.find((item) => item.id === command.participant1Id)
  const p2 = state.participants.find((item) => item.id === command.participant2Id)
  if (!p1 || !p2) fail('PARTICIPANT_MISSING', 'Integrante não cadastrado.')
  const used = occupiedParticipantIds(state)
  used.delete(team.participant1Id)
  used.delete(team.participant2Id)
  if (used.has(command.participant1Id) || used.has(command.participant2Id)) {
    fail('ALREADY_PAIRED', 'Participante já pertence a outra dupla.')
  }
  if (
    command.firstRevealParticipantId !== command.participant1Id &&
    command.firstRevealParticipantId !== command.participant2Id
  ) {
    fail('INVALID_FIRST_REVEAL', 'Quem aparece primeiro precisa ser um dos integrantes.')
  }
  if (state.teams.some((item) => item.id !== team.id && item.revealOrder === command.revealOrder)) {
    fail('REVEAL_ORDER_TAKEN', 'Ordem de revelação já usada.')
  }
  team.name = command.name.trim() || `${p1.name} & ${p2.name}`
  team.participant1Id = command.participant1Id
  team.participant2Id = command.participant2Id
  team.firstRevealParticipantId = command.firstRevealParticipantId
  team.revealOrder = command.revealOrder
}

function handleRemoveTeam(state: TournamentState, teamId: string): void {
  if (state.status !== 'setup') fail('SETUP_LOCKED', 'Duplas só podem ser desfeitas na preparação.')
  const exists = state.teams.some((item) => item.id === teamId)
  if (!exists) fail('TEAM_MISSING', 'Dupla não encontrada.')
  state.teams = state.teams.filter((item) => item.id !== teamId)
}

function handleStartTeamReveal(state: TournamentState): void {
  if (state.participants.length < PARTICIPANT_COUNT) {
    fail('NEED_32', 'Cadastre ao menos 32 participantes.')
  }
  if (state.teams.length !== TEAM_COUNT) fail('NEED_16', 'Cadastre exatamente 16 duplas.')
  for (const team of state.teams) {
    if (teamHasParticipant(team, team.participant1Id) === false) {
      fail('TEAM_BROKEN', 'Dupla inválida.')
    }
  }
  if (new Set(state.teams.flatMap((team) => [team.participant1Id, team.participant2Id])).size !== PARTICIPANT_COUNT) {
    fail('PAIRING_INCOMPLETE', 'As 16 duplas devem cobrir exatamente 32 participantes titulares.')
  }
  state.status = 'revealing_teams'
}

function handleRevealNextTeam(state: TournamentState): void {
  if (state.status !== 'revealing_teams') fail('NOT_REVEALING', 'Revelação de duplas não está ativa.')
  const next = [...state.teams]
    .filter((team) => team.status === 'registered')
    .sort((a, b) => a.revealOrder - b.revealOrder)[0]
  if (!next) fail('ALL_REVEALED', 'Todas as duplas já foram reveladas.')
  next.status = 'revealed'
  if (state.teams.every((team) => team.status === 'revealed')) {
    state.status = 'drawing_bracket'
  }
}

function handleDrawBracket(state: TournamentState, deps: EngineDeps): void {
  if (state.status !== 'drawing_bracket' && !(state.status === 'bracket_drawn' && !state.bracketConfirmed)) {
    fail('CANNOT_DRAW', 'Sorteio só ocorre após revelar as 16 duplas e antes de confirmar.')
  }
  if (state.bracketConfirmed) fail('BRACKET_LOCKED', 'Chave confirmada não pode ser sorteada de novo.')
  if (state.teams.length !== TEAM_COUNT) fail('NEED_16', 'Sorteio exige 16 duplas.')
  const ids = state.teams.map((team) => team.id)
  if (new Set(ids).size !== TEAM_COUNT) fail('DUPLICATE_TEAM', 'Dupla duplicada no sorteio.')
  const shuffled = deps.random.shuffle(ids)
  if (shuffled.length !== TEAM_COUNT) fail('DRAW_INVALID', 'Sorteio não usou 16 duplas.')
  const matches: Match[] = []
  for (let i = 0; i < OITAVAS_MATCH_COUNT; i += 1) {
    const teamAId = shuffled[i * 2]
    const teamBId = shuffled[i * 2 + 1]
    if (!teamAId || !teamBId) fail('DRAW_INVALID', 'Sorteio não gerou 8 confrontos.')
    matches.push({
      id: `oitavas-${i}`,
      stage: 'oitavas',
      position: i,
      teamAId,
      teamBId,
      scoreA: 0,
      scoreB: 0,
      status: 'pending',
      winnerTeamId: null,
    })
  }
  for (let i = 0; i < 4; i += 1) {
    matches.push({
      id: `quartas-${i}`,
      stage: 'quartas',
      position: i,
      teamAId: null,
      teamBId: null,
      scoreA: 0,
      scoreB: 0,
      status: 'pending',
      winnerTeamId: null,
    })
  }
  for (let i = 0; i < 2; i += 1) {
    matches.push({
      id: `semifinais-${i}`,
      stage: 'semifinais',
      position: i,
      teamAId: null,
      teamBId: null,
      scoreA: 0,
      scoreB: 0,
      status: 'pending',
      winnerTeamId: null,
    })
  }
  matches.push({
    id: 'final-0',
    stage: 'final',
    position: 0,
    teamAId: null,
    teamBId: null,
    scoreA: 0,
    scoreB: 0,
    status: 'pending',
    winnerTeamId: null,
  })
  state.matches = matches
  state.rounds = []
  state.bracketSeed = deps.random.seedLabel()
  state.status = 'bracket_drawn'
  for (const team of state.teams) {
    team.status = 'active'
  }
}

function handleConfirmBracket(state: TournamentState): void {
  if (state.status !== 'bracket_drawn') fail('NO_DRAW', 'Confirme somente após o sorteio.')
  if (state.matches.filter((match) => match.stage === 'oitavas').length !== OITAVAS_MATCH_COUNT) {
    fail('BAD_BRACKET', 'A chave precisa de 8 confrontos nas oitavas.')
  }
  state.bracketConfirmed = true
  state.status = 'in_progress'
}

function handleStartMatch(state: TournamentState, matchId: string): void {
  if (state.status !== 'in_progress') fail('NOT_IN_PROGRESS', 'Campeonato ainda não está em andamento.')
  if (hasMatchBlockingStart(state)) {
    const awaiting = state.matches.find((item) => item.status === 'awaiting_confirmation')
    if (awaiting) {
      fail(
        'MATCH_AWAITING_CONFIRM',
        'Confirme a classificação do confronto atual antes de iniciar outro.',
      )
    }
    fail('MATCH_IN_PROGRESS', 'Já existe um confronto ativo.')
  }
  const match = state.matches.find((item) => item.id === matchId)
  if (!match) fail('MATCH_MISSING', 'Confronto não encontrado.')
  if (!match.teamAId || !match.teamBId) fail('TEAMS_PENDING', 'Aguarde o vencedor da fase anterior.')
  if (match.status !== 'pending') fail('MATCH_NOT_PENDING', 'Confronto não está disponível.')
  match.status = 'active'
  match.scoreA = 0
  match.scoreB = 0
  state.activeMatchId = match.id
  state.activeRoundId = null
}

function handleSelectRound1(
  state: TournamentState,
  participantAId: string,
  participantBId: string,
  deps: EngineDeps,
): void {
  const match = requireMatch(state)
  if (match.status !== 'active') fail('MATCH_INACTIVE', 'Confronto inativo.')
  if (state.rounds.some((round) => round.matchId === match.id && round.number === 1)) {
    fail('R1_EXISTS', 'Rodada 1 já foi definida.')
  }
  if (!match.teamAId || !match.teamBId) fail('TEAMS_PENDING', 'Confrontos sem duplas.')
  participantOnTeam(state, match.teamAId, participantAId)
  participantOnTeam(state, match.teamBId, participantBId)
  const round: Round = {
    id: deps.ids.next('r'),
    matchId: match.id,
    number: 1,
    targetTimeMs: null,
    participantAId,
    participantBId,
    attemptA: null,
    attemptB: null,
    status: 'awaiting_target',
    winnerTeamId: null,
    differenceAMs: null,
    differenceBMs: null,
  }
  state.rounds.push(round)
  state.activeRoundId = round.id
}

function handleStartRound2(state: TournamentState, deps: EngineDeps): void {
  const match = requireMatch(state)
  const r1 = state.rounds.find((round) => round.matchId === match.id && round.number === 1)
  if (!r1 || r1.status !== 'confirmed') fail('R1_NOT_DONE', 'Rodada 2 só após confirmar a rodada 1.')
  if (match.scoreA >= WINS_TO_TAKE_MATCH || match.scoreB >= WINS_TO_TAKE_MATCH) {
    fail('MATCH_ALREADY_WON', 'Confronto já encerrado em 2x0.')
  }
  if (state.rounds.some((round) => round.matchId === match.id && round.number === 2)) {
    fail('R2_EXISTS', 'Rodada 2 já existe.')
  }
  if (!match.teamAId || !match.teamBId || !r1.participantAId || !r1.participantBId) {
    fail('R2_PLAYERS_MISSING', 'Não foi possível determinar os jogadores da R2.')
  }
  const teamA = requireTeam(state, match.teamAId)
  const teamB = requireTeam(state, match.teamBId)
  const participantAId = partnerOf(teamA, r1.participantAId)
  const participantBId = partnerOf(teamB, r1.participantBId)
  if (participantAId === r1.participantAId || participantBId === r1.participantBId) {
    fail('R2_REPEAT', 'Rodada 2 não pode repetir quem jogou a rodada 1.')
  }
  const round: Round = {
    id: deps.ids.next('r'),
    matchId: match.id,
    number: 2,
    targetTimeMs: null,
    participantAId,
    participantBId,
    attemptA: null,
    attemptB: null,
    status: 'awaiting_target',
    winnerTeamId: null,
    differenceAMs: null,
    differenceBMs: null,
  }
  state.rounds.push(round)
  state.activeRoundId = round.id
}

function handleSelectRound3(
  state: TournamentState,
  participantAId: string,
  participantBId: string,
  deps: EngineDeps,
): void {
  const match = requireMatch(state)
  if (match.scoreA !== 1 || match.scoreB !== 1) {
    fail('R3_NOT_ALLOWED', 'Rodada 3 só existe em 1x1.')
  }
  if (match.scoreA >= WINS_TO_TAKE_MATCH || match.scoreB >= WINS_TO_TAKE_MATCH) {
    fail('R3_AFTER_2X0', 'Rodada 3 é impossível após 2x0.')
  }
  const r2 = state.rounds.find((round) => round.matchId === match.id && round.number === 2)
  if (!r2 || r2.status !== 'confirmed') fail('R2_NOT_DONE', 'Rodada 3 só após a rodada 2.')
  if (state.rounds.some((round) => round.matchId === match.id && round.number === 3)) {
    fail('R3_EXISTS', 'Rodada 3 já existe.')
  }
  if (!match.teamAId || !match.teamBId) fail('TEAMS_PENDING', 'Confrontos sem duplas.')
  participantOnTeam(state, match.teamAId, participantAId)
  participantOnTeam(state, match.teamBId, participantBId)
  const round: Round = {
    id: deps.ids.next('r'),
    matchId: match.id,
    number: 3,
    targetTimeMs: null,
    participantAId,
    participantBId,
    attemptA: null,
    attemptB: null,
    status: 'awaiting_target',
    winnerTeamId: null,
    differenceAMs: null,
    differenceBMs: null,
  }
  state.rounds.push(round)
  state.activeRoundId = round.id
}

function handleRegisterTarget(state: TournamentState, seconds: number): void {
  const round = requireRound(state)
  if (round.status !== 'awaiting_target' && round.status !== 'awaiting_attempts') {
    fail('TARGET_LOCKED', 'Tempo-alvo não pode ser alterado neste momento.')
  }
  if (!(seconds > 0)) fail('INVALID_TIME', 'Tempo-alvo deve ser positivo.')
  round.targetTimeMs = secondsToMs(seconds)
  if (round.status === 'awaiting_target') round.status = 'awaiting_attempts'
  refreshCalculateReady(round)
}

function handleReceiveCandidate(
  state: TournamentState,
  command: Extract<Command, { type: 'ReceiveTimerCandidate' }>,
  deps: EngineDeps,
): void {
  const detected: DetectedTimerValue = {
    id: deps.ids.next('det'),
    valueMs: secondsToMs(command.valueSeconds),
    confidence: command.confidence,
    capturedAt: deps.clock.now(),
    status: 'pending',
    frameId: command.frameId,
  }
  state.detectedValues.push(detected)

  let pendingCount = 0
  for (let i = state.detectedValues.length - 1; i >= 0; i--) {
    if (state.detectedValues[i].status === 'pending') {
      pendingCount++
      if (pendingCount > 5) {
        state.detectedValues[i].status = 'discarded'
      }
    }
  }
}

function handleAssignTimer(
  state: TournamentState,
  detectedValueId: string,
  participantId: string,
  deps: EngineDeps,
): void {
  const round = requireRound(state)
  requireMatch(state)
  if (round.status !== 'awaiting_attempts' && round.status !== 'ready_to_calculate') {
    fail('ASSIGN_LOCKED', 'Atribuição não permitida neste estado.')
  }
  const detected = state.detectedValues.find((item) => item.id === detectedValueId)
  if (!detected || detected.status !== 'pending') {
    fail('CANDIDATE_MISSING', 'Candidato de tempo indisponível.')
  }
  const attempt = createAttempt(deps, participantId, detected.valueMs, 'timer_capture', detected.id)
  assignAttempt(round, attempt)
  detected.status = 'assigned'
  refreshCalculateReady(round)
}

function handleManualTime(
  state: TournamentState,
  participantId: string,
  seconds: number,
  deps: EngineDeps,
): void {
  const round = requireRound(state)
  requireMatch(state)
  if (round.status !== 'awaiting_attempts' && round.status !== 'ready_to_calculate' && round.status !== 'awaiting_target') {
    fail('MANUAL_LOCKED', 'Entrada manual não permitida neste estado.')
  }
  if (round.targetTimeMs === null) fail('NEED_TARGET', 'Registre o tempo-alvo antes da tentativa.')
  if (!(seconds > 0)) fail('INVALID_TIME', 'Tempo manual deve ser positivo.')
  const attempt = createAttempt(deps, participantId, secondsToMs(seconds), 'manual', null)
  assignAttempt(round, attempt)
  if (round.status === 'awaiting_target') round.status = 'awaiting_attempts'
  refreshCalculateReady(round)
}

function handleCalculate(state: TournamentState): void {
  const round = requireRound(state)
  if (round.status !== 'ready_to_calculate') {
    fail('CALCULATE_BLOCKED', 'Cálculo só com os dois tempos atribuídos e ainda não confirmado.')
  }
  if (round.targetTimeMs === null || !round.attemptA || !round.attemptB) {
    fail('CALCULATE_BLOCKED', 'Cálculo exige alvo e duas tentativas.')
  }
  const match = requireMatch(state)
  const diffA = absoluteDifference(round.attemptA.valueMs, round.targetTimeMs)
  const diffB = absoluteDifference(round.attemptB.valueMs, round.targetTimeMs)
  round.differenceAMs = diffA
  round.differenceBMs = diffB
  if (diffA === diffB) {
    round.status = 'tie'
    round.winnerTeamId = null
    return
  }
  round.winnerTeamId = diffA < diffB ? match.teamAId : match.teamBId
  round.status = 'calculated'
}

function handleReveal(state: TournamentState): void {
  const round = requireRound(state)
  if (round.status !== 'calculated' && round.status !== 'tie') {
    fail('REVEAL_LOCKED', 'Revele somente após calcular.')
  }
  if (round.status === 'tie') return
  round.status = 'revealed'
}

function handleConfirmRound(state: TournamentState): void {
  const round = requireRound(state)
  const match = requireMatch(state)
  if (round.status === 'tie') {
    fail('TIE_NO_SCORE', 'Empate de diferença não altera o placar. Inicie o desempate.')
  }
  if (round.status !== 'revealed' && round.status !== 'calculated') {
    fail('CONFIRM_LOCKED', 'Confirme somente após calcular e conferir.')
  }
  if (!round.winnerTeamId) fail('NO_ROUND_WINNER', 'Rodada sem vencedor.')
  if (round.winnerTeamId === match.teamAId) match.scoreA += 1
  if (round.winnerTeamId === match.teamBId) match.scoreB += 1
  round.status = 'confirmed'
  if (match.scoreA >= WINS_TO_TAKE_MATCH || match.scoreB >= WINS_TO_TAKE_MATCH) {
    match.status = 'awaiting_confirmation'
    match.winnerTeamId = match.scoreA >= WINS_TO_TAKE_MATCH ? match.teamAId : match.teamBId
  }
}

/**
 * Single operator action: validate times via CalculateRound, reveal on the
 * scoreboard, then commit the round. On difference tie, stops at `tie`
 * (no score change) so the operator can start a tiebreaker.
 */
function handleResolveRound(state: TournamentState): void {
  handleCalculate(state)
  const round = requireRound(state)
  if (round.status === 'tie') return
  handleReveal(state)
  handleConfirmRound(state)
}

function handleTiebreaker(state: TournamentState): void {
  const round = requireRound(state)
  if (round.status !== 'tie') fail('NOT_TIE', 'Desempate só após empate de diferença.')
  round.attemptA = null
  round.attemptB = null
  round.differenceAMs = null
  round.differenceBMs = null
  round.winnerTeamId = null
  round.status = round.targetTimeMs === null ? 'awaiting_target' : 'awaiting_attempts'
}

function handleConfirmMatch(state: TournamentState, matchId?: string): void {
  const match = matchId
    ? state.matches.find((item) => item.id === matchId)
    : requireMatch(state)
  if (!match) fail('MATCH_MISSING', 'Confronto não encontrado.')
  if (match.status !== 'awaiting_confirmation' || !match.winnerTeamId) {
    fail('MATCH_NOT_READY', 'Confirme o confronto somente com vencedor definido.')
  }
  if (!match.teamAId || !match.teamBId) fail('LOSER_MISSING', 'Dupla perdedora ausente.')
  requireTeam(state, match.winnerTeamId)
  const loserId = match.teamAId === match.winnerTeamId ? match.teamBId : match.teamAId
  if (!loserId) fail('LOSER_MISSING', 'Dupla perdedora ausente.')
  requireTeam(state, loserId)
  applyMatchClassification(state, match)
  if (state.activeMatchId === match.id) {
    state.activeMatchId = null
    state.activeRoundId = null
  }
}

const STAGE_RANK: Record<Match['stage'], number> = {
  oitavas: 0,
  quartas: 1,
  semifinais: 2,
  final: 3,
}

/** Deterministic fake times: team A closer to target → A wins the round. */
const SIM_TARGET_S = 1.5
const SIM_A_S = 1.4
const SIM_B_S = 1.9

function simulatePlayRound(
  state: TournamentState,
  deps: EngineDeps,
  participantAId: string,
  participantBId: string,
): void {
  handleRegisterTarget(state, SIM_TARGET_S)
  handleManualTime(state, participantAId, SIM_A_S, deps)
  handleManualTime(state, participantBId, SIM_B_S, deps)
  handleResolveRound(state)
}

/**
 * Finish the active match as a clean 2–0 for team A via the normal round path
 * (manual times + ResolveRound). Aborts an in-flight unfinished round by
 * completing remaining steps with the same deterministic times.
 */
function simulateActiveMatchToAwaiting(state: TournamentState, deps: EngineDeps): void {
  const match = requireMatch(state)
  if (!match.teamAId || !match.teamBId) fail('TEAMS_PENDING', 'Confrontos sem duplas.')
  const teamA = requireTeam(state, match.teamAId)
  const teamB = requireTeam(state, match.teamBId)

  let r1 = state.rounds.find((round) => round.matchId === match.id && round.number === 1)
  if (!r1) {
    handleSelectRound1(state, teamA.participant1Id, teamB.participant1Id, deps)
    r1 = state.rounds.find((round) => round.matchId === match.id && round.number === 1)
  }
  if (!r1?.participantAId || !r1.participantBId) {
    fail('R1_PLAYERS_MISSING', 'Rodada 1 sem jogadores para simular.')
  }
  if (r1.status !== 'confirmed') {
    r1.attemptA = null
    r1.attemptB = null
    r1.differenceAMs = null
    r1.differenceBMs = null
    r1.winnerTeamId = null
    r1.targetTimeMs = null
    r1.status = 'awaiting_target'
    state.activeRoundId = r1.id
    simulatePlayRound(state, deps, r1.participantAId, r1.participantBId)
  }

  if (match.scoreA >= WINS_TO_TAKE_MATCH || match.scoreB >= WINS_TO_TAKE_MATCH) return

  let r2 = state.rounds.find((round) => round.matchId === match.id && round.number === 2)
  if (!r2) {
    handleStartRound2(state, deps)
    r2 = state.rounds.find((round) => round.matchId === match.id && round.number === 2)
  }
  if (!r2?.participantAId || !r2.participantBId) {
    fail('R2_PLAYERS_MISSING', 'Rodada 2 sem jogadores para simular.')
  }
  if (r2.status !== 'confirmed') {
    r2.attemptA = null
    r2.attemptB = null
    r2.differenceAMs = null
    r2.differenceBMs = null
    r2.winnerTeamId = null
    r2.targetTimeMs = null
    r2.status = 'awaiting_target'
    state.activeRoundId = r2.id
    simulatePlayRound(state, deps, r2.participantAId, r2.participantBId)
  }
}

/**
 * Operator rehearsal: auto-advance the bracket with deterministic 2–0 wins for
 * team A until the final is ready to start, or until a champion is crowned.
 */
function handleSimulateBracketProgress(
  state: TournamentState,
  until: 'final' | 'champion',
  deps: EngineDeps,
): void {
  if (state.status === 'finished') {
    if (until === 'champion') return
    fail('ALREADY_FINISHED', 'Campeonato já encerrado — use reinício de ensaio.')
  }
  if (state.status !== 'in_progress') {
    fail('NOT_IN_PROGRESS', 'Simulação exige chave confirmada e campeonato em andamento.')
  }

  for (let guard = 0; guard < 64; guard += 1) {
    if (until === 'champion' && state.championTeamId) return

    const awaiting = state.matches.find((item) => item.status === 'awaiting_confirmation')
    if (awaiting) {
      // Stop before crowning so the operator can review Duo Qualified → Confirm.
      if (until === 'final' && awaiting.stage === 'final') return
      handleConfirmMatch(state, awaiting.id)
      continue
    }

    if (state.activeMatchId) {
      const active = state.matches.find((item) => item.id === state.activeMatchId)
      if (until === 'final' && active?.stage === 'final') return
      if (active?.status === 'active') {
        simulateActiveMatchToAwaiting(state, deps)
        continue
      }
      state.activeMatchId = null
      state.activeRoundId = null
    }

    const next = state.matches
      .filter((item) => item.status === 'pending' && item.teamAId && item.teamBId)
      .sort(
        (a, b) =>
          STAGE_RANK[a.stage] - STAGE_RANK[b.stage] || a.position - b.position,
      )[0]

    if (!next) {
      if (until === 'final') return
      fail('SIMULATE_STUCK', 'Não há confrontos pendentes para simular.')
    }

    if (until === 'final' && next.stage === 'final') return

    handleStartMatch(state, next.id)
    simulateActiveMatchToAwaiting(state, deps)
  }

  fail('SIMULATE_LIMIT', 'Simulação excedeu o limite de confrontos.')
}

export function handleCommand(
  current: TournamentState,
  command: Command,
  deps: EngineDeps,
): TournamentState {
  const state = clone(current)
  switch (command.type) {
    case 'RegisterParticipant':
      handleRegisterParticipant(state, command, deps)
      break
    case 'EditParticipant':
      handleEditParticipant(state, command.participantId, command.name, command.fighterVariant)
      break
    case 'RemoveParticipant':
      handleRemoveParticipant(state, command.participantId)
      break
    case 'UploadParticipantPhoto': {
      const participant = state.participants.find((item) => item.id === command.participantId)
      if (!participant) fail('PARTICIPANT_MISSING', 'Participante não encontrado.')
      participant.photoAssetId = command.photoAssetId
      break
    }
    case 'UploadParticipantFightPhoto': {
      const participant = state.participants.find((item) => item.id === command.participantId)
      if (!participant) fail('PARTICIPANT_MISSING', 'Participante não encontrado.')
      participant.fightPhotoAssetId = command.fightPhotoAssetId
      break
    }
    case 'DefineTeam':
      handleDefineTeam(state, command, deps)
      break
    case 'EditTeam':
      handleEditTeam(state, command)
      break
    case 'RemoveTeam':
      handleRemoveTeam(state, command.teamId)
      break
    case 'StartTeamReveal':
      handleStartTeamReveal(state)
      break
    case 'RevealNextTeam':
      handleRevealNextTeam(state)
      break
    case 'DrawBracket':
      handleDrawBracket(state, deps)
      break
    case 'ConfirmBracket':
      handleConfirmBracket(state)
      break
    case 'StartMatch':
      handleStartMatch(state, command.matchId)
      break
    case 'SelectRound1Players':
      handleSelectRound1(state, command.participantAId, command.participantBId, deps)
      break
    case 'StartRound2':
      handleStartRound2(state, deps)
      break
    case 'SelectRound3Representatives':
      handleSelectRound3(state, command.participantAId, command.participantBId, deps)
      break
    case 'RegisterTargetTime':
      handleRegisterTarget(state, command.seconds)
      break
    case 'ReceiveTimerCandidate':
      handleReceiveCandidate(state, command, deps)
      break
    case 'AssignTimerValue':
      handleAssignTimer(state, command.detectedValueId, command.participantId, deps)
      break
    case 'DiscardTimerCandidate': {
      const detected = state.detectedValues.find((item) => item.id === command.detectedValueId)
      if (!detected) fail('CANDIDATE_MISSING', 'Candidato inexistente.')
      detected.status = 'discarded'
      break
    }
    case 'RegisterManualTime':
      handleManualTime(state, command.participantId, command.seconds, deps)
      break
    case 'CalculateRound':
      handleCalculate(state)
      break
    case 'RevealRound':
      handleReveal(state)
      break
    case 'ConfirmRound':
      handleConfirmRound(state)
      break
    case 'ResolveRound':
      handleResolveRound(state)
      break
    case 'StartTiebreaker':
      handleTiebreaker(state)
      break
    case 'ConfirmMatchWinner':
      handleConfirmMatch(state, command.matchId)
      break
    case 'ClearCameraCandidates':
      for (const detected of state.detectedValues) {
        if (
          detected.status === 'pending' &&
          !detected.frameId?.startsWith('mock-') &&
          detected.frameId !== 'local-sim'
        ) {
          detected.status = 'discarded'
        }
      }
      break
    case 'SimulateBracketProgress':
      handleSimulateBracketProgress(state, command.until, deps)
      break
  }
  return state
}