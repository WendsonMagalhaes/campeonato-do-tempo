/**
 * Visual QA screenshots for battle polish (flip, mist, overhead times, no green flash).
 * Requires vite at http://127.0.0.1:5173
 *
 *   node app/scripts/capture-battle-qa-polish.mjs
 */
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../../.tmp_battle_qa/polish')
const base = process.env.BATTLE_DEBUG_URL ?? 'http://127.0.0.1:5173'

async function shot(page, name) {
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: true })
  console.log('wrote', file)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  // Idle + mist + crowd
  await page.goto(`${base}/debug/battle-sprites`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(900)
  await shot(page, '01_idle_mist_crowd.png')

  // Blue hits red (female blue attack / male red hurt)
  await page.locator('label').filter({ hasText: 'L variant' }).locator('select').selectOption('female')
  await page.locator('label').filter({ hasText: 'R variant' }).locator('select').selectOption('male')
  await page.locator('label').filter({ hasText: 'L anim' }).locator('select').selectOption('attack')
  await page.locator('label').filter({ hasText: 'R anim' }).locator('select').selectOption('hurt')
  await page.waitForTimeout(400)
  await shot(page, '02_blue_hits_red_hurt.png')

  // Red hits blue (male blue hurt / female red attack) — verify victim faces attacker
  await page.locator('label').filter({ hasText: 'L variant' }).locator('select').selectOption('male')
  await page.locator('label').filter({ hasText: 'R variant' }).locator('select').selectOption('female')
  await page.locator('label').filter({ hasText: 'L anim' }).locator('select').selectOption('hurt')
  await page.locator('label').filter({ hasText: 'R anim' }).locator('select').selectOption('attack')
  await page.waitForTimeout(400)
  await shot(page, '03_red_hits_blue_hurt.png')

  // female_red hurt frames mid-cycle (hurt_01→hurt_02 must stay facing left when mirrored)
  await page.locator('label').filter({ hasText: 'L anim' }).locator('select').selectOption('idle')
  await page.locator('label').filter({ hasText: 'R anim' }).locator('select').selectOption('hurt')
  await page.waitForTimeout(80)
  await shot(page, '04_female_red_hurt_frame_a.png')
  await page.waitForTimeout(220)
  await shot(page, '05_female_red_hurt_frame_b.png')

  // Walk-in round win L — capture at impact (~670ms) for overhead times + no green flash
  await page.goto(`${base}/debug/battle-hud?reveal=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(700)
  await shot(page, '06_hit_overhead_times.png')
  await page.waitForTimeout(400)
  await shot(page, '07_hit_beat_no_green_flash.png')

  // Trace mirror attrs during both hurt sides
  await page.goto(`${base}/debug/battle-sprites`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.locator('label').filter({ hasText: 'L anim' }).locator('select').selectOption('hurt')
  await page.locator('label').filter({ hasText: 'R anim' }).locator('select').selectOption('hurt')
  await page.waitForTimeout(300)
  const mirrors = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.ce-fighter-wrap')]
    return nodes.map((n) => ({
      side: n.getAttribute('data-side'),
      anim: n.getAttribute('data-anim'),
      mirror: n.getAttribute('data-mirror'),
    }))
  })
  console.log('mirror attrs', JSON.stringify(mirrors))
  await shot(page, '08_both_hurt_mirror_check.png')

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
