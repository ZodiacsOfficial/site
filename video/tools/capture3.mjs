/** Third pass: scrubber, exact-contacts, lunations, retrograde board, sign reading. */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:4321';
const OUT = resolve(process.cwd(), 'video/public/shots');
mkdirSync(OUT, { recursive: true });
const natal = JSON.parse(readFileSync(resolve(process.cwd(), 'video/data/natal-chart.json'), 'utf8'));
function chartToken({ date, time, tz, lat, lon, place, name, houseSystem }) {
  const wire = { d: date, z: tz, la: Math.round(lat * 1e4) / 1e4, lo: Math.round(lon * 1e4) / 1e4 };
  if (time) wire.t = time;
  if (name) wire.n = name;
  if (place) wire.p = place;
  if (houseSystem && houseSystem !== 'whole') wire.h = houseSystem;
  return '1.' + Buffer.from(JSON.stringify(wire)).toString('base64url');
}
const savedChart = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0001',
  name: 'June 16, 1993',
  createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-20T12:00:00.000Z',
  birth: {
    date: natal.input.date, time: natal.input.time, timeKnown: true,
    place: { name: 'New York', admin1: 'New York', country: 'United States', lat: natal.input.lat, lon: natal.input.lon, tz: natal.input.tz },
  },
  summary: {
    engineVersion: natal.engineVersion, utcISO: natal.utc, houseSystem: natal.input.houseSystem,
    bodies: natal.bodies.map((b) => ({ body: b.body, lon: b.lon, retrograde: b.retrograde })),
    angles: { asc: natal.angles.asc, mc: natal.angles.mc }, flags: [],
  },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 1360, height: 1900 }, deviceScaleFactor: 2,
  colorScheme: 'dark', reducedMotion: 'no-preference',
});
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
const settle = async (ms) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(ms); };
async function shot(sel, file, { nth = 0, pad = 0 } = {}) {
  const el = page.locator(sel).nth(nth);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await el.boundingBox();
  await page.screenshot({
    path: `${OUT}/${file}`,
    clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 },
  });
  console.log('shot', file, `${Math.round(box.width)}x${Math.round(box.height)}`);
}

// Transits: scrubber + next-to-exact + one plain-language transit row.
await page.goto(`${BASE}/transits/`);
await page.evaluate(([key, chart]) => {
  localStorage.setItem(key, JSON.stringify({ version: 1, settings: { houseSystem: 'placidus' }, charts: [chart] }));
}, ['zodiacs.profile.v1', savedChart]);
await page.reload();
await settle(1200);
await page.locator('button[type=submit], form button').filter({ hasText: /check/i }).first().click();
await page.waitForSelector('.tring__wheelbox svg', { state: 'visible' });
await settle(3000);
await shot('.tring__scrub', 'transits-scrub.png', { pad: 6 });
await shot('.tring', 'transits-tool.png', { pad: 6 });
const rows = page.locator('button.tring__row');
console.log('transit rows:', await rows.count());
if (await rows.count()) {
  const wrap = page.locator('button.tring__row').first().locator('..');
  const box = await wrap.boundingBox();
  await wrap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot('button.tring__row >> nth=0 >> xpath=..', 'transits-rows.png', { pad: 4 });
}

// Moon lunations list.
await page.goto(`${BASE}/moon-phase/`);
await settle(1400);
await shot('.lunations', 'moon-lunations.png', { pad: 8 });

// Retrogrades board.
await page.goto(`${BASE}/retrogrades/`);
await settle(1200);
await shot('.rx-now', 'retro-now.png', { pad: 4 });
await shot('.rx-table', 'retro-table.png', { pad: 8 });

// One full sign reading (Leo today) for the horoscope scene.
await page.goto(`${BASE}/horoscopes/leo/`);
await settle(1200);
const hOutline = await page.evaluate(() =>
  [...document.querySelectorAll('main [class]')].map((el) => `${el.tagName}.${String(el.className).split(' ').slice(0, 3).join('.')}`)
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 50).join('\n'));
console.log(hOutline);
await page.screenshot({ path: `${OUT}/_horo-leo-debug.png`, fullPage: true });

await browser.close();
console.log('done');
