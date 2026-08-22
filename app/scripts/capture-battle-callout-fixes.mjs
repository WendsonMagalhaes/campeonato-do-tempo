/**
 * Visual QA for post-callout fixes: R1 intro clears after FIGHT, Duo Qualified layout, corner KO times.
 * Requires vite at http://127.0.0.1:5173
 *
 *   node app/scripts/capture-battle-callout-fixes.mjs
 */
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../../.tmp_battle_qa/callout_fixes')
const base = process.env.BATTLE_DEBUG_URL ?? 'http://127.0.0.1:5173'

async function shot(page, name) {
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: true })
  console.log('wrote', file)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })

  // R1 intro: ROUND banner → wait past FIGHT clear (~1650+1400)
  await page.goto(`${base}/debug/battle-hud?round=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="battle-callout"]', { timeout: 5000 })
  await shot(page, '01_r1_round_banner.png')
  await page.waitForTimeout(1750)
  await shot(page, '02_r1_fight_banner.png')
  await page.waitForTimeout(1500)
  const calloutGone = await page.locator('[data-testid="battle-callout"]').count()
  console.log('r1 callout after clear:', calloutGone)
  await shot(page, '03_r1_intro_cleared.png')

  // Duo Qualified winner hierarchy
  await page.goto(`${base}/debug/duo-qualified`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="duo-qualified-winner"]', { timeout: 5000 })
  await page.waitForTimeout(400)
  await shot(page, '04_duo_qualified_winner_layout.png')

  // KO / reveal corner times
  await page.goto(`${base}/debug/battle-hud?ko=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(900)
  await shot(page, '05_ko_corner_times.png')
  const leftBox = await page.locator('[data-testid="fighter-time-left"]').boundingBox()
  const rightBox = await page.locator('[data-testid="fighter-time-right"]').boundingBox()
  console.log('corner times', { leftBox, rightBox })

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
