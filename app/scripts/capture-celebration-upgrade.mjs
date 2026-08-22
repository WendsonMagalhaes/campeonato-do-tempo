import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', '..', '.tmp_battle_qa', 'celebration_crowd_upgrade')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })
  const page = await context.newPage()

  // 1. Capture Duo Qualified
  await page.goto('http://localhost:5173/debug/duo-qualified', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.waitForSelector('[data-crowd-mode="celebration"]')
  await page.waitForSelector('[data-fx="confetti"]')

  const duoShot1 = path.join(outDir, '01_duo_qualified_celebration.png')
  await page.screenshot({ path: duoShot1, fullPage: false })
  console.log(`Saved: ${duoShot1}`)

  // Wait 350ms to toggle frame 2
  await page.waitForTimeout(350)
  const duoShot2 = path.join(outDir, '02_duo_qualified_frame2.png')
  await page.screenshot({ path: duoShot2, fullPage: false })
  console.log(`Saved: ${duoShot2}`)

  // 2. Capture Champion
  await page.goto('http://localhost:5173/debug/champion', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.waitForSelector('[data-crowd-mode="celebration"]')
  await page.waitForSelector('[data-fx="confetti"]')

  const champShot1 = path.join(outDir, '03_champion_celebration.png')
  await page.screenshot({ path: champShot1, fullPage: false })
  console.log(`Saved: ${champShot1}`)

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
