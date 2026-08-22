import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { fitBitmapScale, layoutBitmapText } from '../fonts/bitmapTextLayout'
import type { BitmapTextAlign } from '../fonts/bitmapTextLayout'
import type { BitmapFontSize } from '../fonts/font-v4-types'

/**
 * The one and only bitmap text renderer of the project.
 *
 * Draws one already-transparent PNG per character, positioned from the v4 spec
 * metrics. The glyph PNGs are clean: no background is added, no crop is applied,
 * no colour keying, no filter — only `image-rendering: pixelated`.
 *
 * @see docs/copa-ui/BITMAP_RENDERER.md
 * @see docs/copa-ui/FONT_METRICS_V4.json
 */
export function BitmapText({
  text,
  size = 'medium',
  tracking,
  align = 'left',
  multiline = true,
  scale = 1,
  maxWidth,
  className,
  ariaLabel,
  style,
}: {
  text: string
  size?: BitmapFontSize
  /** Extra pixels between characters. Defaults to the spec `defaultTracking` of the size. */
  tracking?: number
  align?: BitmapTextAlign
  /** When false, newlines are flattened to spaces. */
  multiline?: boolean
  /** Multiplier over the spec line height (64 / 96 / 128 glyph pixels). */
  scale?: number
  /** Layout width budget in CSS pixels. Shrinks the text uniformly when it does not fit. */
  maxWidth?: number
  className?: string
  ariaLabel?: string
  style?: CSSProperties
}) {
  const layout = useMemo(
    () => layoutBitmapText(text, { size, tracking, align, multiline }),
    [text, size, tracking, align, multiline],
  )
  const fittedScale = fitBitmapScale(layout.width, scale, maxWidth)

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel ?? text}
      style={{
        position: 'relative',
        display: 'block',
        width: layout.width * fittedScale,
        height: layout.height * fittedScale,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: layout.width,
          height: layout.height,
          transform: fittedScale === 1 ? undefined : `scale(${fittedScale})`,
          transformOrigin: 'top left',
        }}
      >
        {layout.glyphs.map((glyph, index) => (
          <img
            key={`${index}-${glyph.char}`}
            src={glyph.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              position: 'absolute',
              left: glyph.x,
              top: glyph.y,
              width: glyph.width,
              height: glyph.height,
              imageRendering: 'pixelated',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}
