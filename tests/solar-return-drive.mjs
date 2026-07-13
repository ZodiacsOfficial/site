/** End-to-end acceptance drive for /solar-return/. Run after npm run build. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';
const PORT = 4410;
const BASE = `http://127.0.0.1:${PORT}`;
const kahloBodies = [{ body: 'Sun', lon: 103.3755, retrograde: false }];
const place = { name: 'Mexico City', admin1: 'Ciudad de México', country: 'Mexico', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' };
const profile = {
  version: 1, settings: { houseSystem: 'whole' }, charts: [
    { id: 'kahlo-located', name: 'Frida — located', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', birth: { date: '1907-07-06', time: '08:30', timeKnown: true, place }, summary: { engineVersion: '1.0.0', utcISO: '1907-07-06T15:06:36Z', houseSystem: 'whole', bodies: kahloBodies, angles: null, flags: [] } },
    { id: 'kahlo-no-place', name: 'Frida — saved Sun only', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', birth: { date: '1907-07-06', time: null, timeKnown: false, place: null }, summary: { engineVersion: '1.0.0', utcISO: '1907-07-06T15:06:36Z', houseSystem: 'whole', bodies: kahloBodies, angles: null, flags: ['no-time'] } },
    { id: 'kahlo-no-place-known', name: 'Frida — timed saved Sun', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', birth: { date: '1907-07-06', time: '08:30', timeKnown: true, place: null }, summary: { engineVersion: '1.0.0', utcISO: '1907-07-06T15:06:36Z', houseSystem: 'whole', bodies: kahloBodies, angles: null, flags: [] } },
  ],
};
const preview = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], { stdio: 'ignore' });
await wait(2200);
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

try {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  await context.addInitScript((seed) => {
    localStorage.setItem('zodiacs.profile.v1', JSON.stringify(seed));
    window.__srEvents = [];
    window.zodiacsAnalytics = Object.freeze({ track(name, props) { window.__srEvents.push({ name, props }); } });
  }, profile);
  const page = await context.newPage();
  const fetched = [];
  const requests = [];
  page.on('response', (response) => fetched.push(new URL(response.url()).pathname));
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method(), body: request.postData() ?? '' }));
  await page.goto(`${BASE}/solar-return/`, { waitUntil: 'networkidle' });
  check('saved chart is preselected', await page.locator('#sr-source').inputValue() === 'kahlo-located');
  check('engine, wheel, and result remain lazy', !fetched.some((path) => /(?:full|SolarReturnResult|TransitRing|compute)\.[\w-]+\.js$/.test(path)), fetched.join('\n'));

  const savedStart = Date.now();
  await page.getByRole('button', { name: 'Cast solar return' }).click();
  await page.locator('[data-solar-return-result]').waitFor({ timeout: 45_000 });
  const savedRuntime = Date.now() - savedStart;
  check('saved chart computes', await page.locator('[data-return-instant]').count() === 1);
  check('saved calculation finishes within 45 seconds', savedRuntime < 45_000, `${savedRuntime} ms`);
  check('engine and lazy result load only on compute', fetched.some((path) => /full\.[\w-]+\.js$/.test(path)) && fetched.some((path) => /SolarReturnResult\.[\w-]+\.js$/.test(path)) && fetched.some((path) => /TransitRing\.[\w-]+\.js$/.test(path)));
  check('located result has wheel and houses', await page.locator('.wheel').count() === 1 && await page.getByRole('columnheader', { name: 'House' }).count() === 1);
  const placementBodies = await page.locator('.calc__table tbody td:first-child').allTextContents();
  check('placements table includes both lunar nodes', placementBodies.includes('North Node') && placementBodies.includes('South Node'), placementBodies.join(', '));
  const ascLine = (await page.locator('[data-sr-corpus="asc"]').textContent()) ?? '';
  const houseLine = (await page.locator('[data-sr-corpus="sun-house"]').textContent()) ?? '';
  check('ASC corpus fixture line is exact', ascLine === 'The year leads with consolidation — building, furnishing, and letting good things get boring in the best way. Slow is the strategy, not the setback.', ascLine);
  check('Sun-house corpus fixture line is exact', houseLine === 'A local year — words, siblings, neighborhoods, the daily loop. Small communications carry outsized freight.', houseLine);
  check('analytics fires once via page', await page.evaluate(() => window.__srEvents.filter((e) => e.name === 'srchart_view' && e.props.via === 'page').length) === 1);

  const natalSun = Number(await page.locator('[data-solar-return-result]').getAttribute('data-sr-sun'));
  const mexicoAsc = Number(await page.locator('[data-solar-return-result]').getAttribute('data-sr-asc'));
  await page.getByLabel('Cast for a different place').check();
  await page.getByLabel('Return location').fill('London');
  await page.locator('#sr-cast-place-list button').first().waitFor({ timeout: 15_000 });
  await page.locator('#sr-cast-place-list button').first().click();
  await page.getByRole('button', { name: 'Cast solar return' }).click();
  await page.waitForFunction((oldAsc) => Number(document.querySelector('[data-solar-return-result]')?.getAttribute('data-sr-asc')) !== oldAsc, mexicoAsc, { timeout: 45_000 });
  const relocatedSun = Number(await page.locator('[data-solar-return-result]').getAttribute('data-sr-sun'));
  check('relocation changes ascendant', Number(await page.locator('[data-solar-return-result]').getAttribute('data-sr-asc')) !== mexicoAsc);
  check('relocation leaves planetary longitude fixed', Math.abs(relocatedSun - natalSun) < 1e-10, `${relocatedSun}/${natalSun}`);

  await page.locator('#sr-year-mode').selectOption('custom');
  const yearInput = page.getByLabel('Custom return year');
  check('custom year is bounded', await yearInput.getAttribute('min') === '1800' && await yearInput.getAttribute('max') === '2200');
  await yearInput.fill('2024');
  await page.getByRole('button', { name: 'Cast solar return' }).click();
  await page.getByText('Your 2024 return').waitFor({ timeout: 45_000 });
  check('custom year computes the requested return', await page.getByText('Your 2024 return').count() === 1);

  await page.locator('#sr-source').selectOption('kahlo-no-place-known');
  await page.locator('#sr-year-mode').selectOption('current');
  await page.getByRole('button', { name: 'Cast solar return' }).click();
  await page.waitForFunction(() => document.querySelector('[data-solar-return-result]')?.getAttribute('data-sr-no-place') === 'true', null, { timeout: 45_000 });
  check('time-known saved chart without place stays planets-only', await page.getByRole('columnheader', { name: 'House' }).count() === 0 && await page.locator('[data-noon-notice]').count() === 0);

  await page.locator('#sr-source').selectOption('kahlo-no-place');
  await page.getByRole('button', { name: 'Cast solar return' }).click();
  await page.locator('[data-noon-notice]').waitFor({ timeout: 45_000 });
  check('no-time copy is exact', await page.locator('[data-noon-notice]').textContent() === 'Computed from a noon chart — the return instant can shift a few hours with your exact birth time, and houses need it.');
  check('saved no-place is explicitly planets-only', (await page.locator('.notice').allTextContents()).some((text) => text.includes('saved chart has no stored birthplace')));
  check('no-time/no-place has no house column', await page.getByRole('columnheader', { name: 'House' }).count() === 0);

  await page.locator('#sr-source').selectOption('');
  await page.locator('#sr-date').fill('1907-07-06');
  await page.locator('#sr-time').fill('08:30');
  await page.locator('#sr-place').fill('Mexico City');
  await page.locator('#sr-place-list button').first().waitFor({ timeout: 15_000 });
  await page.locator('#sr-place-list button').first().click();
  check('manual BirthFields path becomes ready', await page.getByRole('button', { name: 'Cast solar return' }).isEnabled());

  await page.locator('#sr-source').selectOption('kahlo-no-place-known');
  await page.getByRole('button', { name: 'Cast solar return' }).click();
  await page.waitForFunction(() => document.querySelector('[data-solar-return-result]')?.getAttribute('data-sr-no-place') === 'true', null, { timeout: 45_000 });
  check('saved no-place chart never reuses prior manual birthplace', await page.getByRole('columnheader', { name: 'House' }).count() === 0);

  await page.locator('#sr-source').selectOption('');
  await page.getByLabel("I don't know it").check();
  check('unknown time suppresses relocation input', await page.getByLabel('Cast for a different place').count() === 0);
  await page.getByRole('button', { name: 'Cast solar return' }).click();
  await page.locator('[data-noon-notice]').waitFor({ timeout: 45_000 });
  check('manual unknown-time path computes planets-only', await page.locator('[data-return-instant]').count() === 1 && await page.getByRole('columnheader', { name: 'House' }).count() === 0);

  check('privacy: all calculation traffic stays same-origin GET with no birth payload', requests.every((request) => new URL(request.url).origin === BASE && request.method === 'GET' && !/1907-07-06|08%3A30|08:30/.test(`${request.url}${request.body}`)));

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 320, height: 900 });
  await mobile.goto(`${BASE}/solar-return/`, { waitUntil: 'networkidle' });
  await mobile.getByRole('button', { name: 'Cast solar return' }).click();
  await mobile.locator('[data-solar-return-result]').waitFor({ timeout: 45_000 });
  const overflow = await mobile.evaluate(() => ({ width: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map((element) => `${element.tagName}.${element.className}`) }));
  check('320px form and result have no page overflow', overflow.width <= 320, JSON.stringify(overflow));
  await mobile.close();
  await browser.close();
} finally {
  preview.kill('SIGTERM');
}

let failed = 0;
for (const item of checks) {
  if (!item.ok) failed += 1;
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` · ${item.detail}` : ''}`);
}
if (failed) process.exit(1);
console.log(`\nALL ${checks.length} CHECKS PASS`);
