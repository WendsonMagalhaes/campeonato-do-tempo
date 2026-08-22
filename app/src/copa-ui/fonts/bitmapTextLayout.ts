/**
 * Layout engine for the canonical bitmap font (Font Fix v4 — TRUE TRANSPARENT).
 *
 * Everything is computed in glyph pixels straight from the spec: one transparent
 * PNG per character, real per-glyph advance, spec `spaceAdvance`, spec
 * `lineHeight`, spec `defaultTracking`, spec aliases. No atlas, no cell grid, no
 * runtime cropping, no invented insets.
 *
 * @see docs/copa-ui/FONT_METRICS_V4.json
 * @see docs/copa-ui/BITMAP_RENDERER.md
 */
import { FONT_V4_ALIASES, FONT_V4_FALLBACK, FONT_V4_GLYPHS, FONT_V4_SIZES } from './font-v4.generated'
import type { BitmapFontSize, BitmapGlyphMetric } from './font-v4-types'

export type BitmapTextAlign = 'left' | 'center' | 'right'

export interface PlacedGlyph {
  char: string
  src: string
  x: number
  y: number
  width: number
  height: number
}

export interface BitmapTextLayout {
  glyphs: PlacedGlyph[]
  /** Widest line, in glyph pixels. */
  width: number
  /** lineCount * lineHeight, in glyph pixels. */
  height: number
  lineWidths: number[]
  lineHeight: number
  tracking: number
}

export interface BitmapTextLayoutOptions {
  size?: BitmapFontSize
  tracking?: number
  align?: BitmapTextAlign
  /** When false, newlines are flattened to spaces and everything renders on one line. */
  multiline?: boolean
}

/** Replaces characters the spec maps onto rendered ones (dashes, quotes, ellipsis, NBSP). */
export function expandAliases(text: string): string {
  let out = ''
  for (const char of text) out += FONT_V4_ALIASES[char] ?? char
  return out
}

function glyphFor(size: BitmapFontSize, char: string): BitmapGlyphMetric {
  const table = FONT_V4_GLYPHS[size]
  return table[char] ?? table[FONT_V4_FALLBACK]!
}

export function layoutBitmapText(text: string, options: BitmapTextLayoutOptions = {}): BitmapTextLayout {
  const size = options.size ?? 'medium'
  const align = options.align ?? 'left'
  const multiline = options.multiline ?? true
  const sizeSpec = FONT_V4_SIZES[size]
  const tracking = options.tracking ?? sizeSpec.defaultTracking
  const lineHeight = sizeSpec.lineHeight

  const normalized = expandAliases(text)
  const sourceLines = multiline ? normalized.split('\n') : [normalized.replace(/\n/g, ' ')]

  const lines = sourceLines.map((line, lineIndex) => {
    const chars = [...line]
    const glyphs: PlacedGlyph[] = []
    let x = 0
    chars.forEach((char, index) => {
      const glyph = glyphFor(size, char)
      if (glyph.src) {
        glyphs.push({
          char,
          src: glyph.src,
          x,
          y: lineIndex * lineHeight + glyph.top,
          width: glyph.width,
          height: glyph.height,
        })
      }
      x += glyph.advance
      if (index < chars.length - 1) x += tracking
    })
    return { glyphs, width: x }
  })

  const width = Math.max(0, ...lines.map((line) => line.width))
  const glyphs: PlacedGlyph[] = []
  for (const line of lines) {
    const slack = width - line.width
    const shift = align === 'center' ? Math.round(slack / 2) : align === 'right' ? slack : 0
    for (const glyph of line.glyphs) glyphs.push(shift ? { ...glyph, x: glyph.x + shift } : glyph)
  }

  return {
    glyphs,
    width,
    height: lines.length * lineHeight,
    lineWidths: lines.map((line) => line.width),
    lineHeight,
    tracking,
  }
}

/** Natural width/height of a string, in glyph pixels. */
export function measureBitmapText(
  text: string,
  options: BitmapTextLayoutOptions = {},
): { width: number; height: number } {
  const layout = layoutBitmapText(text, options)
  return { width: layout.width, height: layout.height }
}

/**
 * Scale that keeps `text` inside `maxWidth` CSS pixels.
 * Only shrinks: a string narrower than the box keeps the requested scale.
 */
export function fitBitmapScale(
  naturalWidth: number,
  scale: number,
  maxWidth: number | undefined,
): number {
  if (!maxWidth || maxWidth <= 0 || naturalWidth <= 0) return scale
  const width = naturalWidth * scale
  return width <= maxWidth ? scale : (scale * maxWidth) / width
}
