/**
 * End-to-end drive of the Relationship Wheel against `astro preview`:
 * seed two saved charts, compare, and exercise the bi-wheel — both rings
 * render, cross-chart chords draw, tapping a row focuses its chord, and
 * the swap button puts the other person inside. Captures evidence shots.
 *
 *   npm run build
 *   OUT_DIR=/tmp/shots node tests/relationship-wheel-drive.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';

const chart = (id, name, date, time, lat, lon, tz, place) => ({
  id, name, createdAt: '2026-07-11T00:00:00Z', updatedAt: '2026-07-11T00:00:00Z',
  birth: { date, time, timeKnown: time !== null, place: { name: place, admin1: '', country: '', lat, lon, tz } },
  summary: { engineVersion: '0-stale', utcISO: `${date}T18:00:00Z`, houseSystem: 'whole', bodies: [], angles: null, flags: [] },
});
const profile = {
  version: 1, settings: { houseSystem: 'whole' },
  charts: [
    chart('drive-frida', 'Frida', '1907-07-06', '08:30', 19.35, -99.16, 'America/Mexico_City', 'Coyoacán'),
    chart('drive-diego', 'Diego', '1886-12-08', '20:00', 21.02, -101.26, 'America/Mexico_City', 'Guanajuato'),
  ],
};

const preview = spawn('npx', ['astro', 'preview', '--port', '4399'], { stdio: 'ignore' });
await wait(2500);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };
const shot = async (t, p, o = {}) => { if (OUT) await t.screenshot({ path: `${OUT}/${p}`, ...o }).catch(() => {}); };

try {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
  await page.addInitScript((prof) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(prof)), profile);
  await page.goto('http://127.0.0.1:4399/compatibility/', { waitUntil: 'networkidle' });

  // Pick the two saved charts and compare.
  await page.locator('#syn-a-source').selectOption('drive-frida');
  await page.locator('#syn-b-source').selectOption('drive-diego');
  await page.locator('.calc__submit').click();
  await page.waitForSelector('.rwheel', { timeout: 20000 });
  await page.waitForSelector('.wheel__transit', { timeout: 15000 });

  // Both rings render: inner natal marks (South Node hidden ⇒ 11) and the
  // outer partner ring (11, Moon included, South Node hidden).
  const innerMarks = await page.locator('.wheel__body:not(.wheel__transit)').count();
  const outerMarks = await page.locator('.wheel__transit').count();
  check('inner wheel renders 11 natal bodies', innerMarks === 11, `${innerMarks}`);
  check('outer ring renders 11 partner bodies', outerMarks === 11, `${outerMarks}`);
  check('cross-chart chords draw', (await page.locator('[data-transit-aspect]').count()) > 0);
  check('caption names both people', /Frida/.test(await page.locator('.tring__caption').textContent() ?? '')
    && /Diego/.test(await page.locator('.tring__caption').textContent() ?? ''));
  await page.locator('.tring__wheelbox').evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await wait(800);
  await shot(page, 'rwheel-both.png', { clip: { x: 0, y: 0, width: 1440, height: 1200 } });

  // Tap a contact row → focus block + chord focus.
  await page.locator('.tring__row').first().click();
  await wait(200);
  check('tapping a row opens the contact reading', await page.locator('.tring__focus').isVisible());
  check('the row is marked focused', (await page.locator('.tring__row.is-focus').count()) === 1);
  await shot(page, 'rwheel-focus.png', { clip: { x: 0, y: 0, width: 1440, height: 1200 } });

  // Swap who's inside: the caption inverts and focus clears.
  const capBefore = await page.locator('.tring__caption').textContent();
  await page.locator('[data-swap]').click();
  await wait(400);
  const capAfter = await page.locator('.tring__caption').textContent();
  check('swap inverts the rings', capBefore !== capAfter && /Diego/.test(capAfter ?? ''), capAfter?.slice(0, 60) ?? '');
  check('swap clears the focused contact', (await page.locator('.tring__row.is-focus').count()) === 0);
  check('rings still render after swap', (await page.locator('.wheel__transit').count()) === 11);
  await shot(page, 'rwheel-swapped.png', { clip: { x: 0, y: 0, width: 1440, height: 1200 } });

  // The invite + pairing blocks survive below the module.
  check('pairing CTA renders', (await page.locator('.calc__actions .btn--ghost').count()) >= 1);
  await page.close();

  // Mobile sanity.
  const mob = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2, hasTouch: true });
  await mob.addInitScript((prof) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(prof)), profile);
  await mob.goto('http://127.0.0.1:4399/compatibility/', { waitUntil: 'networkidle' });
  await mob.locator('#syn-a-source').selectOption('drive-frida');
  await mob.locator('#syn-b-source').selectOption('drive-diego');
  await mob.locator('.calc__submit').click();
  await mob.waitForSelector('.rwheel', { timeout: 20000 });
  check('mobile: bi-wheel renders', (await mob.locator('.wheel__transit').count()) === 11);
  await shot(mob, 'rwheel-mobile.png');
  await mob.close();

  await browser.close();
} finally {
  preview.kill();
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  · ${r.detail.slice(0, 90)}` : ''}`);
}
console.log(failed ? `\n${failed} FAILURES` : '\nALL PASS');
process.exit(failed ? 1 : 0);
