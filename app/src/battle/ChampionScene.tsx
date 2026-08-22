import { FixedCanvas } from '../copa-ui/components/FixedCanvas.tsx'
import { BitmapText } from '../copa-ui/components/BitmapText.tsx'
import { PlayerPortrait } from '../copa-ui/components/PlayerPortrait.tsx'
import {
  absoluteBox,
  CHAMPION,
  CHAMPION_BG,
  QUALIFIED_HUD,
  qualifiedTextMaxWidth,
} from '../copa-ui/layouts/championGeometry.ts'
import { canonicalUi } from './battle-assets.ts'
import type { FighterVariant } from './battle-assets.ts'
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
  members: [Member, Member]
}

/**
 * Champion reveal — plaza BG + victory fighters + composed crowd.
 * Gold accent; fighters use blue sheet as default celebration palette.
 * Title remains BitmapText "CAMPEÃ" — dedicated champion title PNG pending human art
 * (do NOT reuse `/assets/ui/winner.png`, which is Duo Qualified only).
 * Prize currency is intentionally omitted from the telão (domain prizes unchanged).
 */
export function ChampionScene({ teamName, members }: Props) {
  const nameMax = qualifiedTextMaxWidth(CHAMPION.teamName, QUALIFIED_HUD.duoName.maxWidthRatio)
  const showPhoto0 = Boolean(members[0].photoUrl)
  const showPhoto1 = Boolean(members[1].photoUrl)

  return (
    <FixedCanvas className="ce-scene-host ce-champion-host">
      <img src={CHAMPION_BG} alt="" aria-hidden="true" className="ce-qualified-stage-bg" draggable={false} />
      <div className="ce-team-vignette ce-qualified-vignette" aria-hidden="true" />
      <CelebrationConfetti />

      <div style={absoluteBox(CHAMPION.title)} className="ce-center ce-qualified-hud">
        <BitmapText
          text="CAMPEÃ"
          size={QUALIFIED_HUD.title.size}
          scale={0.48}
          align="center"
          maxWidth={CHAMPION.title.w}
        />
      </div>

      <div
        style={absoluteBox(CHAMPION.teamName)}
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

      {showPhoto0 ? (
        <div style={absoluteBox(CHAMPION.portrait1)} className="ce-qualified-portrait accent-gold">
          <PlayerPortrait src={members[0].photoUrl} alt={members[0].name} focusY={20} selected />
        </div>
      ) : null}
      {showPhoto1 ? (
        <div style={absoluteBox(CHAMPION.portrait2)} className="ce-qualified-portrait accent-gold">
          <PlayerPortrait src={members[1].photoUrl} alt={members[1].name} focusY={20} selected />
        </div>
      ) : null}

      <div style={absoluteBox(CHAMPION.fighter1)} className="ce-qualified-fighter">
        <FighterSprite
          side="blue"
          variant={members[0].fighterVariant}
          participantSlug={members[0].id}
          anim="victory"
          face="right"
          className="ce-qualified-fighter__sprite"
        />
      </div>
      <div style={absoluteBox(CHAMPION.fighter2)} className="ce-qualified-fighter">
        <FighterSprite
          side="blue"
          variant={members[1].fighterVariant}
          participantSlug={members[1].id}
          anim="victory"
          face="left"
          className="ce-qualified-fighter__sprite"
        />
      </div>

      <CelebrationCrowd />
    </FixedCanvas>
  )
}
