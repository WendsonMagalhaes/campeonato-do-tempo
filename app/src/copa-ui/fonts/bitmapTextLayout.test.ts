import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { expandAliases, fitBitmapScale, layoutBitmapText, measureBitmapText } from './bitmapTextLayout.ts'
import { FONT_V4_GLYPHS, FONT_V4_SIZES, FONT_V4_VERSION } from './font-v4.generated.ts'

const SPEC_PATH = path.resolve(__dirname, '../../../../docs/copa-ui/FONT_METRICS_V4.json')
const PUBLIC_FONTS = path.resolve(__dirname, '../../../public/assets')

const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8')) as {
  version: number
  sizes: Record<string, { lineHeight: number; spaceAdvance: number; defaultTracking: number }>
  glyphs: Record<string, { files: Record<string, { src: string | null; width: number; advance: number }> }>
  aliases: Record<string, string>
}

const SIZES = ['small', 'medium', 'large'] as const

describe('font v4 runtime module matches the canonical spec', () => {
  it('keeps the spec version', () => {
    expect(FONT_V4_VERSION).toBe(spec.version)
  })

  it('keeps lineHeight, spaceAdvance and defaultTracking per size', () => {
    for (const size of SIZES) {
      expect(FONT_V4_SIZES[size]).toEqual({
        lineHeight: spec.sizes[size]!.lineHeight,
        spaceAdvance: spec.sizes[size]!.spaceAdvance,
        defaultTracking: spec.sizes[size]!.defaultTracking,
      })
    }
  })

  it('keeps every glyph path and advance', () => {
    for (const size of SIZES) {
      for (const [char, glyph] of Object.entries(spec.glyphs)) {
        const runtime = FONT_V4_GLYPHS[size][char]
        expect(runtime, `missing glyph ${JSON.stringify(char)} at ${size}`).toBeDefined()
        expect(runtime!.src).toBe(glyph.files[size]!.src)
        expect(runtime!.advance).toBe(glyph.files[size]!.advance)
      }
    }
  })

  it('uses the spec spaceAdvance for the space glyph', () => {
    for (const size of SIZES) {
      const space = FONT_V4_GLYPHS[size][' ']!
      expect(space.src).toBeNull()
      expect(space.advance).toBe(FONT_V4_SIZES[size].spaceAdvance)
    }
  })

  it('never lets a glyph overflow its line box', () => {
    for (const size of SIZES) {
      for (const [char, glyph] of Object.entries(FONT_V4_GLYPHS[size])) {
        expect(glyph.top + glyph.height, `${JSON.stringify(char)} at ${size}`).toBeLessThanOrEqual(
          FONT_V4_SIZES[size].lineHeight,
        )
      }
    }
  })

  it('ships every glyph PNG under app/public/assets', () => {
    const missing: string[] = []
    for (const size of SIZES) {
      for (const glyph of Object.values(FONT_V4_GLYPHS[size])) {
        if (!glyph.src) continue
        const file = path.join(PUBLIC_FONTS, glyph.src.replace('/assets/', ''))
        if (!fs.existsSync(file)) missing.push(glyph.src)
      }
    }
    expect(missing).toEqual([])
  })
})

describe('layoutBitmapText', () => {
  it('advances by real per-glyph width plus tracking', () => {
    const layout = layoutBitmapText('AB', { size: 'large' })
    const a = FONT_V4_GLYPHS.large.A!
    const b = FONT_V4_GLYPHS.large.B!
    expect(layout.glyphs).toHaveLength(2)
    expect(layout.glyphs[0]!.x).toBe(0)
    expect(layout.glyphs[1]!.x).toBe(a.advance + FONT_V4_SIZES.large.defaultTracking)
    expect(layout.width).toBe(a.advance + FONT_V4_SIZES.large.defaultTracking + b.advance)
  })

  it('honours a custom tracking', () => {
    const tight = measureBitmapText('AAA', { size: 'medium', tracking: 0 })
    const loose = measureBitmapText('AAA', { size: 'medium', tracking: 10 })
    expect(loose.width - tight.width).toBe(20)
  })

  it('applies spaceAdvance and emits no glyph for spaces', () => {
    const layout = layoutBitmapText('A A', { size: 'small' })
    expect(layout.glyphs).toHaveLength(2)
    const a = FONT_V4_GLYPHS.small.A!
    const tracking = FONT_V4_SIZES.small.defaultTracking
    expect(layout.glyphs[1]!.x).toBe(a.advance + tracking + FONT_V4_SIZES.small.spaceAdvance + tracking)
  })

  it('is proportional — I is narrower than M and W', () => {
    const i = measureBitmapText('I', { size: 'medium' }).width
    expect(i).toBeLessThan(measureBitmapText('M', { size: 'medium' }).width)
    expect(i).toBeLessThan(measureBitmapText('W', { size: 'medium' }).width)
  })

  it('stacks lines by lineHeight and keeps the widest line as width', () => {
    const layout = layoutBitmapText('A\nAA', { size: 'medium' })
    expect(layout.height).toBe(FONT_V4_SIZES.medium.lineHeight * 2)
    expect(layout.width).toBe(layout.lineWidths[1])
    expect(layout.glyphs[1]!.y).toBeGreaterThanOrEqual(FONT_V4_SIZES.medium.lineHeight)
  })

  it('flattens newlines when multiline is false', () => {
    const flat = layoutBitmapText('A\nA', { size: 'medium', multiline: false })
    expect(flat.height).toBe(FONT_V4_SIZES.medium.lineHeight)
    expect(flat.width).toBe(measureBitmapText('A A', { size: 'medium' }).width)
  })

  it('centers and right-aligns shorter lines', () => {
    const left = layoutBitmapText('A\nAAA', { size: 'medium', align: 'left' })
    const center = layoutBitmapText('A\nAAA', { size: 'medium', align: 'center' })
    const right = layoutBitmapText('A\nAAA', { size: 'medium', align: 'right' })
    const slack = center.width - center.lineWidths[0]!
    expect(left.glyphs[0]!.x).toBe(0)
    expect(center.glyphs[0]!.x).toBe(Math.round(slack / 2))
    expect(right.glyphs[0]!.x).toBe(slack)
  })

  it('falls back to ? for unknown characters', () => {
    const layout = layoutBitmapText('\u2603', { size: 'medium' })
    expect(layout.glyphs[0]!.src).toBe(FONT_V4_GLYPHS.medium['?']!.src)
  })

  it('expands the spec aliases', () => {
    expect(expandAliases('A\u2014B')).toBe('A-B')
    expect(expandAliases('\u201Coi\u201D')).toBe('"oi"')
    expect(expandAliases('a\u2026')).toBe('a...')
    for (const [from, to] of Object.entries(spec.aliases)) {
      expect(expandAliases(from)).toBe(to)
    }
  })

  it('renders accented Portuguese glyphs instead of the fallback', () => {
    for (const char of 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç') {
      const layout = layoutBitmapText(char, { size: 'medium' })
      expect(layout.glyphs[0]!.src, char).not.toBe(FONT_V4_GLYPHS.medium['?']!.src)
    }
  })

  it('uses the colon glyph (U+003A) for race-time separators', () => {
    const layout = layoutBitmapText('00:01:51', { size: 'large' })
    const colons = layout.glyphs.filter((g) => g.char === ':')
    expect(colons).toHaveLength(2)
    expect(colons[0]!.src).toContain('u003A.png')
    expect(colons[0]!.src).not.toContain('u0027.png')
    expect(colons[0]!.height).toBeGreaterThan(colons[0]!.width)
  })
})

describe('fitBitmapScale', () => {
  it('keeps the requested scale when the text already fits', () => {
    expect(fitBitmapScale(100, 0.5, 200)).toBe(0.5)
  })

  it('shrinks so the text fits exactly', () => {
    expect(fitBitmapScale(400, 0.5, 100)).toBeCloseTo(0.25)
  })

  it('ignores an absent or invalid budget', () => {
    expect(fitBitmapScale(400, 0.5, undefined)).toBe(0.5)
    expect(fitBitmapScale(400, 0.5, 0)).toBe(0.5)
  })
})
