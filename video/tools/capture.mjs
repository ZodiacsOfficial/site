/**
 * Screenshot the real running site (astro dev on :4321) for the X video.
 * Element screenshots only — cropped to the tool itself, never nav/footer.
 * Outputs to video/public/shots/ at deviceScaleFactor 2.
 *
 *   node video/tools/capture.mjs
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.CAPTURE_BASE ?? 'http://127.0.0.1:4321';
const OUT = resolve(process.cwd(), 'video/public/shots');
mkdirSync(OUT, { recursive: true });

const natal = JSON.parse(readFileSync(resolve(process.cwd(), 'video/data/natal-chart.json'), 'utf8'));

/** Same wire format as src/lib/share.ts encodeChartLink. */
function chartToken({ date, time, tz, lat, lon, place, name, houseSystem }) {
  const wire = { d: date, z: tz, la: Math.round(lat * 1e4) / 1e4, lo: Math.round(lon * 1e4) / 1e4 };
  if (time) wire.t = time;
  if (name) wire.n = name;
  if (place) wire.p = place;
  if (houseSystem && houseSystem !== 'whole') wire.h = houseSystem;
  return '1.' + Buffer.from(JSON.stringify(wire)).toString('base64url');
}

const PERSON_A = { ...natal.input, name: 'Person A' };
// A second real birth for synastry — Oct 4, 1994, 9:15 PM, Los Angeles.
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
    date: natal.input.date,
    time: natal.input.time,
    timeKnown: true,
    place: {
      name: 'New York', admin1: 'New York', country: 'United States',
      lat: natal.input.lat, lon: natal.input.lon, tz: natal.input.tz,
    },
  },
  summary: {
    engineVersion: natal.engineVersion,
    utcISO: natal.utc,
    houseSystem: natal.input.houseSystem,
    bodies: natal.bodies.map((b) => ({ body: b.body, lon: b.lon, retrograde: b.retrograde })),
    angles: { asc: natal.angles.asc, mc: natal.angles.mc },
    flags: [],
  },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 1360, height: 1700 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();
page.setDefaultTimeout(45000);

async function settle(ms = 800) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(locator, file, pad = 0) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  if (pad) {
    const box = await el.boundingBox();
    await page.screenshot({
      path: `${OUT}/${file}`,
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      },
    });
  } else {
    await el.screenshot({ path: `${OUT}/${file}` });
  }
  console.log('shot', file);
}

// Warm the dev server's dep optimizer so hydration isn't delayed mid-run.
for (const p of ['/birth-chart/', '/horoscopes/', '/compatibility/', '/transits/', '/moon-phase/', '/today/']) {
  await page.goto(`${BASE}${p}`).catch(() => {});
  await page.waitForTimeout(400);
}

// ── 1 · Natal chart, fully rendered with aspect lines ────────────────
await page.goto(`${BASE}/birth-chart/#c=${chartToken(natal.input)}`);
await page.waitForSelector('.calc__result svg.wheel', { state: 'visible', timeout: 60000 });
await settle(2600); // let the wheel draw-in finish
await shot(page.locator('.calc__result svg').first().locator('..'), 'natal-wheel.png', 8);
const bigThree = await page.evaluate(() => {
  const text = (sel) => document.querySelector(sel)?.textContent?.trim() ?? '';
  return {
    result: text('.calc__result h2'),
    receipt: text('[data-chart-receipt]'),
  };
});
console.log('big three heading:', JSON.stringify(bigThree));
// Placements table (real degrees).
const table = page.locator('.calc__result table').first();
if (await table.count()) await shot(table, 'natal-placements.png', 6);
await shot(page.locator('.calc__result'), 'natal-full.png', 0);

// ── 2 · Daily horoscopes — three different signs side by side ────────
await page.goto(`${BASE}/horoscopes/`);
await settle(700);
const cardSel = ['article', '.tile', 'li'].join(',');
const cards = page.locator('main').locator(cardSel).filter({ hasText: 'Aries' });
console.log('horoscope card candidates:', await cards.count());
// Dump main structure once to find the right selector for cards.
const outline = await page.evaluate(() => {
  const main = document.querySelector('main');
  const rows = [];
  main.querySelectorAll('section, ul, ol, article, div').forEach((el) => {
    const c = el.className && String(el.className).slice(0, 60);
    if (c && el.children.length >= 3 && rows.length < 40) rows.push(`${el.tagName}.${c} kids=${el.children.length}`);
  });
  return rows;
});
console.log(outline.join('\n'));

// ── 3 · Synastry — two charts overlaid, real cross-aspects ───────────
await page.goto(`${BASE}/compatibility/#a=${chartToken(PERSON_A)}&b=${chartToken(PERSON_B)}`);
await settle(1200);
// The tool auto-runs with both sides; wait for the overlay wheel svg.
await page.waitForSelector('svg', { state: 'visible' });
await page.waitForTimeout(2500);
const synOutline = await page.evaluate(() => {
  const rows = [];
  document.querySelectorAll('main [class]').forEach((el) => {
    const c = String(el.className).slice(0, 70);
    if (/syn|rel|compat|wheel|result/i.test(c) && rows.length < 40) rows.push(`${el.tagName}.${c}`);
  });
  return [...new Set(rows)];
});
console.log(synOutline.join('\n'));
await page.screenshot({ path: `${OUT}/_synastry-debug-full.png`, fullPage: true });

// ── 4 · Transits — bi-wheel ring over the saved chart ────────────────
await page.goto(`${BASE}/transits/`);
await page.evaluate(([key, chart]) => {
  localStorage.setItem(key, JSON.stringify({
    version: 1, settings: { houseSystem: 'placidus' }, charts: [chart],
  }));
}, ['zodiacs.profile.v1', savedChart]);
await page.reload();
await settle(900);
const checkBtn = page.locator('button[type=submit], form button').filter({ hasText: /check|track|see/i }).first();
console.log('transit submit button:', await checkBtn.count() ? await checkBtn.textContent() : 'NOT FOUND');
if (await checkBtn.count()) {
  await checkBtn.click();
  await page.waitForTimeout(4000);
}
await page.screenshot({ path: `${OUT}/_transits-debug-full.png`, fullPage: true });

// ── 5 · Moon phase — tonight, auto-rendered ──────────────────────────
await page.goto(`${BASE}/moon-phase/`);
await settle(1200);
const moonOutline = await page.evaluate(() => {
  const rows = [];
  document.querySelectorAll('main [class]').forEach((el) => {
    const c = String(el.className).slice(0, 70);
    if (/mp__|moon|tonight/i.test(c) && rows.length < 30) rows.push(`${el.tagName}.${c}`);
  });
  return [...new Set(rows)];
});
console.log(moonOutline.join('\n'));
await page.screenshot({ path: `${OUT}/_moon-debug-full.png`, fullPage: true });

// ── 6 · Today / sky ticker (live ephemeris strip) ────────────────────
await page.goto(`${BASE}/today/`);
await settle(1200);
const todayOutline = await page.evaluate(() => {
  const rows = [];
  document.querySelectorAll('[class]').forEach((el) => {
    const c = String(el.className).slice(0, 70);
    if (/ticker|sky|now/i.test(c) && rows.length < 30) rows.push(`${el.tagName}.${c}`);
  });
  return [...new Set(rows)];
});
console.log(todayOutline.join('\n'));
await page.screenshot({ path: `${OUT}/_today-debug-full.png`, fullPage: true });

await browser.close();
console.log('done');
