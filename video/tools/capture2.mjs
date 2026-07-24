/**
 * Second, precise capture pass — tight element shots only, verified
 * selectors, no nav/footer/registry chrome in any frame.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:4321';
const OUT = resolve(process.cwd(), 'video/public/shots');
mkdirSync(OUT, { recursive: true });
// Remove pass-1 shots that captured registry chrome.
for (const f of ['natal-placements.png', 'natal-full.png']) rmSync(`${OUT}/${f}`, { force: true });

const natal = JSON.parse(readFileSync(resolve(process.cwd(), 'video/data/natal-chart.json'), 'utf8'));
function chartToken({ date, time, tz, lat, lon, place, name, houseSystem }) {
  const wire = { d: date, z: tz, la: Math.round(lat * 1e4) / 1e4, lo: Math.round(lon * 1e4) / 1e4 };
  if (time) wire.t = time;
  if (name) wire.n = name;
  if (place) wire.p = place;
  if (houseSystem && houseSystem !== 'whole') wire.h = houseSystem;
  return '1.' + Buffer.from(JSON.stringify(wire)).toString('base64url');
}
const PERSON_A = { ...natal.input, name: 'Person A' };
const PERSON_B = {
  date: '1994-10-04', time: '21:15', tz: 'America/Los_Angeles',
  lat: 34.0522, lon: -118.2437, place: 'Los Angeles, CA', name: 'Person B',
  houseSystem: 'placidus',
};
const savedChart = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0001',
  name: 'June 16, 1993',
  createdAt: '2026-07-20T12:00:00.000Z',
  updatedAt: '2026-07-20T12:00:00.000Z',
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

// ── Natal ───────────────────────────────────────────────────────────
await page.goto(`${BASE}/birth-chart/#c=${chartToken(natal.input)}`);
await page.waitForSelector('.calc__result svg.wheel', { state: 'visible' });
await settle(2800);
const outline = await page.evaluate(() =>
  [...document.querySelectorAll('.calc__result [class]')].map((el) => `${el.tagName}.${String(el.className).split(' ').slice(0, 3).join('.')}`)
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 60).join('\n'));
console.log(outline);
await shot('.calc__three', 'natal-bigthree.png', { pad: 4 });
if (await page.locator('.calc__table-wrap').count()) {
  await shot('.calc__table-wrap', 'natal-table.png', { pad: 4 });
}
await shot('[data-chart-receipt]', 'natal-receipt.png', { pad: 10 });

// ── Horoscopes: three sign cards ────────────────────────────────────
await page.goto(`${BASE}/horoscopes/`);
await settle(900);
const gridKids = await page.evaluate(() =>
  [...document.querySelector('.horo-grid').children].map((el) => el.className + ' :: ' + (el.textContent ?? '').slice(0, 40)));
console.log(gridKids.join('\n'));
for (const [i, name] of [[0, 'aries'], [4, 'leo'], [11, 'pisces']]) {
  await shot(`.horo-grid > :nth-child(${i + 1})`, `horoscope-${name}.png`, { pad: 2 });
}
await shot('.horo-grid', 'horoscope-grid.png', { pad: 4 });

// ── Synastry ────────────────────────────────────────────────────────
await page.goto(`${BASE}/compatibility/#a=${chartToken(PERSON_A)}&b=${chartToken(PERSON_B)}`);
await page.waitForSelector('.rwheel svg', { state: 'visible' });
await settle(2800);
await shot('.tring__wheelbox', 'synastry-wheel.png', { pad: 6 });
await shot('.syn__people', 'synastry-people.png', { pad: 6 });
const aspectRows = page.locator('.syn__aspects .syn__aspect');
console.log('aspect rows:', await aspectRows.count());
await shot('.syn__aspects', 'synastry-aspects.png', { pad: 4 });

// ── Transits ────────────────────────────────────────────────────────
await page.goto(`${BASE}/transits/`);
await page.evaluate(([key, chart]) => {
  localStorage.setItem(key, JSON.stringify({ version: 1, settings: { houseSystem: 'placidus' }, charts: [chart] }));
}, ['zodiacs.profile.v1', savedChart]);
await page.reload();
await settle(1200);
await page.locator('button[type=submit], form button').filter({ hasText: /check/i }).first().click();
await page.waitForSelector('.tring__wheelbox svg', { state: 'visible' });
await settle(3200);
const tOutline = await page.evaluate(() =>
  [...document.querySelectorAll('main [class]')].map((el) => `${el.tagName}.${String(el.className).split(' ').slice(0, 3).join('.')}`)
    .filter((v) => /tring|transit|scrub|exact/i.test(v))
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 40).join('\n'));
console.log(tOutline);
await shot('.tring__wheelbox', 'transits-wheel.png', { pad: 6 });

// ── Moon ────────────────────────────────────────────────────────────
await page.goto(`${BASE}/moon-phase/`);
await settle(1600);
await shot('.mp__tonight', 'moon-tonight.png', { pad: 4 });
const lunations = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('main table, main .fact-table, main [class*=lun]')];
  return rows.map((el) => `${el.tagName}.${String(el.className).slice(0, 50)}`).slice(0, 10);
});
console.log('lunation candidates:', lunations.join(' | '));
const lunTable = page.locator('main table').first();
if (await lunTable.count()) {
  const b = await lunTable.boundingBox();
  if (b) await shot('main table', 'moon-lunations.png', { pad: 6 });
}

// ── Retrogrades page (current Rx board) ─────────────────────────────
await page.goto(`${BASE}/retrogrades/`);
await settle(1200);
const rxOutline = await page.evaluate(() =>
  [...document.querySelectorAll('main [class]')].map((el) => `${el.tagName}.${String(el.className).split(' ').slice(0, 2).join('.')}`)
    .filter((v) => /rx|retro/i.test(v)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 20).join('\n'));
console.log(rxOutline);
await page.screenshot({ path: `${OUT}/_retro-debug.png`, fullPage: true });

await browser.close();
console.log('done');
