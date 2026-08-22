import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScoreboardProjection } from '../domain/projections.ts'
import { Portrait } from '../ui/canonical/Portrait.tsx'
import { BitmapText } from '../copa-ui/components/BitmapText.tsx'
import { FixedCanvas } from '../copa-ui/components/FixedCanvas.tsx'
import {
  BATTLE,
  BATTLE_HUD,
  PLATE_ASPECT,
  absoluteBox,
  battleTextMaxWidth,
  fighterPlacement,
} from '../copa-ui/layouts/battleGeometry.ts'
import {
  battleFx,
  type FighterVariant,
} from './battle-assets.ts'
import { APPROACH_PX, WALK_IN_MS } from './battle-timeline.ts'
import { ScorePanel, TimePanel } from './CanonicalHud.tsx'
import { FighterSprite } from './FighterSprite.tsx'
import { globalAudio } from '../audio/singleton.ts'
import { useBattleDirector } from './useBattleDirector.ts'
import '../copa-ui/runtime/runtime.css'

type VersusView = NonNullable<ScoreboardProjection['versus']>

type Props = {
  versus: VersusView
  screen: ScoreboardProjection['screen']
  getPhoto: (photoAssetId: string | null | undefined) => string | null
  /**
   * When true, force the match-finish KO timeline even if domain already left the round screen
   * (scoreboard holds battle until KO completes before duo-qualified).
   */
  forceMatchFinish?: boolean
  /**
   * When true, force the round-win punch timeline (not KO) while scoreboard holds battle
   * before Round 3 selection after a 1–1 R2 confirm.
   */
  forceRoundWin?: boolean
}

function activeMember(
  members: VersusView['membersA'],
  activeId: string | null,
): { id: string; name: string; photoAssetId: string | null; fighterVariant: FighterVariant } {
  const found =
    (activeId ? members.find((m) => m.id === activeId) : undefined) ??
    (!activeId ? members[0] : undefined) ??
    members[0]
  const variant = found.fighterVariant === 'female' ? 'female' : found.fighterVariant === 'male' ? 'male' : 'male'
  return {
    id: found.id,
    name: found.name,
    photoAssetId: found.photoAssetId,
    fighterVariant: variant,
  }
}

/** Exactly one primary BitmapText callout — never stack with large PNG callouts. */
function primaryMessage(versus: VersusView, overlayText: string | null): string | null {
  if (overlayText) return overlayText.toUpperCase()
  if (versus.tie) return 'EMPATE'
  if (!versus.roundNumber) return null
  // Do not announce hidden times — crowd/stage read better without that banner.
  // Keep BitmapText "VENCE A RODADA: NOME" — do not replace with winner.png.
  if (versus.roundWinner) return `VENCE A RODADA: ${versus.roundWinner}`.toUpperCase()
  return null
}

/** Display size for large callout PNGs (~0.85 of natural ~750px width). */
const CALLOUT_SCALE = 0.85

function useScorePop(scoreA: number, scoreB: number): 'left' | 'right' | null {
  const prev = useRef({ a: scoreA, b: scoreB })
  const [popSide, setPopSide] = useState<'left' | 'right' | null>(null)

  useEffect(() => {
    const before = prev.current
    let side: 'left' | 'right' | null = null
    if (scoreA > before.a) side = 'left'
    else if (scoreB > before.b) side = 'right'
    prev.current = { a: scoreA, b: scoreB }
    if (!side) return
    setPopSide(side)
    const t = window.setTimeout(() => setPopSide(null), 520)
    return () => window.clearTimeout(t)
  }, [scoreA, scoreB])

  return popSide
}

export function BattleScene({
  versus,
  screen,
  getPhoto,
  forceMatchFinish = false,
  forceRoundWin = false,
}: Props) {
  const winnerSide =
    versus.roundWinnerSide ??
    (forceMatchFinish || forceRoundWin
      ? versus.scoreA > versus.scoreB
        ? 'left'
        : versus.scoreB > versus.scoreA
          ? 'right'
          : null
      : null)

  // Round-win hold must NOT use match-finish KO timeline / announcer.
  const matchPoint = forceRoundWin ? false : forceMatchFinish || versus.matchPoint
  const finalScore: '2-0' | '2-1' | null = forceRoundWin
    ? null
    : forceMatchFinish
      ? versus.finalScoreLabel ??
        (versus.scoreA === 2 || versus.scoreB === 2
          ? (Math.min(versus.scoreA, versus.scoreB) === 0 ? '2-0' : '2-1')
          : '2-1')
      : versus.finalScoreLabel

  const holdSuffix = forceMatchFinish ? '-ko-hold' : forceRoundWin ? '-r3-hold' : ''
  const resultKey =
    winnerSide && ((!versus.timesHidden && !versus.tie) || forceMatchFinish || forceRoundWin)
      ? `${versus.stage}-${versus.roundNumber}-${winnerSide}-${versus.scoreA}-${versus.scoreB}${holdSuffix}`
      : null

  const introKey =
    !forceMatchFinish &&
    !forceRoundWin &&
    versus.roundNumber &&
    versus.activeAId &&
    versus.activeBId &&
    (screen === 'round' || screen === 'round3')
      ? `${versus.stage}-r${versus.roundNumber}-intro`
      : null

  const left = useMemo(
    () => activeMember(versus.membersA, versus.activeAId),
    [versus.membersA, versus.activeAId],
  )
  const right = useMemo(
    () => activeMember(versus.membersB, versus.activeBId),
    [versus.membersB, versus.activeBId],
  )

  const visual = useBattleDirector({
    resultKey,
    winnerSide,
    matchPoint,
    finalScore,
    introKey,
    roundNumber: versus.roundNumber,
    audio: globalAudio,
    loserVariant: winnerSide === 'left' ? right.fighterVariant : left.fighterVariant,
  })

  const leftPlace = fighterPlacement(BATTLE.leftFighter)
  const rightPlace = fighterPlacement(BATTLE.rightFighter)

  // Walk-in attack: attacker translates toward the opponent over the walk cycle,
  // punches from the advanced spot, then the same transition walks them back.
  const leftShift = visual.advanceSide === 'left' ? APPROACH_PX : 0
  const rightShift = visual.advanceSide === 'right' ? -APPROACH_PX : 0
  const walkTransition = `transform ${WALK_IN_MS}ms linear`

  const shakeClass =
    visual.cameraShake === 'none' ? '' : `ce-camera-shake ce-camera-shake--${visual.cameraShake}`

  // Stage only in score center — round number is announced via ROUND/FIGHT callouts.
  const roundLabel = versus.stage.toUpperCase()

  const hudMessage = primaryMessage(versus, visual.overlayText)
  // Large PNG callouts (intro ROUND/FIGHT, match KO) — separate from HUD BitmapText slot.
  const showCallout = Boolean(visual.calloutSrc)
  const scorePop = useScorePop(versus.scoreA, versus.scoreB)
  const pulseSide =
    !versus.timesHidden && versus.roundWinnerSide
      ? versus.roundWinnerSide
      : winnerSide && (forceMatchFinish || forceRoundWin)
        ? winnerSide
        : null

  // Corner MM:SS:CS for the whole result beat (walk-in → punch → score), not while hidden.
  const showCornerTimes =
    !versus.timesHidden &&
    Boolean(versus.timeA || versus.timeB) &&
    (visual.phase === 'attack' ||
      visual.phase === 'impact' ||
      visual.phase === 'hurt' ||
      visual.phase === 'fall' ||
      visual.phase === 'lying-ko' ||
      visual.phase === 'ko-announce' ||
      visual.phase === 'perfect-announce' ||
      visual.phase === 'score-reveal' ||
      visual.phase === 'victory' ||
      visual.impactVisible)

  return (
    <FixedCanvas className={`ce-scene-host ce-battle-host ${shakeClass}`}>
      {/* 1. Stage / background — coldroom static BG */}
      <img
        src="/assets/backgrounds/battle_dock_coldroom_bg.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="ce-battle-bg ce-pixel"
        style={absoluteBox(BATTLE.background)}
      />

      {/* 3. Fighters — always on stage (incl. tempos ocultos); above mist, under HUD chrome */}
      <FighterSprite
        className="ce-battle-fighter"
        side="blue"
        variant={left.fighterVariant}
        participantSlug={left.id}
        anim={visual.left}
        style={{
          position: 'absolute',
          left: leftPlace.left,
          top: leftPlace.top,
          width: leftPlace.width,
          height: leftPlace.height,
          zIndex: 3,
          visibility: 'visible',
          opacity: 1,
          transform: `translateX(${leftShift}px)`,
          transition: walkTransition,
        }}
      />
      <FighterSprite
        className="ce-battle-fighter"
        side="red"
        variant={right.fighterVariant}
        participantSlug={right.id}
        anim={visual.right}
        style={{
          position: 'absolute',
          left: rightPlace.left,
          top: rightPlace.top,
          width: rightPlace.width,
          height: rightPlace.height,
          zIndex: 3,
          visibility: 'visible',
          opacity: 1,
          transform: `translateX(${rightShift}px)`,
          transition: walkTransition,
        }}
      />

      {/* 4. Combat FX — pre-extracted PNG at contact point between fighters */}
      {visual.impactVisible ? (
        <img
          className="ce-battle-impact ce-pixel"
          src={matchPoint ? battleFx.impact : battleFx.impactLight}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: BATTLE.impactCenter.x - BATTLE.impactSize.w / 2,
            top: BATTLE.impactCenter.y - BATTLE.impactSize.h / 2,
            width: BATTLE.impactSize.w,
            height: BATTLE.impactSize.h,
            objectFit: 'contain',
            zIndex: 3,
            pointerEvents: 'none',
            // Impact follows the advanced attacker's fist (no transition — appears in place).
            transform: `translateX(${leftShift + rightShift}px)`,
          }}
        />
      ) : null}

      {/* 5. Canonical HUD — boxes + text metrics from battleGeometry */}
      <div className="ce-battle-hud-layer" aria-hidden={false}>
        <div style={{ ...absoluteBox(BATTLE.score), zIndex: 4 }}>
          <ScorePanel
            scoreA={versus.scoreA}
            scoreB={versus.scoreB}
            roundLabel={roundLabel}
            className="ce-battle-score-fill"
            panelBox={BATTLE.score}
            popSide={scorePop}
          />
        </div>

        {/* Duo names — beside portrait clusters (left→right of avatars; right→left of avatars). */}
        <div
          style={{ ...absoluteBox(BATTLE.leftName), zIndex: 4 }}
          className={`ce-battle-duo-name ce-battle-duo-name--left${pulseSide === 'left' ? ' is-pulse' : ''}`}
        >
          <BitmapText
            text={versus.teamAName.toUpperCase()}
            size={BATTLE_HUD.nameText.size}
            scale={BATTLE_HUD.nameText.scale}
            align="left"
            maxWidth={battleTextMaxWidth(
              BATTLE.leftName,
              BATTLE_HUD.nameText.maxWidthRatio,
              BATTLE.leftName.w / BATTLE.leftName.h,
            )}
          />
        </div>
        <div
          style={{ ...absoluteBox(BATTLE.rightName), zIndex: 4 }}
          className={`ce-battle-duo-name ce-battle-duo-name--right${pulseSide === 'right' ? ' is-pulse' : ''}`}
        >
          <BitmapText
            text={versus.teamBName.toUpperCase()}
            size={BATTLE_HUD.nameText.size}
            scale={BATTLE_HUD.nameText.scale}
            align="right"
            maxWidth={battleTextMaxWidth(
              BATTLE.rightName,
              BATTLE_HUD.nameText.maxWidthRatio,
              BATTLE.rightName.w / BATTLE.rightName.h,
            )}
          />
        </div>

        {versus.membersA.map((member, index) => {
          const box = index === 0 ? BATTLE.leftHudPortrait : BATTLE.leftHudPortrait2
          return (
            <div
              key={member.id}
              style={{ ...absoluteBox(box), zIndex: 5 }}
              className={
                pulseSide === 'left'
                  ? 'ce-battle-portrait-wrap is-pulse is-pulse-left'
                  : 'ce-battle-portrait-wrap'
              }
            >
              <Portrait
                className="ce-battle-portrait"
                state={versus.activeAId === member.id ? 'blue' : 'eliminated'}
                photoUrl={(member.photoAssetId && getPhoto(member.photoAssetId)) || member.avatarUrl || null}
                alt={member.name}
              />
            </div>
          )
        })}

        {versus.membersB.map((member, index) => {
          const box = index === 0 ? BATTLE.rightHudPortrait2 : BATTLE.rightHudPortrait
          return (
            <div
              key={member.id}
              style={{ ...absoluteBox(box), zIndex: 5 }}
              className={
                pulseSide === 'right'
                  ? 'ce-battle-portrait-wrap is-pulse is-pulse-right'
                  : 'ce-battle-portrait-wrap'
              }
            >
              <Portrait
                className="ce-battle-portrait"
                state={versus.activeBId === member.id ? 'red' : 'eliminated'}
                photoUrl={(member.photoAssetId && getPhoto(member.photoAssetId)) || member.avatarUrl || null}
                alt={member.name}
              />
            </div>
          )
        })}

        {/* TEMPO ALVO — mid-lower plaque above head gap; only when target is set */}
        {versus.targetLabel ? (
          <div
            style={{ ...absoluteBox(BATTLE.target), zIndex: 4 }}
            className="ce-battle-target"
            data-testid="battle-target-plaque"
          >
            <BitmapText
              text="TEMPO ALVO"
              size={BATTLE_HUD.targetLabel.size}
              scale={BATTLE_HUD.targetLabel.scale}
              align="right"
              maxWidth={battleTextMaxWidth(BATTLE.target, BATTLE_HUD.targetLabel.maxWidthRatio, 12)}
            />
            <BitmapText
              text={versus.targetLabel}
              size={BATTLE_HUD.targetValue.size}
              scale={BATTLE_HUD.targetValue.scale}
              align="left"
              maxWidth={battleTextMaxWidth(BATTLE.target, BATTLE_HUD.targetValue.maxWidthRatio, 12)}
            />
          </div>
        ) : null}

        {!versus.timesHidden && versus.timeA ? (
          <div style={{ ...absoluteBox(BATTLE.leftTime), zIndex: 4 }}>
            <TimePanel
              text={versus.timeA}
              className="ce-battle-name-fill"
              maxWidth={battleTextMaxWidth(
                BATTLE.leftTime,
                BATTLE_HUD.timeText.maxWidthRatio,
                PLATE_ASPECT.name,
              )}
              scale={BATTLE_HUD.timeText.scale}
            />
          </div>
        ) : null}
        {!versus.timesHidden && versus.timeB ? (
          <div style={{ ...absoluteBox(BATTLE.rightTime), zIndex: 4 }}>
            <TimePanel
              text={versus.timeB}
              className="ce-battle-name-fill"
              maxWidth={battleTextMaxWidth(
                BATTLE.rightTime,
                BATTLE_HUD.timeText.maxWidthRatio,
                PLATE_ASPECT.name,
              )}
              scale={BATTLE_HUD.timeText.scale}
            />
          </div>
        ) : null}

        {/* Corner times: pinned bottom L/R — do NOT follow walk-in translateX */}
        {showCornerTimes && versus.timeA ? (
          <div
            style={{
              ...absoluteBox(BATTLE.leftFighterTime),
              zIndex: 5,
            }}
            className="ce-battle-fighter-time ce-battle-fighter-time--left"
            data-testid="fighter-time-left"
          >
            <BitmapText
              text={versus.timeA}
              size={BATTLE_HUD.fighterTime.size}
              scale={BATTLE_HUD.fighterTime.scale}
              align="center"
              maxWidth={battleTextMaxWidth(
                BATTLE.leftFighterTime,
                BATTLE_HUD.fighterTime.maxWidthRatio,
                12,
              )}
            />
          </div>
        ) : null}
        {showCornerTimes && versus.timeB ? (
          <div
            style={{
              ...absoluteBox(BATTLE.rightFighterTime),
              zIndex: 5,
            }}
            className="ce-battle-fighter-time ce-battle-fighter-time--right"
            data-testid="fighter-time-right"
          >
            <BitmapText
              text={versus.timeB}
              size={BATTLE_HUD.fighterTime.size}
              scale={BATTLE_HUD.fighterTime.scale}
              align="center"
              maxWidth={battleTextMaxWidth(
                BATTLE.rightFighterTime,
                BATTLE_HUD.fighterTime.maxWidthRatio,
                12,
              )}
            />
          </div>
        ) : null}

        {hudMessage && !showCallout ? (
          <div
            style={{ ...absoluteBox(BATTLE.roundTitle), zIndex: 6 }}
            className="ce-battle-primary-msg"
            data-testid="battle-status-plaque"
          >
            <BitmapText
              text={hudMessage}
              size="medium"
              scale={0.28}
              align="center"
              maxWidth={BATTLE.roundTitle.w - 48}
            />
          </div>
        ) : null}
      </div>

      {/* Large announcer callouts — centered, natural aspect (~0.85 scale), not HUD 540×72 */}
      {showCallout && visual.calloutSrc ? (
        <div
          style={{ ...absoluteBox(BATTLE.calloutOverlay), zIndex: 7 }}
          className="ce-battle-callout"
          data-testid="battle-callout"
        >
          <img
            className="ce-battle-callout__img ce-pixel"
            src={visual.calloutSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ transform: `scale(${CALLOUT_SCALE})` }}
          />
        </div>
      ) : null}
    </FixedCanvas>
  )
}
