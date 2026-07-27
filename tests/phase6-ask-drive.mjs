/**
 * Phase 6 — /ask/ page and assistant-contract browser drive, with a fully
 * mocked /api/assistant. Covers the static feature-off usefulness, the
 * one-click panel, disabled/quota/provider states, streaming and stop,
 * the exact-preview chart consent in both directions, the internal-source
 * row, no-JS behavior, and zero horizontal overflow at the four widths.
 *
 *   npm run build
 *   node tests/phase6-ask-drive.mjs
 */
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const profile = {
  version: 1,
  settings: { houseSystem: 'whole' },
  charts: [{
    id: 'ask-drive-chart',
    name: 'Drive Person',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    birth: {
      date: '1988-11-02',
      time: '06:20',
      timeKnown: true,
      place: { name: 'Lisbon', admin1: '', country: 'PT', lat: 38.72, lon: -9.14, tz: 'Europe/Lisbon' },
    },
    summary: {
      engineVersion: '1.0.0',
      utcISO: '1988-11-02T06:20:00.000Z',
      houseSystem: 'whole',
      bodies: [
        { body: 'Sun', lon: 220.4, retrograde: false },
        { body: 'Moon', lon: 95.2, retrograde: false },
        { body: 'Venus', lon: 187.7, retrograde: false },
      ],
      angles: { asc: 218, mc: 128 },
      flags: [],
    },
  }],
};

const sse = (chunks) => `${chunks.map((text) => `data: ${JSON.stringify({ t: text })}`).join('\n\n')}\n\ndata: [DONE]\n\n`;

await withPreview({ port: 4406 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });
  try {
    /* 1 — static page: useful without the feature and without JS. */
    const noJs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(`${baseURL}/ask/`, { waitUntil: 'domcontentloaded' });
    check('no-JS /ask/ renders the guide heading', await noJsPage.locator('h1').textContent() === 'A question, answered from this site.');
    check('no-JS /ask/ explains the JavaScript need', (await noJsPage.locator('.ask__nojs').textContent() ?? '').includes('JavaScript'));
    check('no-JS /ask/ keeps working links', await noJsPage.locator('.ask__links a[href="/learn/"]').count() === 1);
    check('no-JS /ask/ has no horizontal overflow',
      await noJsPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await noJs.close();

    /* 2 — interactive states across the mocked endpoint. */
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript((saved) => {
      localStorage.setItem('zodiacs.profile.v1', JSON.stringify(saved));
    }, profile);
    const page = await context.newPage();
    const requests = [];
    let mode = 'disabled';
    await page.route('**/api/assistant', async (route) => {
      const body = route.request().postDataJSON();
      requests.push(body);
      if (mode === 'disabled') {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'disabled' }) });
        return;
      }
      if (mode === 'limit') {
        await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'limit' }) });
        return;
      }
      if (mode === 'slow') {
        await wait(4_000);
        await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(['this arrives late']) });
        return;
      }
      const withChart = typeof body.chart === 'string';
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          withChart ? 'Your Scorpio Sun reads plainly here. ' : 'A square is friction that produces motion. ',
          'Read more at /learn/aspects/ and /birth-chart/.',
        ]),
      });
    });

    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseURL}/ask/`, { waitUntil: 'networkidle' });
    check('/ask/ robots are indexable', (await page.locator('meta[name="robots"]').getAttribute('content')) === 'max-image-preview:large');
    check('/ask/ canonical is self', (await page.locator('link[rel="canonical"]').getAttribute('href')) === 'https://zodiacs.org/ask/');
    check('/ask/ states the generated/symbolic disclosure',
      (await page.textContent('.ask__contract-core') ?? '').includes('can be wrong'));

    /* Disabled: calm copy, page remains the answer. */
    await page.locator('[data-assistant-open]').first().click();
    const textarea = page.locator('.zassistant textarea');
    await textarea.waitFor({ timeout: 15_000 });
    await textarea.fill('What is a square?');
    await page.locator('.zassistant form button[type="submit"]').click();
    const status = page.locator('.zassistant [role="status"], .zassistant .zassistant__status');
    try {
      await page.waitForFunction(() => {
        const node = document.querySelector('.zassistant');
        return node && /resting|not available|unavailable|off right now/i.test(node.textContent ?? '');
      }, null, { timeout: 15_000 });
      check('disabled state shows the calm resting copy', true);
    } catch (error) {
      const dump = await page.evaluate(() => document.querySelector('.zassistant')?.textContent?.slice(0, 400) ?? 'NO PANEL');
      console.error('DISABLED-STATE DUMP:', dump);
      throw error;
    }

    /* Quota: 429 becomes the daily-limit copy. */
    mode = 'limit';
    await textarea.fill('What is a trine?');
    await page.locator('.zassistant form button[type="submit"]').click();
    await page.waitForFunction(() => /caps out|messages a day|daily|per day|limit/i.test(document.querySelector('.zassistant')?.textContent ?? ''), null, { timeout: 15_000 });
    check('quota state shows the daily-limit copy', true);

    /* Streaming + sources row. */
    mode = 'ok';
    await textarea.fill('What is a square aspect?');
    await page.locator('.zassistant form button[type="submit"]').click();
    await page.locator('.zassistant__sources').first().waitFor({ timeout: 15_000 });
    const sources = await page.locator('.zassistant__sources').last().textContent() ?? '';
    check('answer carries the internal-source row', sources.includes('/learn/aspects/') && sources.includes('From this site'));
    check('source paths render as links', await page.locator('.zassistant__sources a[href="/learn/aspects/"]').count() >= 1);

    /* Consent: enabling the chart shows the exact preview before anything is sent. */
    const before = requests.length;
    await page.locator('.zassistant [aria-pressed]').first().click();
    const preview = page.locator('.zassistant__consent-preview');
    await preview.waitFor({ timeout: 15_000 });
    const previewText = (await preview.textContent() ?? '').trim();
    check('consent preview shows a placements-only summary',
      previewText.length > 40 && /Sun/.test(previewText) && !previewText.includes('1988-11-02') && !previewText.includes('Lisbon'),
      previewText.slice(0, 120));
    check('opening the consent card sent nothing', requests.length === before);

    /* Cancel keeps the chart out. */
    await page.locator('.zassistant__consent-cancel').click();
    await textarea.fill('Read my chart please — what is my sun sign?');
    await page.locator('.zassistant form button[type="submit"]').click();
    await page.locator('.zassistant__consent-preview').waitFor({ timeout: 15_000 });
    const beforeDecline = requests.length;
    await page.locator('.zassistant__consent-cancel').click();
    await page.waitForFunction(
      (n) => document.querySelectorAll('.zassistant__sources').length >= n,
      2,
      { timeout: 20_000 },
    );
    const declinedRequest = requests.at(-1);
    check('declined consent still sent the question', requests.length === beforeDecline + 1);
    check('declined consent sends the question without a chart',
      declinedRequest && declinedRequest.chart === undefined,
      JSON.stringify(Object.keys(declinedRequest ?? {})));

    /* Confirm attaches exactly the previewed text. */
    await textarea.fill('What is my sun sign, from my chart?');
    await page.locator('.zassistant form button[type="submit"]').click();
    await page.locator('.zassistant__consent-preview').waitFor({ timeout: 15_000 });
    const confirmedPreview = (await page.locator('.zassistant__consent-preview').textContent() ?? '').trim();
    await page.locator('.zassistant__consent-confirm').click();
    await page.waitForFunction(() => document.querySelectorAll('.zassistant__sources').length >= 3, null, { timeout: 20_000 });
    const chartRequest = requests.findLast((request) => typeof request.chart === 'string');
    check('confirmed consent attaches exactly the previewed summary',
      Boolean(chartRequest) && chartRequest.chart.trim() === confirmedPreview,
      chartRequest ? String(chartRequest.chart.length) : 'none');
    check('chart payload stays placements-only',
      Boolean(chartRequest) && !/1988|Lisbon|06:20/.test(chartRequest.chart));

    /* Stop cancels a slow answer. */
    mode = 'slow';
    await textarea.fill('Long question about houses');
    await page.locator('.zassistant form button[type="submit"]').click();
    const stop = page.locator('.zassistant button', { hasText: /stop|detener|parar|arr[êe]|ferma/i }).first();
    await stop.waitFor({ timeout: 10_000 });
    await stop.click();
    await page.waitForFunction(() => /stopped|detenid|interrot|arrêt|parada|parado/i.test(document.querySelector('.zassistant')?.textContent ?? ''), null, { timeout: 10_000 });
    check('stop cancels an in-flight answer', true);
    check('no page errors across all states', errors.length === 0, errors.join(' | '));
    await context.close();

    /* 3 — overflow at the four widths. */
    for (const width of [360, 390, 781, 1280]) {
      const sized = await browser.newContext({ viewport: { width, height: 900 } });
      const sizedPage = await sized.newPage();
      await sizedPage.goto(`${baseURL}/ask/`, { waitUntil: 'networkidle' });
      check(`/ask/@${width} has no horizontal overflow`,
        await sizedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await sized.close();
    }
  } finally {
    await browser.close();
  }
});

const failures = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
}
if (failures.length > 0) {
  console.error(`phase6-ask-drive: FAIL — ${failures.length}/${results.length}`);
  process.exit(1);
}
console.log(`phase6-ask-drive: PASS — ${results.length}/${results.length} checks`);
