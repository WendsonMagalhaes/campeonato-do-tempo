#!/usr/bin/env node
/**
 * Generate the runtime bitmap font module from the canonical spec.
 *
 * SoT: docs/copa-ui/FONT_METRICS_V4.json (Copa Esperança Font Fix v4 — TRUE TRANSPARENT)
 * Output: app/src/copa-ui/fonts/font-v4.generated.ts
 *
 * Nothing here invents metrics. Every number is copied from the spec; the only
 * derived value is the per-glyph vertical offset `top`, documented in
 * docs/copa-ui/BITMAP_RENDERER.md and asserted by font-v4.generated.test.ts.
 *
 * Usage (from app/): node scripts/generate-font-v4.mjs [--check]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(appRoot, '..')

export const SPEC_PATH = path.join(repoRoot, 'docs', 'copa-ui', 'FONT_METRICS_V4.json')
export const OUTPUT_PATH = path.join(appRoot, 'src', 'copa-ui', 'fonts', 'font-v4.generated.ts')

const SIZES = ['small', 'medium', 'large']

/**
 * Vertical offset of a glyph inside its line box, in glyph pixels.
 *
 * Sizes whose PNGs were normalized to the full line height (small, medium) fill
 * the box, so the offset is 0. Sizes that keep the natural crop (large) are
 * placed with the offset the glyph has inside its source sheet row, which is the
 * only baseline information the spec carries.
 */
function glyphTop(file, glyph, lineHeight) {
  if (!file.src || file.height >= lineHeight) return 0
  const source = glyph.source
  if (!source || !Array.isArray(source.bbox)) return 0
  const raw = source.bbox[1] - source.detectedRowTop
  return Math.max(0, Math.min(raw, lineHeight - file.height))
}

function key(value) {
  return JSON.stringify(value).replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
}

export function renderModule(spec) {
  const lines = []
  lines.push('// AUTO-GENERATED — do not edit by hand.')
  lines.push('// Source: docs/copa-ui/FONT_METRICS_V4.json')
  lines.push('// Regenerate: npm run font:generate')
  lines.push('')
  lines.push("import type { BitmapFontSize, BitmapGlyphMetric } from './font-v4-types'")
  lines.push('')
  lines.push(`export const FONT_V4_VERSION = ${spec.version}`)
  lines.push('')
  lines.push(`export const FONT_V4_FALLBACK = ${key(spec.rendering.defaultFallback)}`)
  lines.push('')
  lines.push('export const FONT_V4_SIZES: Record<')
  lines.push('  BitmapFontSize,')
  lines.push('  { lineHeight: number; spaceAdvance: number; defaultTracking: number }')
  lines.push('> = {')
  for (const size of SIZES) {
    const s = spec.sizes[size]
    lines.push(
      `  ${size}: { lineHeight: ${s.lineHeight}, spaceAdvance: ${s.spaceAdvance}, defaultTracking: ${s.defaultTracking} },`,
    )
  }
  lines.push('}')
  lines.push('')
  lines.push('export const FONT_V4_GLYPHS: Record<BitmapFontSize, Record<string, BitmapGlyphMetric>> = {')
  for (const size of SIZES) {
    lines.push(`  ${size}: {`)
    for (const [char, glyph] of Object.entries(spec.glyphs)) {
      const file = glyph.files[size]
      if (!file) continue
      const top = glyphTop(file, glyph, spec.sizes[size].lineHeight)
      const src = file.src ? key(file.src) : 'null'
      lines.push(
        `    ${key(char)}: { src: ${src}, width: ${file.width}, height: ${file.height}, advance: ${file.advance}, top: ${top} },`,
      )
    }
    lines.push('  },')
  }
  lines.push('}')
  lines.push('')
  lines.push('export const FONT_V4_ALIASES: Record<string, string> = {')
  for (const [from, to] of Object.entries(spec.aliases)) {
    if (from === to) continue
    lines.push(`  ${key(from)}: ${key(to)},`)
  }
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

export function readSpec() {
  return JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'))
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-font-v4.mjs')) {
  const generated = renderModule(readSpec())
  const check = process.argv.includes('--check')
  const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null
  if (check) {
    if (current !== generated) {
      console.error('font-v4.generated.ts is out of sync with docs/copa-ui/FONT_METRICS_V4.json')
      process.exitCode = 1
    } else {
      console.log('PASS — font-v4.generated.ts matches the spec.')
    }
  } else {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
    fs.writeFileSync(OUTPUT_PATH, generated)
    console.log(`Wrote ${path.relative(appRoot, OUTPUT_PATH)}`)
  }
}
