import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', '..', '.tmp_battle_qa', 'celebration_crowd_tuning')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })
  const page = await context.newPage()

  for (const y of [626, 645, 660, 675, 690]) {
    await page.goto('http://localhost:5173/debug/duo-qualified', { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    await page.evaluate((val) => {
      const img = document.querySelector('.ce-celebration-crowd__img')
      if (img) img.style.top = `${val}px`
    }, y)
    await page.waitForTimeout(100)
    const out = path.join(outDir, `duo_y_${y}.png`)
    await page.screenshot({ path: out, fullPage: false })
    console.log(`Saved: ${out}`)
  }

  for (const y of [626, 645, 660, 675, 690]) {
    await page.goto('http://localhost:5173/debug/champion', { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    await page.evaluate((val) => {
      const img = document.querySelector('.ce-celebration-crowd__img')
      if (img) img.style.top = `${val}px`
    }, y)
    await page.waitForTimeout(100)
    const out = path.join(outDir, `champ_y_${y}.png`)
    await page.screenshot({ path: out, fullPage: false })
    console.log(`Saved: ${out}`)
  }

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
