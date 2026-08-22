import { useEffect, useState } from 'react'
import { CURSOR_FIT, type Box } from '../layouts/teamFormationGeometry.ts'
import {
  SELECTION_CURSOR_FRAMES,
  SELECTION_CURSOR_FPS,
  type CursorAnimState,
  type CursorPlayer,
} from './selectionCursorFrames.ts'

export type { CursorAnimState, CursorPlayer }

type Props = {
  player: CursorPlayer
  state: CursorAnimState
  /** Inner photo hole box (logical 1920×1080). Cursor centers on this — does not resize the photo. */
  slot: Box
  className?: string
}

/**
 * Square moldura/aura selection cursor (sprite frames).
 * Kept for tooling / optional reuse — Team Formation and Round 3 use CSS
 * `.ce-slot-highlight` / `.is-draft-p1|p2` instead (human direction 2026-08-15).
 */
export function SelectionCursor({ player, state, slot, className }: Props) {
  const frames = SELECTION_CURSOR_FRAMES[player][state]
  const fps = SELECTION_CURSOR_FPS[state]
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    setFrameIndex(0)
  }, [player, state, slot.x, slot.y, frames])

  useEffect(() => {
    if (frames.length <= 1) return

    // LOCK: play once through, hold last frame (elegant confirm — no explosion).
    if (state === 'lock') {
      let i = 0
      const id = window.setInterval(() => {
        i += 1
        if (i >= frames.length - 1) {
          setFrameIndex(frames.length - 1)
          window.clearInterval(id)
          return
        }
        setFrameIndex(i)
      }, Math.round(1000 / fps))
      return () => window.clearInterval(id)
    }

    // IDLE: loop
    const id = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length)
    }, Math.round(1000 / fps))
    return () => window.clearInterval(id)
  }, [frames, fps, state])

  const fit = CURSOR_FIT[state]
  const size = fit.outer
  const left = slot.x + slot.w / 2 - size / 2 + fit.offsetX
  const top = slot.y + slot.h / 2 - size / 2 + fit.offsetY
  const src = frames[Math.min(frameIndex, frames.length - 1)] ?? frames[0]!

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      data-player={player}
      data-cursor-state={state}
      className={`ce-selection-cursor-frame ${className ?? ''}`}
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        objectFit: 'fill',
        pointerEvents: 'none',
        zIndex: 20,
        imageRendering: 'pixelated',
      }}
      draggable={false}
    />
  )
}
