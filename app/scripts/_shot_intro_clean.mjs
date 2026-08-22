import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outDir = path.join(root, '.tmp_battle_qa', 'intro_critique')
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto('http://127.0.0.1:5173/telao', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(600)
const prompt = page.getByRole('img', { name: /CLIQUE PARA INICIAR/i })
for (let i = 0; i < 8 && (await prompt.count()) > 0; i++) {
  await prompt.first().click({ force: true }).catch(() => {})
  await page.waitForTimeout(200)
}
await page.waitForSelector('.ce-opening-host', { timeout: 20000 })
await page.waitForTimeout(11000)

const info = await page.evaluate(() => {
  const presses = [...document.querySelectorAll('[aria-label="PRESS START"]')]
  const labels = [...document.querySelectorAll('[aria-label]')]
    .map((n) => n.getAttribute('aria-label'))
    .filter(Boolean)
  const street = document.querySelector('.ce-opening-street-stable')?.getAttribute('src') || ''
  const panels = [...document.querySelectorAll('.ce-opening-strip-panel')].map((img) =>
    img.getAttribute('src'),
  )
  return {
    pressCount: presses.length,
    labels,
    street,
    panels,
    hasFighters: !!document.querySelector('.ce-opening-fighters'),
    hasLogoPass: !!document.querySelector('.ce-opening-logo-pass'),
  }
})

const out = path.join(outDir, 'after_clean_no_title_junk.png')
await page.screenshot({ path: out, fullPage: false })
console.log(JSON.stringify(info, null, 2))
console.log('saved', out)
await browser.close()

if (info.pressCount !== 1) {
  console.error('FAIL: expected exactly 1 PRESS START, got', info.pressCount)
  process.exit(1)
}
if (/COPA|DUPLAS|melhor/i.test(info.labels.join('|'))) {
  console.error('FAIL: branding labels still in DOM', info.labels)
  process.exit(1)
}
if (!info.street.includes('opening_street_bg')) {
  console.error('FAIL: dirty street still mounted', info.street)
  process.exit(1)
}
