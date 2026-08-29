import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { BitmapText } from '../components/BitmapText.tsx'
import { PlayerPortrait } from '../components/PlayerPortrait.tsx'
import { useRealImageAsset } from '../hooks/useRealImageAsset.ts'
import {
  ROUND3,
  ROUND3_BG_FALLBACK,
  ROUND3_BG_PREFERRED,
  ROUND3_HUD,
  absoluteBox,
  type Box,
} from '../layouts/round3SelectionGeometry.ts'
import { canonicalUi } from '../../battle/battle-assets.ts'
import './runtime.css'

export type Round3Candidate = {
  id: string
  name: string
  photoUrl: string | null
}

type Props = {
  membersA: [Round3Candidate, Round3Candidate]
  membersB: [Round3Candidate, Round3Candidate]
  /** Draft pick from operator UI before confirm (highlight on scoreboard). */
  draftAId: string | null
  draftBId: string | null
  backgroundSrc?: string
  /**
   * Reaproveita a mesma tela pra outras seleções (ex: Rodada 1 -- escolha
   * de quem abre o confronto). Default mantém o texto original do round 3.
   */
  title?: string
}

/** Candidate name under the photo — BitmapText only (no decorative name_plate PNG). */
function CandidateName({ box, name }: { box: Box; name: string }) {
  return (
    <div style={absoluteBox(box)} className="ce-center ce-r3-candidate-name">
      <BitmapText
        text={name.toUpperCase()}
        size={ROUND3_HUD.candidateName.size}
        align="center"
        scale={ROUND3_HUD.candidateName.scale}
        maxWidth={box.w - 16}
      />
    </div>
  )
}

/**
 * Seleção de representante da dupla — layout compartilhado.
 * Usada tanto na Rodada 3 (escolha do representante decisivo) quanto na
 * Rodada 1 (escolha de quem abre o confronto), via prop `title`.
 * Baked `round3_selection_screen.png` is reference only.
 * Selection state = CSS border/glow on the chosen top slots (no sprite cursor, no bottom row).
 * No score banner / duo labels — names live under each large PlayerPortrait.
 */
export function DuoSelectionScene({
  membersA,
  membersB,
  draftAId,
  draftBId,
  backgroundSrc,
  title = 'RODADA 3 - ESCOLHA O REPRESENTANTE',
}: Props) {
  const hasPreferredBg = useRealImageAsset(ROUND3_BG_PREFERRED)
  const bgSrc =
    backgroundSrc ?? (hasPreferredBg ? ROUND3_BG_PREFERRED : ROUND3_BG_FALLBACK)

  const slots: Array<{
    person: Round3Candidate
    photo: Box
    name: Box
    player: 'p1' | 'p2'
    selected: boolean
  }> = [
      {
        person: membersA[0],
        photo: ROUND3.leftCandidate1,
        name: ROUND3.leftName1,
        player: 'p1',
        selected: draftAId === membersA[0].id,
      },
      {
        person: membersA[1],
        photo: ROUND3.leftCandidate2,
        name: ROUND3.leftName2,
        player: 'p1',
        selected: draftAId === membersA[1].id,
      },
      {
        person: membersB[0],
        photo: ROUND3.rightCandidate1,
        name: ROUND3.rightName1,
        player: 'p2',
        selected: draftBId === membersB[0].id,
      },
      {
        person: membersB[1],
        photo: ROUND3.rightCandidate2,
        name: ROUND3.rightName2,
        player: 'p2',
        selected: draftBId === membersB[1].id,
      },
    ]

  return (
    <FixedCanvas className="ce-scene-host ce-r3-host">
      <img src={bgSrc} alt="" aria-hidden="true" className="ce-round3-stage-bg" draggable={false} />
      <div className="ce-team-vignette" aria-hidden="true" />

      <div style={absoluteBox(ROUND3.title)} className="ce-center">
        <BitmapText
          text={title}
          size={ROUND3_HUD.title.size}
          align="center"
          scale={ROUND3_HUD.title.scale}
          maxWidth={ROUND3.title.w}
        />
      </div>

      {slots.map((slot) => (
        <div
          key={slot.person.id}
          style={absoluteBox(slot.photo)}
          className={`ce-r3-portrait-slot${slot.selected ? ` is-draft-${slot.player}` : ''}`}
        >
          <PlayerPortrait src={slot.person.photoUrl} alt={slot.person.name} />
        </div>
      ))}

      {slots.map((slot) => (
        <CandidateName key={`nm-${slot.person.id}`} box={slot.name} name={slot.person.name} />
      ))}

      <img
        src={canonicalUi.vsEmblem}
        alt="VS"
        className="ce-vs"
        style={{ ...absoluteBox(ROUND3.vs), objectFit: 'contain' }}
      />
    </FixedCanvas>
  )
}

/** Alias — mantém compatibilidade com quem já importa `Round3SelectionScene`. */
export const Round3SelectionScene = DuoSelectionScene