import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const TIMEOUT = 45_000;
const BIRTH = {
  date: '1990-06-15',
  time: '08:30',
  cityQuery: 'New York',
};
const ENGINE_PACKAGE = JSON.parse(await readFile(
  new URL('../node_modules/@zodiacs/engine/package.json', import.meta.url),
  'utf8',
));
const ENGINE_VERSION = String(ENGINE_PACKAGE.version);

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

async function pngDimensions(download) {
  const path = await download.path();
  assert.ok(path, 'completed download must expose a local path');
  const png = await readFile(path);
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG', 'download must be a PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
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
      globalThis.__t17CanvasText = [];
      globalThis.__t17DownloadClicks = [];
      globalThis.__t17ShareCalls = 0;
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (value, x, y, maxWidth) {
        globalThis.__t17CanvasText.push({
          value: String(value), x, y, align: this.textAlign, at: performance.now(),
        });
        return maxWidth === undefined
          ? fillText.call(this, value, x, y)
          : fillText.call(this, value, x, y, maxWidth);
      };
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.download) {
          globalThis.__t17DownloadClicks.push({ filename: this.download, at: performance.now() });
        }
        return click.call(this);
      };
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
          track(name, props) { globalThis.__t17Events.push({ name, props, at: performance.now() }); },
        };
      });
      const iconRequests = [];
      source.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (path.includes('/assets/zodiac-icons/')) {
          iconRequests.push({ path, type: request.resourceType() });
        }
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

      const fullCardStart = await source.evaluate(() => {
        globalThis.__t17CanvasText = [];
        globalThis.__t17DownloadClicks = [];
        return performance.now();
      });
      const fullCardDownloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await dialog.locator('[data-share-card-action="full"]').click();
      assert.equal(await dialog.locator('[data-hide-birth-details]').isDisabled(), true,
        'link-privacy control must be locked while a card export is in flight');
      await source.waitForFunction(() => globalThis.__t17Events.length === 3, null, { timeout: TIMEOUT });
      await source.waitForFunction(() => {
        const toggle = document.querySelector('[data-hide-birth-details]');
        const action = document.querySelector('[data-share-card-action="full"]');
        return toggle instanceof HTMLInputElement
          && !toggle.disabled
          && !action?.textContent?.includes('Rendering');
      }, null, { timeout: TIMEOUT });
      const fullCardDownload = await fullCardDownloadPromise;
      assert.equal(fullCardDownload.suggestedFilename(), 'zodiacs-chart.png',
        'full-card filename must contain no birth input');
      assert.deepEqual(await pngDimensions(fullCardDownload), { width: 1080, height: 1350 },
        'full chart must export at 2× the 540×675 design size');

      const fullCardRender = await source.evaluate(() => ({
        text: globalThis.__t17CanvasText.slice(),
        downloads: globalThis.__t17DownloadClicks.slice(),
        events: globalThis.__t17Events.slice(),
      }));
      const fullCardText = fullCardRender.text.map((entry) => entry.value).join(' | ');
      for (const privateValue of [BIRTH.date, BIRTH.time, BIRTH.cityQuery, 'June 15, 1990', 'America/New_York']) {
        assert.equal(fullCardText.includes(privateValue), false, `default full-chart PNG leaked ${privateValue}`);
      }
      assert.equal(fullCardText.includes(`Engine ${ENGINE_VERSION}`), true,
        'default full-chart PNG must carry only its engine receipt');
      const fullCardWordmark = fullCardRender.text.find((entry) => entry.value === 'ZODIACS · ORG');
      assert.deepEqual(
        { align: fullCardWordmark?.align, x: fullCardWordmark?.x, y: fullCardWordmark?.y },
        { align: 'right', x: 1016, y: 1304 },
        'full-chart wordmark must occupy the bottom-right register',
      );
      const fullCardDownloadAt = fullCardRender.downloads.find((entry) => entry.filename === 'zodiacs-chart.png')?.at;
      const fullCardEventAt = fullCardRender.events.find((entry) => entry.name === 'share_card_downloaded')?.at;
      assert.ok(fullCardDownloadAt >= fullCardStart, 'full-chart download must start after the action');
      assert.ok(fullCardEventAt >= fullCardDownloadAt,
        'share_card_downloaded must fire only after the non-cancelled full-chart download starts');
      assert.ok(fullCardEventAt - fullCardStart < 1000,
        `full-chart PNG action took ${(fullCardEventAt - fullCardStart).toFixed(1)}ms; expected <1000ms`);
      assert.deepEqual((await events(source)).map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'details_link' } },
        { name: 'chart_share', props: { variant: 'full_chart_card' } },
        { name: 'share_card_downloaded', props: { variant: 'full_chart_card' } },
      ], 'default full-card analytics must fire exactly once and contain no sensitive fields');

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
      await source.waitForFunction(() => globalThis.__t17Events.length === 4, null, { timeout: TIMEOUT });
      assert.deepEqual((await events(source)).map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'details_link' } },
        { name: 'chart_share', props: { variant: 'full_chart_card' } },
        { name: 'share_card_downloaded', props: { variant: 'full_chart_card' } },
        { name: 'chart_share', props: { variant: 'positions_link' } },
      ], 'positions-link analytics must retain only its approved, non-sensitive variant');

      const bigThreeStart = await source.evaluate(() => {
        globalThis.__t17CanvasText = [];
        globalThis.__t17DownloadClicks = [];
        return performance.now();
      });
      const bigThreeDownloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await dialog.locator('[data-share-card-action="big-three"]').click();
      const bigThreeDownload = await bigThreeDownloadPromise;
      await source.waitForFunction(() => globalThis.__t17Events.length === 6, null, { timeout: TIMEOUT });
      assert.equal(bigThreeDownload.suggestedFilename(), 'zodiacs-big-three.png');
      assert.deepEqual(await pngDimensions(bigThreeDownload), { width: 1080, height: 1350 },
        'big-three card must export at 2× the 540×675 design size');
      const bigThreeRender = await source.evaluate(() => ({
        text: globalThis.__t17CanvasText.slice(),
        downloads: globalThis.__t17DownloadClicks.slice(),
        events: globalThis.__t17Events.slice(),
      }));
      const bigThreeText = bigThreeRender.text.map((entry) => entry.value).join(' | ');
      for (const privateValue of [BIRTH.date, BIRTH.time, BIRTH.cityQuery, 'June 15, 1990', 'America/New_York']) {
        assert.equal(bigThreeText.includes(privateValue), false, `big-three PNG leaked ${privateValue}`);
      }
      const bigThreeWordmark = bigThreeRender.text.find((entry) => entry.value === 'ZODIACS · ORG');
      assert.deepEqual(
        { align: bigThreeWordmark?.align, x: bigThreeWordmark?.x, y: bigThreeWordmark?.y },
        { align: 'right', x: 1016, y: 1304 },
        'big-three wordmark must occupy the bottom-right register',
      );
      const bigThreeDownloadAt = bigThreeRender.downloads.find((entry) => entry.filename === 'zodiacs-big-three.png')?.at;
      const bigThreeEventAt = bigThreeRender.events.findLast((entry) => entry.name === 'share_card_downloaded')?.at;
      assert.ok(bigThreeEventAt >= bigThreeDownloadAt,
        'big-three analytics must follow the non-cancelled download');
      assert.ok(bigThreeEventAt - bigThreeStart < 1000,
        `big-three PNG action took ${(bigThreeEventAt - bigThreeStart).toFixed(1)}ms; expected <1000ms`);
      assert.deepEqual((await events(source)).map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'details_link' } },
        { name: 'chart_share', props: { variant: 'full_chart_card' } },
        { name: 'share_card_downloaded', props: { variant: 'full_chart_card' } },
        { name: 'chart_share', props: { variant: 'positions_link' } },
        { name: 'chart_share', props: { variant: 'big_three_card' } },
        { name: 'share_card_downloaded', props: { variant: 'big_three_card' } },
      ], 'each completed card must fire its two approved analytics events exactly once');

      const eventCountBeforeCancel = (await events(source)).length;
      await source.evaluate(() => {
        globalThis.__t17DownloadClicks = [];
        globalThis.__t17ShareCalls = 0;
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(Navigator.prototype, 'share', {
          configurable: true,
          value: () => {
            globalThis.__t17ShareCalls += 1;
            return Promise.reject(new DOMException('cancelled', 'AbortError'));
          },
        });
      });
      await dialog.locator('[data-share-card-action="big-three"]').click();
      await source.waitForFunction(() => {
        const action = document.querySelector('[data-share-card-action="big-three"]');
        return globalThis.__t17ShareCalls === 1
          && action
          && !action.textContent?.includes('Rendering');
      }, null, { timeout: TIMEOUT });
      assert.equal((await events(source)).length, eventCountBeforeCancel,
        'a cancelled share sheet must not fire chart_share or share_card_downloaded');
      assert.equal(await source.evaluate(() => globalThis.__t17DownloadClicks.length), 0,
        'a cancelled share sheet must not fall through to download');
      const cardIconRequests = iconRequests.filter((request) => request.type === 'fetch');
      assert.ok(cardIconRequests.length >= 3, 'share cards must request canonical zodiac art');
      assert.equal(cardIconRequests.every(({ path }) => /^\/assets\/zodiac-icons\/128\/[a-z-]+\.webp$/.test(path)), true,
        'share cards may request only canonical 128px zodiac icons');

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
      assert.equal(receivedText.toLowerCase().includes(`engine v${ENGINE_VERSION}`.toLowerCase()), true,
        'positions result must carry the installed engine version receipt');

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
      transcript.cardFilename = fullCardDownload.suggestedFilename();
      transcript.bigThreeFilename = bigThreeDownload.suggestedFilename();
      transcript.fullCardPng = await pngDimensions(fullCardDownload);
      transcript.bigThreePng = await pngDimensions(bigThreeDownload);
      transcript.fullCardMs = Math.round(fullCardEventAt - fullCardStart);
      transcript.bigThreeMs = Math.round(bigThreeEventAt - bigThreeStart);
      transcript.events = (await events(source)).map(({ name, props }) => ({ name, props }));
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
