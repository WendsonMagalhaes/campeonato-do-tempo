import { useEffect, useState } from 'react'
import { absoluteBox, OPENING } from '../layouts/championGeometry.ts'
import { INTRO_FIGHT_TIMELINE, introFightStepAt } from './introFightAnimation.ts'

type Props = {
  className?: string
}

/**
 * Layer 3 — company-front fighters (center of ring, world-scale vs crowd).
 * Timed idle/attack loop. Geometry: OPENING.fighters. Mounted under crowd layer.
 */
export function IntroFightLayer({ className }: Props) {
  const [src, setSrc] = useState(INTRO_FIGHT_TIMELINE[0].src)

  useEffect(() => {
    const started = performance.now()
    let timeoutId = 0

    const schedule = () => {
      const elapsed = performance.now() - started
      const step = introFightStepAt(elapsed)
      setSrc(step.src)
      // Wake near the next timeline boundary (discrete swap, no interpolation).
      const cycle = INTRO_FIGHT_TIMELINE.reduce((sum, s) => sum + s.holdMs, 0)
      const t = ((elapsed % cycle) + cycle) % cycle
      let remaining = 0
      let acc = 0
      for (const s of INTRO_FIGHT_TIMELINE) {
        acc += s.holdMs
        if (t < acc) {
          remaining = acc - t
          break
        }
      }
      timeoutId = window.setTimeout(schedule, Math.max(16, Math.ceil(remaining)))
    }

    schedule()
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`ce-opening-layer ce-opening-fighters ce-pixel ${className ?? ''}`.trim()}
      style={absoluteBox(OPENING.fighters)}
    />
  )
}
