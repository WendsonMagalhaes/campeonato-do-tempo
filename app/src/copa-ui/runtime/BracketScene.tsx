import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ScoreboardProjection } from '../../domain/projections.ts'
import { BitmapText } from '../components/BitmapText.tsx'
import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { canonicalUi } from '../../battle/battle-assets.ts'
import { globalAudio } from '../../audio/singleton.ts'
import {
  BRACKET,
  BRACKET_BG,
  BRACKET_HUD,
  BRACKET_LOGO,
  BRACKET_ROUND_LABELS,
  DESIGN,
  absoluteBox,
  cardBox,
  elbowPath,
  getMatchCenter,
  type Box,
} from '../layouts/bracketGeometry.ts'
import './runtime.css'

// Copie o PNG enviado pra pasta de assets do projeto e ajuste este caminho.
import { DuplaFrame } from '../components/DuplaFrame.tsx'
import { MatchupRevealScene } from './MatchupRevealScene.tsx'


type MatchView = ScoreboardProjection['matches'][number]
type MemberView = NonNullable<MatchView['membersA']>[number]

type RevealOverride = {
  active: boolean
  revealedKeys: Set<string>
  lastKey: string | null
} | null

type TeamSlot = {
  key: string
  name: string
  members: [MemberView, MemberView] | null
  /** Gold accent when this team won the match that feeds / owns this slot. */
  winner: boolean
  /** Dim when this team lost a completed match still shown in R16. */
  eliminated: boolean
  box: Box
  justRevealed: boolean
}

type Props = {
  matches: MatchView[]
  getPhoto: (photoAssetId: string | null | undefined) => string | null
  status?: ScoreboardProjection['status']
  focusMatchId?: string | null
  revealOverride?: RevealOverride
}

function sortStage(matches: MatchView[], stage: MatchView['stage']) {
  return matches.filter((m) => m.stage === stage).sort((a, b) => a.position - b.position)
}

function teamSlotFromMatch(
  match: MatchView | undefined,
  side: 'A' | 'B',
  box: Box,
  key: string,
  justRevealed = false,
): TeamSlot {
  if (!match) {
    return { key, name: 'A DEFINIR', members: null, winner: false, eliminated: false, box, justRevealed: false }
  }
  const name = side === 'A' ? match.teamA : match.teamB
  const members = side === 'A' ? match.membersA : match.membersB
  const decided = match.status === 'completed'
  const aWins = decided && match.scoreA > match.scoreB
  const bWins = decided && match.scoreB > match.scoreA
  const winner = side === 'A' ? aWins : bWins
  const eliminated = side === 'A' ? bWins : aWins
  const empty = !members || !name.trim() || /^a\s*definir$/i.test(name.trim())
  return {
    key,
    name: empty ? 'A DEFINIR' : name,
    members: empty ? null : members,
    winner,
    eliminated,
    box,
    justRevealed,
  }
}

function buildSlots(matches: MatchView[], revealOverride?: RevealOverride): { slots: TeamSlot[]; paths: string[] } {
  const oitavas = sortStage(matches, 'oitavas')
  const quartas = sortStage(matches, 'quartas')
  const semis = sortStage(matches, 'semifinais')
  const finals = sortStage(matches, 'final')
  const finalMatch = finals[0]

  const slots: TeamSlot[] = []
  const paths: string[] = []

  const placeSide = (side: 'left' | 'right') => {
    const cols = side === 'left' ? BRACKET.leftColumns : BRACKET.rightColumns
    const oitavasOffset = side === 'left' ? 0 : 4
    const quartasOffset = side === 'left' ? 0 : 2
    const semiPos = side === 'left' ? 0 : 1
    const finalSide: 'A' | 'B' = side === 'left' ? 'A' : 'B'

    const r16Boxes: Box[] = []
    for (let i = 0; i < 8; i += 1) {
      const match = oitavas[oitavasOffset + Math.floor(i / 2)]
      const teamSide: 'A' | 'B' = i % 2 === 0 ? 'A' : 'B'
      const box = cardBox(cols[0], BRACKET.round16Ys[i]!)
      r16Boxes.push(box)
      const revealKey = match ? `${match.id}-${teamSide}` : null
      const masked = Boolean(revealOverride?.active) && (!revealKey || !revealOverride!.revealedKeys.has(revealKey))
      const justRevealed = Boolean(revealKey && revealOverride?.lastKey === revealKey)
      slots.push(teamSlotFromMatch(masked ? undefined : match, teamSide, box, `${side}-r16-${i}`, justRevealed))
    }

    const qfBoxes: Box[] = []
    for (let i = 0; i < 4; i += 1) {
      const match = quartas[quartasOffset + Math.floor(i / 2)]
      const teamSide: 'A' | 'B' = i % 2 === 0 ? 'A' : 'B'
      const box = cardBox(cols[1], BRACKET.quarterYs[i]!)
      qfBoxes.push(box)
      slots.push(teamSlotFromMatch(match, teamSide, box, `${side}-qf-${i}`))
      const fromA = r16Boxes[i * 2]!
      const fromB = r16Boxes[i * 2 + 1]!
      paths.push(elbowPath(fromA, box, side))
      paths.push(elbowPath(fromB, box, side))
    }

    const sfBoxes: Box[] = []
    for (let i = 0; i < 2; i += 1) {
      const match = semis[semiPos]
      const teamSide: 'A' | 'B' = i % 2 === 0 ? 'A' : 'B'
      const box = cardBox(cols[2], BRACKET.semiYs[i]!)
      sfBoxes.push(box)
      slots.push(teamSlotFromMatch(match, teamSide, box, `${side}-sf-${i}`))
      paths.push(elbowPath(qfBoxes[i * 2]!, box, side))
      paths.push(elbowPath(qfBoxes[i * 2 + 1]!, box, side))
    }

    const finalistBox =
      side === 'left'
        ? cardBox(BRACKET.finalLeft.x, BRACKET.finalLeft.y)
        : cardBox(BRACKET.finalRight.x, BRACKET.finalRight.y)
    slots.push(teamSlotFromMatch(finalMatch, finalSide, finalistBox, `${side}-finalist`))
    paths.push(elbowPath(sfBoxes[0]!, finalistBox, side))
    paths.push(elbowPath(sfBoxes[1]!, finalistBox, side))
  }

  placeSide('left')
  placeSide('right')

  return { slots, paths }
}

function stageAccentClass(slotKey: string): string {
  if (slotKey.includes('-finalist')) return 'is-final'
  if (slotKey.includes('-sf-')) return 'is-semi'
  return ''
}

// Timings/escala da animação de revelação: aparece grande no centro do
// canvas, segura um tempo, e depois "voa" até a posição real do slot.
const REVEAL_CENTER_SCALE = 3.2
const REVEAL_HOLD_MS = 2000 // quanto tempo fica grande no centro
const REVEAL_FLY_MS = 1800 // duração do voo até o slot

// Duração total de uma revelação (hold + voo). O ScoreboardApp usa isso pra
// espaçar as duplas — se o intervalo entre elas for menor que isso, a
// animação da dupla anterior é cortada no meio quando a próxima começa.
export const REVEAL_TOTAL_MS = REVEAL_HOLD_MS + REVEAL_FLY_MS

/**
 * Escala padrão da câmera (estado "overview"). Antes era scale(1) sem
 * margem nenhuma, então os labels de rodada (OITAVAS/QUARTAS/...), que
 * ficam em roundLabel.y = 38, coladinhos na borda de cima do canvas
 * 1920x1080, acabavam sem folga na tela real. Encolher só a ALTURA (largura
 * fica 1:1), centralizado verticalmente em y=540, dá folga em cima/embaixo
 * sem estreitar a cena nem mudar a posição horizontal de nada.
 */
const OVERVIEW_SCALE_Y = 0.93
const OVERVIEW_TY = (DESIGN.height / 2) * (1 - OVERVIEW_SCALE_Y)
const OVERVIEW_TRANSFORM = `translate(0px, ${OVERVIEW_TY}px) scale(1, ${OVERVIEW_SCALE_Y})`

function TeamCard({
  slot,
  getPhoto,
}: {
  slot: TeamSlot
  getPhoto: Props['getPhoto']
}) {
  const [animPhase, setAnimPhase] = useState<'hidden' | 'center' | 'flying' | 'settled'>(
    slot.justRevealed ? 'hidden' : 'settled',
  )
  // Guarda qual reveal (por key) já foi iniciado, pra não reiniciar o
  // timeline se o componente re-renderizar enquanto os timers ainda correm.
  const startedForKeyRef = useRef<string | null>(null)

  // Cleanup de verdade só quando o componente desmonta de fato.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!slot.justRevealed) return
    if (startedForKeyRef.current === slot.key) return // já iniciado, não reinicia

    startedForKeyRef.current = slot.key
    setAnimPhase('hidden')

    // rAF pra garantir que o navegador pinte o estado 'hidden' (opacity 0,
    // escala grande) antes de mudarmos pra 'center' — senão a transição de
    // opacity/scale pode ser "engolida" por acontecer no mesmo frame.
    const raf = requestAnimationFrame(() => {
      if (!isMountedRef.current) return
      setAnimPhase('center')
      globalAudio.play('ui.selectionLock') // som de "pop" grande no centro
    })

    // Depois do hold no centro, começa o voo até o slot real.
    const flyTimer = window.setTimeout(() => {
      if (!isMountedRef.current) return
      setAnimPhase('flying')
      globalAudio.play('ui.cursorMove') // som de "whoosh" do voo
    }, REVEAL_HOLD_MS)

    // Quando o voo termina, larga no estado final (sem transform inline,
    // volta a obedecer só o layout normal do slot).
    const settleTimer = window.setTimeout(() => {
      if (!isMountedRef.current) return
      setAnimPhase('settled')
    }, REVEAL_HOLD_MS + REVEAL_FLY_MS)

    // Cleanup só cancela o rAF (é local a este mount). Os timers de
    // hold/voo continuam de propósito mesmo se a próxima dupla começar
    // a ser revelada antes — pra não cortar a animação desta no meio.
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(flyTimer)
      window.clearTimeout(settleTimer)
    }
  }, [slot.justRevealed, slot.key])

  const box = slot.box
  const boxCenterX = box.x + box.w / 2
  const boxCenterY = box.y + box.h / 2
  const dx = DESIGN.width / 2 - boxCenterX
  const dy = DESIGN.height / 2 - boxCenterY

  let revealStyle: CSSProperties = {}
  if (slot.justRevealed) {
    if (animPhase === 'hidden') {
      revealStyle = {
        opacity: 0,
        transform: `translate(${dx}px, ${dy}px) scale(${REVEAL_CENTER_SCALE})`,
        zIndex: 50,
      }
    } else if (animPhase === 'center') {
      revealStyle = {
        opacity: 1,
        transform: `translate(${dx}px, ${dy}px) scale(${REVEAL_CENTER_SCALE})`,
        transition: 'opacity 350ms ease-out',
        zIndex: 50,
      }
    } else if (animPhase === 'flying') {
      revealStyle = {
        opacity: 1,
        transform: 'translate(0px, 0px) scale(1)',
        transition: `transform ${REVEAL_FLY_MS}ms cubic-bezier(0.34, 1.1, 0.64, 1)`,
        zIndex: 50,
      }
    }
    // 'settled': revealStyle fica {} — volta ao layout normal do slot.
  }

  const m0 = slot.members?.[0]
  const m1 = slot.members?.[1]
  const isTbd = slot.name === 'A DEFINIR' && !slot.members
  const stateClass = slot.winner ? 'is-winner' : slot.eliminated ? 'is-eliminated' : ''
  const stageClass = stageAccentClass(slot.key)

  if (isTbd) {
    // "A definir" continua usando o card CSS antigo (com fundo/borda) — só o
    // slot preenchido é que passa a usar apenas a imagem da moldura.
    const tbdClass = ['ce-bracket-card', 'ce-bracket-card--tbd', stageClass].filter(Boolean).join(' ')
    return (
      <div className={tbdClass} style={absoluteBox(slot.box)} data-slot={slot.key}>
        <div className="ce-bracket-card__tbd">
          <BitmapText
            text="A DEFINIR"
            size={BRACKET_HUD.tbdLabel.size}
            scale={BRACKET_HUD.tbdLabel.scale}
            maxWidth={BRACKET_HUD.tbdLabel.maxWidth}
            align="center"
          />
        </div>
      </div>
    )
  }

  // filtro visual pro estado da dupla, aplicado direto na moldura (sem depender
  // de background/border de classe — a moldura em si já é o visual completo)
  const stateFilter =
    slot.winner ? 'drop-shadow(0 0 10px rgba(255, 214, 64, 0.65))'
      : slot.eliminated ? 'grayscale(0.6) brightness(0.7)'
        : 'none'

  return (
    <div
      // sem 'ce-bracket-card': evita herdar background/border do CSS antigo.
      // stageClass/stateClass mantidos só se você usa pra outra coisa além de fundo (ex: z-index).
      className={[stageClass, stateClass].filter(Boolean).join(' ')}
      style={{
        ...absoluteBox(slot.box),
        position: 'absolute',
        transformOrigin: 'center center',
        background: 'none',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        // centraliza a moldura dentro do slot (ela mantém a proporção 1536:1024
        // e pode não preencher a altura inteira do box — evita esticar/deformar)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...revealStyle,
      }}
      data-slot={slot.key}
    >
      <DuplaFrame
        style={{ width: '100%', filter: stateFilter }}
        duplaName={slot.name}
        memberAPhoto={m0 ? (m0.photoAssetId ? getPhoto(m0.photoAssetId) : m0.avatarUrl ?? null) : null}
        memberBPhoto={m1 ? (m1.photoAssetId ? getPhoto(m1.photoAssetId) : m1.avatarUrl ?? null) : null}
        memberAAlt={m0?.name ?? ''}
        memberBAlt={m1?.name ?? ''}
      />
    </div>
  )
}

/**
 * Telão Chave — FixedCanvas 1920×1080 layered bilateral bracket.
 * Hybrid rule: canonical layers (not Team Formation structural PNG).
 */
export function BracketScene({ matches, getPhoto, status, focusMatchId, revealOverride }: Props) {
  const { slots, paths } = buildSlots(matches, revealOverride)
  const [cameraState, setCameraState] = useState<'overview' | 'focusMatch'>('overview')
  const [focusCenter, setFocusCenter] = useState<{ x: number; y: number } | null>(null)

  // Substituiu o antigo "tour de câmera" (zoom nos cards pequenos do
  // bracket) por uma apresentação em tela cheia de cada confronto das
  // oitavas — ver MatchupRevealScene.tsx.
  const [showMatchupReveal, setShowMatchupReveal] = useState(false)

  const prevStatusRef = useRef(status)
  useEffect(() => {
    if (prevStatusRef.current === 'bracket_drawn' && status === 'in_progress') {
      setShowMatchupReveal(true)
    }
    prevStatusRef.current = status
  }, [status])

  useEffect(() => {
    if (focusMatchId) {
      const match = matches.find(m => m.id === focusMatchId)
      if (match) {
        setFocusCenter(getMatchCenter(match.stage, match.position))
        setCameraState('focusMatch')

        const t = setTimeout(() => {
          setCameraState('overview')
        }, 2500)

        return () => clearTimeout(t)
      }
    }
  }, [focusMatchId, matches])

  // "overview" agora tem uma leve margem (ver OVERVIEW_TRANSFORM acima) em
  // vez de scale(1) colado nas quatro bordas.
  let transform = OVERVIEW_TRANSFORM
  if (cameraState === 'focusMatch' && focusCenter) {
    const scale = 1.5
    const tx = 960 - focusCenter.x * scale
    const ty = 540 - focusCenter.y * scale
    transform = `translate(${tx}px, ${ty}px) scale(${scale})`
  }

  return (
    <>
      <FixedCanvas className="ce-scene-host ce-bracket-host">
        <div
          style={{
            width: '100%',
            height: '100%',
            transform,
            transition: 'transform 1s cubic-bezier(0.25, 1, 0.5, 1)',
            transformOrigin: '0 0'
          }}
        >
          <img
            src={BRACKET_BG}
            alt=""
            aria-hidden="true"
            className="ce-bracket-stage-bg"
            draggable={false}
          />
          <div className="ce-team-vignette ce-bracket-vignette" aria-hidden="true" />

          {BRACKET_ROUND_LABELS.map((label) => {
            const labelW = label.w ?? BRACKET.card.w
            return (
              <div
                key={`${label.text}-${label.x}`}
                className="ce-center ce-bracket-round-label"
                style={absoluteBox({
                  x: label.x,
                  y: BRACKET.roundLabel.y,
                  w: labelW,
                  h: BRACKET.roundLabel.h,
                })}
              >
                <BitmapText
                  text={label.text}
                  size={BRACKET_HUD.roundLabel.size}
                  scale={BRACKET_HUD.roundLabel.scale}
                  align="center"
                  maxWidth={labelW}
                />
              </div>
            )
          })}

          <svg
            className="ce-bracket-connectors"
            viewBox={`0 0 ${DESIGN.width} ${DESIGN.height}`}
            aria-hidden="true"
          >
            {paths.map((d, i) => (
              <path key={i} className="ce-bracket-connector" d={d} />
            ))}
          </svg>

          <img
            src={BRACKET_LOGO}
            alt=""
            aria-hidden="true"
            className="ce-bracket-logo"
            style={{
              ...absoluteBox(BRACKET.logo),
              objectFit: 'contain',
            }}
            draggable={false}
          />

          <img
            src={canonicalUi.vsEmblem}
            alt=""
            aria-hidden="true"
            className="ce-bracket-trophy"
            style={{
              ...absoluteBox(BRACKET.vs),
              objectFit: 'contain',
            }}
            draggable={false}
          />

          {slots.map((slot) => (
            <TeamCard key={slot.key} slot={slot} getPhoto={getPhoto} />
          ))}
        </div>
      </FixedCanvas>

      {showMatchupReveal ? (
        <MatchupRevealScene
          matches={sortStage(matches, 'oitavas')}
          getPhoto={getPhoto}
          onDone={() => setShowMatchupReveal(false)}
        />
      ) : null}
    </>
  )
}