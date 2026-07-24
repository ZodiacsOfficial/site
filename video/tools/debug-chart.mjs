import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const natal = JSON.parse(readFileSync(resolve(process.cwd(), 'video/data/natal-chart.json'), 'utf8'));
function chartToken({ date, time, tz, lat, lon, place, name, houseSystem }) {
  const wire = { d: date, z: tz, la: Math.round(lat * 1e4) / 1e4, lo: Math.round(lon * 1e4) / 1e4 };
  if (time) wire.t = time;
  if (name) wire.n = name;
  if (place) wire.p = place;
  if (houseSystem && houseSystem !== 'whole') wire.h = houseSystem;
  return '1.' + Buffer.from(JSON.stringify(wire)).toString('base64url');
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newContext({ viewport: { width: 1360, height: 1700 }, colorScheme: 'dark' }).then((c) => c.newPage());
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 500)));
page.on('requestfailed', (r) => console.log('[reqfail]', r.url().slice(0, 160), r.failure()?.errorText));

const url = `http://127.0.0.1:4321/birth-chart/#c=${chartToken(natal.input)}`;
console.log('goto', url);
await page.goto(url);
await page.waitForTimeout(12000);
const state = await page.evaluate(() => ({
  hash: location.hash,
  hasIsland: Boolean(document.querySelector('astro-island')),
  islands: [...document.querySelectorAll('astro-island')].map((i) => i.getAttribute('component-export')).slice(0, 10),
  resultHtml: document.querySelector('.calc__result')?.innerHTML?.slice(0, 400) ?? 'NO .calc__result',
  error: document.querySelector('.calc__error')?.textContent ?? null,
  dateVal: document.querySelector('input[type=date]')?.value ?? null,
}));
console.log(JSON.stringify(state, null, 2));
await browser.close();
