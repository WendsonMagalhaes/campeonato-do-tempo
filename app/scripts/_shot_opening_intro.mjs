import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.join(root, '.tmp_battle_qa', 'opening_intro_live.png')
fs.mkdirSync(path.dirname(out), { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto('http://localhost:5173/telao', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)

const prompt = page.getByRole('img', { name: /CLIQUE PARA INICIAR/i })
for (let i = 0; i < 8 && (await prompt.count()) > 0; i++) {
  await prompt.first().click({ force: true }).catch(() => {})
  await page.waitForTimeout(500)
}

await page.waitForSelector('.ce-opening-host', { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(700)
await page.screenshot({ path: out, fullPage: false })
console.log('saved', out)

const info = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('[role="img"][aria-label]')].map((n) =>
    n.getAttribute('aria-label'),
  )
  const crowd = document.querySelector('.ce-opening-crowd')
  const fighters = document.querySelector('.ce-opening-fighters')
  const press = document.querySelector('.ce-opening-press-start')
  return {
    labels,
    hasOpening: !!document.querySelector('.ce-opening-host'),
    crowdTop: crowd ? getComputedStyle(crowd).top : null,
    crowdZ: crowd ? getComputedStyle(crowd).zIndex : null,
    fight: fighters
      ? {
          left: fighters.style.left,
          top: fighters.style.top,
          width: fighters.style.width,
          height: fighters.style.height,
          z: getComputedStyle(fighters).zIndex,
        }
      : null,
    pressZ: press ? getComputedStyle(press).zIndex : null,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
