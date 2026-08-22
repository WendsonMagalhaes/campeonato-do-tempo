import { expect, test } from '@playwright/test'

test('fluxo manual do operador e telão somente leitura', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ensaio 32/16' }).click()
  await expect(page.getByText('32/32 participantes')).toBeVisible()
  await expect(page.getByText('16/16 duplas')).toBeVisible()
  await page.getByRole('button', { name: 'Iniciar revelação cenográfica' }).click()
  await page.getByRole('button', { name: 'Revelar próxima dupla' }).click()
  const scoreboard = await context.newPage()
  await scoreboard.goto('/telao')
  // The telão status is bitmap lettering: an aria-labelled image, not a text node.
  await expect(scoreboard.getByRole('img', { name: 'FORMANDO AS DUPLAS' })).toBeVisible()
  await expect(scoreboard.getByRole('button', { name: 'Calcular' })).toHaveCount(0)
})
