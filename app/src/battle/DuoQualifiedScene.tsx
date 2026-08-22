import { ScorePanel } from './CanonicalHud.tsx'
import { BitmapText } from '../copa-ui/components/BitmapText.tsx'
import { FixedCanvas } from '../copa-ui/components/FixedCanvas.tsx'
import { PlayerPortrait } from '../copa-ui/components/PlayerPortrait.tsx'
import {
  absoluteBox,
  CHAMPION_BG,
  DUO_QUALIFIED,
  QUALIFIED_HUD,
  qualifiedTextMaxWidth,
} from '../copa-ui/layouts/championGeometry.ts'
import { canonicalUi, battleCallouts } from './battle-assets.ts'
import type { FighterVariant, TeamSide } from './battle-assets.ts'
import { CelebrationCrowd } from './CelebrationCrowd.tsx'
import { CelebrationConfetti } from './CelebrationConfetti.tsx'
import { FighterSprite } from './FighterSprite.tsx'
import '../copa-ui/runtime/runtime.css'

type Member = {
  id: string
  name: string
  photoUrl: string | null
  fighterVariant: FighterVariant
}

type Props = {
  teamName: string
  scoreA: number
  scoreB: number
  members: [Member, Member]
  /** Winning side color for sheet key + CSS accent. */
  side: TeamSide
  prize?: string | null
}

/**
 * Match-qualified celebration — plaza BG + victory fighters + composed crowd.
 * Title uses `winner.png` (not BitmapText "DUPLA CLASSIFICADA").
 * Duo identity is the nameplate only (no duplicate member line).
 * duo_qualified blue/red reference plates are not used as full structural UI.
 */
export function DuoQualifiedScene({ teamName, scoreA, scoreB, members, side, prize }: Props) {
  const nameMax = qualifiedTextMaxWidth(DUO_QUALIFIED.teamName, QUALIFIED_HUD.duoName.maxWidthRatio)
  const showPhoto0 = Boolean(members[0].photoUrl)
  const showPhoto1 = Boolean(members[1].photoUrl)

  return (
    <FixedCanvas className={`ce-scene-host ce-qualified-host is-${side}`}>
      <img
        className="ce-qualified-stage-bg"
        src={CHAMPION_BG}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="ce-team-vignette ce-qualified-vignette" aria-hidden="true" />
      <CelebrationConfetti />

      <div
        style={absoluteBox(DUO_QUALIFIED.title)}
        className="ce-center ce-qualified-hud ce-qualified-winner-title"
        data-testid="duo-qualified-winner"
      >
        <img
          className="ce-qualified-winner-title__img ce-pixel"
          src={battleCallouts.winner}
          alt="Dupla classificada"
          draggable={false}
        />
      </div>

      <div
        style={absoluteBox(DUO_QUALIFIED.teamName)}
        className="ce-center ce-nameplate-slot ce-versus-nameplate ce-qualified-hud"
      >
        <img className="ce-nameplate-art" src={canonicalUi.namePlate} alt="" aria-hidden="true" />
        <div className="ce-versus-nameplate__label">
          <BitmapText
            text={teamName.toUpperCase()}
            size={QUALIFIED_HUD.duoName.size}
            scale={QUALIFIED_HUD.duoName.scale}
            align="center"
            maxWidth={nameMax}
          />
        </div>
      </div>

      <div style={absoluteBox(DUO_QUALIFIED.score)} className="ce-qualified-hud">
        <ScorePanel
          scoreA={scoreA}
          scoreB={scoreB}
          roundLabel="WIN"
          className="ce-battle-score-fill"
          panelBox={DUO_QUALIFIED.score}
          digitScale={QUALIFIED_HUD.score.scale}
          roundScale={0.3}
        />
      </div>

      {showPhoto0 ? (
        <div style={absoluteBox(DUO_QUALIFIED.portrait1)} className={`ce-qualified-portrait accent-${side}`}>
          <PlayerPortrait src={members[0].photoUrl} alt={members[0].name} focusY={20} selected />
        </div>
      ) : null}
      {showPhoto1 ? (
        <div style={absoluteBox(DUO_QUALIFIED.portrait2)} className={`ce-qualified-portrait accent-${side}`}>
          <PlayerPortrait src={members[1].photoUrl} alt={members[1].name} focusY={20} selected />
        </div>
      ) : null}

      <div style={absoluteBox(DUO_QUALIFIED.fighter1)} className="ce-qualified-fighter">
        <FighterSprite
          side={side}
          variant={members[0].fighterVariant}
          participantSlug={members[0].id}
          anim="victory"
          face="right"
          className="ce-qualified-fighter__sprite"
        />
      </div>
      <div style={absoluteBox(DUO_QUALIFIED.fighter2)} className="ce-qualified-fighter">
        <FighterSprite
          side={side}
          variant={members[1].fighterVariant}
          participantSlug={members[1].id}
          anim="victory"
          face="left"
          className="ce-qualified-fighter__sprite"
        />
      </div>

      {/* Foreground spectators (back-facing) — after fighters so legs can be occluded. */}
      <CelebrationCrowd />

      {prize ? (
        <div style={absoluteBox(DUO_QUALIFIED.prize)} className="ce-center ce-qualified-hud">
          <BitmapText
            text={prize.toUpperCase()}
            size={QUALIFIED_HUD.prize.size}
            scale={QUALIFIED_HUD.prize.scale}
            align="center"
            maxWidth={DUO_QUALIFIED.prize.w}
          />
        </div>
      ) : null}
    </FixedCanvas>
  )
}
