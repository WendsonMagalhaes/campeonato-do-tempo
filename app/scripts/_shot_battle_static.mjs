// Static-pose QA shots (hurt flip / lying / victory) + DOM-sampled timeline trace.
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

async function setAnims(page, lVar, lAnim, rVar, rAnim) {
  await page.selectOption('select >> nth=0', lVar)
  await page.selectOption('select >> nth=1', lAnim)
  await page.selectOption('select >> nth=2', rVar)
  await page.selectOption('select >> nth=3', rAnim)
  await page.waitForTimeout(350)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(URL)
  await page.waitForTimeout(1500)

  // Hurt flip checks — victim must recoil AWAY from the attacker.
  await setAnims(page, 'female', 'attack', 'male', 'hurt')
  await shot(page, 'st1_blueF_attack_redM_hurt')
  await setAnims(page, 'male', 'hurt', 'female', 'attack')
  await shot(page, 'st2_blueM_hurt_redF_attack')
  await setAnims(page, 'female', 'attack', 'female', 'hurt')
  await shot(page, 'st3_blueF_attack_redF_hurt')

  // KO poses
  await setAnims(page, 'male', 'lying', 'female', 'victory')
  await shot(page, 'st4_blueM_lying_redF_victory')
  await setAnims(page, 'female', 'lying', 'male', 'victory')
  await shot(page, 'st5_blueF_lying_redM_victory')

  // Timeline trace: sample anim + transform every 100ms during Round win L.
  await setAnims(page, 'female', 'idle', 'male', 'idle')
  await page.click('text=Round win L')
  const trace = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = []
        const t0 = performance.now()
        const id = setInterval(() => {
          const wraps = [...document.querySelectorAll('.ce-fighter-wrap')]
          const get = (side) => {
            const el = wraps.find((w) => w.getAttribute('data-side') === side)
            if (!el) return null
            const tf = getComputedStyle(el).transform
            return `${el.getAttribute('data-anim')}@${tf === 'none' ? '0' : tf.split(',')[4]?.trim()}`
          }
          samples.push(`${Math.round(performance.now() - t0)}ms blue:${get('blue')} red:${get('red')}`)
          if (performance.now() - t0 > 2600) {
            clearInterval(id)
            resolve(samples)
          }
        }, 100)
      }),
  )
  console.log(trace.join('\n'))

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
