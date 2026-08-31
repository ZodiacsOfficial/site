/**
 * Phase 7 Living Chart acceptance against a flag-on production build.
 *
 *   PUBLIC_LIVING_CHART_CAPTURE_ENABLED=1 npm run build
 *   npm run test:phase7:living-chart
 */
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const CHROMIUM = await findChromium();
const NOTE = 'Accepted a new project and wrote down the first concrete step.';
const profile = {
  version: 1,
  settings: { houseSystem: 'whole' },
  charts: [{
    id: '99999999-9999-4999-8999-999999999999',
    name: 'My chart',
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
    birth: { date: '1990-01-01', time: '12:00', timeKnown: true, place: null },
    summary: {
      engineVersion: 'living-chart-drive',
      utcISO: '1990-01-01T12:00:00.000Z',
      houseSystem: 'whole',
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

async function downloadText(page, selector) {
  const downloadPromise = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error(`Download ${download.suggestedFilename()} has no readable path.`);
  return {
    filename: download.suggestedFilename(),
    text: await readFile(path, 'utf8'),
  };
}

async function drive(BASE, browser) {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, hasTouch: true });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let apiRequests = 0;
  await page.route('**/api/**', (route) => {
    apiRequests += 1;
    return route.abort();
  });
  await page.addInitScript((savedProfile) => {
    localStorage.setItem('zodiacs.profile.v1', JSON.stringify(savedProfile));
  }, profile);

  await page.goto(`${BASE}/today/#save-moment`, { waitUntil: 'networkidle' });
  const chooser = page.locator('[data-living-self-chart]');
  await chooser.waitFor({ state: 'visible' });
  check('legacy saved chart requires an explicit self-chart choice', await chooser.isVisible());
  await chooser.getByRole('button').click();
  await page.locator('[data-living-moment-open]').waitFor({ state: 'visible' });
  check('Today exposes the opt-in moment capture', await page.locator('[data-living-moment-capture]').isVisible());
  await page.locator('[data-living-moment-open]').click();
  const form = page.locator('[data-living-moment-form]');
  await form.waitFor({ state: 'visible' });
  await form.locator('textarea').fill(NOTE);
  await form.locator('input[name="living-moment-category"][value="work"]').check();
  await form.getByRole('button', { name: 'Save moment' }).click();
  await page.locator('[data-living-moment-saved]').waitFor({ state: 'visible' });
  check('Today confirms a local save', await page.getByText('Saved to this device.').isVisible());
  const todayWidth = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  check('360px saved and sync choice UI has no horizontal overflow', todayWidth.page <= todayWidth.viewport, `${todayWidth.page}/${todayWidth.viewport}`);

  await page.goto(`${BASE}/profile/#living-chart`, { waitUntil: 'networkidle' });
  const entry = page.locator('[data-living-chart-entry]');
  await entry.waitFor({ state: 'visible' });
  check('Profile restores the saved IndexedDB entry', await entry.count() === 1);
  check('Profile renders the private note', await entry.getByText(NOTE, { exact: true }).isVisible());
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  check('360px timeline has no horizontal overflow', width.page <= width.viewport, `${width.page}/${width.viewport}`);

  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-living-chart-entry]').waitFor({ state: 'visible' });
  check('entry survives a full page reload', await page.locator('[data-living-chart-entry]').count() === 1);

  const jsonDownload = await downloadText(page, '[data-living-chart-export="json"]');
  const json = JSON.parse(jsonDownload.text);
  check(
    'JSON export is versioned and complete',
    json.schema === 'zodiacs.living-chart.export.v1'
      && json.ownerKind === 'guest'
      && json.moments?.length === 1
      && json.moments[0]?.note === NOTE,
    jsonDownload.filename,
  );
  const markdownDownload = await downloadText(page, '[data-living-chart-export="markdown"]');
  check(
    'Markdown export contains the entry and its frozen forecast',
    markdownDownload.filename.endsWith('.md')
      && markdownDownload.text.includes(NOTE)
      && markdownDownload.text.includes('Forecast saved with this moment'),
    markdownDownload.filename,
  );

  const remove = page.locator('[data-living-chart-delete]');
  await remove.click();
  await page.getByRole('button', { name: 'Delete this moment', exact: true }).click();
  await entry.waitFor({ state: 'detached' });
  check('two-step deletion removes the entry', await page.locator('[data-living-chart-entry]').count() === 0);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-living-chart]').waitFor({ state: 'visible' });
  check('deleted entry stays deleted after reload', await page.locator('[data-living-chart-entry]').count() === 0);
  check('local-only capture makes no API requests', apiRequests === 0, `${apiRequests} requests`);
  check('capture and timeline raise no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  await page.close();
}

await withPreview({ port: 4407 }, async (BASE) => {
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
