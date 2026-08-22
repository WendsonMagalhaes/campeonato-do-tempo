import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  console.log('Opening operator page...');
  const operatorPage = await context.newPage();
  await operatorPage.goto('http://localhost:5173/');

  // Seed demo
  console.log('Seeding demo...');
  await operatorPage.click('text="Ensaio 32/16"');
  
  // Start reveal
  console.log('Starting reveal...');
  await operatorPage.click('text="Iniciar revelação cenográfica"');

  // Reveal 16 teams
  console.log('Revealing 16 teams...');
  for (let i = 0; i < 16; i++) {
    await operatorPage.click('text="Revelar próxima dupla"');
    // small wait just in case
    await operatorPage.waitForTimeout(100);
  }

  // Draw bracket
  console.log('Drawing bracket...');
  await operatorPage.click('text="Sortear 8 confrontos"');

  // Open telão
  console.log('Opening scoreboard (telão)...');
  const telaoPage = await context.newPage();
  await telaoPage.goto('http://localhost:5173/telao');
  
  // Wait for it to load and render the bracket
  await telaoPage.waitForTimeout(2000);

  // Dismiss audio unlock overlay so finals/VS are visible in the shot.
  // Headless: unlock() may fail; strip the gate overlay either way.
  await telaoPage.mouse.click(960, 540)
  await telaoPage.evaluate(() => {
    for (const el of document.querySelectorAll('div')) {
      if (el instanceof HTMLElement && el.style.zIndex === '9999') el.remove()
    }
  })
  await telaoPage.waitForTimeout(300)

  const overviewPath = path.join(__dirname, 'bracket-overview.png');
  await telaoPage.screenshot({ path: overviewPath });
  console.log(`Saved overview screenshot to: ${overviewPath}`);

  // Confirm bracket to trigger tour
  console.log('Confirming bracket to trigger tour...');
  await operatorPage.bringToFront();
  await operatorPage.click('text="Confirmar chave"');

  // Switch back to telão and wait a bit to catch the zoom
  await telaoPage.bringToFront();
  await telaoPage.waitForTimeout(1200); // 1.2s into the 2.5s tour interval

  const tourPath = path.join(__dirname, 'bracket-tour.png');
  await telaoPage.screenshot({ path: tourPath });
  console.log(`Saved tour screenshot to: ${tourPath}`);

  await browser.close();
}

run().catch(console.error);
