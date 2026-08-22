import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

/**
 * Visual lettering check for the canonical bitmap font (Font Fix v4).
 * Glyphs are individual transparent PNGs — one <img> per character.
 */
/** Glyph <img> elements load asynchronously; poll instead of sampling once. */
async function expectAllGlyphsDecoded(glyphs: Locator) {
  await expect
    .poll(
      () =>
        glyphs.evaluateAll(
          (nodes) =>
            nodes.filter(
              (node) =>
                !(node as HTMLImageElement).complete || (node as HTMLImageElement).naturalWidth === 0,
            ).length,
        ),
      { timeout: 10_000 },
    )
    .toBe(0)
}

test('bitmap title COPA ESPERANÇA renders from individual glyph PNGs', async ({ page }) => {
  await page.goto('/debug/bitmap-text')
  const title = page.getByTestId('bitmap-title-large')
  await expect(title.locator('img').first()).toBeVisible()

  // A 404 would render a broken image box instead of the letter.
  await expectAllGlyphsDecoded(title.locator('img'))

  // "COPA ESPERANÇA" — 13 glyphs, the space carries no PNG (spaceAdvance only).
  await expect(title.locator('img')).toHaveCount(13)

  // Glyph boxes must not collide: each left edge starts after the previous one.
  const boxes = await title.locator('img').evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().left),
  )
  for (let i = 1; i < boxes.length; i += 1) {
    expect(boxes[i]).toBeGreaterThan(boxes[i - 1])
  }
})

test('proportional advances: I is narrower than M and W', async ({ page }) => {
  await page.goto('/debug/bitmap-text')
  const glyphs = page.getByTestId('bitmap-width-proof').locator('img')
  await expect(glyphs.first()).toBeVisible()
  await expectAllGlyphsDecoded(glyphs)

  const widths = await glyphs.evaluateAll((nodes) =>
    nodes.map((node) => ({ src: (node as HTMLImageElement).src, width: node.getBoundingClientRect().width })),
  )
  const widthOf = (codepoint: string) => widths.find((g) => g.src.includes(codepoint))!.width

  expect(widthOf('u0049')).toBeLessThan(widthOf('u004D'))
  expect(widthOf('u0049')).toBeLessThan(widthOf('u0057'))
})
