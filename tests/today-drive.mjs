/**
 * Drive /today/ against the static preview.
 *
 *   npm run build
 *   OUT_DIR=/tmp/today-shots npm run test:today:browser
 */
import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = await findChromium();
const manifest = JSON.parse(await readFile(
  new URL('../src/data/daily-publication-manifest.json', import.meta.url),
  'utf8',
));

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

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function drive(BASE, browser) {
  if (OUT) await mkdir(OUT, { recursive: true });
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
  check('saved chart replaces the Sun-sign baseline', await desktop.locator('[data-today-sun-sign]').count() === 0);
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
  check('no-chart state renders all twelve sign notes', await empty.locator('[data-today-sun-sign]').count() === 12);
  check(
    'sign picker uses all twelve pastel icon assets',
    await empty.locator('.today-sign-picker .today-sign__icon img[src^="/assets/zodiac-icons/48/"]').count() === 12,
  );
  check(
    'sign notes use all twelve pastel icon assets',
    await empty.locator('[data-today-all-signs] .today-sign-reading__icon img[src^="/assets/zodiac-icons/48/"]').count() === 12,
  );
  check('no-chart state links to the calculator', await empty.locator('.today-fallback__personalize a[href="/birth-chart/"]').isVisible());
  check(
    'verified edition markers match the manifest',
    await empty.locator(`[data-daily-date="${manifest.date}"][data-generation-mode="${manifest.generation.mode}"]`).count() === 1,
  );
  check('edition details are summarized without leading the page', await empty.locator('.today-provenance summary').isVisible());
  check('edition details are closed by default', await empty.locator('.today-provenance').evaluate((node) => !node.open));
  check('public provenance link remains available', await empty.locator('a[href="/data/daily-publication.json"]').count() === 1);
  if (OUT) await empty.screenshot({ path: `${OUT}/today-empty-900.png`, fullPage: true });
  await empty.locator('a[href="#today-sun-sign-leo"]').click();
  await empty.waitForFunction(() => document.querySelectorAll('[data-today-sun-sign]').length === 1);
  check('enhanced sign link narrows to one note', await empty.locator('[data-today-sun-sign="leo"]').count() === 1);
  check('selected sign keeps its pastel icon', await empty.locator('[data-today-sun-sign="leo"] .today-sign-reading__icon img[src$="/leo.webp"]').count() === 1);
  const selectedHash = await empty.evaluate(() => location.hash);
  check('enhanced sign link keeps native hash navigation', selectedHash === '#today-sun-sign-leo', selectedHash);
  await empty.close();

  const noJs = await browser.newPage({
    viewport: { width: 900, height: 800 },
    javaScriptEnabled: false,
  });
  await noJs.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  check('no-JavaScript page renders all twelve sign notes', await noJs.locator('[data-today-sun-sign]').count() === 12);
  check('no-JavaScript sign notes link to full horoscopes', await noJs.locator('[data-today-sun-sign] a[href^="/horoscopes/"]').count() === 12);
  check('no-JavaScript page has no loading gate', await noJs.locator('.today-loading').count() === 0);
  const noJsEdition = noJs.locator('.today-provenance');
  check('no-JavaScript page keeps native edition details', await noJsEdition.count() === 1);
  check('no-JavaScript edition details start closed', await noJsEdition.evaluate((node) => !node.open));
  check('no-JavaScript edition summary stays visible', await noJsEdition.locator('summary').isVisible());
  await noJsEdition.locator('summary').click();
  check(
    'no-JavaScript edition evidence opens on request',
    await noJs.getByText('Each reading is tied to the recorded sky', { exact: false }).isVisible(),
  );
  check(
    'edition note keeps a space before its date',
    (await noJsEdition.innerText()).includes(`for ${manifest.date}`),
  );
  check(
    'Today does not lead with AI-operations language',
    await noJs.getByText('Zodiacs.org is AI-operated.', { exact: false }).count() === 0,
  );
  if (OUT) await noJs.screenshot({ path: `${OUT}/today-nojs-900.png`, fullPage: true });
  await noJs.close();

  const fallbackMobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  await fallbackMobile.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  await fallbackMobile.waitForSelector('[data-today-state="empty"]');
  const fallbackWidth = await fallbackMobile.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  check(
    '375px Sun-sign baseline has no horizontal overflow',
    fallbackWidth.page <= fallbackWidth.viewport,
    `${fallbackWidth.page}/${fallbackWidth.viewport}`,
  );
  if (OUT) await fallbackMobile.screenshot({ path: `${OUT}/today-empty-375.png`, fullPage: true });
  await fallbackMobile.close();

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
}

await withPreview({ port: 4398 }, async (BASE) => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: STABLE_CHROMIUM_ARGS,
  });
  try {
    await drive(BASE, browser);
  } finally {
    await browser.close();
  }
});

let failures = 0;
for (const result of results) {
  if (!result.ok) failures += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
