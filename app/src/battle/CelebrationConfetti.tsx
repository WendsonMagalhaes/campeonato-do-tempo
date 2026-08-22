/**
 * Celebration confetti FX for Duo Qualified / Champion.
 * Uses pre-extracted `/assets/runtime/fx/confetti.png` (FX_RUNTIME_MANIFEST).
 * Black-keyed canvas blit; gentle drift only — never covers title/nameplate band.
 */

import { useEffect, useRef } from 'react'
import { battleFx } from './battle-assets.ts'

const BLACK_KEY = 24

/** Blit slots kept clear of title (~y48–180) and nameplate (~y120–250). */
const CONFETTI_BLITS: readonly { x: number; y: number; w: number; h: number; alpha: number }[] = [
  { x: 80, y: 260, w: 520, h: 280, alpha: 0.72 },
  { x: 1320, y: 250, w: 520, h: 280, alpha: 0.72 },
  { x: 420, y: 480, w: 420, h: 220, alpha: 0.55 },
  { x: 1080, y: 470, w: 420, h: 220, alpha: 0.55 },
  { x: 700, y: 320, w: 520, h: 200, alpha: 0.4 },
]

type Props = {
  className?: string
}

function keyBlackToAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    if (r <= BLACK_KEY && g <= BLACK_KEY && b <= BLACK_KEY) {
      data[i + 3] = 0
    }
  }
  ctx.putImageData(image, 0, 0)
}

export function CelebrationConfetti({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 1920
    canvas.height = 1080
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = battleFx.confetti
    img.onload = () => {
      const off = document.createElement('canvas')
      off.width = img.naturalWidth || img.width
      off.height = img.naturalHeight || img.height
      const octx = off.getContext('2d')
      if (!octx) return
      octx.imageSmoothingEnabled = false
      octx.drawImage(img, 0, 0)
      keyBlackToAlpha(octx, off.width, off.height)

      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, 1920, 1080)
      for (const blit of CONFETTI_BLITS) {
        ctx.globalAlpha = blit.alpha
        ctx.drawImage(off, blit.x, blit.y, blit.w, blit.h)
      }
      ctx.globalAlpha = 1
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`ce-celebration-confetti ${className ?? ''}`}
      data-fx="confetti"
      aria-hidden="true"
    />
  )
}
