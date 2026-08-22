import { useState, type CSSProperties } from 'react'
import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { BitmapText } from '../components/BitmapText.tsx'
import type { CursorAnimState, CursorPlayer } from '../components/selectionCursorFrames.ts'
import {
  TEAM_FORMATION_BG,
  LEFT_PORTRAIT,
  RIGHT_PORTRAIT,
  LEFT_NAMEPLATE,
  RIGHT_NAMEPLATE,
  LOWER_PANEL,
  absoluteBox,
  gridSlotBox,
  isRandomSlot,
  type Box,
} from '../layouts/teamFormationGeometry.ts'
import './runtime.css'

export type FormationParticipant = {
  id: string
  name: string
  photoUrl?: string | null
  avatarUrl?: string | null
  bodyImageUrl?: string | null
}

export type FormationCursor = {
  player: CursorPlayer
  state: CursorAnimState
  cell: { row: number; col: number }
}

/** Photo overlay only — never redraws baked frames; never uses brand logo as fallback. */
function CoverPhoto({
  src,
  alt,
  box,
  className,
  fit = 'cover',
  position = '50% 28%',
}: {
  src?: string | null
  alt: string
  box: Box
  className?: string
  fit?: 'cover' | 'contain'
  position?: string
}) {
  const [failed, setFailed] = useState(false)
  const hasPhoto = Boolean(src) && !failed
  const style: CSSProperties = {
    ...absoluteBox(box),
    overflow: 'hidden',
    pointerEvents: 'none',
  }

  return (
    <div className={`ce-cover-photo ${className ?? ''}`} style={style}>
      {hasPhoto ? (
        <img
          src={src!}
          alt={alt}
          onError={() => setFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            objectPosition: position,
            display: 'block',
          }}
        />
      ) : (
        <div className="ce-cover-photo__fallback" aria-label={`${alt} sem foto`}>
          ?
        </div>
      )}
    </div>
  )
}

function cells(participants: FormationParticipant[]) {
  const out: Array<{
    row: number
    col: number
    participant?: FormationParticipant
    random?: true
  }> = []
  let i = 0
  for (let row = 1; row <= 3; row++) {
    for (let col = 1; col <= 11; col++) {
      if (isRandomSlot(row, col)) out.push({ row, col, random: true })
      else out.push({ row, col, participant: participants[i++] })
    }
  }
  return out
}

/**
 * Team Formation (fake shuffle) — structural UI comes entirely from
 * `team_formation_variant_03.png`. Dynamic layers only: grid photos,
 * CSS slot highlight (no SelectionCursor sprite), large selected
 * portraits/names, lower-panel messages.
 * Hybrid human rule: do NOT migrate this screen to pure canonical layers.
 */
export function TeamFormationScene({
  participants,
  cursors = [],
  /** @deprecated Prefer `cursors` (supports independent P1+P2). */
  cursorCell,
  cursorPlayer = 'p1',
  cursorState = 'idle',
  selectedTop,
  selectedBottom,
  status = 'SELECIONANDO DUPLA',
  duoLabel,
}: {
  participants: FormationParticipant[]
  /** Up to two independent cursors (P1 blue + P2 red). */
  cursors?: FormationCursor[]
  cursorCell?: { row: number; col: number } | null
  cursorPlayer?: CursorPlayer
  cursorState?: CursorAnimState
  /** First selected participant (left large portrait). Null while idle / before spin. */
  selectedTop?: FormationParticipant | null
  /** Second selected participant (right large portrait). */
  selectedBottom?: FormationParticipant | null
  status?: string
  duoLabel?: string
}) {
  if (participants.length !== 32) {
    throw new Error(`TeamFormationScene requires exactly 32 participants; got ${participants.length}`)
  }

  const gridCells = cells(participants)
  const lowerText = duoLabel
    ? `DUPLA FORMADA\n${duoLabel.toUpperCase()}`
    : status.toUpperCase()

  const resolvedCursors: FormationCursor[] =
    cursors.length > 0
      ? cursors
      : cursorCell
        ? [{ player: cursorPlayer, state: cursorState, cell: cursorCell }]
        : []

  return (
    <FixedCanvas className="ce-scene-host">
      {/* Layer 1: full structural background */}
      <img
        src={TEAM_FORMATION_BG}
        alt=""
        aria-hidden="true"
        className="ce-team-formation-bg"
        draggable={false}
      />

      {/* Layer 2: 32 small grid photos (skip "?" slot) */}
      {gridCells.map((cell, idx) => {
        if (cell.random) return null
        const box = gridSlotBox(cell.row, cell.col)
        return (
          <CoverPhoto
            key={`${cell.row}-${cell.col}`}
            box={box}
            src={cell.participant?.avatarUrl ?? cell.participant?.photoUrl}
            alt={cell.participant?.name ?? `Participante ${idx + 1}`}
            className="ce-team-grid-photo"
          />
        )
      })}

      {/* Layer 3: CSS border highlight on active/locked slots (P1 blue / P2 red) */}
      {resolvedCursors.map((c) => {
        const box = gridSlotBox(c.cell.row, c.cell.col)
        return (
          <div
            key={`cursor-${c.player}`}
            className={`ce-slot-highlight ce-slot-highlight--${c.player} ce-slot-highlight--${c.state}`}
            style={absoluteBox(box)}
            data-player={c.player}
            data-cursor-state={c.state}
            aria-hidden="true"
          />
        )
      })}

      {/* Layer 4–5: first selected large photo + name (left) */}
      {selectedTop && (
        <>
          <CoverPhoto
            box={LEFT_PORTRAIT}
            src={selectedTop.bodyImageUrl ?? selectedTop.avatarUrl ?? selectedTop.photoUrl}
            alt={selectedTop.name}
            className="ce-team-large-photo"
            fit="cover"
            position="50% 15%"
          />
          <div style={absoluteBox(LEFT_NAMEPLATE)} className="ce-center ce-team-nameplate">
            <BitmapText
              text={selectedTop.name.toUpperCase()}
              size="small"
              align="center"
              scale={0.36}
              maxWidth={LEFT_NAMEPLATE.w - 16}
            />
          </div>
        </>
      )}

      {/* Layer 6–7: second selected large photo + name (right) — no extra VS */}
      {selectedBottom && (
        <>
          <CoverPhoto
            box={RIGHT_PORTRAIT}
            src={selectedBottom.bodyImageUrl ?? selectedBottom.avatarUrl ?? selectedBottom.photoUrl}
            alt={selectedBottom.name}
            className="ce-team-large-photo"
            fit="cover"
            position="50% 15%"
          />
          <div style={absoluteBox(RIGHT_NAMEPLATE)} className="ce-center ce-team-nameplate">
            <BitmapText
              text={selectedBottom.name.toUpperCase()}
              size="small"
              align="center"
              scale={0.36}
              maxWidth={RIGHT_NAMEPLATE.w - 16}
            />
          </div>
        </>
      )}

      {/* Layer 8: dynamic duo info on lower panel */}
      <div
        style={absoluteBox(LOWER_PANEL)}
        className={`ce-center ce-team-lower-panel ${duoLabel ? 'is-reveal' : ''}`}
      >
        <BitmapText text={lowerText} size="small" align="center" scale={0.425} maxWidth={LOWER_PANEL.w - 24} />
      </div>
    </FixedCanvas>
  )
}
