#!/usr/bin/env node
/**
 * Visual verification of the canonical bitmap font (Font Fix v4) across the
 * text-heavy telão screens. Same approach as verify-bracket.mjs: it drives the
 * operator page and screenshots the telão.
 *
 * Requires a dev server already running on http://localhost:5173.
 *
 * Usage (from app/):
 *   npm run dev
 *   node scripts/verify-bitmap-font.mjs
 *
 * Screenshots land in app/scripts/font-verify/.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(scriptDir, 'font-verify')
const BASE = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173'

fs.mkdirSync(outDir, { recursive: true })

const shots = []
const failures = []

async function shoot(page, name) {
  await page.waitForTimeout(600)
  const file = path.join(outDir, `${name}.png`)
  await page.screenshot({ path: file })
  shots.push(file)
  console.log(`  shot ${name}`)
}

/** Every glyph <img> must decode, or a letter is silently missing. */
async function assertGlyphsDecoded(page, label) {
  const report = await page.evaluate(() => {
    const images = [...document.querySelectorAll('img[src*="/assets/fonts/glyphs/"]')]
    return {
      total: images.length,
      broken: images
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute('src')),
    }
  })
  console.log(`  ${label}: ${report.total} glyph images, ${report.broken.length} broken`)
  if (report.broken.length > 0) {
    failures.push(`${label}: broken glyph images ${[...new Set(report.broken)].join(', ')}`)
  }
  return report
}

/** No text may spill outside its own layout box. */
async function assertNoOverflow(page, label) {
  const overflows = await page.evaluate(() => {
    const out = []
    for (const node of document.querySelectorAll('[role="img"][aria-label]')) {
      const parent = node.parentElement
      if (!parent) continue
      const box = node.getBoundingClientRect()
      const bounds = parent.getBoundingClientRect()
      if (box.width === 0 || bounds.width === 0) continue
      const overflowX = Math.max(0, bounds.left - box.left) + Math.max(0, box.right - bounds.right)
      const overflowY = Math.max(0, bounds.top - box.top) + Math.max(0, box.bottom - bounds.bottom)
      if (overflowX > 2 || overflowY > 2) {
        out.push({
          text: node.getAttribute('aria-label'),
          overflowX: Math.round(overflowX),
          overflowY: Math.round(overflowY),
        })
      }
    }
    return out
  })
  if (overflows.length > 0) {
    console.log(`  ${label}: ${overflows.length} overflowing labels`)
    for (const item of overflows) {
      failures.push(`${label}: "${item.text}" overflows box by ${item.overflowX}x${item.overflowY}px`)
    }
  }
  return overflows
}

async function check(page, label) {
  await assertGlyphsDecoded(page, label)
  await assertNoOverflow(page, label)
}

/** The audio unlock overlay dims the whole telão — clear it before screenshotting. */
async function dismissAudioOverlay(page) {
  const prompt = page.getByRole('img', { name: /CLIQUE PARA INICIAR/i })
  // globalAudio.unlock() can take a while in headless Chromium, so retry the gesture.
  for (let attempt = 0; attempt < 10 && (await prompt.count()) > 0; attempt++) {
    await prompt.first().click({ force: true, timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(1000)
  }
  if ((await prompt.count()) > 0) failures.push('audio unlock overlay could not be dismissed')
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })

  const telao = await context.newPage()
  telao.on('console', (msg) => {
    if (msg.type() === 'error') failures.push(`telao console error: ${msg.text()}`)
  })
  telao.on('requestfailed', (request) => {
    if (request.url().includes('/assets/fonts/')) failures.push(`font request failed: ${request.url()}`)
  })

  console.log('debug/bitmap-text ...')
  await telao.goto(`${BASE}/debug/bitmap-text`)
  await telao.waitForTimeout(1200)
  await check(telao, 'debug')
  await shoot(telao, '01-debug-bitmap-text')

  const operator = await context.newPage()
  await operator.goto(`${BASE}/`)
  await operator.click('text="Ensaio 32/16"')
  await operator.waitForTimeout(300)

  console.log('audio unlock overlay ...')
  await telao.goto(`${BASE}/telao`)
  await telao.waitForTimeout(1200)
  await check(telao, 'audio_overlay')
  await shoot(telao, '02-audio-overlay')
  await dismissAudioOverlay(telao)

  console.log('opening ...')
  await telao.waitForTimeout(600)
  await check(telao, 'opening')
  await shoot(telao, '03-opening')

  console.log('team formation ...')
  await operator.click('text="Iniciar revelação cenográfica"')
  await operator.click('text="Revelar próxima dupla"')
  await telao.bringToFront()
  await telao.waitForTimeout(2500)
  await check(telao, 'fake_shuffle')
  await shoot(telao, '04-team-formation')

  await operator.bringToFront()
  for (let i = 1; i < 16; i++) {
    await operator.click('text="Revelar próxima dupla"')
    await operator.waitForTimeout(120)
  }

  console.log('bracket ...')
  await operator.click('text="Sortear 8 confrontos"')
  await telao.bringToFront()
  await telao.waitForTimeout(1500)
  await check(telao, 'bracket')
  await shoot(telao, '05-bracket')

  await operator.bringToFront()
  await operator.click('text="Confirmar chave"')
  await operator.waitForTimeout(400)

  console.log('versus ...')
  await operator.locator('button', { hasText: 'Iniciar confronto' }).first().click()
  await telao.bringToFront()
  await telao.waitForTimeout(1200)
  await check(telao, 'versus')
  await shoot(telao, '06-versus')

  // Round 1 — pick one member per duo, then a target and two manual times.
  await operator.bringToFront()
  const selects = operator.locator('.op-card select')
  await selects.nth(0).selectOption({ index: 1 })
  await selects.nth(1).selectOption({ index: 1 })
  await operator.click('text="Confirmar rodada 1"')
  await operator.waitForTimeout(300)

  async function playRound(aTime, bTime) {
    await operator.fill('input[placeholder="Tempo-alvo MM:SS:CS"]', '00:03:00')
    await operator.click('text="Definir alvo"')
    await operator.fill('input[placeholder="Tempo manual MM:SS:CS"]', aTime)
    await operator.click('text="Atribuir a A"')
    await operator.fill('input[placeholder="Tempo manual MM:SS:CS"]', bTime)
    await operator.click('text="Atribuir a B"')
    await operator.waitForTimeout(200)
  }

  console.log('battle HUD ...')
  await operator.fill('input[placeholder="Tempo-alvo MM:SS:CS"]', '00:03:00')
  await operator.click('text="Definir alvo"')
  await telao.bringToFront()
  await telao.waitForTimeout(1000)
  await check(telao, 'battle')
  await shoot(telao, '07-battle-hud')

  // A wins round 1 (closer to target) → 1 x 0.
  await operator.bringToFront()
  await playRound('00:03:10', '00:03:80')
  await operator.click('text="Calcular, revelar e confirmar"')
  await operator.waitForTimeout(600)

  console.log('battle HUD with score + times ...')
  await telao.bringToFront()
  await telao.waitForTimeout(1500)
  await check(telao, 'battle-score')
  await shoot(telao, '08-battle-score-times')

  // Round 2 — B wins → 1 x 1, which unlocks the round 3 selection screen.
  await operator.bringToFront()
  await operator.click('text="Iniciar rodada 2"')
  await operator.waitForTimeout(400)
  await playRound('00:03:90', '00:03:02')
  await operator.click('text="Calcular, revelar e confirmar"')
  await operator.waitForTimeout(4000)

  console.log('round 3 selection ...')
  await telao.bringToFront()
  await telao.waitForTimeout(2000)
  await check(telao, 'round3')
  await shoot(telao, '09-round3-selection')

  // Round 3 — A wins → 2 x 1 → duo qualified.
  await operator.bringToFront()
  const r3 = operator.locator('.op-card select')
  await r3.nth(0).selectOption({ index: 1 })
  await r3.nth(1).selectOption({ index: 1 })
  await operator.click('text="Confirmar rodada 3"')
  await operator.waitForTimeout(400)
  await playRound('00:03:05', '00:03:70')
  await operator.click('text="Calcular, revelar e confirmar"')
  await operator.waitForTimeout(5000)

  console.log('duo qualified ...')
  await telao.bringToFront()
  await telao.waitForTimeout(2500)
  await check(telao, 'duo_qualified')
  await shoot(telao, '10-duo-qualified')

  await browser.close()

  console.log('\nScreenshots:')
  for (const file of shots) console.log(`  ${file}`)

  if (failures.length > 0) {
    console.error(`\nFAIL — ${failures.length} problem(s):`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exitCode = 1
  } else {
    console.log('\nPASS — every glyph decoded and no label overflows its box.')
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
