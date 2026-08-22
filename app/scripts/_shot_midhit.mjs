import { chromium } from 'playwright'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../tmp-battle-shots')
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://127.0.0.1:5173/debug/battle-sprites', { waitUntil: 'networkidle', timeout: 60000 })
await page.locator('label').filter({ hasText: 'L anim' }).locator('select').selectOption('hurt')
await page.locator('label').filter({ hasText: 'R anim' }).locator('select').selectOption('attack')
await page.waitForTimeout(400)

const left = page.locator('.ce-fighter-wrap[data-side="blue"]')
const right = page.locator('.ce-fighter-wrap[data-side="red"]')
console.log('L', await left.getAttribute('data-anim'), 'mirror', await left.getAttribute('data-mirror'))
console.log('R', await right.getAttribute('data-anim'), 'mirror', await right.getAttribute('data-mirror'))

await page.screenshot({ path: path.join(outDir, 'midhit-red-hits-blue.png'), fullPage: true })
await left.screenshot({ path: path.join(outDir, 'blue-hurt-only.png') })
console.log('wrote', outDir)
await browser.close()
