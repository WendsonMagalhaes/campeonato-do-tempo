import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { createSupabaseDisplay } from '../adapters/display/supabaseChannel.ts'


interface Store {
  state: TournamentState
  photos: Record<string, string>
  persistenceLabel: string
  error: string | null
  dispatch: (command: Command) => void
  undo: () => void
  /** true enquanto ainda houver estados anteriores no histórico para desfazer. */
  canUndo: boolean
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
  /** Live draft highlight on scoreboard before SelectRound1Fighters confirm. */
  publishRound1Draft: (participantAId: string | null, participantBId: string | null) => void
  /** Live draft highlight on scoreboard before SelectRound3Representatives confirm. */
  publishRound3Draft: (participantAId: string | null, participantBId: string | null) => void
}

const Ctx = createContext<Store | null>(null)

/**
 * Duração estimada da animação de fake-shuffle exibida no telão (veja
 * `frameDelay` / `buildSpinFrames` em `ScoreboardApp.tsx`): 25 frames por
 * fase (spin1 + spin2), delay(i) = 55 + (i/24)^2 * 300ms, mais um gap de
 * 300ms entre as duas fases. Se o telão mudar frameCount, o gap entre fases
 * ou a curva de delay, atualize esta constante junto -- ela existe só pra
 * saber quanto tempo esperar aqui antes de marcar a dupla como "revelada"
 * (e portanto "off" na grade via usedParticipantIds).
 */
function estimateFakeShuffleDurationMs(frameCount: number): number {
  let total = 0
  for (let i = 0; i < frameCount; i += 1) {
    const t = i / Math.max(frameCount - 1, 1)
    total += 55 + t * t * 300
  }
  return total
}

const FAKE_SHUFFLE_FRAME_COUNT = 25
const FAKE_SHUFFLE_PHASE_GAP_MS = 300
const FAKE_SHUFFLE_SAFETY_BUFFER_MS = 500
const FAKE_SHUFFLE_ANIMATION_MS =
  estimateFakeShuffleDurationMs(FAKE_SHUFFLE_FRAME_COUNT) * 2 +
  FAKE_SHUFFLE_PHASE_GAP_MS +
  FAKE_SHUFFLE_SAFETY_BUFFER_MS

export function TournamentProvider({ children }: { children: ReactNode }) {
  const depsRef = useRef(createLiveDeps())
  const persistence = useRef(createIndexedDbPersistence()).current
  const audio = useRef(createLocalAudio()).current
  const display = useRef(
    createSupabaseDisplay(() => JSON.stringify(projectScoreboard(stateRef.current)))
  ).current
  const mockTimer = useRef(createMockTimerCapture()).current
  const localTimer = useRef(createLocalhostTimerCapture()).current
  const history = useRef<TournamentState[]>([])
  const stateRef = useRef<TournamentState>(createInitialState())
  const [state, setState] = useState<TournamentState>(stateRef.current)
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [persistenceLabel, setPersistenceLabel] = useState('carregando…')
  const [error, setError] = useState<string | null>(null)
  // Espelha history.current.length em estado React só para poder
  // desabilitar o botão "Desfazer" na UI quando não há mais nada para
  // desfazer. A pilha "de verdade" continua sendo o ref (history.current);
  // isto aqui é só um contador para renderização.
  const [historyLength, setHistoryLength] = useState(0)
  const syncHistoryLength = useCallback(() => {
    setHistoryLength(history.current.length)
  }, [])
  // Evita disparar uma segunda cinemática de fake-shuffle (e um segundo
  // RevealNextTeam) enquanto a animação da dupla atual ainda está rodando
  // no telão -- ver revealNextWithCinematic() abaixo.
  const revealInFlightRef = useRef(false)
  // Handle do setTimeout que dispara o RevealNextTeam ao fim da cinemática.
  // Guardado para poder ser cancelado se o operador clicar "Desfazer"
  // antes da animação terminar -- senão o RevealNextTeam agendado dispara
  // depois, em cima do estado já desfeito, e reintroduz a dupla fora de
  // ordem (ou revela uma dupla que o operador já tinha voltado atrás).
  const revealTimeoutRef = useRef<number | null>(null)

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
      syncHistoryLength()
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
      syncHistoryLength()
      audio.play('error')
      setError(err instanceof DomainError ? err.message : 'Falha no comando.')
    }
  }, [audio, commit, syncHistoryLength])

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
      // Proposital: leituras de câmera NÃO entram no histórico de undo.
      // Elas são candidatos passivos (o operador ainda precisa atribuir A/B
      // manualmente) e nunca devem contar como um "passo" desfazível --
      // desfazer não deve precisar "consumir" uma leitura de câmera que o
      // operador nem chegou a usar.
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
    canUndo: historyLength > 0,
    undo() {
      // Se havia uma revelação cinemática agendada para disparar depois
      // (RevealNextTeam via setTimeout em revealNextWithCinematic), cancela
      // agora -- senão ela dispararia mais tarde em cima do estado que
      // acabamos de restaurar, reintroduzindo a dupla fora de ordem.
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current)
        revealTimeoutRef.current = null
        revealInFlightRef.current = false
      }
      const previous = history.current.pop()
      syncHistoryLength()
      if (!previous) {
        setError('Nada para desfazer.')
        return
      }
      setError(null)
      commit(previous)
    },
    loadOfficialRoster() {
      history.current = []
      syncHistoryLength()
      commit(applyOfficialSetup(depsRef.current))
    },
    seedDemo() {
      history.current = []
      syncHistoryLength()
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
      syncHistoryLength()
      commit(next, 'ui_confirm')
    },
    simulateTimer(seconds) {
      mockTimer.simulate(seconds)
    },
    revealNextWithCinematic() {
      // Já existe uma animação em andamento para a dupla atual -- ignora o
      // clique repetido em vez de disparar uma segunda cinemática para a
      // mesma dupla (que ainda está com status 'registered').
      if (revealInFlightRef.current) return

      const pending = [...stateRef.current.teams]
        .filter((team) => team.status === 'registered')
        .sort((a, b) => a.revealOrder - b.revealOrder)[0]

      if (!pending) {
        // Nada pendente: deixa o domínio emitir o erro ALL_REVEALED normalmente.
        dispatch({ type: 'RevealNextTeam' })
        return
      }

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

      // Só marca a dupla como 'revealed' (o que a deixa "off"/cinza na
      // grade via usedParticipantIds, projetado em projectScoreboard) DEPOIS
      // que a animação de fake-shuffle já terminou de rodar no telão --
      // senão o estado persistido chega adiantado via display.publish() e a
      // dupla aparece cinza antes mesmo de ser sorteada/exibida.
      revealInFlightRef.current = true
      revealTimeoutRef.current = window.setTimeout(() => {
        revealInFlightRef.current = false
        revealTimeoutRef.current = null
        dispatch({ type: 'RevealNextTeam' })
      }, FAKE_SHUFFLE_ANIMATION_MS)
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
      syncHistoryLength()
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
    publishRound1Draft(participantAId, participantBId) {
      display.publishCinematic({
        type: 'round1_draft',
        participantAId,
        participantBId,
      })
    },
    publishRound3Draft(participantAId, participantBId) {
      display.publishCinematic({
        type: 'round3_draft',
        participantAId,
        participantBId,
      })
    },
  }), [commit, dispatch, display, error, historyLength, mockTimer, persistence, persistenceLabel, photos, state, syncHistoryLength])

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