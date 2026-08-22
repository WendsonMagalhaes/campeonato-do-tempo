import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })
  const page = await context.newPage()
  await page.goto('http://localhost:5173/debug/duo-qualified', { waitUntil: 'networkidle' })
  // Allow canvas crowd + confetti image decode/blit
  await page.waitForTimeout(800)
  await page.waitForSelector('[data-crowd-mode="celebration"]')
  await page.waitForSelector('[data-fx="confetti"]')

  const outPath = path.join(__dirname, 'duo-qualified-celebration.png')
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`Saved Duo Qualified screenshot to: ${outPath}`)
  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
