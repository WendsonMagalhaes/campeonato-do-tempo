import { absoluteBox } from '../layouts/championGeometry.ts'
import { INTRO_CROWD_LAYOUT } from './introCinematicAssets.ts'
import {
  INTRO_CROWD_GROUPS,
  introCrowdBobY,
  introCrowdFrameSrc,
  type IntroCrowdGroupConfig,
} from './introCrowdAnimation.ts'

type Props = {
  /** Elapsed ms since crowd active (timeline). */
  elapsedSinceRevealMs: number
  opacity?: number
  className?: string
}

function CrowdGroup({
  group,
  elapsedSinceRevealMs,
}: {
  group: IntroCrowdGroupConfig
  elapsedSinceRevealMs: number
}) {
  const layout = INTRO_CROWD_LAYOUT[group.id]
  const src = introCrowdFrameSrc(elapsedSinceRevealMs, group)
  const bobY = introCrowdBobY(elapsedSinceRevealMs, group)
  const isUpper = group.id === 'upperLeft' || group.id === 'upperRight'
  
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`ce-opening-crowd-group ce-opening-crowd-group--${group.id} ce-pixel`}
      style={{
        ...absoluteBox(layout),
        transform: `translate3d(0, ${bobY}px, 0)`,
        filter: isUpper ? 'brightness(0.85) saturate(0.95) drop-shadow(0px 8px 4px rgba(0,0,0,0.4))' : undefined,
      }}
    />
  )
}

/**
 * Layered cinematic crowd (upper L/R + foreground).
 * Hidden until opacity > 0 (after street settle / crowdReveal).
 */
export function IntroCrowdLayer({ elapsedSinceRevealMs, opacity = 1, className }: Props) {
  if (opacity <= 0) return null

  return (
    <div
      className={`ce-opening-crowd-stack ${className ?? ''}`.trim()}
      style={{ opacity }}
      aria-hidden="true"
    >
      {INTRO_CROWD_GROUPS.map((group) => (
        <CrowdGroup key={group.id} group={group} elapsedSinceRevealMs={elapsedSinceRevealMs} />
      ))}
    </div>
  )
}
