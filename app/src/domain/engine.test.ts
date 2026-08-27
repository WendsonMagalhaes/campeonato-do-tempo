import { describe, expect, it } from 'vitest'
import { fighterRuntimeKey } from '../battle/battle-assets.ts'
import { fakeShuffleDestination, fakeShuffleFrames } from './teams.ts'
import { handleCommand } from './engine.ts'
import { DomainError } from './errors.ts'
import { projectScoreboard } from './projections.ts'
import { applyDemoSetup, applyFullReveal } from './seed.ts'
import { createSeededRandom } from './state.ts'
import type { EngineDeps, TournamentState } from './types.ts'

function deps(seed = 7): EngineDeps {
  let n = 0
  return {
    random: createSeededRandom(seed),
    ids: {
      next(prefix: string) {
        n += 1
        return `${prefix}_${n}`
      },
    },
    clock: { now: () => '2026-08-13T00:00:00.000Z' },
  }
}

function readyMatch(seed = 7) {
  const d = deps(seed)
  let state = applyFullReveal(applyDemoSetup(d), d)
  state = handleCommand(state, { type: 'DrawBracket' }, d)
  state = handleCommand(state, { type: 'ConfirmBracket' }, d)
  const match = state.matches.find((item) => item.id === 'oitavas-0')
  if (!match?.teamAId || !match.teamBId) throw new Error('bracket incompleto')
  state = handleCommand(state, { type: 'StartMatch', matchId: match.id }, d)
  const teamA = state.teams.find((team) => team.id === match.teamAId)
  const teamB = state.teams.find((team) => team.id === match.teamBId)
  if (!teamA || !teamB) throw new Error('times ausentes')
  return { state, d, teamA, teamB, match }
}

function playRound(
  state: TournamentState,
  d: EngineDeps,
  secondsA: number,
  secondsB: number,
  participantAId: string,
  participantBId: string,
): TournamentState {
  let next = handleCommand(state, { type: 'RegisterTargetTime', seconds: 1.5 }, d)
  next = handleCommand(next, { type: 'RegisterManualTime', participantId: participantAId, seconds: secondsA }, d)
  next = handleCommand(next, { type: 'RegisterManualTime', participantId: participantBId, seconds: secondsB }, d)
  next = handleCommand(next, { type: 'ResolveRound' }, d)
  return next
}

describe('invariantes de domínio', () => {
  it('R1 válida seleciona um integrante de cada dupla', () => {
    const { state, d, teamA, teamB } = readyMatch()
    const next = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    const round = next.rounds[0]
    expect(round?.number).toBe(1)
    expect(round?.participantAId).toBe(teamA.participant1Id)
    expect(round?.participantBId).toBe(teamB.participant1Id)
  })

  it('R2 força os jogadores restantes e rejeita repetição', () => {
    const { state, d, teamA, teamB } = readyMatch()
    let next = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    next = playRound(next, d, 1.4, 1.9, teamA.participant1Id, teamB.participant1Id)
    next = handleCommand(next, { type: 'StartRound2' }, d)
    const r2 = next.rounds.find((round) => round.number === 2)
    expect(r2?.participantAId).toBe(teamA.participant2Id)
    expect(r2?.participantBId).toBe(teamB.participant2Id)
    expect(r2?.participantAId).not.toBe(teamA.participant1Id)
    expect(r2?.participantBId).not.toBe(teamB.participant1Id)
  })

  it('2x0 termina e R3 é impossível', () => {
    const { state, d, teamA, teamB } = readyMatch()
    let next = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    next = playRound(next, d, 1.4, 1.9, teamA.participant1Id, teamB.participant1Id)
    next = handleCommand(next, { type: 'StartRound2' }, d)
    const r2 = next.rounds.find((round) => round.number === 2)
    if (!r2?.participantAId || !r2.participantBId) throw new Error('r2')
    next = playRound(next, d, 1.45, 1.8, r2.participantAId, r2.participantBId)
    const match = next.matches.find((item) => item.id === next.activeMatchId)
    expect(match?.scoreA).toBe(2)
    expect(match?.status).toBe('awaiting_confirmation')
    expect(() =>
      handleCommand(next, {
        type: 'SelectRepresentatives',
        participantAId: teamA.participant1Id,
        participantBId: teamB.participant1Id,
      }, d),
    ).toThrow(DomainError)
  })

  it('1x1 abre R3 e aceita qualquer integrante', () => {
    const { state, d, teamA, teamB } = readyMatch()
    let next = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    next = playRound(next, d, 1.4, 1.9, teamA.participant1Id, teamB.participant1Id)
    next = handleCommand(next, { type: 'StartRound2' }, d)
    const r2 = next.rounds.find((round) => round.number === 2)
    if (!r2?.participantAId || !r2.participantBId) throw new Error('r2')
    next = playRound(next, d, 1.9, 1.4, r2.participantAId, r2.participantBId)
    const match = next.matches.find((item) => item.id === next.activeMatchId)
    expect(match?.scoreA).toBe(1)
    expect(match?.scoreB).toBe(1)
    next = handleCommand(next, {
      type: 'SelectRepresentatives',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant2Id,
    }, d)
    const r3 = next.rounds.find((round) => round.number === 3)
    expect(r3?.participantAId).toBe(teamA.participant1Id)
    expect(r3?.participantBId).toBe(teamB.participant2Id)
  })

  it('empate não pontua e exige desempate', () => {
    const { state, d, teamA, teamB } = readyMatch()
    let next = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    next = handleCommand(next, { type: 'RegisterTargetTime', seconds: 1.5 }, d)
    next = handleCommand(next, { type: 'RegisterManualTime', participantId: teamA.participant1Id, seconds: 1.4 }, d)
    next = handleCommand(next, { type: 'RegisterManualTime', participantId: teamB.participant1Id, seconds: 1.6 }, d)
    next = handleCommand(next, { type: 'ResolveRound' }, d)
    const round = next.rounds[0]
    expect(round?.status).toBe('tie')
    const match = next.matches.find((item) => item.id === next.activeMatchId)
    expect(match?.scoreA).toBe(0)
    expect(match?.scoreB).toBe(0)
    expect(() => handleCommand(next, { type: 'ConfirmRound' }, d)).toThrow(DomainError)
    next = handleCommand(next, { type: 'StartTiebreaker' }, d)
    expect(next.rounds[0]?.attemptA).toBeNull()
  })

  it('ResolveRound calcula, revela e confirma em um comando', () => {
    const { state, d, teamA, teamB } = readyMatch()
    let next = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    next = handleCommand(next, { type: 'RegisterTargetTime', seconds: 1.5 }, d)
    next = handleCommand(next, { type: 'RegisterManualTime', participantId: teamA.participant1Id, seconds: 1.41 }, d)
    next = handleCommand(next, { type: 'RegisterManualTime', participantId: teamB.participant1Id, seconds: 1.8 }, d)
    next = handleCommand(next, { type: 'ResolveRound' }, d)
    const round = next.rounds[0]
    expect(round?.status).toBe('confirmed')
    expect(round?.winnerTeamId).toBe(teamA.id)
    const match = next.matches.find((item) => item.id === next.activeMatchId)
    expect(match?.scoreA).toBe(1)
    expect(match?.scoreB).toBe(0)
  })

  it('fake shuffle termina na dupla cadastrada e não usa RNG no destino', () => {
    const d = deps()
    const state = applyDemoSetup(d)
    const team = state.teams[0]
    if (!team) throw new Error('team')
    expect(fakeShuffleDestination(team)).toBe(team.participant2Id)
    const frames = fakeShuffleFrames(team.participant2Id, () => 'noise', 8)
    expect(frames.at(-1)).toBe(team.participant2Id)
    const before = team.participant1Id
    const revealed = applyFullReveal(state, d)
    expect(revealed.teams[0]?.participant1Id).toBe(before)
    expect(revealed.teams[0]?.participant2Id).toBe(team.participant2Id)
  })

  it('bracket draw usa todas as duplas exatamente uma vez e gera 8 confrontos', () => {
    const d = deps(99)
    let state = applyFullReveal(applyDemoSetup(d), d)
    state = handleCommand(state, { type: 'DrawBracket' }, d)
    const oitavas = state.matches.filter((match) => match.stage === 'oitavas')
    expect(oitavas).toHaveLength(8)
    const used = oitavas.flatMap((match) => [match.teamAId, match.teamBId])
    expect(new Set(used).size).toBe(16)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)
    expect(() => handleCommand(state, { type: 'DrawBracket' }, d)).toThrow(DomainError)
  })

  it('candidato de timer não altera score e atribuição não calcula sozinha', () => {
    const { state, d, teamA, teamB } = readyMatch()
    let next = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    next = handleCommand(next, { type: 'RegisterTargetTime', seconds: 1.5 }, d)
    next = handleCommand(next, { type: 'ReceiveTimerCandidate', valueSeconds: 1.56, confidence: 0.9, frameId: 'f1' }, d)
    const match = next.matches.find((item) => item.id === next.activeMatchId)
    expect(match?.scoreA).toBe(0)
    const candidate = next.detectedValues[0]
    if (!candidate) throw new Error('candidate')
    next = handleCommand(next, {
      type: 'AssignTimerValue',
      detectedValueId: candidate.id,
      participantId: teamA.participant1Id,
    }, d)
    expect(next.rounds[0]?.status).toBe('awaiting_attempts')
    expect(next.rounds[0]?.winnerTeamId).toBeNull()
  })

  it('cálculo bloqueado sem dois tempos e fallback manual funciona', () => {
    const { state, d, teamA, teamB } = readyMatch()
    let next = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    next = handleCommand(next, { type: 'RegisterTargetTime', seconds: 1.5 }, d)
    expect(() => handleCommand(next, { type: 'CalculateRound' }, d)).toThrow(DomainError)
    next = handleCommand(next, { type: 'RegisterManualTime', participantId: teamA.participant1Id, seconds: 1.41 }, d)
    expect(() => handleCommand(next, { type: 'CalculateRound' }, d)).toThrow(DomainError)
    next = handleCommand(next, { type: 'RegisterManualTime', participantId: teamB.participant1Id, seconds: 1.8 }, d)
    next = handleCommand(next, { type: 'CalculateRound' }, d)
    expect(next.rounds[0]?.winnerTeamId).toBe(teamA.id)
  })

  it('ensaio completo chega na campeã via entrada manual', () => {
    const d = deps(3)
    let state = handleCommand(applyFullReveal(applyDemoSetup(d), d), { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)
    while (state.status !== 'finished') {
      const match = state.matches.find((item) => item.status === 'pending' && item.teamAId && item.teamBId)
      if (!match?.teamAId || !match.teamBId) throw new Error('sem confronto')
      const teamA = state.teams.find((team) => team.id === match.teamAId)
      const teamB = state.teams.find((team) => team.id === match.teamBId)
      if (!teamA || !teamB) throw new Error('duplas')
      state = handleCommand(state, { type: 'StartMatch', matchId: match.id }, d)
      state = handleCommand(state, {
        type: 'SelectRound1Players',
        participantAId: teamA.participant1Id,
        participantBId: teamB.participant1Id,
      }, d)
      state = playRound(state, d, 1.48, 1.9, teamA.participant1Id, teamB.participant1Id)
      state = handleCommand(state, { type: 'StartRound2' }, d)
      const r2 = state.rounds.find((round) => round.matchId === match.id && round.number === 2)
      if (!r2?.participantAId || !r2.participantBId) throw new Error('r2')
      state = playRound(state, d, 1.47, 1.88, r2.participantAId, r2.participantBId)
      state = handleCommand(state, { type: 'ConfirmMatchWinner' }, d)
    }
    expect(state.championTeamId).toBeTruthy()
    expect(state.teams.find((team) => team.id === state.championTeamId)?.guaranteedPrize).toBe(500)
  })

  function playMatchToAwaiting(
    state: TournamentState,
    d: EngineDeps,
    matchId: string,
  ): TournamentState {
    const match = state.matches.find((item) => item.id === matchId)
    if (!match?.teamAId || !match.teamBId) throw new Error(`match ${matchId} incompleto`)
    const teamA = state.teams.find((team) => team.id === match.teamAId)
    const teamB = state.teams.find((team) => team.id === match.teamBId)
    if (!teamA || !teamB) throw new Error('duplas')
    let next = handleCommand(state, { type: 'StartMatch', matchId }, d)
    next = handleCommand(next, {
      type: 'SelectRound1Players',
      participantAId: teamA.participant1Id,
      participantBId: teamB.participant1Id,
    }, d)
    next = playRound(next, d, 1.48, 1.9, teamA.participant1Id, teamB.participant1Id)
    next = handleCommand(next, { type: 'StartRound2' }, d)
    const r2 = next.rounds.find((round) => round.matchId === matchId && round.number === 2)
    if (!r2?.participantAId || !r2.participantBId) throw new Error('r2')
    next = playRound(next, d, 1.47, 1.88, r2.participantAId, r2.participantBId)
    const updated = next.matches.find((item) => item.id === matchId)
    expect(updated?.status).toBe('awaiting_confirmation')
    return next
  }

  it('oitavas confirmadas propagam vencedores e liberam as 4 quartas (uma por vez)', () => {
    const d = deps(21)
    let state = handleCommand(applyFullReveal(applyDemoSetup(d), d), { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)

    for (let i = 0; i < 8; i += 1) {
      state = playMatchToAwaiting(state, d, `oitavas-${i}`)
      state = handleCommand(state, { type: 'ConfirmMatchWinner' }, d)
    }

    const quartas = state.matches.filter((match) => match.stage === 'quartas')
    expect(quartas).toHaveLength(4)
    for (const q of quartas) {
      expect(q.teamAId).toBeTruthy()
      expect(q.teamBId).toBeTruthy()
      expect(q.status).toBe('pending')
    }

    // Product: one match at a time — first ready quarterfinal starts; others stay locked until confirm.
    state = handleCommand(state, { type: 'StartMatch', matchId: 'quartas-0' }, d)
    expect(state.activeMatchId).toBe('quartas-0')
    expect(() => handleCommand(state, { type: 'StartMatch', matchId: 'quartas-1' }, d)).toThrow(
      DomainError,
    )
  })

  it('não inicia outro confronto enquanto houver awaiting_confirmation (evita órfãos na chave)', () => {
    const d = deps(5)
    let state = handleCommand(applyFullReveal(applyDemoSetup(d), d), { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)
    state = playMatchToAwaiting(state, d, 'oitavas-0')

    expect(() => handleCommand(state, { type: 'StartMatch', matchId: 'oitavas-1' }, d)).toThrow(
      DomainError,
    )
    expect(state.matches.find((m) => m.id === 'oitavas-0')?.status).toBe('awaiting_confirmation')
    expect(state.matches.find((m) => m.id === 'quartas-0')?.teamAId).toBeNull()

    state = handleCommand(state, { type: 'ConfirmMatchWinner' }, d)
    const o0 = state.matches.find((m) => m.id === 'oitavas-0')
    const q0 = state.matches.find((m) => m.id === 'quartas-0')
    expect(o0?.status).toBe('completed')
    expect(q0?.teamAId).toBe(o0?.winnerTeamId)
    state = handleCommand(state, { type: 'StartMatch', matchId: 'oitavas-1' }, d)
    expect(state.activeMatchId).toBe('oitavas-1')
  })

  it('ConfirmMatchWinner com matchId confirma confronto órfão e propaga vencedor', () => {
    const d = deps(8)
    let state = handleCommand(applyFullReveal(applyDemoSetup(d), d), { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)
    state = playMatchToAwaiting(state, d, 'oitavas-0')
    // Simulate legacy bug: wipe active pointer while leaving awaiting_confirmation.
    state = {
      ...state,
      activeMatchId: null,
      activeRoundId: null,
    }
    state = handleCommand(state, { type: 'ConfirmMatchWinner', matchId: 'oitavas-0' }, d)
    const o0 = state.matches.find((m) => m.id === 'oitavas-0')
    expect(o0?.status).toBe('completed')
    expect(state.matches.find((m) => m.id === 'quartas-0')?.teamAId).toBe(o0?.winnerTeamId)
  })

  it('seed grava fighterVariant explícito (não alterna por índice)', () => {
    const d = deps(3)
    const state = applyDemoSetup(d)
    const byName = Object.fromEntries(state.participants.map((p) => [p.name, p.fighterVariant]))
    // Must match curated variants for official participants
    expect(byName['João']).toBe('male')
    expect(byName['Livia']).toBe('female')
    expect(byName['Adriel']).toBe('male')
    expect(byName['Ana']).toBe('female')
    expect(state.participants.every((p) => p.fighterVariant === 'male' || p.fighterVariant === 'female')).toBe(true)
  })

  it('participante female cadastrada aparece na batalha com sheet female do ativo', () => {
    const d = deps(19)
    let state = applyFullReveal(applyDemoSetup(d), d)
    state = handleCommand(state, { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)

    const livia = state.participants.find((p) => p.name === 'Livia')
    if (!livia) throw new Error('Livia ausente')
    expect(livia.fighterVariant).toBe('female')

    const herTeam = state.teams.find(
      (t) => t.participant1Id === livia.id || t.participant2Id === livia.id,
    )
    if (!herTeam) throw new Error('time da Livia')
    const match = state.matches.find(
      (m) => m.teamAId === herTeam.id || m.teamBId === herTeam.id,
    )
    if (!match?.teamAId || !match.teamBId) throw new Error('partida da Livia')

    state = handleCommand(state, { type: 'StartMatch', matchId: match.id }, d)
    const teamA = state.teams.find((t) => t.id === match.teamAId)
    const teamB = state.teams.find((t) => t.id === match.teamBId)
    if (!teamA || !teamB) throw new Error('times')

    const participantAId = match.teamAId === herTeam.id ? livia.id : teamA.participant1Id
    const participantBId = match.teamBId === herTeam.id ? livia.id : teamB.participant1Id
    state = handleCommand(state, {
      type: 'SelectRound1Players',
      participantAId,
      participantBId,
    }, d)

    const view = projectScoreboard(state)
    expect(view.versus?.activeAId).toBe(participantAId)
    expect(view.versus?.activeBId).toBe(participantBId)

    const left = view.versus?.membersA.find((m) => m.id === view.versus?.activeAId)
    const right = view.versus?.membersB.find((m) => m.id === view.versus?.activeBId)
    if (match.teamAId === herTeam.id) {
      expect(left?.name).toBe('Livia')
      expect(left?.fighterVariant).toBe('female')
      expect(fighterRuntimeKey('blue', left!.fighterVariant)).toBe('female_blue')
    } else {
      expect(right?.name).toBe('Livia')
      expect(right?.fighterVariant).toBe('female')
      expect(fighterRuntimeKey('red', right!.fighterVariant)).toBe('female_red')
    }
  })

  it('CRUD de participantes inclui fighterVariant e trava fora da preparação', () => {
    const d = deps(11)
    let state = applyDemoSetup(d)
    const participant = state.participants[0]
    if (!participant) throw new Error('participant')
    state = handleCommand(
      state,
      { type: 'EditParticipant', participantId: participant.id, name: 'Renomeado', fighterVariant: 'female' },
      d,
    )
    expect(state.participants[0]?.name).toBe('Renomeado')
    expect(state.participants[0]?.fighterVariant).toBe('female')

    const team = state.teams[0]
    if (!team) throw new Error('team')
    expect(() =>
      handleCommand(state, { type: 'RemoveParticipant', participantId: team.participant1Id }, d),
    ).toThrow(DomainError)

    state = handleCommand(state, {
      type: 'EditTeam',
      teamId: team.id,
      name: 'Dupla Editada',
      participant1Id: team.participant1Id,
      participant2Id: team.participant2Id,
      firstRevealParticipantId: team.participant2Id,
      revealOrder: team.revealOrder,
    }, d)
    expect(state.teams[0]?.name).toBe('Dupla Editada')
    expect(state.teams[0]?.firstRevealParticipantId).toBe(team.participant2Id)

    state = handleCommand(state, { type: 'RemoveTeam', teamId: team.id }, d)
    expect(state.teams.some((t) => t.id === team.id)).toBe(false)
    state = handleCommand(state, { type: 'RemoveParticipant', participantId: team.participant1Id }, d)
    expect(state.participants.some((p) => p.id === team.participant1Id)).toBe(false)

    const revealing = applyFullReveal(applyDemoSetup(d), d)
    const revealedTeam = revealing.teams[0]
    if (!revealedTeam) throw new Error('revealedTeam')
    expect(() =>
      handleCommand(revealing, {
        type: 'EditTeam',
        teamId: revealedTeam.id,
        name: 'x',
        participant1Id: revealedTeam.participant1Id,
        participant2Id: revealedTeam.participant2Id,
        firstRevealParticipantId: revealedTeam.participant1Id,
        revealOrder: revealedTeam.revealOrder,
      }, d),
    ).toThrow(DomainError)
  })
})

describe('SimulateBracketProgress (operator rehearsal)', () => {
  it('until=final deixa a final pendente com as duas duplas', () => {
    const d = deps(11)
    let state = handleCommand(applyFullReveal(applyDemoSetup(d), d), { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)
    state = handleCommand(state, { type: 'SimulateBracketProgress', until: 'final' }, d)

    const final = state.matches.find((match) => match.stage === 'final')
    expect(final?.teamAId).toBeTruthy()
    expect(final?.teamBId).toBeTruthy()
    expect(final?.status).toBe('pending')
    expect(state.status).toBe('in_progress')
    expect(state.championTeamId).toBeNull()
    expect(state.matches.filter((match) => match.stage === 'semifinais' && match.status === 'completed')).toHaveLength(2)
  })

  it('until=champion coroa a campeã via 2x0 determinísticos', () => {
    const d = deps(13)
    let state = handleCommand(applyFullReveal(applyDemoSetup(d), d), { type: 'DrawBracket' }, d)
    state = handleCommand(state, { type: 'ConfirmBracket' }, d)
    state = handleCommand(state, { type: 'SimulateBracketProgress', until: 'champion' }, d)

    expect(state.status).toBe('finished')
    expect(state.championTeamId).toBeTruthy()
    const champion = state.teams.find((team) => team.id === state.championTeamId)
    expect(champion?.status).toBe('champion')
    expect(champion?.guaranteedPrize).toBe(500)
    const projection = projectScoreboard(state)
    expect(projection.screen).toBe('champion')
  })

  it('rejeita fora de in_progress', () => {
    const d = deps(2)
    const setup = applyDemoSetup(d)
    expect(() =>
      handleCommand(setup, { type: 'SimulateBracketProgress', until: 'final' }, d),
    ).toThrow(DomainError)
  })
})
