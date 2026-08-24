import { useMemo } from 'react'
import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { BitmapText } from '../components/BitmapText.tsx'
import { AvatarFrame } from '../components/AvatarFrame.tsx'
import type { CursorAnimState, CursorPlayer } from '../components/selectionCursorFrames.ts'
import { computeAutoGrid, type GridArea } from '../layouts/autoFormationGrid.ts'
import './runtime.css'

export type FormationParticipant = {
  id: string
  name: string
  photoUrl?: string | null
  avatarUrl?: string | null
  bodyImageUrl?: string | null
  fightAvatarUrl?: string | null
}

export type FormationCursor = {
  player: CursorPlayer
  state: CursorAnimState
  participantId: string
}

export type FormationSpotlight = {
  participant: FormationParticipant
  state: CursorAnimState
}

const GRID_AREA: GridArea = { x: 470, y: 240, w: 980, h: 560 }
const CARD_ASPECT = 0.8
const CARD_GAP = -10

const DEFAULT_LOGO_SRC = '/assets/brand/drow-logo.png'
const DEFAULT_TITLE_SRC = '/assets/brand/drow-title.png'
const DEFAULT_STATUS_PLATE_SRC = '/assets/brand/status-plate.png'

function SceneBackground({ src }: { src?: string | null }) {
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="ce-formation-background"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
    />
  )
}

function SidePanel({ side, spotlight }: { side: 'left' | 'right'; spotlight?: FormationSpotlight | null }) {
  const participant = spotlight?.participant ?? null
  const backdropSrc = participant
    ? participant.bodyImageUrl ?? participant.photoUrl ?? participant.avatarUrl
    : null

  return (
    <div className={`ce-formation-side ce-formation-side--${side}`}>
      {backdropSrc ? (
        <img src={backdropSrc} alt="" aria-hidden="true" draggable={false} className="ce-formation-side__backdrop" />
      ) : null}
      <div className="ce-formation-side__fade" aria-hidden="true" />
      <div
        className={[
          'ce-formation-side__badge',
          side === 'left' ? 'accent-p1' : 'accent-p2',
          spotlight?.state === 'lock' ? 'is-locked' : '',
        ].join(' ').trim()}
      >
        <BitmapText
          text={side === 'left' ? '1P' : '2P'}
          size="small"
          align="center"
          scale={0.4}
        />
      </div>      <div className="ce-formation-side__card">
        {participant ? (
          <AvatarFrame
            name={participant.name}
            photoSrc={participant.bodyImageUrl}
            active={spotlight?.state === 'lock'}
            selected={spotlight?.state === 'idle' || spotlight?.state === 'lock'}
            accent={side === 'left' ? 'p1' : 'p2'}
            nameScale={0.5}
          />
        ) : (
          <div className="ce-formation-side__placeholder" aria-hidden="true">?</div>
        )}
      </div>
    </div>
  )
}

/**
 * Team Formation (fake shuffle) -- dynamic grid in the center, two spotlight
 * side panels (P1 left / P2 right), a fixed top header (logo left / title
 * centered) and a status / duo-formed label pinned to the bottom.
 */
export function TeamFormationScene({
  participants,
  cursors = [],
  status = 'SELECIONANDO DUPLA',
  duoLabel,
  spotlightLeft = null,
  spotlightRight = null,
  backgroundUrl = null,
  usedParticipantIds,
  logoSrc = DEFAULT_LOGO_SRC,
  titleSrc = DEFAULT_TITLE_SRC,
  statusPlateSrc = DEFAULT_STATUS_PLATE_SRC,
}: {
  participants: FormationParticipant[]
  cursors?: FormationCursor[]
  status?: string
  duoLabel?: string
  spotlightLeft?: FormationSpotlight | null
  spotlightRight?: FormationSpotlight | null
  backgroundUrl?: string | null
  usedParticipantIds?: Set<string>
  logoSrc?: string
  titleSrc?: string
  statusPlateSrc?: string
}) {
  const sortedParticipants = useMemo(
    () => [...participants].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [participants],
  )

  const grid = useMemo(
    () => computeAutoGrid(sortedParticipants.length, GRID_AREA, { aspectRatio: CARD_ASPECT, gap: CARD_GAP }),
    [sortedParticipants.length],
  )

  const cursorByParticipantId = useMemo(() => {
    const map = new Map<string, FormationCursor>()
    for (const c of cursors) map.set(c.participantId, c)
    return map
  }, [cursors])

  if (sortedParticipants.length < 2) {
    return (
      <FixedCanvas className="ce-scene-host">
        <SceneBackground src={backgroundUrl} />
        <div className="ce-center" style={{ position: 'absolute', inset: 0 }}>
          <BitmapText text="AGUARDANDO PARTICIPANTES" size="medium" align="center" scale={0.5} maxWidth={1200} />
        </div>
      </FixedCanvas>
    )
  }

  return (
    <FixedCanvas className="ce-scene-host">
      <SceneBackground src={backgroundUrl} />

      <SidePanel side="left" spotlight={spotlightLeft} />
      <SidePanel side="right" spotlight={spotlightRight} />

      {/* Top header: logo pinned left, title centered independently */}
      <div className="ce-formation-header">
        <img src={logoSrc} alt="" aria-hidden="true" draggable={false} className="ce-formation-header__logo" />
        <img src={titleSrc} alt="" aria-hidden="true" draggable={false} className="ce-formation-header__title-img" />
      </div>

      {/* Dynamic grid of participant avatars -- alphabetical order.
          `active` here only drives the glow/accent color (p1/p2) while a
          participant is under the cursor or just locked in -- it no longer
          swaps the frame image, so the grid card keeps the same frame the
          whole time (selecting + chosen). Only `used` (already paired)
          changes the frame, to the greyed "off" one. */}
      {sortedParticipants.map((participant, i) => {
        const box = grid.cells[i]
        const cursor = cursorByParticipantId.get(participant.id)
        return (
          <div
            key={participant.id}
            style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, zIndex: 2 }}
          >
            <AvatarFrame
              name={participant.name}
              photoSrc={participant.photoUrl}
              active={Boolean(cursor)}
              used={usedParticipantIds?.has(participant.id) ?? false}
              accent={cursor?.player ?? null}
              nameScale={0.1}
            />
          </div>
        )
      })}

      {/* Bottom status / duo-formed label -- image plate behind, text on top */}
      <div className="ce-formation-status">
        <img
          src={statusPlateSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="ce-formation-status__plate"
        />
        <div className="ce-formation-status__label">
          <BitmapText
            text={duoLabel ? `DUPLA FORMADA\n${duoLabel.toUpperCase()}` : status.toUpperCase()}
            size="small"
            align="center"
            scale={0.35}
            maxWidth={1000}
          />
        </div>
      </div>
    </FixedCanvas>
  )
}