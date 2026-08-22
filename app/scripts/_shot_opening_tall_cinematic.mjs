import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.tmp_battle_qa', 'intro_tall_cinematic');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

console.log('Navigating to /telao...');
await page.goto('http://127.0.0.1:5173/telao', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);

// Click unlock prompt if present
const prompt = page.getByRole('img', { name: /CLIQUE PARA INICIAR/i });
for (let i = 0; i < 8 && (await prompt.count()) > 0; i++) {
  await prompt.first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(200);
}

await page.waitForSelector('.ce-opening-host', { timeout: 20000 });
console.log('OpeningScene loaded. Capturing keyframe sequence...');

// 1. Sky Hold (t = 1s)
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(outDir, '01_sky_hold_t1s.png') });
console.log('Captured 01_sky_hold_t1s.png');

// 2. Camera descent (t = 5.5s)
await page.waitForTimeout(4500);
await page.screenshot({ path: path.join(outDir, '02_mid_descent_t5_5s.png') });
console.log('Captured 02_mid_descent_t5_5s.png');

// 3. Street settled + crowd + fighters + PRESS START (t = 9s)
await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(outDir, '03_street_settled_t9s.png') });
console.log('Captured 03_street_settled_t9s.png');

// 4. Another beat showing crowd animation (t = 11s)
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(outDir, '04_crowd_animated_t11s.png') });
console.log('Captured 04_crowd_animated_t11s.png');

const info = await page.evaluate(() => {
  const tallStrip = document.querySelector('.ce-opening-tall-strip')?.getAttribute('src');
  const streetStable = document.querySelector('.ce-opening-street-stable')?.getAttribute('src');
  const upperLeftSrc = document.querySelector('.ce-opening-crowd-group--upperLeft')?.getAttribute('src');
  const foregroundSrc = document.querySelector('.ce-opening-crowd-group--foreground')?.getAttribute('src');
  const hasFighters = !!document.querySelector('.ce-opening-fighters');
  const pressText = document.querySelector('.ce-opening-press-start')?.textContent || '';

  return {
    tallStrip,
    streetStable,
    upperLeftSrc,
    foregroundSrc,
    hasFighters,
    pressText: pressText.trim(),
  };
});

console.log('DOM Evaluation Info:', JSON.stringify(info, null, 2));

await browser.close();
console.log('Done capturing live QA shots.');
