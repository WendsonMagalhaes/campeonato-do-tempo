// Sample the fighter <img> srcs over time — proves the idle loop cycles frames.
import { chromium } from 'playwright'

const URL = 'http://localhost:5173/debug/battle-sprites'

async function sample(page, label) {
  const seen = { blue: new Set(), red: new Set() }
  for (let i = 0; i < 10; i++) {
    const srcs = await page.$$eval('.ce-fighter', (imgs) =>
      imgs.map((img) => img.getAttribute('src')),
    )
    if (srcs[0]) seen.blue.add(srcs[0])
    if (srcs[1]) seen.red.add(srcs[1])
    await page.waitForTimeout(120)
  }
  console.log(label, 'blue frames:', [...seen.blue].join(', '))
  console.log(label, 'red frames :', [...seen.red].join(', '))
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(URL)
  await page.waitForTimeout(1200)

  await sample(page, 'female pair')

  await page.selectOption('select >> nth=0', 'male')
  await page.selectOption('select >> nth=2', 'male')
  await page.waitForTimeout(400)
  await sample(page, 'male pair')

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
