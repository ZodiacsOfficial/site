/** Fix-up pass: the placements table (inside a collapsed details) + tight wheel svg. */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:4321';
const OUT = resolve(process.cwd(), 'video/public/shots');
const natal = JSON.parse(readFileSync(resolve(process.cwd(), 'video/data/natal-chart.json'), 'utf8'));
function chartToken({ date, time, tz, lat, lon, place, houseSystem }) {
  const wire = { d: date, z: tz, la: Math.round(lat * 1e4) / 1e4, lo: Math.round(lon * 1e4) / 1e4 };
  if (time) wire.t = time;
  if (place) wire.p = place;
  if (houseSystem && houseSystem !== 'whole') wire.h = houseSystem;
  return '1.' + Buffer.from(JSON.stringify(wire)).toString('base64url');
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 1360, height: 1900 }, deviceScaleFactor: 2,
  colorScheme: 'dark', reducedMotion: 'no-preference',
});
const page = await ctx.newPage();
page.setDefaultTimeout(60000);

await page.goto(`${BASE}/birth-chart/#c=${chartToken(natal.input)}`);
await page.waitForSelector('.calc__result svg.wheel', { state: 'visible' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2800);

// Tight wheel-only shot (element screenshot handles scrolling correctly).
await page.locator('.calc__result svg.wheel').first().screenshot({ path: `${OUT}/natal-wheel-tight.png` });
console.log('shot natal-wheel-tight.png');

// Open every details in the result so the placements table is visible.
await page.evaluate(() => {
  document.querySelectorAll('.calc__result details').forEach((d) => { d.open = true; });
});
await page.waitForTimeout(600);
const tables = page.locator('.calc__result table');
console.log('tables:', await tables.count());
for (let i = 0; i < Math.min(await tables.count(), 3); i++) {
  const cls = await tables.nth(i).evaluate((el) => el.className + ' :: ' + (el.textContent ?? '').slice(0, 60));
  console.log('table', i, cls);
}
await tables.first().screenshot({ path: `${OUT}/natal-table.png` });
console.log('shot natal-table.png');
await browser.close();
console.log('done');
