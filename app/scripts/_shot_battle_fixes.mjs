// One-off visual QA for the 2026-08-15 battle fixes:
// idle loops, walk-in attack, hurt flip, crowd grounding.
// Deterministic: waits for data-anim states instead of fixed sleeps.
// Requires the dev server at http://localhost:5173 (npm run dev).
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', '..', '.tmp_battle_qa')
const URL = 'http://localhost:5173/debug/battle-sprites'

const shot = async (page, name) => {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file })
  console.log('saved', file)
}

const waitAnim = (page, side, anim) =>
  page.waitForSelector(`.ce-fighter-wrap[data-side="${side}"][data-anim="${anim}"]`, {
    timeout: 8000,
  })

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(URL)
  await page.waitForTimeout(1500)

  // 1. Female pair idle + crowd grounding
  await shot(page, '01_idle_female_a')
  await page.waitForTimeout(340)
  await shot(page, '02_idle_female_b')

  // 2. Male pair idle
  await page.selectOption('select >> nth=0', 'male')
  await page.selectOption('select >> nth=2', 'male')
  await page.waitForTimeout(400)
  await shot(page, '03_idle_male_a')

  // 3. Round win L (female attacker vs male defender)
  await page.selectOption('select >> nth=0', 'female')
  await page.waitForTimeout(300)
  await page.click('text=Round win L')
  await waitAnim(page, 'blue', 'walk')
  await page.waitForTimeout(250)
  await shot(page, '05_walkin_mid')
  await waitAnim(page, 'red', 'hurt')
  await shot(page, '06_punch_red_hurt') // red male hurt — must recoil AWAY from blue
  await waitAnim(page, 'blue', 'idle')
  await shot(page, '08_rest_after_roundwin')

  // 4. KO R (red female beats blue male): mirror-side hurt + fall + victory
  await page.selectOption('select >> nth=0', 'male')
  await page.selectOption('select >> nth=2', 'female')
  await page.waitForTimeout(300)
  await page.click('text=KO R')
  await waitAnim(page, 'blue', 'hurt')
  await shot(page, '09_ko_blue_hurt') // blue male hurt — must recoil AWAY from red
  await waitAnim(page, 'blue', 'lying')
  await shot(page, '10_ko_lying')
  await waitAnim(page, 'red', 'victory')
  await shot(page, '12_ko_victory')

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
