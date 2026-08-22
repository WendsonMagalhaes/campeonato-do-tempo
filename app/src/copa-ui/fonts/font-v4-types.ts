/**
 * Types for the canonical bitmap font (Copa Esperança Font Fix v4 — TRUE TRANSPARENT).
 *
 * @see docs/copa-ui/FONT_METRICS_V4.json
 * @see docs/copa-ui/BITMAP_RENDERER.md
 */
export type BitmapFontSize = 'small' | 'medium' | 'large'

export interface BitmapGlyphMetric {
  /** Absolute runtime URL of the transparent glyph PNG, or null for the space advance. */
  src: string | null
  /** Natural PNG width in glyph pixels. */
  width: number
  /** Natural PNG height in glyph pixels. */
  height: number
  /** Horizontal advance in glyph pixels (tracking is added on top of it). */
  advance: number
  /** Vertical offset inside the line box, in glyph pixels. */
  top: number
}
