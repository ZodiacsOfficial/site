/**
 * Drive /today/ against the static preview.
 *
 *   npm run build
 *   OUT_DIR=/tmp/today-shots node tests/today-drive.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';
const BASE = 'http://127.0.0.1:4398';

const profile = {
  version: 1,
  settings: { houseSystem: 'whole' },
  charts: [{
    id: 'today-drive',
    name: 'Fixture chart',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    birth: { date: '1990-01-01', time: '12:00', timeKnown: true, place: null },
    summary: {
      engineVersion: 'fixture',
      utcISO: '1990-01-01T12:00:00.000Z',
      houseSystem: 'whole',
      // These positions deliberately make several contacts with the committed
      // daily snapshot while containing no birth details beyond the local fixture.
      bodies: [
        { body: 'Sun', lon: 20.2, retrograde: false },
        { body: 'Moon', lon: 213.1, retrograde: false },
        { body: 'Mercury', lon: 51.1, retrograde: false },
        { body: 'Venus', lon: 93.1, retrograde: false },
        { body: 'Mars', lon: 279.7, retrograde: false },
        { body: 'Jupiter', lon: 302.7, retrograde: false },
        { body: 'Saturn', lon: 104.6, retrograde: false },
        { body: 'Uranus', lon: 244.3, retrograde: false },
        { body: 'Neptune', lon: 184.4, retrograde: false },
        { body: 'Pluto', lon: 124.6, retrograde: false },
      ],
      angles: { asc: 290, mc: 200 },
      flags: [],
    },
  }],
};

const preview = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', '4398'], { stdio: 'ignore' });
await wait(2500);
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

try {
  if (OUT) await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROMIUM });

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.addInitScript((value) => {
    localStorage.setItem('zodiacs.profile.v1', JSON.stringify(value));
  }, profile);
  let apiRequests = 0;
  await desktop.route('**/api/**', (route) => {
    apiRequests += 1;
    return route.abort();
  });
  await desktop.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  await desktop.waitForSelector('[data-today-state="chart"]');
  check('saved chart renders a real brief', await desktop.locator('.today-lines li').count() >= 2);
  check('brief makes no backend requests', apiRequests === 0, `${apiRequests} requests`);
  await desktop.context().setOffline(true);
  check('rendered brief remains available offline', await desktop.locator('.today-lines').isVisible());
  await desktop.context().setOffline(false);
  if (OUT) await desktop.screenshot({ path: `${OUT}/today-1440.png`, fullPage: true });
  await desktop.close();

  const empty = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await empty.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  await empty.waitForSelector('[data-today-state="empty"]');
  check('no-chart state is honest', await empty.getByText('No saved chart on this device.').isVisible());
  check('no-chart state links to the calculator', await empty.locator('.today-empty a[href="/birth-chart/"]').isVisible());
  await empty.close();

  const reduced = await browser.newPage({
    viewport: { width: 900, height: 800 },
    reducedMotion: 'reduce',
  });
  await reduced.addInitScript((value) => {
    localStorage.setItem('zodiacs.profile.v1', JSON.stringify(value));
  }, profile);
  await reduced.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  await reduced.waitForSelector('.today-streak__count');
  const animation = await reduced.locator('.today-streak__count').evaluate((node) => {
    const style = getComputedStyle(node);
    return { name: style.animationName, duration: style.animationDuration };
  });
  check('reduced motion makes the streak instant', animation.name === 'none' || animation.duration === '0s', JSON.stringify(animation));
  await reduced.close();

  const mobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  await mobile.addInitScript((value) => {
    localStorage.setItem('zodiacs.profile.v1', JSON.stringify(value));
  }, profile);
  await mobile.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  await mobile.waitForSelector('[data-today-state="chart"]');
  const width = await mobile.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  check('375px layout has no horizontal overflow', width.page <= width.viewport, `${width.page}/${width.viewport}`);
  if (OUT) await mobile.screenshot({ path: `${OUT}/today-375.png`, fullPage: true });
  await mobile.close();

  await browser.close();
} finally {
  preview.kill();
}

let failures = 0;
for (const result of results) {
  if (!result.ok) failures += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
