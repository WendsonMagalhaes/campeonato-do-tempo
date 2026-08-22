import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../../.tmp_font_restore')
fs.mkdirSync(outDir, { recursive: true })
const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:5173'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
try {
  await page.goto(`${BASE}/debug/bitmap-text`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(800)
  const file = path.join(outDir, '01_bitmap_text_restored.png')
  await page.screenshot({ path: file, fullPage: true })
  console.log('OK', file)

  // Spot-check a few glyph img natural sizes match pack v4 (A=129x104, colon=54x39)
  const dims = await page.evaluate(async () => {
    async function dim(src) {
      const img = new Image()
      img.src = src
      await img.decode()
      return { src, w: img.naturalWidth, h: img.naturalHeight }
    }
    return {
      A: await dim('/assets/fonts/glyphs/large/u0041.png'),
      colon: await dim('/assets/fonts/glyphs/large/u003A.png'),
      F: await dim('/assets/fonts/glyphs/large/u0046.png'),
    }
  })
  console.log(JSON.stringify(dims))
  if (dims.A.w !== 129 || dims.A.h !== 104) throw new Error('A glyph not restored')
  if (dims.colon.w !== 54 || dims.colon.h !== 39) throw new Error('colon glyph not restored')
} finally {
  await browser.close()
}
