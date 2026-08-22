import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, 'font-verify')
const BASE = process.env.BATTLE_HUD_URL ?? 'http://127.0.0.1:5173'

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(`${BASE}/debug/battle-hud`, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(800)
const dest = path.join(OUT, '07-battle-hud-layout.png')
await page.screenshot({ path: dest, fullPage: false })
console.log('wrote', dest)
await browser.close()
