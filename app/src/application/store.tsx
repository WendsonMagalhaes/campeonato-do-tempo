import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createBroadcastDisplay } from '../adapters/display/broadcastChannel.ts'
import { createLocalAudio } from '../adapters/audio/localAudio.ts'
import { createLocalhostTimerCapture, createMockTimerCapture } from '../adapters/timerCapture/timerCapture.ts'
import type { Command } from '../domain/commands.ts'
import { DomainError } from '../domain/errors.ts'
import { handleCommand } from '../domain/engine.ts'
import { projectOperator, projectScoreboard } from '../domain/projections.ts'
import { applyOfficialSetup } from '../domain/seed.ts'
import { createInitialState, createLiveDeps } from '../domain/state.ts'
import { fakeShuffleDestination } from '../domain/teams.ts'
import type { TournamentState } from '../domain/types.ts'
import { createIndexedDbPersistence } from '../persistence/indexedDb.ts'

interface Store {
  state: TournamentState
  photos: Record<string, string>
  persistenceLabel: string
  error: string | null
  dispatch: (command: Command) => void
  undo: () => void
  loadOfficialRoster: () => void
  seedDemo: () => void
  uploadPhoto: (participantId: string, dataUrl: string) => Promise<void>
  uploadFightPhoto: (participantId: string, dataUrl: string) => Promise<void>
  exportBackup: () => Promise<string>
  importBackup: (json: string) => Promise<void>
  simulateTimer: (seconds: number) => void
  revealNextWithCinematic: () => void
  /** Roda DrawBracket e transmite a revelação ao telão dupla por dupla. */
  drawBracketWithCinematic: () => void
  /** Embaralha a ordem de revelação das duplas (state.teams[].revealOrder). Pode ser chamado várias vezes antes de iniciar a revelação. Empilha no histórico de undo. */
  shuffleTeamRevealOrder: () => void
  /** Live draft highlight on scoreboard before SelectRound3Representatives confirm. */
  publishRound3Draft: (participantAId: string | null, participantBId: string | null) => void
}

const Ctx = createContext<Store | null>(null)

export function TournamentProvider({ children }: { children: ReactNode }) {
  const depsRef = useRef(createLiveDeps())
  const persistence = useRef(createIndexedDbPersistence()).current
  const audio = useRef(createLocalAudio()).current
  const display = useRef(createBroadcastDisplay()).current
  const mockTimer = useRef(createMockTimerCapture()).current
  const localTimer = useRef(createLocalhostTimerCapture()).current
  const history = useRef<TournamentState[]>([])
  const stateRef = useRef<TournamentState>(createInitialState())
  const [state, setState] = useState<TournamentState>(stateRef.current)
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [persistenceLabel, setPersistenceLabel] = useState('carregando…')
  const [error, setError] = useState<string | null>(null)

  const commit = useCallback((next: TournamentState, sound?: string) => {
    stateRef.current = next
    setState(next)
    display.publish(JSON.stringify(projectScoreboard(next)))
    if (sound) audio.play(sound)
    void persistence.save(next).then(() => {
      setPersistenceLabel(`salvo ${new Date().toLocaleTimeString('pt-BR')}`)
    })
  }, [audio, display, persistence])

  const dispatch = useCallback((command: Command) => {
    setError(null)
    try {
      history.current.push(structuredClone(stateRef.current))
      const next = handleCommand(stateRef.current, command, depsRef.current)
      const active = next.rounds.find((round) => round.id === next.activeRoundId)
      const sound =
        command.type === 'ConfirmBracket' ? 'bracket_lock'
          : command.type === 'ConfirmRound' ? 'round_win'
            : command.type === 'ConfirmMatchWinner' ? 'match_win'
              : command.type === 'RevealRound' ? 'round_reveal'
                : command.type === 'CalculateRound' && active?.status === 'tie' ? 'tie'
                  // Assign time: soft pack lock click — never the old synthetic ui_confirm blip.
                  : command.type === 'AssignTimerValue' || command.type === 'RegisterManualTime'
                    ? 'ui_select'
                    : 'ui_confirm'
      commit(next, sound)
    } catch (err) {
      history.current.pop()
      audio.play('error')
      setError(err instanceof DomainError ? err.message : 'Falha no comando.')
    }
  }, [audio, commit])

  useEffect(() => {
    void persistence.load().then(async (loaded) => {
      if (loaded) {
        commit(loaded)
        setPersistenceLabel('restaurado')
        const nextPhotos: Record<string, string> = {}
        for (const person of loaded.participants) {
          if (person.photoAssetId) {
            const data = await persistence.getPhoto(person.photoAssetId)
            if (data) nextPhotos[person.photoAssetId] = data
          }
          if (person.fightPhotoAssetId) {
            const data = await persistence.getPhoto(person.fightPhotoAssetId)
            if (data) nextPhotos[person.fightPhotoAssetId] = data
          }
        }
        if (Object.keys(nextPhotos).length > 0) {
          setPhotos((current) => ({ ...current, ...nextPhotos }))
        }
      } else {
        const initial = applyOfficialSetup(depsRef.current)
        commit(initial)
        setPersistenceLabel('elenco oficial carregado')
      }
    })
    const onCandidate = (candidate: {
      valueSeconds: number
      confidence?: number
      frameId?: string | null
    }) => {
      // Remover retorno sonoro a pedido do usuário (audio.play('timer_detected'))
      try {
        const next = handleCommand(stateRef.current, {
          type: 'ReceiveTimerCandidate',
          valueSeconds: candidate.valueSeconds,
          confidence: candidate.confidence ?? 1,
          frameId: candidate.frameId ?? null,
        }, depsRef.current)
        commit(next)
      } catch {
        /* candidato ignorado se o domínio rejeitar */
      }
    }
    void mockTimer.start(onCandidate)
    void localTimer.start(onCandidate)
    return () => {
      void mockTimer.stop()
      void localTimer.stop()
    }
  }, [audio, commit, localTimer, mockTimer, persistence])

  const value = useMemo<Store>(() => ({
    state,
    photos,
    persistenceLabel,
    error,
    dispatch,
    undo() {
      const previous = history.current.pop()
      if (!previous) {
        setError('Nada para desfazer.')
        return
      }
      setError(null)
      commit(previous)
    },
    loadOfficialRoster() {
      history.current = []
      commit(applyOfficialSetup(depsRef.current))
    },
    seedDemo() {
      history.current = []
      commit(applyOfficialSetup(depsRef.current))
    },
    async uploadPhoto(participantId, dataUrl) {
      const id = `photo_${participantId}`
      await persistence.savePhoto(id, dataUrl)
      setPhotos((current) => ({ ...current, [id]: dataUrl }))
      dispatch({ type: 'UploadParticipantPhoto', participantId, photoAssetId: id })
    },
    async uploadFightPhoto(participantId, dataUrl) {
      const id = `fight_photo_${participantId}`
      await persistence.savePhoto(id, dataUrl)
      setPhotos((current) => ({ ...current, [id]: dataUrl }))
      dispatch({ type: 'UploadParticipantFightPhoto', participantId, fightPhotoAssetId: id })
    },
    exportBackup() {
      return persistence.exportBackup()
    },
    async importBackup(json) {
      const next = await persistence.importBackup(json)
      history.current = []
      commit(next, 'ui_confirm')
    },
    simulateTimer(seconds) {
      mockTimer.simulate(seconds)
    },
    revealNextWithCinematic() {
      const pending = [...stateRef.current.teams]
        .filter((team) => team.status === 'registered')
        .sort((a, b) => a.revealOrder - b.revealOrder)[0]
      if (pending) {
        const others = stateRef.current.participants
          .map((item) => item.id)
          .filter((id) => id !== pending.firstRevealParticipantId && id !== fakeShuffleDestination(pending))
        display.publishCinematic({
          type: 'fake_shuffle',
          firstParticipantId: pending.firstRevealParticipantId,
          destinationParticipantId: fakeShuffleDestination(pending),
          candidateIds: others,
          teamName: pending.name,
        })
      }
      dispatch({ type: 'RevealNextTeam' })
    },
    drawBracketWithCinematic() {
      dispatch({ type: 'DrawBracket' })
      const next = stateRef.current
      // Comando falhou (ex: chave já confirmada) — erro já foi setado pelo dispatch.
      if (next.status !== 'bracket_drawn') return
      const oitavas = [...next.matches]
        .filter((match) => match.stage === 'oitavas')
        .sort((a, b) => a.position - b.position)
      const order = oitavas.flatMap((match) => {
        if (!match.teamAId || !match.teamBId) return []
        return [
          { matchId: match.id, side: 'A' as const, teamId: match.teamAId },
          { matchId: match.id, side: 'B' as const, teamId: match.teamBId },
        ]
      })
      display.publishCinematic({ type: 'bracket_draw', order })
    },
    shuffleTeamRevealOrder() {
      history.current.push(structuredClone(stateRef.current))
      const shuffled = [...stateRef.current.teams]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      const next: TournamentState = {
        ...stateRef.current,
        teams: shuffled.map((team, index) => ({ ...team, revealOrder: index + 1 })),
      }
      commit(next, 'ui_select')
    },
    publishRound3Draft(participantAId, participantBId) {
      display.publishCinematic({
        type: 'round3_draft',
        participantAId,
        participantBId,
      })
    },
  }), [commit, dispatch, display, error, mockTimer, persistence, persistenceLabel, photos, state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTournament(): Store {
  const value = useContext(Ctx)
  if (!value) throw new Error('TournamentProvider ausente')
  return value
}

export function useOperatorView() {
  const store = useTournament()
  return { ...store, view: projectOperator(store.state, store.persistenceLabel) }
}