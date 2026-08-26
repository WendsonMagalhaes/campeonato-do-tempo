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
import { prizeImageForAmount } from './prizeAssets.ts'
import { CelebrationCrowd } from './CelebrationCrowd.tsx'
import { CelebrationConfetti } from './CelebrationConfetti.tsx'
import { FighterSprite } from './FighterSprite.tsx'
import '../copa-ui/runtime/runtime.css'

/** Moldura nova dos avatares, única pra todo mundo nessa tela (não mexe
 * na moldura padrão usada em Round 3 / Versus / etc). */
const AVATAR_FRAME_QUALIFIED = '/assets/ui/avatar-frame-qualified.png'
/** Versão "-off" da mesma moldura -- usada só na tela do eliminado. */
const AVATAR_FRAME_QUALIFIED_OFF = '/assets/ui/avatar-frame-qualified-off.png'
/** Título da tela de eliminado -- mesmo esquema do winner.png, mas pro perdedor. */
const LOSER_TITLE_IMAGE = '/assets/ui/loser.png'

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
  /** Team color for sheet key + CSS accent (a própria cor da dupla exibida, vencedora ou não). */
  side: TeamSide
  /** Valor do prêmio (número puro, ex: 500) -- vira imagem via prizeAssets.ts. */
  prizeAmount?: number | null
  /** 'classified' (padrão) usa o título "Dupla classificada". 'eliminated' troca por texto. */
  outcome?: 'classified' | 'eliminated'
}

/**
 * Match-result celebration — plaza BG + fighters + composed crowd.
 * `outcome: 'classified'` (padrão): título usa `winner.png`, mantém o
 * clima de festa (confete + torcida + placar), com o prêmio em leve destaque.
 * `outcome: 'eliminated'`: fundo escurecido, sem festa (sem confete/torcida/
 * placar) — o foco fica todo no agradecimento e no valor do prêmio, ambos
 * em painéis com bastante destaque.
 */
export function DuoQualifiedScene({
  teamName,
  scoreA,
  scoreB,
  members,
  side,
  prizeAmount,
  outcome = 'classified',
}: Props) {
  const nameMax = qualifiedTextMaxWidth(DUO_QUALIFIED.teamName, QUALIFIED_HUD.duoName.maxWidthRatio)
  const showPhoto0 = Boolean(members[0].photoUrl)
  const showPhoto1 = Boolean(members[1].photoUrl)
  const isEliminated = outcome === 'eliminated'

  const titleBox = isEliminated ? DUO_QUALIFIED.titleEliminated : DUO_QUALIFIED.title
  const prizeBox = isEliminated ? DUO_QUALIFIED.prizeEliminated : DUO_QUALIFIED.prize
  const prizeSrc = prizeAmount != null ? prizeImageForAmount(prizeAmount) : null
  const portraitFrameSrc = isEliminated ? AVATAR_FRAME_QUALIFIED_OFF : AVATAR_FRAME_QUALIFIED
  const fighterAnim = isEliminated ? 'hurt' : 'victory'

  return (
    <FixedCanvas className={`ce-scene-host ce-qualified-host is-${side} ${isEliminated ? 'is-eliminated' : ''}`}>
      <img
        className="ce-qualified-stage-bg"
        src={CHAMPION_BG}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="ce-team-vignette ce-qualified-vignette" aria-hidden="true" />
      {isEliminated ? <div className="ce-qualified-eliminated-overlay" aria-hidden="true" /> : null}
      {!isEliminated ? <CelebrationConfetti /> : null}

      <div
        style={absoluteBox(titleBox)}
        className="ce-center ce-qualified-hud ce-qualified-winner-title"
        data-testid="duo-qualified-winner"
      >
        {isEliminated ? (
          <img
            className="ce-qualified-winner-title__img ce-pixel"
            src={LOSER_TITLE_IMAGE}
            alt="Dupla eliminada"
            draggable={false}
          />
        ) : (
          <img
            className="ce-qualified-winner-title__img ce-pixel"
            src={battleCallouts.winner}
            alt="Dupla classificada"
            draggable={false}
          />
        )}
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

      {!isEliminated ? (
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
      ) : null}

      {showPhoto0 ? (
        <div
          style={absoluteBox(DUO_QUALIFIED.portrait1)}
          className={`ce-qualified-portrait accent-${side} ${isEliminated ? 'is-dimmed' : ''}`}
        >
          <PlayerPortrait
            src={members[0].photoUrl}
            alt={members[0].name}
            focusY={20}
            selected
            frameSrc={portraitFrameSrc}
          />
        </div>
      ) : null}
      {showPhoto1 ? (
        <div
          style={absoluteBox(DUO_QUALIFIED.portrait2)}
          className={`ce-qualified-portrait accent-${side} ${isEliminated ? 'is-dimmed' : ''}`}
        >
          <PlayerPortrait
            src={members[1].photoUrl}
            alt={members[1].name}
            focusY={20}
            selected
            frameSrc={portraitFrameSrc}
          />
        </div>
      ) : null}

      <div style={absoluteBox(DUO_QUALIFIED.fighter1)} className="ce-qualified-fighter">
        <FighterSprite
          side={side}
          variant={members[0].fighterVariant}
          participantSlug={members[0].id}
          anim={fighterAnim}
          face="right"
          className="ce-qualified-fighter__sprite"
        />
      </div>
      <div style={absoluteBox(DUO_QUALIFIED.fighter2)} className="ce-qualified-fighter">
        <FighterSprite
          side={side}
          variant={members[1].fighterVariant}
          participantSlug={members[1].id}
          anim={fighterAnim}
          face="left"
          className="ce-qualified-fighter__sprite"
        />
      </div>

      {!isEliminated ? <CelebrationCrowd /> : null}

      {prizeSrc ? (
        <div style={absoluteBox(prizeBox)} className="ce-center ce-qualified-hud">
          <div className={`ce-qualified-prize-panel ${isEliminated ? 'is-eliminated' : ''}`}>
            <img
              className="ce-qualified-prize-image"
              src={prizeSrc}
              alt={`Prêmio R$ ${prizeAmount}`}
              draggable={false}
            />
          </div>
        </div>
      ) : null}
    </FixedCanvas>
  )
}