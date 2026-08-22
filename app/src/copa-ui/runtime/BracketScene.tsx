import { useEffect, useRef, useState } from 'react'
import type { ScoreboardProjection } from '../../domain/projections.ts'
import { BitmapText } from '../components/BitmapText.tsx'
import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { PlayerPortrait } from '../components/PlayerPortrait.tsx'
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

type MatchView = ScoreboardProjection['matches'][number]
type MemberView = NonNullable<MatchView['membersA']>[number]

type TeamSlot = {
  key: string
  name: string
  members: [MemberView, MemberView] | null
  /** Gold accent when this team won the match that feeds / owns this slot. */
  winner: boolean
  /** Dim when this team lost a completed match still shown in R16. */
  eliminated: boolean
  box: Box
}

type Props = {
  matches: MatchView[]
  getPhoto: (photoAssetId: string | null | undefined) => string | null
  status?: ScoreboardProjection['status']
  focusMatchId?: string | null
}

function sortStage(matches: MatchView[], stage: MatchView['stage']) {
  return matches.filter((m) => m.stage === stage).sort((a, b) => a.position - b.position)
}

function teamSlotFromMatch(
  match: MatchView | undefined,
  side: 'A' | 'B',
  box: Box,
  key: string,
): TeamSlot {
  if (!match) {
    return { key, name: 'A DEFINIR', members: null, winner: false, eliminated: false, box }
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
  }
}

function buildSlots(matches: MatchView[]): { slots: TeamSlot[]; paths: string[] } {
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
      slots.push(teamSlotFromMatch(match, teamSide, box, `${side}-r16-${i}`))
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

function TeamCard({
  slot,
  getPhoto,
}: {
  slot: TeamSlot
  getPhoto: Props['getPhoto']
}) {
  const m0 = slot.members?.[0]
  const m1 = slot.members?.[1]
  const isTbd = slot.name === 'A DEFINIR' && !slot.members
  const stateClass = slot.winner ? 'is-winner' : slot.eliminated ? 'is-eliminated' : ''
  const stageClass = stageAccentClass(slot.key)
  const cardClass = [
    'ce-bracket-card',
    isTbd ? 'ce-bracket-card--tbd' : '',
    stageClass,
    stateClass,
  ]
    .filter(Boolean)
    .join(' ')

  if (isTbd) {
    return (
      <div className={cardClass} style={absoluteBox(slot.box)} data-slot={slot.key}>
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

  return (
    <div className={cardClass} style={absoluteBox(slot.box)} data-slot={slot.key}>
      <div className="ce-bracket-card__member">
        <div className="ce-bracket-card__portrait">
          <PlayerPortrait
            src={m0 ? (m0.photoAssetId ? getPhoto(m0.photoAssetId) : m0.avatarUrl ?? null) : null}
            alt={m0?.name ?? ''}
          />
        </div>
        <div className="ce-bracket-card__label">
          <BitmapText
            text={(m0?.name || '?').toUpperCase()}
            size={BRACKET_HUD.teamName.size}
            scale={BRACKET_HUD.teamName.scale}
            maxWidth={BRACKET_HUD.teamName.maxWidth}
            align="left"
          />
        </div>
      </div>
      <div className="ce-bracket-card__member">
        <div className="ce-bracket-card__portrait">
          <PlayerPortrait
            src={m1 ? (m1.photoAssetId ? getPhoto(m1.photoAssetId) : m1.avatarUrl ?? null) : null}
            alt={m1?.name ?? ''}
          />
        </div>
        <div className="ce-bracket-card__label">
          <BitmapText
            text={(m1?.name || '?').toUpperCase()}
            size={BRACKET_HUD.teamName.size}
            scale={BRACKET_HUD.teamName.scale}
            maxWidth={BRACKET_HUD.teamName.maxWidth}
            align="left"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Telão Chave — FixedCanvas 1920×1080 layered bilateral bracket.
 * Hybrid rule: canonical layers (not Team Formation structural PNG).
 */
export function BracketScene({ matches, getPhoto, status, focusMatchId }: Props) {
  const { slots, paths } = buildSlots(matches)
  const [cameraState, setCameraState] = useState<'overview' | 'tourAll' | 'focusMatch'>('overview')
  const [tourIndex, setTourIndex] = useState(0)
  const [focusCenter, setFocusCenter] = useState<{ x: number; y: number } | null>(null)
  
  const prevStatusRef = useRef(status)
  useEffect(() => {
    if (prevStatusRef.current === 'bracket_drawn' && status === 'in_progress') {
      setCameraState('tourAll')
      setTourIndex(0)
      globalAudio.play('ui.cursorMove')
      
      let currentIdx = 0
      const interval = setInterval(() => {
        currentIdx++
        if (currentIdx >= 8) {
          clearInterval(interval)
          setCameraState('overview')
          globalAudio.play('ui.cursorMove')
        } else {
          setTourIndex(currentIdx)
          globalAudio.play('ui.cursorMove')
        }
      }, 2500)
      
      return () => { clearInterval(interval) }
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

  let transform = 'translate(0px, 0px) scale(1)'
  if (cameraState === 'tourAll') {
    const focus = getMatchCenter('oitavas', tourIndex)
    const scale = 1.6
    const tx = 960 - focus.x * scale
    const ty = 540 - focus.y * scale
    transform = `translate(${tx}px, ${ty}px) scale(${scale})`
  } else if (cameraState === 'focusMatch' && focusCenter) {
    // Zoom to 1.5x, center on focusCenter
    // Container is 1920x1080. Center of screen is 960x540.
    const scale = 1.5
    const tx = 960 - focusCenter.x * scale
    const ty = 540 - focusCenter.y * scale
    transform = `translate(${tx}px, ${ty}px) scale(${scale})`
  }

  return (
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
  )
}
