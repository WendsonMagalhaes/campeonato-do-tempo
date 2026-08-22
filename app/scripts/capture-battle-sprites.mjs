import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../tmp-battle-shots')
const base = process.env.BATTLE_DEBUG_URL ?? 'http://127.0.0.1:5173/debug/battle-sprites'

async function shot(page, name) {
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: true })
  console.log('wrote', file)
}

async function main() {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(800)
  await shot(page, 'idle-both.png')

  await page.locator('label').filter({ hasText: 'L anim' }).locator('select').selectOption('attack')
  await page.locator('label').filter({ hasText: 'R anim' }).locator('select').selectOption('hurt')
  await page.waitForTimeout(500)
  await shot(page, 'attack-hurt.png')

  await page.locator('label').filter({ hasText: 'L anim' }).locator('select').selectOption('victory')
  await page.locator('label').filter({ hasText: 'R anim' }).locator('select').selectOption('lying')
  await page.waitForTimeout(500)
  await shot(page, 'victory-lying.png')

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
