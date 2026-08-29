import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createIndexedDbPersistence } from '../../persistence/indexedDb.ts'
import { projectScoreboard, type ScoreboardProjection } from '../../domain/projections.ts'
import type { CinematicEvent } from '../../application/ports.ts'
import { CHANNEL } from '../../domain/constants.ts'
import { BattleScene } from '../../battle/BattleScene.tsx'
import { ChampionScene } from '../../battle/ChampionScene.tsx'
import { DuoQualifiedScene } from '../../battle/DuoQualifiedScene.tsx'
import { prizeForLoser, prizeForWinner, type MatchStage } from '../../battle/prizeTable.ts'
import { globalAudio } from '../../audio/singleton.ts'
import { BracketScene, REVEAL_TOTAL_MS } from '../../copa-ui/runtime/BracketScene.tsx'
import type { CursorAnimState } from '../../copa-ui/components/selectionCursorFrames.ts'
import {
  TeamFormationScene,
  type FormationCursor,
  type FormationParticipant,
} from '../../copa-ui/runtime/TeamFormationScene.tsx'
import { OpeningScene } from '../../copa-ui/runtime/OpeningScene.tsx'
import { DuoSelectionScene } from '../../copa-ui/runtime/Round3SelectionScene.tsx'
import { RoundAnnounceScene } from '../../copa-ui/runtime/RoundAnnounceScene.tsx'
import {
  MATCH_KO_HOLD_MS,
  ROUND_WIN_HOLD_MS,
  ROUND_RESULT_HOLD_MS,
  resolveScoreboardLayers,
} from './scoreboardLayers.ts'
import { DuoRevealScene } from '../../copa-ui/runtime/DuoRevealScene.tsx'
import { parsePrizeAmount } from '../../battle/prizeAssets.ts' // ajuste o caminho relativo se necessário
import { subscribeScoreboardSupabase as subscribeScoreboard } from '../../adapters/display/supabaseChannel.ts'

// Tempo que a tela da dupla ELIMINADA (com o prêmio da fase em que caiu)
// fica em tela antes de trocar pra tela da dupla CLASSIFICADA (prêmio
// garantido da próxima fase).
const LOSER_PANEL_HOLD_MS = 8000

// Personagens que não devem participar do sorteio de duplas -- ficam
// "off"/cinza na grade do TeamFormationScene desde o início, sem passar
// pelo fluxo de "revelado" do domínio (não mexe em bracket, undo,
// persistência etc. -- é puramente visual, só na tela de sorteio).
// IMPORTANTE: os nomes abaixo precisam bater EXATAMENTE com
// projection.participants[].name (inclua sobrenome se houver mais de uma
// pessoa com o mesmo primeiro nome no elenco).
const PRE_EXCLUDED_PARTICIPANT_NAMES = new Set<string>([
  'Hiago',
  'Kelvin',
  'Fernando',
  'Hadassa',
  'Ester',
])

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const left = arr[i]
    const right = arr[j]
    if (left === undefined || right === undefined) continue
    arr[i] = right
    arr[j] = left
  }
  return arr
}
function buildSpinFrames(candidateIds: string[], destinationId: string, frameCount: number): string[] {
  const pool = candidateIds.length > 0 ? candidateIds : [destinationId]
  const frames: string[] = []
  while (frames.length < frameCount - 1) {
    frames.push(...shuffleArray(pool))
  }
  return [...frames.slice(0, frameCount - 1), destinationId]
}
function frameDelay(index: number, total: number): number {
  const t = index / Math.max(total - 1, 1)
  return 55 + t * t * 300
}
function usePhotoCache() {
  const persistence = useRef(createIndexedDbPersistence()).current
  const cacheRef = useRef(new Map<string, string>())
  const pendingRef = useRef(new Set<string>())
  const [, bump] = useState(0)
  const get = (photoAssetId: string | null | undefined): string | null => {
    if (!photoAssetId) return null
    if (photoAssetId.startsWith('/') || photoAssetId.startsWith('http')) return photoAssetId
    const cached = cacheRef.current.get(photoAssetId)
    if (cached) return cached
    if (!pendingRef.current.has(photoAssetId)) {
      pendingRef.current.add(photoAssetId)
      void persistence.getPhoto(photoAssetId).then((data) => {
        pendingRef.current.delete(photoAssetId)
        if (data) {
          cacheRef.current.set(photoAssetId, data)
          bump((n) => n + 1)
        }
      }).catch(() => {
        pendingRef.current.delete(photoAssetId)
      })
    }
    return null
  }
  return get
}

/** Acha o membro ativo (lado A ou B) pelo id, dentro de uma dupla — usado
 * pra montar os dados exibidos na RoundAnnounceScene. Inclui bodyImageUrl
 * (foto de corpo inteiro), mesmo campo já usado por DuoQualifiedScene e
 * ChampionScene. */
function findMemberById(
  members: ScoreboardProjection['versus'] extends infer V
    ? V extends { membersA: infer M }
    ? M
    : never
    : never,
  id: string | null,
) {
  if (!id) return undefined
  return (members as Array<{ id: string }>).find((m) => m.id === id) as
    | {
      id: string
      name: string
      photoAssetId: string | null
      avatarUrl: string | null
      bodyImageUrl?: string | null
    }
    | undefined
}

/**
 * `participantsRef` always mirrors the participants actually on screen,
 * so the spin frame pool never contains a stale/orphan id (the previous
 * cause of "freezes on one character but draws another").
 */
function useProjection() {
  const [projection, setProjection] = useState<ScoreboardProjection | null>(null)
  const [cinematic, setCinematic] = useState<CinematicEvent | null>(null)
  const [spinningId1, setSpinningId1] = useState<string | null>(null)
  const [spinningId2, setSpinningId2] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'spin1' | 'spin2' | 'landed'>('idle')
  const [round1Draft, setRound1Draft] = useState<{ a: string | null; b: string | null }>({
    a: null,
    b: null,
  })
  const [round3Draft, setRound3Draft] = useState<{ a: string | null; b: string | null }>({
    a: null,
    b: null,
  })
  const [bracketReveal, setBracketReveal] = useState<{
    active: boolean
    revealedKeys: Set<string>
    lastKey: string | null
  }>({ active: false, revealedKeys: new Set(), lastKey: null })

  const participantsRef = useRef<ScoreboardProjection['participants']>([])
  useEffect(() => {
    if (projection) participantsRef.current = projection.participants
  }, [projection])

  useEffect(() => {
    const persistence = createIndexedDbPersistence()
    void persistence.load().then((state) => {
      if (state) setProjection(projectScoreboard(state))
    })
    let generation = 0
    let bracketGeneration = 0
    const unsubscribe = subscribeScoreboard(
      (json) => setProjection(JSON.parse(json) as ScoreboardProjection),
      (event) => {
        setCinematic(event)
        if (event.type === 'round1_draft') {
          setRound1Draft({ a: event.participantAId, b: event.participantBId })
          return
        }
        if (event.type === 'round3_draft') {
          setRound3Draft({ a: event.participantAId, b: event.participantBId })
          return
        }
        if (event.type === 'bracket_draw') {
          bracketGeneration += 1
          const myGeneration = bracketGeneration
          setBracketReveal({ active: true, revealedKeys: new Set(), lastKey: null })
          // Intervalo entre a revelação de cada dupla no sorteio do bracket.
          // Nunca pode ser menor que REVEAL_TOTAL_MS (hold + voo), senão a
          // animação da dupla anterior é cortada quando a próxima começa.
          const STEP_DELAY_MS = REVEAL_TOTAL_MS + 300
          event.order.forEach((step, idx) => {
            window.setTimeout(() => {
              if (myGeneration !== bracketGeneration) return
              const key = `${step.matchId}-${step.side}`
              const isLast = idx === event.order.length - 1
              globalAudio.play(step.side === 'B' ? 'ui.selectionLock' : 'ui.cursorMove')
              setBracketReveal((prev) => {
                const revealedKeys = new Set(prev.revealedKeys)
                revealedKeys.add(key)
                return { active: !isLast, revealedKeys, lastKey: key }
              })
              if (isLast) globalAudio.play('bracket_lock')
            }, STEP_DELAY_MS * (idx + 1))
          })
          return
        }
        if (event.type === 'fake_shuffle') {
          generation += 1
          const myGeneration = generation
          setPhase('spin1')
          setSpinningId1(null)
          setSpinningId2(null)

          const onScreenIds = new Set(participantsRef.current.map((p) => p.id))
          const safePool = event.candidateIds.filter((id) => onScreenIds.has(id))
          const pool1 = safePool.includes(event.firstParticipantId)
            ? safePool
            : [...safePool, event.firstParticipantId]
          const pool2 = safePool.includes(event.destinationParticipantId)
            ? safePool
            : [...safePool, event.destinationParticipantId]

          const frames1 = buildSpinFrames(pool1, event.firstParticipantId, 25)
          const frames2 = buildSpinFrames(pool2, event.destinationParticipantId, 25)
          let lastSlotId: string | null = null
          const runFrame = (i: number, isPhase2: boolean) => {
            if (myGeneration !== generation) return
            const frames = isPhase2 ? frames2 : frames1
            const id = frames[Math.min(i, frames.length - 1)] ?? null
            if (isPhase2) {
              setSpinningId2(id ?? event.destinationParticipantId)
            } else {
              setSpinningId1(id ?? event.firstParticipantId)
            }
            if (i >= frames.length - 1) {
              globalAudio.play('ui.selectionLock')
              if (!isPhase2) {
                setPhase('spin2')
                lastSlotId = null
                window.setTimeout(() => runFrame(0, true), 300)
              } else {
                setPhase('landed')
              }
              return
            }
            if (id && id !== lastSlotId) {
              globalAudio.play('ui.cursorMove')
              lastSlotId = id
            }
            window.setTimeout(() => runFrame(i + 1, isPhase2), frameDelay(i, frames.length))
          }
          runFrame(0, false)
        }
      },
    )
    return unsubscribe
  }, [])
  return {
    projection,
    cinematic,
    spinningId1,
    spinningId2,
    phase,
    round1Draft,
    setRound1Draft,
    round3Draft,
    setRound3Draft,
    bracketReveal,
  }
}

/**
 * Renders every registered participant (no more fixed 32-slot cut), and
 * hands cursors to TeamFormationScene by `participantId` -- matching the
 * grid's own render order, so there is never a lookup mismatch.
 */
function FakeShuffleScreen({
  participants,
  phase,
  spinningId1,
  spinningId2,
  anchorId,
  destId,
  teamName,
  getPhoto,
  usedParticipantIds,
}: {
  participants: ScoreboardProjection['participants']
  phase: 'idle' | 'spin1' | 'spin2' | 'landed'
  spinningId1: string | null
  spinningId2: string | null
  anchorId: string | null
  destId: string | null
  teamName: string | null
  getPhoto: (photoAssetId: string | null | undefined) => string | null
  /** Ids of participants already drawn into a duo -- shown off/grayscale in the grid. */
  usedParticipantIds: Set<string>
}) {
  const [p1State, setP1State] = useState<CursorAnimState>('idle')
  const [p2State, setP2State] = useState<CursorAnimState>('idle')

  useEffect(() => {
    // IDLE = waiting + navigating; LOCK = confirmed. Never MOVE/SELECTED (invade neighbors).
    if (phase === 'idle' || phase === 'spin1') {
      setP1State('idle')
      setP2State('idle')
      return
    }
    if (phase === 'spin2') {
      setP1State('lock')
      setP2State('idle')
      return
    }
    setP1State('lock')
    setP2State('lock')
  }, [phase])

  const formationParticipants: FormationParticipant[] = useMemo(
    () =>
      participants.map((p) => ({
        id: p.id,
        name: p.name,
        photoUrl: (p.photoAssetId && getPhoto(p.photoAssetId)) || p.avatarUrl || null,
        avatarUrl: (p.photoAssetId && getPhoto(p.photoAssetId)) || p.avatarUrl || null,
        bodyImageUrl: p.bodyImageUrl || (p.photoAssetId && getPhoto(p.photoAssetId)) || p.avatarUrl || null,
      })),
    [participants, getPhoto],
  )

  const cursors: FormationCursor[] = []
  if (phase === 'spin1') {
    if (spinningId1) cursors.push({ player: 'p1', state: p1State, participantId: spinningId1 })
  } else if (phase === 'spin2' || phase === 'landed') {
    if (anchorId) cursors.push({ player: 'p1', state: p1State, participantId: anchorId })
    const p2Id = phase === 'spin2' ? spinningId2 : destId
    if (p2Id) cursors.push({ player: 'p2', state: p2State, participantId: p2Id })
  }

  // Same source ids as the grid cursors above, just fed into the side
  // spotlight panels instead: P1 (left) shows first, P2 (right) shows once
  // P1 is locked in.
  const spotlightLeftId = phase === 'idle' ? null : phase === 'spin1' ? spinningId1 : anchorId
  const spotlightRightId = phase === 'spin2' ? spinningId2 : phase === 'landed' ? destId : null

  const spotlightLeftParticipant = spotlightLeftId
    ? formationParticipants.find((p) => p.id === spotlightLeftId) ?? null
    : null
  const spotlightRightParticipant = spotlightRightId
    ? formationParticipants.find((p) => p.id === spotlightRightId) ?? null
    : null

  const status =
    phase === 'landed' ? 'DUPLA FORMADA'
      : phase === 'spin2' ? 'ESCOLHENDO PARCEIRO'
        : phase === 'spin1' ? 'SELECIONANDO DUPLA'
          : 'FORMANDO AS DUPLAS'

  return (
    <>
      <div className={`ce-formation-dim ${phase === 'landed' ? 'is-dimmed' : ''}`}>
        <TeamFormationScene
          participants={formationParticipants}
          cursors={cursors}
          status={status}
          backgroundUrl="/assets/backgrounds/draw-background.png"
          duoLabel={phase === 'landed' && teamName ? teamName : undefined}
          spotlightLeft={spotlightLeftParticipant ? { participant: spotlightLeftParticipant, state: p1State } : null}
          spotlightRight={spotlightRightParticipant ? { participant: spotlightRightParticipant, state: p2State } : null}
          usedParticipantIds={usedParticipantIds}
        />
      </div>
      {phase === 'landed' && spotlightLeftParticipant && spotlightRightParticipant ? (
        <DuoRevealScene
          teamName={teamName}
          memberA={spotlightLeftParticipant}
          memberB={spotlightRightParticipant}
        />
      ) : null}
    </>
  )
}

export function ScoreboardApp() {
  const {
    projection,
    cinematic,
    spinningId1,
    spinningId2,
    phase,
    round1Draft,
    setRound1Draft,
    round3Draft,
    setRound3Draft,
    bracketReveal,
  } = useProjection()
  const getPhoto = usePhotoCache()
  const playedOpeningRef = useRef(false)
  const lastScreenRef = useRef<string | undefined>(undefined)
  const lastRoundWinnerRef = useRef<string | null>(null)
  const lastMatchWinnerRef = useRef<string | null>(null)
  const lastRound3HoldRef = useRef<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [koHoldDone, setKoHoldDone] = useState(false)

  // Tracks which participants have already been drawn into a duo during the
  // current fake-shuffle run -- consumed by FakeShuffleScreen to show the
  // "off" frame + grayscale photo for already-paired participants in the grid.
  // This is only the *runtime* signal (fires the instant a duo lands, before
  // the operator's "revealed" status round-trips through persistence). The
  // durable signal lives in `projection.usedParticipantIds` -- see the merge
  // in `usedParticipantIds` below -- which is what survives a screen refresh.
  const usedParticipantIdsRef = useRef<Set<string>>(new Set())
  const [, bumpUsed] = useState(0)

  // Anúncio "quem vai lutar nessa rodada" (RoundAnnounceScene) — aparece
  // logo que a rodada entra em cena (Rodada 1 selecionada manualmente ou
  // Rodada 2 automática), por cima do BattleScene, e some sozinho.
  const [roundAnnounceHold, setRoundAnnounceHold] = useState(false)
  const lastRoundAnnounceKeyRef = useRef<string | null>(null)

  const handleUnlockAudio = useCallback(async () => {
    await globalAudio.unlock()
    setAudioUnlocked(true)
    if (projection?.screen === 'opening') {
      globalAudio.playMusic('introCinematic')
    } else if (projection?.screen === 'fake_shuffle' || projection?.screen === 'versus') {
      globalAudio.playMusic('teamSelect')
    } else if (projection?.screen === 'round') {
      globalAudio.playMusic('battleMain')
      globalAudio.playAmbience('coldRoom')
    } else if (projection?.screen === 'round3') {
      globalAudio.playMusic('round3Select')
    } else if (projection?.screen === 'champion' || projection?.screen === 'match_win') {
      globalAudio.playMusic('championCelebration')
      globalAudio.playAmbience('crowd')
    }
  }, [projection?.screen])

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      try {
        const testCtx = new AudioContextClass()
        if (testCtx.state === 'running') {
          globalAudio.unlock().then(() => setAudioUnlocked(true))
        }
        void testCtx.close()
      } catch (e) {
        console.warn('Auto-unlock test failed:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (audioUnlocked) return
    const onUserInteraction = () => {
      void handleUnlockAudio()
    }
    window.addEventListener('keydown', onUserInteraction)
    window.addEventListener('pointerdown', onUserInteraction)
    return () => {
      window.removeEventListener('keydown', onUserInteraction)
      window.removeEventListener('pointerdown', onUserInteraction)
    }
  }, [audioUnlocked, handleUnlockAudio])

  const [round3HoldDone, setRound3HoldDone] = useState(false)
  const koHold = projection?.screen === 'match_win' && !koHoldDone
  const round3Hold = projection?.screen === 'round3' && !round3HoldDone
  const prevMatchesRef = useRef(projection?.matches)
  const [focusMatchId, setFocusMatchId] = useState<string | null>(null)

  useEffect(() => {
    if (!projection) return
    if (prevMatchesRef.current) {
      const justCompleted = projection.matches.find(m =>
        m.status === 'completed' &&
        prevMatchesRef.current!.find(p => p.id === m.id)?.status !== 'completed'
      )
      if (justCompleted) {
        setFocusMatchId(justCompleted.id)
      }
    }
    prevMatchesRef.current = projection.matches
  }, [projection?.matches])

  // ---------------------------------------------------------------------
  // FIX: Rodada N -> N+1 dentro do MESMO confronto (screen continua
  // 'round' o tempo todo). O operador pode confirmar/avançar a rodada
  // antes da animação de resultado (walk-in -> soco -> impacto -> hurt ->
  // walk-back -> score-reveal) terminar. Isso derruba `versus.timesHidden`
  // de volta pra `true` assim que `activeRoundId` muda, o que zera o
  // `resultKey` dentro do BattleScene e cancela o timeline no meio
  // (sintoma: "anda um pouco e para", só funciona certo na Rodada 1
  // porque lá o operador demora mais pra confirmar).
  //
  // Solução: assim que uma rodada é revelada e NÃO decide o confronto
  // (matchPoint === false -- essas já são cobertas por koHold), tira um
  // snapshot desse `versus` e continua entregando ele pro BattleScene por
  // ROUND_RESULT_HOLD_MS, ignorando o que a projection real já avançou.
  // ---------------------------------------------------------------------
  const revealedVersusRef = useRef<ScoreboardProjection['versus']>(null)
  const revealedRoundKeyRef = useRef<string | null>(null)
  const [roundResultHoldDone, setRoundResultHoldDone] = useState(true)

  useEffect(() => {
    if (projection?.screen !== 'round') {
      revealedRoundKeyRef.current = null
      setRoundResultHoldDone(true)
      return
    }
    const v = projection.versus
    if (!v || v.timesHidden || !v.roundWinner || v.matchPoint) return

    const key = `${v.stage}-r${v.roundNumber}-${v.roundWinnerSide}-${v.scoreA}-${v.scoreB}`
    if (revealedRoundKeyRef.current === key) return

    revealedRoundKeyRef.current = key
    revealedVersusRef.current = v
    setRoundResultHoldDone(false)
    const t = window.setTimeout(() => setRoundResultHoldDone(true), ROUND_RESULT_HOLD_MS)
    return () => window.clearTimeout(t)
  }, [projection?.screen, projection?.versus])

  const roundResultHold = projection?.screen === 'round' && !roundResultHoldDone
  const versusForBattle =
    roundResultHold && revealedVersusRef.current ? revealedVersusRef.current : projection?.versus

  // Anúncio da rodada: dispara sempre que a chave entra em 'round' com os
  // dois participantes ativos já definidos (cobre Rodada 1 manual e Rodada 2
  // automática — ambas passam por screen === 'round' com activeAId/activeBId
  // preenchidos). Usa uma chave estável (estágio+rodada+dupla de ids) pra
  // não reabrir a cada re-render enquanto a mesma dupla ainda está lutando.
  useEffect(() => {
    if (!projection || projection.screen !== 'round' || !projection.versus) {
      lastRoundAnnounceKeyRef.current = null
      return
    }
    const { versus } = projection
    if (!versus.activeAId || !versus.activeBId) return

    const key = `${versus.stage}-r${versus.roundNumber}-${versus.activeAId}-${versus.activeBId}`
    if (lastRoundAnnounceKeyRef.current === key) return

    lastRoundAnnounceKeyRef.current = key
    setRoundAnnounceHold(true)
    const t = window.setTimeout(() => setRoundAnnounceHold(false), 2500)
    return () => window.clearTimeout(t)
  }, [projection])

  useEffect(() => {
    if (!projection) return
    if (projection.screen === 'opening' && !playedOpeningRef.current) {
      playedOpeningRef.current = true
      globalAudio.playMusic('introCinematic')
    }
    if (projection.screen !== 'opening') {
      playedOpeningRef.current = false
    }
    if (projection.screen === 'fake_shuffle') {
      globalAudio.playMusic('teamSelect')
      globalAudio.playAmbience(null)
    } else if (projection.screen === 'versus') {
      globalAudio.playMusic('teamSelect')
      globalAudio.playAmbience(null)
    } else if (projection.screen === 'round') {
      globalAudio.playMusic('battleMain')
      globalAudio.playAmbience('coldRoom')
    } else if (projection.screen === 'round3') {
      if (!round3Hold) {
        globalAudio.playMusic('round3Select')
        globalAudio.playAmbience(null)
      } else {
        globalAudio.playMusic('battleMain')
        globalAudio.playAmbience('coldRoom')
      }
    } else if (projection.screen === 'champion') {
      globalAudio.playMusic('championCelebration')
      globalAudio.playAmbience('crowd')
    } else if (projection.screen === 'match_win') {
      if (!koHold) {
        globalAudio.playMusic('championCelebration')
        globalAudio.playAmbience('crowd')
      }
    } else if (projection.screen !== 'opening') {
      globalAudio.playMusic(null)
    }
    if (projection.screen !== lastScreenRef.current) {
      if (projection.screen === 'versus' || projection.screen === 'round') {
        globalAudio.play('vs_impact')
      }
      if (projection.screen === 'round3') {
        setRound3Draft({ a: null, b: null })
      }
      // Nova janela de "versus" começando -- limpa o draft da seleção da
      // Rodada 1 pra não herdar highlight de um confronto anterior.
      if (projection.screen === 'versus' && lastScreenRef.current !== 'versus') {
        setRound1Draft({ a: null, b: null })
      }
      // New fake-shuffle run starting -- clear the "already paired" tracker.
      if (projection.screen === 'fake_shuffle' && lastScreenRef.current !== 'fake_shuffle') {
        usedParticipantIdsRef.current = new Set()
        bumpUsed((n) => n + 1)
      }
      if (projection.screen === 'bracket') {
        globalAudio.play('bracket_shuffle')
        setTimeout(() => globalAudio.play('bracket_lock'), 800)
      }
      if (projection.screen === 'champion') {
        globalAudio.play('champion')
        setFlash(true)
        setTimeout(() => setFlash(false), 400)
      }
      lastScreenRef.current = projection.screen
    }
    if (projection.versus?.roundWinner && projection.versus.roundWinner !== lastRoundWinnerRef.current) {
      lastRoundWinnerRef.current = projection.versus.roundWinner
    } else if (!projection.versus?.roundWinner) {
      lastRoundWinnerRef.current = null
    }
    if (projection.screen === 'match_win' && !lastMatchWinnerRef.current) {
      lastMatchWinnerRef.current = 'playing'
      setKoHoldDone(false)
      window.setTimeout(() => {
        setKoHoldDone(true)
        lastMatchWinnerRef.current = 'done'
        globalAudio.playMusic('championCelebration')
        globalAudio.playAmbience('crowd')
        globalAudio.play('crowd.cheerBig')
      }, MATCH_KO_HOLD_MS)
    } else if (projection.screen !== 'match_win') {
      lastMatchWinnerRef.current = null
      setKoHoldDone(false)
    }
    if (projection.screen === 'round3' && projection.versus && !lastRound3HoldRef.current) {
      lastRound3HoldRef.current = 'playing'
      setRound3HoldDone(false)
      window.setTimeout(() => {
        setRound3HoldDone(true)
        lastRound3HoldRef.current = 'done'
        globalAudio.playMusic('round3Select')
        globalAudio.playAmbience(null)
      }, ROUND_WIN_HOLD_MS)
    } else if (projection.screen !== 'round3') {
      lastRound3HoldRef.current = null
      setRound3HoldDone(false)
    }
    if (projection.versus?.tie) {
      globalAudio.play('tie')
    }
  }, [projection, koHold, round3Hold, setRound1Draft, setRound3Draft])

  const anchorId = cinematic?.type === 'fake_shuffle' ? cinematic.firstParticipantId : null
  const destId = cinematic?.type === 'fake_shuffle' ? cinematic.destinationParticipantId : null

  // Once a duo "lands", mark both members as used so the grid greys them out
  // for the rest of the fake-shuffle run.
  useEffect(() => {
    if (phase === 'landed' && anchorId && destId) {
      if (!usedParticipantIdsRef.current.has(anchorId) || !usedParticipantIdsRef.current.has(destId)) {
        const next = new Set(usedParticipantIdsRef.current)
        next.add(anchorId)
        next.add(destId)
        usedParticipantIdsRef.current = next
        bumpUsed((n) => n + 1)
      }
    }
  }, [phase, anchorId, destId])

  // Merge the durable, persisted "revealed" participants (survives a screen
  // refresh, since it's derived straight from `state.teams` on every
  // projection) with the ephemeral in-run tracker above (covers the instant
  // a duo lands, ahead of the operator's confirm round-tripping back here)
  // and with the fixed pre-exclusion list (participants who must never be
  // drawn, marked "off" from the start -- see PRE_EXCLUDED_PARTICIPANT_NAMES).
  const usedParticipantIds = useMemo(() => {
    const persisted = projection?.usedParticipantIds ?? []
    const preExcluded = (projection?.participants ?? [])
      .filter((p) => PRE_EXCLUDED_PARTICIPANT_NAMES.has(p.name))
      .map((p) => p.id)
    if (
      persisted.length === 0 &&
      preExcluded.length === 0 &&
      usedParticipantIdsRef.current.size === 0
    ) {
      return usedParticipantIdsRef.current
    }
    return new Set([...persisted, ...preExcluded, ...usedParticipantIdsRef.current])
  }, [projection?.usedParticipantIds, projection?.participants, phase, anchorId, destId])

  // Sequência ao terminar um confronto: primeiro a dupla ELIMINADA (com o
  // prêmio da fase em que caiu), depois a dupla CLASSIFICADA (prêmio
  // garantido da próxima fase). `duoQualifiedArmedRef` garante que o timer
  // só é armado uma vez por confronto -- reseta quando sai de match_win.
  const [showWinnerPanel, setShowWinnerPanel] = useState(false)
  const duoQualifiedArmedRef = useRef(false)
  const showDuoQualifiedNow = projection?.screen === 'match_win' && !koHold && Boolean(projection?.versus)

  useEffect(() => {
    if (showDuoQualifiedNow && !duoQualifiedArmedRef.current) {
      duoQualifiedArmedRef.current = true
      setShowWinnerPanel(false)
      const t = window.setTimeout(() => setShowWinnerPanel(true), LOSER_PANEL_HOLD_MS)
      return () => window.clearTimeout(t)
    }
    if (!showDuoQualifiedNow) {
      duoQualifiedArmedRef.current = false
      setShowWinnerPanel(false)
    }
  }, [showDuoQualifiedNow])

  if (!projection) {
    return (
      <div className="scoreboard">
        <OpeningScene tournamentName="Copa Esperança" timelineEpoch={0} />
      </div>
    )
  }
  const layers = resolveScoreboardLayers({
    screen: projection.screen,
    hasVersus: Boolean(projection.versus),
    koHold,
    round3Hold,
  })
  const winnerSideBlue =
    projection.versus?.matchWinnerSide === 'left' ||
    (projection.versus != null &&
      projection.versus.matchWinnerSide == null &&
      projection.versus.scoreA > projection.versus.scoreB)

  // Dados dos 2 participantes ativos da rodada atual — usados só pela
  // RoundAnnounceScene abaixo. Foto de corpo (bodyImageUrl) tem prioridade
  // sobre o retrato de rosto.
  const roundAnnounceLeft = projection.versus
    ? findMemberById(projection.versus.membersA, projection.versus.activeAId)
    : undefined
  const roundAnnounceRight = projection.versus
    ? findMemberById(projection.versus.membersB, projection.versus.activeBId)
    : undefined

  return (
    <>
      {!audioUnlocked && (
        <div
          className="audio-unlock-overlay"
          onClick={handleUnlockAudio}
          role="button"
          tabIndex={0}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 48px',
              border: '3px solid #ffcc00',
              borderRadius: '8px',
              background: 'rgba(12, 12, 24, 0.92)',
              boxShadow: '0 0 35px rgba(255, 204, 0, 0.5), inset 0 0 25px rgba(255, 204, 0, 0.2)',
              textAlign: 'center',
              gap: '16px',
              maxWidth: '840px',
            }}
          >
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '22px',
                color: '#ffcc00',
                lineHeight: 1.6,
                textShadow: '0 0 12px #ff8800, 2px 2px 0px #000',
                animation: 'blink 1.2s steps(2, start) infinite',
              }}
            >
              ▶ CLIQUE NA TELA PARA INICIAR
            </div>
            <div
              style={{
                fontFamily: "'VT323', monospace",
                fontSize: '28px',
                color: '#e0e0e0',
                letterSpacing: '1px',
                textShadow: '1px 1px 2px #000',
              }}
            >
              Toque ou clique em qualquer lugar para ativar o som do telão
            </div>
            <div
              style={{
                fontSize: '13px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#00ffff',
                marginTop: '6px',
                letterSpacing: '1px',
                textShadow: '0 0 8px #00ffff',
              }}
            >
              [ PRESS START / CLICK TO UNLOCK AUDIO ]
            </div>
          </div>
        </div>
      )}
      <div className={`scoreboard ${flash ? 'flash-white' : ''}`}>
        {projection.screen === 'opening' ? (
          <OpeningScene
            tournamentName={projection.tournamentName}
            timelineEpoch={audioUnlocked ? 'unlocked' : 'locked'}
          />
        ) : null}
        {projection.screen === 'fake_shuffle' ? (
          <FakeShuffleScreen
            participants={projection.participants}
            phase={phase}
            spinningId1={spinningId1}
            spinningId2={spinningId2}
            anchorId={anchorId}
            destId={destId}
            teamName={cinematic?.type === 'fake_shuffle' ? cinematic.teamName : null}
            getPhoto={getPhoto}
            usedParticipantIds={usedParticipantIds}
          />
        ) : null}
        {projection.screen === 'bracket' ? (
          <BracketScene
            matches={projection.matches}
            getPhoto={getPhoto}
            status={projection.status}
            focusMatchId={focusMatchId}
            revealOverride={bracketReveal}
          />
        ) : null}
        {layers.showRound1Selection && projection.versus ? (
          <DuoSelectionScene
            title="RODADA 1 - ESCOLHA QUEM ABRE O CONFRONTO"
            membersA={[
              {
                id: projection.versus.membersA[0].id,
                name: projection.versus.membersA[0].name,
                photoUrl:
                  (projection.versus.membersA[0].photoAssetId &&
                    getPhoto(projection.versus.membersA[0].photoAssetId)) ||
                  projection.versus.membersA[0].avatarUrl ||
                  null,
              },
              {
                id: projection.versus.membersA[1].id,
                name: projection.versus.membersA[1].name,
                photoUrl:
                  (projection.versus.membersA[1].photoAssetId &&
                    getPhoto(projection.versus.membersA[1].photoAssetId)) ||
                  projection.versus.membersA[1].avatarUrl ||
                  null,
              },
            ]}
            membersB={[
              {
                id: projection.versus.membersB[0].id,
                name: projection.versus.membersB[0].name,
                photoUrl:
                  (projection.versus.membersB[0].photoAssetId &&
                    getPhoto(projection.versus.membersB[0].photoAssetId)) ||
                  projection.versus.membersB[0].avatarUrl ||
                  null,
              },
              {
                id: projection.versus.membersB[1].id,
                name: projection.versus.membersB[1].name,
                photoUrl:
                  (projection.versus.membersB[1].photoAssetId &&
                    getPhoto(projection.versus.membersB[1].photoAssetId)) ||
                  projection.versus.membersB[1].avatarUrl ||
                  null,
              },
            ]}
            draftAId={round1Draft.a}
            draftBId={round1Draft.b}
          />
        ) : null}
        {layers.showRound3Selection && projection.versus ? (
          <DuoSelectionScene
            membersA={[
              {
                id: projection.versus.membersA[0].id,
                name: projection.versus.membersA[0].name,
                photoUrl:
                  (projection.versus.membersA[0].photoAssetId &&
                    getPhoto(projection.versus.membersA[0].photoAssetId)) ||
                  projection.versus.membersA[0].avatarUrl ||
                  null,
              },
              {
                id: projection.versus.membersA[1].id,
                name: projection.versus.membersA[1].name,
                photoUrl:
                  (projection.versus.membersA[1].photoAssetId &&
                    getPhoto(projection.versus.membersA[1].photoAssetId)) ||
                  projection.versus.membersA[1].avatarUrl ||
                  null,
              },
            ]}
            membersB={[
              {
                id: projection.versus.membersB[0].id,
                name: projection.versus.membersB[0].name,
                photoUrl:
                  (projection.versus.membersB[0].photoAssetId &&
                    getPhoto(projection.versus.membersB[0].photoAssetId)) ||
                  projection.versus.membersB[0].avatarUrl ||
                  null,
              },
              {
                id: projection.versus.membersB[1].id,
                name: projection.versus.membersB[1].name,
                photoUrl:
                  (projection.versus.membersB[1].photoAssetId &&
                    getPhoto(projection.versus.membersB[1].photoAssetId)) ||
                  projection.versus.membersB[1].avatarUrl ||
                  null,
              },
            ]}
            draftAId={round3Draft.a}
            draftBId={round3Draft.b}
          />
        ) : null}
        {layers.showBattle && versusForBattle ? (
          <BattleScene
            versus={versusForBattle}
            screen={layers.battleScreen}
            getPhoto={getPhoto}
            forceMatchFinish={layers.forceMatchFinish}
            forceRoundWin={layers.forceRoundWin}
          />
        ) : null}
        {roundAnnounceHold && projection.versus && roundAnnounceLeft && roundAnnounceRight ? (
          <RoundAnnounceScene
            roundLabel={`RODADA ${projection.versus.roundNumber ?? ''}`}
            left={{
              id: roundAnnounceLeft.id,
              name: roundAnnounceLeft.name,
              photoUrl:
                roundAnnounceLeft.bodyImageUrl ||
                (roundAnnounceLeft.photoAssetId && getPhoto(roundAnnounceLeft.photoAssetId)) ||
                roundAnnounceLeft.avatarUrl ||
                null,
            }}
            right={{
              id: roundAnnounceRight.id,
              name: roundAnnounceRight.name,
              photoUrl:
                roundAnnounceRight.bodyImageUrl ||
                (roundAnnounceRight.photoAssetId && getPhoto(roundAnnounceRight.photoAssetId)) ||
                roundAnnounceRight.avatarUrl ||
                null,
            }}
            onDone={() => setRoundAnnounceHold(false)}
          />
        ) : null}
        {layers.showDuoQualified && projection.versus ? (() => {
          const { versus } = projection
          const stage = versus.stage as MatchStage
          const winnerIsA = winnerSideBlue
          const winnerMembers = winnerIsA ? versus.membersA : versus.membersB
          const loserMembers = winnerIsA ? versus.membersB : versus.membersA
          const winnerTeamName = winnerIsA ? versus.teamAName : versus.teamBName
          const loserTeamName = winnerIsA ? versus.teamBName : versus.teamAName
          const winnerSide: 'blue' | 'red' = winnerIsA ? 'blue' : 'red'
          const loserSide: 'blue' | 'red' = winnerIsA ? 'red' : 'blue'

          const toDisplayMembers = (
            pair: typeof winnerMembers,
          ): [
              { id: string; name: string; photoUrl: string | null; fighterVariant: (typeof pair)[number]['fighterVariant'] },
              { id: string; name: string; photoUrl: string | null; fighterVariant: (typeof pair)[number]['fighterVariant'] },
            ] =>
            pair.map((m) => ({
              id: m.id,
              name: m.name,
              photoUrl: m.bodyImageUrl || (m.photoAssetId && getPhoto(m.photoAssetId)) || m.avatarUrl || null,
              fighterVariant: m.fighterVariant,
            })) as any

          return showWinnerPanel ? (
            <DuoQualifiedScene
              teamName={winnerTeamName}
              scoreA={versus.scoreA}
              scoreB={versus.scoreB}
              side={winnerSide}
              outcome="classified"
              prizeAmount={parsePrizeAmount(prizeForWinner(stage))}
              members={toDisplayMembers(winnerMembers)}
            />
          ) : (
            <DuoQualifiedScene
              teamName={loserTeamName}
              scoreA={versus.scoreA}
              scoreB={versus.scoreB}
              side={loserSide}
              outcome="eliminated"
              prizeAmount={parsePrizeAmount(prizeForLoser(stage))}
              members={toDisplayMembers(loserMembers)}
            />
          )
        })() : null}
        {projection.screen === 'champion' && projection.champion ? (
          <ChampionScene
            teamName={projection.champion.name}
            members={[
              {
                id: projection.champion.memberIds[0],
                name: projection.champion.members[0] ?? '',
                photoUrl:
                  projection.champion.memberBodyImageUrls[0] ||
                  (projection.champion.memberPhotoAssetIds[0] &&
                    getPhoto(projection.champion.memberPhotoAssetIds[0])) ||
                  projection.champion.memberAvatarUrls[0] ||
                  null,
                fighterVariant: projection.champion.memberFighterVariants[0],
              },
              {
                id: projection.champion.memberIds[1],
                name: projection.champion.members[1] ?? '',
                photoUrl:
                  projection.champion.memberBodyImageUrls[1] ||
                  (projection.champion.memberPhotoAssetIds[1] &&
                    getPhoto(projection.champion.memberPhotoAssetIds[1])) ||
                  projection.champion.memberAvatarUrls[1] ||
                  null,
                fighterVariant: projection.champion.memberFighterVariants[1],
              },
            ]}
          />
        ) : null}
        <span hidden>{CHANNEL.projection}</span>
      </div>
    </>
  )
}
