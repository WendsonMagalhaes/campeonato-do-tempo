import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outDir = path.join(root, '.tmp_battle_qa', 'intro_critique')
fs.mkdirSync(outDir, { recursive: true })

// Visual timeline after PRE_DROP_MAX_MS=4000 (approx).
const shots = [
  { name: 'after_01_t0_sky', waitMs: 350 },
  { name: 'after_02_t2s_drift', waitMs: 2000 },
  { name: 'after_03_drop_start_4s', waitMs: 4200 },
  { name: 'after_04_mid_drop', waitMs: 5500 },
  { name: 'after_05_near_settle', waitMs: 7500 },
  { name: 'after_06_settle_fighters', waitMs: 8200 },
  { name: 'after_07_crowd_press', waitMs: 10500 },
  { name: 'after_08_final_hold', waitMs: 12500 },
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })

async function openOpening() {
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/telao', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const prompt = page.getByRole('img', { name: /CLIQUE PARA INICIAR/i })
  for (let i = 0; i < 8 && (await prompt.count()) > 0; i++) {
    await prompt.first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(200)
  }
  await page.waitForSelector('.ce-opening-host', { timeout: 20000 })
  return page
}

for (const s of shots) {
  const page = await openOpening()
  await page.waitForTimeout(s.waitMs)
  const info = await page.evaluate(() => {
    const cam = document.querySelector('.ce-opening-camera')
    const fighters = document.querySelector('.ce-opening-fighters')
    const crowd = document.querySelector('.ce-opening-crowd-stack')
    const panels = [...document.querySelectorAll('.ce-opening-strip-panel')].map((img) =>
      (img.getAttribute('src') || '').split('/').pop(),
    )
    return {
      camTransform: cam ? cam.style.transform : null,
      hasFighters: !!fighters,
      fightBox: fighters
        ? { left: fighters.style.left, top: fighters.style.top, w: fighters.style.width, h: fighters.style.height }
        : null,
      crowdOpacity: crowd ? crowd.style.opacity : null,
      panels,
      press: !!document.querySelector('.ce-opening-press-start'),
      logoPass: !!document.querySelector('.ce-opening-logo-pass'),
    }
  })
  const file = path.join(outDir, `${s.name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(JSON.stringify({ shot: s.name, waitMs: s.waitMs, ...info }))
  await page.close()
}

await browser.close()
console.log('saved to', outDir)
