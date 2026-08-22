/**
 * Celebration crowd for Duo Qualified / Champion scenes.
 *
 * Uses the high-quality intro foreground layered assets (back-facing celebrating crowd):
 * - Frame 01: /assets/runtime/intro/crowd/layered/30_intro_crowd_foreground_frame_01.png
 * - Frame 02: /assets/runtime/intro/crowd/layered/31_intro_crowd_foreground_frame_02.png
 *
 * Back-facing celebrants look towards the plaza / fighters.
 * Planted along the bottom edge so torsos read as near-camera foreground spectators.
 * 2-frame subtle celebration animation loop (~3.125 FPS / 320ms per frame).
 */

import { useEffect, useState } from 'react'
import { CELEBRATION_CROWD_ANIM, CELEBRATION_CROWD_FRAMES } from './celebrationCrowdData.ts'
import { absoluteBox, CELEBRATION_CROWD_BOX, type Box } from '../copa-ui/layouts/championGeometry.ts'

type Props = {
  className?: string
  /** Override layout box if needed */
  layout?: Box
  /** Optional freeze on frame 0 for tests/screenshots */
  freeze?: boolean
}

/**
 * Foreground back-facing crowd for victory scenes.
 * z-index sits above fighters (occluding feet/legs) and below HUD title/names/score.
 */
export function CelebrationCrowd({ className, layout = CELEBRATION_CROWD_BOX, freeze = false }: Props) {
  const [frameIndex, setFrameIndex] = useState<0 | 1>(0)

  useEffect(() => {
    if (freeze) return
    const id = window.setInterval(() => {
      setFrameIndex((prev) => (prev === 0 ? 1 : 0))
    }, CELEBRATION_CROWD_ANIM.periodMs)
    return () => window.clearInterval(id)
  }, [freeze])

  const src = CELEBRATION_CROWD_FRAMES[frameIndex]

  return (
    <div
      className={`ce-celebration-crowd ${className ?? ''}`.trim()}
      data-crowd-mode="celebration"
      data-crowd-facing="back"
      data-crowd-anim="loop"
      data-crowd-frame={frameIndex}
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="ce-celebration-crowd__img ce-pixel"
        style={absoluteBox(layout)}
      />
    </div>
  )
}
