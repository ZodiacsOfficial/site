import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const TIMEOUT = 45_000;
const BIRTH = {
  date: '1990-06-15',
  time: '08:30',
  cityQuery: 'New York',
};

async function waitForHydration(page) {
  await page.locator('.calc__form').waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.waitForFunction(() => {
    const form = document.querySelector('.calc__form');
    const island = form?.closest('astro-island');
    return island ? !island.hasAttribute('ssr') : Boolean(form);
  }, null, { timeout: TIMEOUT });
}

async function open(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, `${url} must return 200`);
  await waitForHydration(page);
}

async function selectCity(page) {
  const place = page.locator('#place');
  await place.fill(BIRTH.cityQuery);
  const option = page.locator('#place-list [role="option"]:not([aria-disabled="true"])').first();
  await option.waitFor({ state: 'visible', timeout: TIMEOUT });
  await option.click();
  await page.locator('#place[readonly]').waitFor({ state: 'visible', timeout: TIMEOUT });
}

async function computeChart(page) {
  await page.locator('#birth-date').fill(BIRTH.date);
  await page.locator('#birth-time').fill(BIRTH.time);
  await selectCity(page);
  await page.locator('.calc__form button[type="submit"]').click();
  await page.locator('.calc__result').waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.waitForFunction(() => document.querySelector('.calc__form')?.getAttribute('aria-busy') === 'false', null, { timeout: TIMEOUT });
}

async function clipboard(page) {
  return page.evaluate(() => globalThis.__t17Clipboard.slice());
}

async function events(page) {
  return page.evaluate(() => globalThis.__t17Events.slice());
}

function v2Wire(url) {
  const parsed = new URL(url);
  const token = new URLSearchParams(parsed.hash.slice(1)).get('p');
  assert.ok(token?.startsWith('2.'), 'positions link must use the v2 prefix');
  return {
    parsed,
    token,
    wire: JSON.parse(Buffer.from(token.slice(2), 'base64url').toString('utf8')),
  };
}

const executablePath = await findChromium();
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});

const errors = [];
const transcript = { schema: 'zodiacs.t17-positions-share.v1' };

try {
  await withPreview({ port: Number(process.env.T17_SHARE_PORT ?? 4332) }, async (baseURL) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: 'dark',
      locale: 'en-US',
      timezoneId: 'UTC',
      reducedMotion: 'reduce',
      acceptDownloads: true,
    });
    await context.addInitScript(() => {
      globalThis.__t17Clipboard = [];
      globalThis.__t17Events = [];
      Object.defineProperty(Navigator.prototype, 'clipboard', {
        configurable: true,
        get() {
          return {
            writeText(value) {
              globalThis.__t17Clipboard.push(value);
              return Promise.resolve();
            },
          };
        },
      });
      Object.defineProperty(Navigator.prototype, 'canShare', {
        configurable: true,
        value: () => false,
      });
    });

    const trackedPage = async () => {
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console:${message.text()}`);
      });
      return page;
    };

    try {
      const source = await trackedPage();
      await open(source, `${baseURL}/birth-chart/`);
      await computeChart(source);
      await source.evaluate(() => {
        globalThis.__t17Events = [];
        globalThis.zodiacsAnalytics = {
          track(name, props) { globalThis.__t17Events.push({ name, props }); },
        };
      });

      assert.equal(await source.locator('[data-share-card]').count(), 1, 'the legacy share-card hook must stay unique');
      assert.equal(await source.locator('[data-share-link]').count(), 1, 'the legacy full-link hook must stay unique');
      assert.equal(await source.locator('[data-share-dialog]').count(), 0, 'dialog must stay unmounted until requested');

      await source.locator('[data-share-card]').click();
      const dialog = source.locator('[data-share-dialog]');
      await dialog.waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.equal(await dialog.getAttribute('open') !== null, true, 'share dialog must be modal/open');
      assert.equal((await dialog.locator('label').innerText()).trim(), 'Hide birth details');
      assert.equal(await dialog.locator('[data-hide-birth-details]').isChecked(), false, 'birth details stay visible by default');
      assert.equal(await dialog.getAttribute('data-share-mode'), 'details');

      await dialog.locator('[data-share-link]').click();
      await source.waitForFunction(() => globalThis.__t17Clipboard.length === 1, null, { timeout: TIMEOUT });
      const fullUrl = (await clipboard(source))[0];
      const fullParsed = new URL(fullUrl);
      assert.equal(fullParsed.hash.startsWith('#c=1.'), true, 'default link sharing must preserve v1 #c');

      await dialog.locator('[data-hide-birth-details]').check();
      assert.equal(await dialog.getAttribute('data-share-mode'), 'positions');
      const privacy = await dialog.locator('.calc-share-dialog__note').innerText();
      assert.match(privacy, /omits your birth date, time, and place/i);
      assert.match(privacy, /still be identifying/i);
      assert.match(privacy, /not anonymous/i);

      await dialog.locator('[data-share-link]').click();
      await source.waitForFunction(() => globalThis.__t17Clipboard.length === 2, null, { timeout: TIMEOUT });
      const positionsUrl = (await clipboard(source))[1];
      const { parsed: positionsParsed, token, wire } = v2Wire(positionsUrl);
      assert.equal(positionsParsed.pathname, '/birth-chart/');
      assert.deepEqual(Object.keys(wire).sort(), ['a', 'b', 'h', 'v'], 'v2 wire must contain positions metadata only');
      const wireText = JSON.stringify(wire);
      for (const privateValue of [BIRTH.date, BIRTH.time, BIRTH.cityQuery, 'America/New_York', '40.7', '-74.0']) {
        assert.equal(wireText.includes(privateValue), false, `v2 wire leaked ${privateValue}`);
      }

      const downloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await dialog.locator('[data-share-card-action]').click();
      assert.equal(await dialog.locator('[data-hide-birth-details]').isDisabled(), true,
        'privacy mode must be locked while a card export is in flight');
      await source.waitForFunction(() => globalThis.__t17Events.length === 3, null, { timeout: TIMEOUT });
      await source.waitForFunction(() => {
        const toggle = document.querySelector('[data-hide-birth-details]');
        const action = document.querySelector('[data-share-card-action]');
        return toggle instanceof HTMLInputElement
          && !toggle.disabled
          && action?.textContent?.includes('Card saved');
      }, null, { timeout: TIMEOUT });
      assert.equal(await dialog.locator('[data-hide-birth-details]').isDisabled(), false,
        'privacy mode must unlock after the card has finished saving');
      const download = await downloadPromise;
      assert.equal(
        download.suggestedFilename(),
        'zodiacs-chart-positions.png',
        'positions card filename must omit the birth date',
      );

      assert.deepEqual(await events(source), [
        { name: 'chart_share', props: { variant: 'details_link' } },
        { name: 'chart_share', props: { variant: 'positions_link' } },
        { name: 'chart_share', props: { variant: 'positions_card' } },
      ], 'analytics must contain approved, non-sensitive variants only');

      const received = await trackedPage();
      await open(received, positionsUrl);
      const positions = received.locator('[data-positions-only]');
      await positions.waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.equal(new URL(received.url()).hash, '', 'successful #p fragment must be consumed and stripped');
      assert.equal((await positions.locator('.notice').innerText()).trim(), 'Positions only — birth details not included.');
      assert.equal(await positions.locator('svg.wheel').count(), 1, 'positions result keeps a static wheel');
      assert.equal(await positions.locator('tbody tr').count(), 14, 'twelve bodies plus encoded ASC/MC must be shown');
      assert.equal(await positions.locator('.xplr, [data-entity], .calc__aspects, [data-share-card], [data-share-link]').count(), 0,
        'positions result must not reconstruct interactive, aspect, or share/save surfaces');
      assert.equal(await positions.locator('th').allTextContents().then((labels) => labels.some((label) => /house|motion/i.test(label))), false,
        'positions table must omit house and motion claims');
      assert.equal(await received.locator('#birth-date').inputValue(), '', 'positions link must not prefill a birth date');
      assert.equal(await received.locator('#birth-time').inputValue(), '', 'positions link must not prefill a birth time');
      assert.equal(await received.locator('#place').inputValue(), '', 'positions link must not prefill a birthplace');
      const receivedText = await positions.innerText();
      for (const privateValue of [BIRTH.date, BIRTH.time, BIRTH.cityQuery, 'UTC']) {
        assert.equal(receivedText.includes(privateValue), false, `positions result leaked ${privateValue}`);
      }
      assert.match(receivedText, /engine v1\.0\.0/i, 'positions result must carry the engine receipt');

      const full = await trackedPage();
      await open(full, fullUrl);
      await full.locator('.calc__result').waitFor({ state: 'visible', timeout: TIMEOUT });
      await full.waitForFunction(() => document.querySelector('.calc__form')?.getAttribute('aria-busy') === 'false', null, { timeout: TIMEOUT });
      assert.equal(new URL(full.url()).hash, '', 'legacy #c fragment must still be stripped after compute');
      assert.equal(await full.locator('#birth-date').inputValue(), BIRTH.date, 'legacy #c must still prefill date');
      assert.equal(await full.locator('#birth-time').inputValue(), BIRTH.time, 'legacy #c must still prefill time');
      assert.match(await full.locator('.notice').allInnerTexts().then((items) => items.join(' ')), /birth details came in the link/i);
      assert.equal(await full.locator('[data-share-card]').count(), 1);
      assert.equal(await full.locator('[data-share-link]').count(), 1);

      const ambiguous = await trackedPage();
      await open(ambiguous, `${baseURL}/birth-chart/#p=${token}&${fullParsed.hash.slice(1)}`);
      await ambiguous.waitForFunction(() => location.hash === '', null, { timeout: TIMEOUT });
      assert.match(await ambiguous.locator('.calc__error').innerText(), /two chart formats/i);
      assert.equal(await ambiguous.locator('[data-positions-only], .calc__result').count(), 0, 'ambiguous fragments must render neither format');

      const invalid = await trackedPage();
      await open(invalid, `${baseURL}/birth-chart/#p=2.invalid`);
      await invalid.locator('.calc__error').waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.match(await invalid.locator('.calc__error').innerText(), /invalid or incomplete/i);
      assert.equal(await invalid.locator('[data-positions-only], .calc__result').count(), 0, 'invalid v2 must not render a result');

      transcript.fullFragment = fullParsed.hash.slice(0, 5);
      transcript.positionsFragment = positionsParsed.hash.slice(0, 5);
      transcript.positionsWireKeys = Object.keys(wire).sort();
      transcript.positionsRows = await positions.locator('tbody tr').count();
      transcript.cardFilename = download.suggestedFilename();
      transcript.events = await events(source);
      transcript.hashesStripped = { positions: true, full: true, ambiguous: true };
    } finally {
      await context.close();
    }
  });
} finally {
  await browser.close();
}

assert.deepEqual(errors, [], 'T-17 browser flow emitted errors');
process.stdout.write(`${JSON.stringify(transcript, null, 2)}\n`);
