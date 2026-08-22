import type { ReactNode } from 'react'
import { BitmapText } from '../copa-ui/components/BitmapText.tsx'
import {
  BATTLE,
  BATTLE_HUD,
  PLATE_ASPECT,
  SCORE_PANEL_HOLES_PX,
  battleTextMaxWidth,
  scorePanelHoleInBox,
  type Box,
} from '../copa-ui/layouts/battleGeometry.ts'
import { canonicalUi } from './battle-assets.ts'

type ScorePanelProps = {
  scoreA: number
  scoreB: number
  /** Text for the wide center hole (stage only, e.g. "OITAVAS" — no R1/R2). */
  roundLabel?: string | null
  className?: string
  /** Panel draw box used for hole mapping (defaults to battle HUD score slot). */
  panelBox?: Box
  /** Optional pop animation when a point lands. */
  popSide?: 'left' | 'right' | null
  digitScale?: number
  roundScale?: number
}

export function ScorePanel({
  scoreA,
  scoreB,
  roundLabel,
  className,
  panelBox = BATTLE.score,
  popSide = null,
  digitScale,
  roundScale,
}: ScorePanelProps) {
  const leftHole = scorePanelHoleInBox(SCORE_PANEL_HOLES_PX.leftScore, {
    x: 0,
    y: 0,
    w: panelBox.w,
    h: panelBox.h,
  })
  const centerHole = scorePanelHoleInBox(SCORE_PANEL_HOLES_PX.centerRound, {
    x: 0,
    y: 0,
    w: panelBox.w,
    h: panelBox.h,
  })
  const rightHole = scorePanelHoleInBox(SCORE_PANEL_HOLES_PX.rightScore, {
    x: 0,
    y: 0,
    w: panelBox.w,
    h: panelBox.h,
  })

  const dScale = digitScale ?? BATTLE_HUD.scoreDigit.scale
  const rScale = roundScale ?? BATTLE_HUD.scoreRound.scale
  const leftMax = Math.floor(leftHole.w * BATTLE_HUD.scoreDigit.maxWidthRatio)
  const rightMax = Math.floor(rightHole.w * BATTLE_HUD.scoreDigit.maxWidthRatio)
  const centerMax = Math.floor(centerHole.w * BATTLE_HUD.scoreRound.maxWidthRatio)

  return (
    <div className={`ce-panel ce-score-panel ${className ?? ''}`}>
      <img className="ce-panel__art ce-pixel" src={canonicalUi.scorePanel} alt="" aria-hidden="true" />
      <div
        className={`ce-score-slot ce-score-slot--left${popSide === 'left' ? ' is-pop' : ''}`}
        style={{
          left: leftHole.x,
          top: leftHole.y,
          width: leftHole.w,
          height: leftHole.h,
        }}
      >
        <BitmapText text={String(scoreA)} size={BATTLE_HUD.scoreDigit.size} scale={dScale} align="center" maxWidth={leftMax} />
      </div>
      <div
        className="ce-score-slot ce-score-slot--center"
        style={{
          left: centerHole.x,
          top: centerHole.y,
          width: centerHole.w,
          height: centerHole.h,
        }}
      >
        {roundLabel ? (
          <BitmapText
            text={roundLabel.toUpperCase()}
            size={BATTLE_HUD.scoreRound.size}
            scale={rScale}
            align="center"
            maxWidth={centerMax}
          />
        ) : null}
      </div>
      <div
        className={`ce-score-slot ce-score-slot--right${popSide === 'right' ? ' is-pop' : ''}`}
        style={{
          left: rightHole.x,
          top: rightHole.y,
          width: rightHole.w,
          height: rightHole.h,
        }}
      >
        <BitmapText text={String(scoreB)} size={BATTLE_HUD.scoreDigit.size} scale={dScale} align="center" maxWidth={rightMax} />
      </div>
    </div>
  )
}

type VsEmblemProps = {
  className?: string
}

export function VsEmblem({ className }: VsEmblemProps) {
  return (
    <img
      className={`ce-vs ${className ?? ''}`}
      src={canonicalUi.vsEmblem}
      alt="VS"
    />
  )
}

type HudChromeProps = {
  children: ReactNode
  className?: string
}

export function HudChrome({ children, className }: HudChromeProps) {
  return <div className={`ce-battle-hud ${className ?? ''}`}>{children}</div>
}

type TimePanelProps = {
  text: string
  className?: string
  size?: 'small' | 'medium' | 'large'
  maxWidth?: number
  scale?: number
}

export function TimePanel({ text, className, size = BATTLE_HUD.timeText.size, maxWidth, scale }: TimePanelProps) {
  const resolvedScale = scale ?? BATTLE_HUD.timeText.scale
  const resolvedMax =
    maxWidth ??
    battleTextMaxWidth(BATTLE.leftTime, BATTLE_HUD.timeText.maxWidthRatio, PLATE_ASPECT.name)

  return (
    <div className={`ce-panel ce-time-panel ${className ?? ''}`}>
      <img className="ce-panel__art ce-pixel" src={canonicalUi.timePanel} alt="" aria-hidden="true" />
      <div className="ce-panel__content">
        <BitmapText
          text={text.toUpperCase()}
          size={size}
          scale={resolvedScale}
          align="center"
          maxWidth={resolvedMax}
        />
      </div>
    </div>
  )
}
