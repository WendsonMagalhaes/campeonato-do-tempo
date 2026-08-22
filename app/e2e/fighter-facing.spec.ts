import { expect, test } from '@playwright/test'

/**
 * Facing regressions after female_blue hurt was normalized to face RIGHT:
 * - Blue never mirrors (faces opponent via baked art).
 * - Red always mirrors.
 * - Mirror stable across hurt→fall→lying (no flicker).
 */
test('fighter facing: blue hurt looks at red, no mirror flicker', async ({ page }) => {
  await page.goto('/debug/battle-sprites')

  const left = page.locator('.ce-fighter-wrap[data-side="blue"]')
  const right = page.locator('.ce-fighter-wrap[data-side="red"]')

  await expect(left).toHaveAttribute('data-variant', 'female')
  await expect(right).toHaveAttribute('data-variant', 'female')
  await expect(left).toHaveAttribute('data-mirror', '0')
  await expect(right).toHaveAttribute('data-mirror', '1')

  const leftAnim = page.locator('label:has-text("L anim") select')
  const rightAnim = page.locator('label:has-text("R anim") select')

  await rightAnim.selectOption('attack')
  await leftAnim.selectOption('hurt')
  await expect(left).toHaveAttribute('data-anim', 'hurt')
  await expect(left).toHaveAttribute('data-mirror', '0')
  await expect(right).toHaveAttribute('data-mirror', '1')

  const leftScale = await left.locator('[data-fighter-scale]').evaluate((el) => getComputedStyle(el).transform)
  const m = leftScale.match(/matrix\(([^,]+)/)
  if (m) {
    expect(Number(m[1])).toBeGreaterThan(0)
  } else {
    expect(leftScale).not.toMatch(/scale\(\s*-/)
  }

  for (const anim of ['hurt', 'fall', 'lying'] as const) {
    await leftAnim.selectOption(anim)
    await expect(left).toHaveAttribute('data-anim', anim)
    await expect(left).toHaveAttribute('data-mirror', '0')
  }

  await leftAnim.selectOption('hurt')
  await rightAnim.selectOption('attack')
  await page.waitForTimeout(250)
  await expect(left).toHaveScreenshot('female-blue-hurt-faces-red.png', {
    maxDiffPixelRatio: 0.03,
  })
})

test('fighter mirror stays stable for red through hurt sequence', async ({ page }) => {
  await page.goto('/debug/battle-sprites')

  const left = page.locator('.ce-fighter-wrap[data-side="blue"]')
  const right = page.locator('.ce-fighter-wrap[data-side="red"]')
  const rightAnim = page.locator('label:has-text("R anim") select')
  const sequence = ['idle', 'attack', 'hurt', 'fall', 'lying', 'victory'] as const

  for (const anim of sequence) {
    await rightAnim.selectOption(anim)
    await expect(right).toHaveAttribute('data-anim', anim)
    await expect(right).toHaveAttribute('data-mirror', '1')
    await expect(left).toHaveAttribute('data-mirror', '0')
  }
})
