import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { BitmapText } from '../components/BitmapText.tsx'
import { PlayerPortrait } from '../components/PlayerPortrait.tsx'
import {
  absoluteBox,
  VERSUS,
  VERSUS_BG,
  VERSUS_HUD,
  type Box,
} from '../layouts/versusGeometry.ts'
import { canonicalUi } from '../../battle/battle-assets.ts'
import './runtime.css'

export type VersusMember = { id: string; name: string; photoUrl: string | null }

type Props = {
  phaseLabel: string
  /** Kept for callers; duo identity is shown via member portraits + names. */
  teamAName: string
  teamBName: string
  membersA: [VersusMember, VersusMember]
  membersB: [VersusMember, VersusMember]
  targetLabel?: string | null
  backgroundSrc?: string
}

/** Member name under a portrait — BitmapText only (no name_plate chrome). */
function MemberName({ box, name, side, delayMs }: { box: Box; name: string; side: 'left' | 'right'; delayMs: number }) {
  return (
    <div
      style={{ ...absoluteBox(box), animationDelay: `${delayMs}ms` }}
      className={`ce-center ce-versus-member-name ce-versus-enter-${side}`}
    >
      <BitmapText
        text={name.toUpperCase()}
        size={VERSUS_HUD.memberName.size}
        align="center"
        scale={VERSUS_HUD.memberName.scale}
        maxWidth={box.w - 16}
      />
    </div>
  )
}

/**
 * Versus intro — layered per EXACT_SCREEN_GEOMETRY.versus.
 * Two selection-scale portraits per side (360×360 PlayerPortrait + frame),
 * plain BitmapText names (medium@0.5), soft entrance toward VS. No name_plate_base.
 */
export function VersusScene({
  phaseLabel,
  membersA,
  membersB,
  targetLabel,
  backgroundSrc = VERSUS_BG,
}: Props) {
  const waiting = !(targetLabel && targetLabel.trim().length > 0)
  const targetText = waiting ? 'AGUARDANDO RODADA' : `ALVO ${targetLabel!.toUpperCase()}`

  const slots: Array<{
    person: VersusMember
    photo: Box
    name: Box
    side: 'left' | 'right'
    delayMs: number
  }> = [
    { person: membersA[0], photo: VERSUS.leftPortrait1, name: VERSUS.leftName1, side: 'left', delayMs: 40 },
    { person: membersA[1], photo: VERSUS.leftPortrait2, name: VERSUS.leftName2, side: 'left', delayMs: 120 },
    { person: membersB[0], photo: VERSUS.rightPortrait1, name: VERSUS.rightName1, side: 'right', delayMs: 40 },
    { person: membersB[1], photo: VERSUS.rightPortrait2, name: VERSUS.rightName2, side: 'right', delayMs: 120 },
  ]

  return (
    <FixedCanvas className="ce-scene-host ce-versus-host">
      <img src={backgroundSrc} alt="" aria-hidden="true" className="ce-versus-stage-bg" draggable={false} />
      <div className="ce-team-vignette" aria-hidden="true" />

      <div style={absoluteBox(VERSUS.phase)} className="ce-center ce-versus-phase">
        <BitmapText
          text={phaseLabel.toUpperCase()}
          size={VERSUS_HUD.phase.size}
          align="center"
          scale={VERSUS_HUD.phase.scale}
          maxWidth={VERSUS.phase.w}
        />
      </div>

      {slots.map((slot) => (
        <div
          key={slot.person.id}
          style={{ ...absoluteBox(slot.photo), animationDelay: `${slot.delayMs}ms` }}
          className={`ce-versus-portrait ce-versus-enter-${slot.side}`}
        >
          <PlayerPortrait src={slot.person.photoUrl} alt={slot.person.name} />
        </div>
      ))}

      {slots.map((slot) => (
        <MemberName
          key={`nm-${slot.person.id}`}
          box={slot.name}
          name={slot.person.name}
          side={slot.side}
          delayMs={slot.delayMs + 80}
        />
      ))}

      <img
        src={canonicalUi.vsEmblem}
        alt="VS"
        className="ce-vs ce-versus-vs"
        style={{ ...absoluteBox(VERSUS.vs), objectFit: 'contain' }}
      />

      <div
        style={absoluteBox(VERSUS.target)}
        className={`ce-center ce-versus-status${waiting ? ' is-waiting' : ''}`}
      >
        <BitmapText
          text={targetText}
          size={VERSUS_HUD.status.size}
          align="center"
          scale={VERSUS_HUD.status.scale}
          maxWidth={VERSUS.target.w - 24}
        />
      </div>
    </FixedCanvas>
  )
}
