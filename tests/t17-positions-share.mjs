import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
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
const SHARE_WING_LINKS = 'a[href="/astrofolio/"], a[href^="/registry/"], a[href^="/sdk/"]';
const ZOOM_EVIDENCE_FILE = fileURLToPath(new URL(
  '../docs/acceptance/phase4-sharing/chart-sheet-33-percent.png',
  import.meta.url,
));

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

async function computeUnknownTimeChart(page) {
  await page.locator('#birth-date').fill('1990-01-01');
  await page.locator('.field__toggle input[type="checkbox"]').check();
  assert.equal(await page.locator('#birth-time').isDisabled(), true,
    'unknown-time calculation must not ask for a hidden exact time');
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

async function persistZoomEvidence(download) {
  if (process.env.T17_SHARE_EVIDENCE !== '1') return null;
  const path = await download.path();
  assert.ok(path, 'chart-sheet evidence needs the completed download');
  await mkdir(dirname(ZOOM_EVIDENCE_FILE), { recursive: true });
  await sharp(path).resize({ width: 594, height: 792, fit: 'fill' }).png().toFile(ZOOM_EVIDENCE_FILE);
  return ZOOM_EVIDENCE_FILE;
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
      globalThis.__t17IconFetches = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = function (input, init) {
        const url = input instanceof Request ? input.url : String(input);
        const path = new URL(url, location.href).pathname;
        if (path.includes('/assets/zodiac-icons/')) globalThis.__t17IconFetches.push(path);
        return originalFetch.call(this, input, init);
      };
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
      // Keep receiver coverage independent from the links copied below: this
      // canonical fixture makes the read-only v2 contract explicit before the
      // dialog exercises its sheet, signature, and link choices.
      const fixtureWire = {
        b: [84, 210, 72, 100, 12, 105, 294, 278, 282, 225, 307, 127],
        a: [166, 74],
        h: 'w',
        v: ENGINE_VERSION,
      };
      const fixtureToken = `2.${Buffer.from(JSON.stringify(fixtureWire)).toString('base64url')}`;
      const positionsUrl = `${baseURL}/birth-chart/#p=${fixtureToken}`;
      const { parsed: positionsParsed, token, wire } = v2Wire(positionsUrl);
      const source = await trackedPage();
      await open(source, `${baseURL}/birth-chart/`);
      assert.equal(await source.locator('html[data-chart-share-receiver]').count(), 0,
        'a fresh calculator visit must not activate fragment-receiver sterility');
      assert.ok(await source.locator(SHARE_WING_LINKS).count() > 0,
        'fresh calculator chrome must not inherit fragment-receiver sterility');
      await computeChart(source);
      await source.evaluate(() => {
        globalThis.__t17Events = [];
        globalThis.zodiacsAnalytics = {
          track(name, props) { globalThis.__t17Events.push({ name, props, at: performance.now() }); },
        };
      });
      await source.waitForFunction(() => {
        const approach = document.querySelector('[data-approach-share]');
        const communication = document.querySelector('[data-communication-share]');
        return approach?.getAttribute('data-card-state') === 'idle'
          && communication?.getAttribute('data-card-state') === 'idle';
      }, null, { timeout: TIMEOUT });
      const contextualPrepared = await source.evaluate(() => {
        const cardText = (title) => {
          const all = globalThis.__t17CanvasText.slice();
          const start = all.findLastIndex((entry) => entry.value === title);
          if (start < 0) return [];
          const relativeEnd = all.slice(start).findIndex((entry) => entry.value === 'ZODIACS · ORG');
          return relativeEnd < 0 ? [] : all.slice(start, start + relativeEnd + 1);
        };
        return {
          approach: cardText('How to approach me'),
          communication: cardText('How I communicate'),
        };
      });
      assert.ok(contextualPrepared.approach.length > 0,
        'the approach image must be prepared before its final share tap');
      assert.ok(contextualPrepared.communication.length > 0,
        'the communication image must be prepared before its final share tap');
      await source.evaluate(() => { globalThis.__t17IconFetches = []; });

      assert.equal(await source.locator('[data-share-card]').count(), 1, 'the prepared chart-sheet action must stay unique');
      assert.equal(await source.locator('[data-share-link]').count(), 0,
        'birth details must not be the result surface’s default link action');
      assert.equal(await source.locator('[data-share-dialog]').count(), 0,
        'dialog must stay unmounted until requested');
      assert.ok(await source.locator(SHARE_WING_LINKS).count() > 0,
        'a fresh computed chart must retain sanctioned records links');

      const preparedSheet = await source.evaluate(() => ({
        text: globalThis.__t17CanvasText.slice(),
        events: globalThis.__t17Events.slice(),
      }));
      const preparedSheetText = preparedSheet.text.map((entry) => entry.value).join(' | ');
      for (const label of [
        'Positions', 'Aspect grid', 'Whole sign · Tropical',
        'Sun', 'Moon', 'Merc', 'Venus', 'Mars', 'Jup', 'Sat', 'Ura', 'Nep', 'Plu',
        'Node', 'S.Node', 'ASC', 'MC',
      ]) {
        assert.equal(preparedSheetText.includes(label), true,
          `the prepared chart sheet must include ${label}`);
      }
      for (const privateValue of [
        BIRTH.date, BIRTH.time, BIRTH.cityQuery, 'June 15, 1990', 'America/New_York',
      ]) {
        assert.equal(preparedSheetText.includes(privateValue), false,
          `the default hidden chart sheet leaked ${privateValue}`);
      }
      assert.equal(preparedSheetText.includes('Standout in my chart'), false,
        'the chart sheet and signature must remain separate compositions');
      const sheetWordmarks = preparedSheet.text.filter((entry) => entry.value === 'zodiacs.org');
      assert.deepEqual(sheetWordmarks.map(({ align, x, y }) => ({ align, x, y })), [
        { align: 'right', x: 1708, y: 92 },
      ], 'chart sheet must carry one small corner wordmark');

      const moreActions = source.locator('[data-chart-more]');
      if (!(await moreActions.getAttribute('open'))) await moreActions.locator('summary').click();
      await source.evaluate(() => {
        const original = HTMLCanvasElement.prototype.toBlob;
        globalThis.__t17RaceOriginalToBlob = original;
        globalThis.__t17DelayShareArtifact = true;
        HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
          if (globalThis.__t17DelayShareArtifact && this.width === 1080 && this.height === 1350) {
            globalThis.__t17DelayShareArtifact = false;
            setTimeout(() => original.call(this, callback, type, quality), 250);
            return;
          }
          return original.call(this, callback, type, quality);
        };
      });
      await moreActions.locator('[data-share-options]').click();
      const dialog = source.locator('[data-share-dialog]');
      await dialog.waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.equal(await dialog.getAttribute('open') !== null, true, 'share dialog must be modal/open');
      assert.equal(await dialog.getAttribute('data-share-mode'), 'full');
      assert.equal(await dialog.locator('[data-hide-birth-details]').count(), 1,
        'the chart sheet must offer an explicit birth-detail privacy toggle');
      assert.equal(await dialog.locator('[data-share-card-action="sheet"]').count(), 1,
        'the tall chart sheet must be the primary image action');
      assert.equal(await dialog.locator('[data-share-card-action="signature"]').count(), 1,
        'English full charts must offer the wired signature card');
      assert.equal(await dialog.locator('[data-positions-link]').count(), 1,
        'the positions-only link must be the primary link action');
      assert.equal(await dialog.locator('[data-preview-link]').count(), 1,
        'the preview link must be an explicit adjacent opt-in');
      assert.equal(await dialog.locator('[data-details-link]').count(), 1,
        'the v1 birth-details link must remain a labeled secondary action');
      assert.equal(
        (await dialog.locator('[data-preview-link]').locator('xpath=../following-sibling::p[1]').innerText()).trim(),
        'The private link keeps positions in your browser; the preview link sends positions — never birth details — to the preview service.',
        'the preview tradeoff must stay one dry sentence',
      );

      await source.waitForFunction(() => (
        document.querySelector('[data-share-card-action="signature"]')?.textContent?.includes('Preparing image')
      ), null, { timeout: TIMEOUT });
      await dialog.locator('[data-hide-birth-details]').uncheck();
      assert.equal(
        (await dialog.locator('[data-chart-image-privacy]').innerText()).trim(),
        'This image includes the birth date, time, and place shown above. It does not include a name, coordinates, or chart link.',
        'privacy copy must disclose the birth details when the toggle is off',
      );
      await source.waitForFunction((birth) => (
        globalThis.__t17CanvasText.some((entry) => entry.value.includes(birth))
        && !document.querySelector('[data-share-card-action="sheet"]')?.disabled
        && !document.querySelector('[data-share-card-action="signature"]')?.disabled
      ), BIRTH.date, { timeout: TIMEOUT });
      const detailedSheetText = await source.evaluate(() => (
        globalThis.__t17CanvasText.map((entry) => entry.value).join(' | ')
      ));
      for (const detail of [BIRTH.date, BIRTH.time, 'New York', 'Whole sign · Tropical']) {
        assert.equal(detailedSheetText.includes(detail), true,
          `birth-details-on sheet must include ${detail}`);
      }
      await dialog.locator('[data-hide-birth-details]').check();
      assert.equal(
        (await dialog.locator('[data-chart-image-privacy]').innerText()).trim(),
        'The image includes chart positions and calculation settings, but not a name, birth date, time, place, coordinates, or chart link.',
        'privacy copy must return to the hidden-details statement',
      );
      await source.waitForFunction(() => (
        !document.querySelector('[data-share-card-action="sheet"]')?.disabled
        && !document.querySelector('[data-share-card-action="signature"]')?.disabled
      ), null, { timeout: TIMEOUT });
      await source.evaluate(() => {
        HTMLCanvasElement.prototype.toBlob = globalThis.__t17RaceOriginalToBlob;
      });

      await dialog.locator('[data-positions-link]').click();
      await source.waitForFunction(() => globalThis.__t17Clipboard.length === 1, null, { timeout: TIMEOUT });
      const sourcePositionsUrl = (await clipboard(source))[0];
      const sourcePositions = v2Wire(sourcePositionsUrl);
      assert.equal(sourcePositions.wire.b.length, 12, 'positions-only link must carry all twelve body longitudes');
      assert.deepEqual(Object.keys(sourcePositions.wire).sort(), ['a', 'b', 'h', 'v']);
      for (const privateValue of [BIRTH.date, BIRTH.time, BIRTH.cityQuery, 'America/New_York']) {
        assert.equal(sourcePositionsUrl.includes(privateValue), false,
          `positions-only link leaked ${privateValue}`);
      }

      await dialog.locator('[data-preview-link]').click();
      await source.waitForFunction(() => globalThis.__t17Clipboard.length === 2, null, { timeout: TIMEOUT });
      const previewUrl = new URL((await clipboard(source))[1]);
      assert.equal(previewUrl.pathname, '/api/og/chart');
      assert.equal(previewUrl.hash, '', 'preview opt-in must put only positions in the query');
      assert.equal(previewUrl.searchParams.get('p'), sourcePositions.token);

      await dialog.locator('[data-details-link]').click();
      await source.waitForFunction(() => globalThis.__t17Clipboard.length === 3, null, { timeout: TIMEOUT });
      const fullUrl = (await clipboard(source))[2];
      const fullParsed = new URL(fullUrl);
      assert.equal(fullParsed.hash.startsWith('#c=1.'), true,
        'the explicitly labeled full-detail link must preserve v1 #c');
      assert.deepEqual((await events(source))
        .filter(({ name }) => name === 'chart_share')
        .map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'positions_link' } },
        { name: 'chart_share', props: { variant: 'positions_link' } },
        { name: 'chart_share', props: { variant: 'details_link' } },
      ], 'link analytics must use only the approved bounded variants');

      const fullCardAction = dialog.locator('[data-share-card-action="sheet"]');
      const signatureCardAction = dialog.locator('[data-share-card-action="signature"]');
      await source.waitForFunction(() => {
        const sheet = document.querySelector('[data-share-card-action="sheet"]');
        const signature = document.querySelector('[data-share-card-action="signature"]');
        return sheet instanceof HTMLButtonElement && !sheet.disabled
          && signature instanceof HTMLButtonElement && !signature.disabled;
      }, null, { timeout: TIMEOUT });
      const dialogPreparedText = await source.evaluate(() => (
        globalThis.__t17CanvasText.map((entry) => entry.value).join(' | ')
      ));
      assert.equal(dialogPreparedText.includes('Standout in my chart'), true,
        'opening the dialog must prepare the sentence-case signature card');
      assert.equal(dialogPreparedText.includes('STANDOUT IN MY CHART'), false,
        'signature kicker must not use a mono-caps eyebrow');

      await source.evaluate(() => {
        globalThis.__t17CanvasText = [];
        globalThis.__t17DownloadClicks = [];
        globalThis.__t17Events = [];
      });
      const fullCardStart = await source.evaluate(() => performance.now());
      const fullCardDownloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await fullCardAction.click();
      const fullCardDownload = await fullCardDownloadPromise;
      await source.waitForFunction(() => globalThis.__t17Events.length === 2, null, { timeout: TIMEOUT });
      assert.equal(fullCardDownload.suggestedFilename(), 'zodiacs-chart-sheet.png',
        'chart-sheet filename must contain no birth input');
      assert.deepEqual(await pngDimensions(fullCardDownload), { width: 1800, height: 2400 },
        'chart sheet must have a 1,800px short edge');
      const zoomEvidence = await persistZoomEvidence(fullCardDownload);
      const fullCardRender = await source.evaluate(() => ({
        canvasCount: globalThis.__t17CanvasText.length,
        downloads: globalThis.__t17DownloadClicks.slice(),
        events: globalThis.__t17Events.slice(),
      }));
      assert.equal(fullCardRender.canvasCount, 0,
        'the final chart-sheet tap must save the prepared image without rendering again');
      const fullCardDownloadAt = fullCardRender.downloads
        .find((entry) => entry.filename === 'zodiacs-chart-sheet.png')?.at;
      const fullCardEventAt = fullCardRender.events
        .findLast((entry) => entry.name === 'share_card_downloaded')?.at;
      assert.ok(fullCardDownloadAt >= fullCardStart, 'chart-sheet download must start after the action');
      assert.ok(fullCardEventAt >= fullCardDownloadAt,
        'share_card_downloaded must fire only after the non-cancelled chart-sheet download starts');
      assert.ok(fullCardEventAt - fullCardStart < 1000,
        `chart-sheet action took ${(fullCardEventAt - fullCardStart).toFixed(1)}ms; expected <1000ms`);
      assert.deepEqual((await events(source)).map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'full_chart_card' } },
        { name: 'share_card_downloaded', props: { variant: 'full_chart_card' } },
      ]);

      const signatureDownloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await signatureCardAction.click();
      const signatureDownload = await signatureDownloadPromise;
      await source.waitForFunction(() => globalThis.__t17Events.length === 4, null, { timeout: TIMEOUT });
      assert.equal(signatureDownload.suggestedFilename(), 'zodiacs-chart-signature.png');
      assert.deepEqual(await pngDimensions(signatureDownload), { width: 1080, height: 1350 });
      assert.deepEqual((await events(source)).slice(-2).map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'signature_card' } },
        { name: 'share_card_downloaded', props: { variant: 'signature_card' } },
      ]);

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
      await fullCardAction.click();
      await source.waitForFunction(() => (
        globalThis.__t17ShareCalls === 1
        && !document.querySelector('[data-share-card-action="sheet"]')?.disabled
      ), null, { timeout: TIMEOUT });
      assert.equal((await events(source)).length, eventCountBeforeCancel,
        'a cancelled share sheet must not fire chart_share or share_card_downloaded');
      assert.equal(await source.evaluate(() => globalThis.__t17DownloadClicks.length), 0,
        'a cancelled share sheet must not fall through to download');
      const cardIconRequests = await source.evaluate(() => globalThis.__t17IconFetches.slice());
      // A signature may feature one to three distinct signs, followed by the
      // three Big Three discs. The fixture currently selects a one-sign
      // dignity signature, so four calls is the contractual floor.
      assert.ok(cardIconRequests.length >= 4,
        'the prepared signature card must request canonical zodiac art');
      assert.equal(cardIconRequests.every((path) => /^\/assets\/zodiac-icons\/128\/[a-z-]+\.webp$/.test(path)), true,
        'share cards may request only canonical 128px zodiac icons');

      await dialog.locator('.calc-share-dialog__close').click();
      await dialog.waitFor({ state: 'detached', timeout: TIMEOUT });

      const approachButton = source.locator('[data-approach-share]');
      assert.equal(await approachButton.count(), 1,
        'the approach insight must expose one contextual share action');
      assert.equal(await approachButton.getAttribute('data-card-state'), 'idle',
        'the approach image must be ready before its action is enabled');
      assert.equal((await approachButton.innerText()).includes('Share how to approach me'), true,
        'the approach action must explain who the shared guidance is for');
      assert.equal(await source.locator('.calc__approach-part').count(), 4,
        'the approach insight must cover Rising, Mercury, Moon, and Mars');
      assert.equal(await source.evaluate(() => {
        const approach = document.querySelector('[data-approach-read]');
        const communication = document.querySelector('.calc__comm');
        return Boolean(approach && communication
          && (approach.compareDocumentPosition(communication) & Node.DOCUMENT_POSITION_FOLLOWING));
      }), true, 'how to approach you must appear before how you communicate');

      const approachExpected = await source.locator('.calc__approach').evaluate((section) => {
        const firstSentence = (value) => {
          const text = value.trim();
          const match = /[.!?](?:[\u201d"']?)(?=\s|$)/.exec(text);
          return match ? text.slice(0, match.index + match[0].length).trim() : text;
        };
        return Array.from(section.querySelectorAll('.calc__approach-part')).map((part) => ({
          body: part.querySelector('.mono--label')?.textContent?.trim() ?? '',
          role: part.querySelector('h3')?.textContent?.trim() ?? '',
          sign: part.querySelector('.calc__approach-sign > span')?.textContent?.trim() ?? '',
          reading: firstSentence(part.querySelector(':scope > p')?.textContent ?? ''),
        }));
      });
      assert.deepEqual(approachExpected.map(({ body }) => body), ['Rising', 'Mercury', 'Moon', 'Mars']);
      const approachValues = contextualPrepared.approach.map((entry) => entry.value);
      const approachText = approachValues.join(' | ');
      const normalizedApproachText = approachValues.join(' ').replace(/\s+/g, ' ').toLowerCase();
      assert.equal(approachValues.filter((value) => value === 'How to approach me').length, 1,
        'approach PNG must carry its audience-facing title exactly once');
      for (const part of approachExpected) {
        assert.equal(normalizedApproachText.includes(`${part.body} · ${part.role}`.toLowerCase()), true,
          `approach PNG must label ${part.body}'s role`);
        assert.equal(normalizedApproachText.includes(part.sign.toLowerCase()), true,
          `approach PNG must name the ${part.body} sign`);
        const readingLead = part.reading.split(/\s+/).slice(0, 5).join(' ').toLowerCase();
        assert.equal(normalizedApproachText.includes(readingLead), true,
          `approach PNG must include concise ${part.body} guidance`);
      }
      for (const privateValue of [
        BIRTH.date,
        BIRTH.time,
        BIRTH.cityQuery,
        'June 15, 1990',
        'America/New_York',
        '/birth-chart/',
        'http://',
        'https://',
      ]) {
        assert.equal(approachText.includes(privateValue), false,
          `approach PNG leaked ${privateValue}`);
      }
      assert.equal(approachText.includes(`Engine ${ENGINE_VERSION}`), true,
        'approach PNG must carry only its engine receipt');
      const approachWordmark = contextualPrepared.approach.find((entry) => entry.value === 'ZODIACS · ORG');
      assert.deepEqual(
        { align: approachWordmark?.align, x: approachWordmark?.x, y: approachWordmark?.y },
        { align: 'right', x: 1016, y: 1304 },
        'approach wordmark must occupy the bottom-right register',
      );

      await source.evaluate(() => {
        globalThis.__t17CanvasText = [];
        globalThis.__t17DownloadClicks = [];
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => false });
      });
      const approachEventStart = (await events(source)).length;
      const approachTapStart = await source.evaluate(() => performance.now());
      const approachDownloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await approachButton.click();
      const approachDownload = await approachDownloadPromise;
      await source.waitForFunction((start) => globalThis.__t17Events.length === start + 2,
        approachEventStart, { timeout: TIMEOUT });
      assert.equal(approachDownload.suggestedFilename(), 'zodiacs-how-to-approach-me.png',
        'the approach filename must contain no birth input');
      assert.deepEqual(await pngDimensions(approachDownload), { width: 1080, height: 1350 },
        'approach card must export at 1080×1350');
      const approachSave = await source.evaluate(() => ({
        canvasCount: globalThis.__t17CanvasText.length,
        downloads: globalThis.__t17DownloadClicks.slice(),
        events: globalThis.__t17Events.slice(),
      }));
      const approachDownloadAt = approachSave.downloads
        .find((entry) => entry.filename === 'zodiacs-how-to-approach-me.png')?.at;
      assert.equal(approachSave.canvasCount, 0,
        'the final approach tap must save the prepared card without rendering again');
      assert.ok(approachDownloadAt >= approachTapStart && approachDownloadAt - approachTapStart < 1000,
        'the prepared approach download must start directly from the final tap');
      assert.deepEqual(
        approachSave.events.slice(approachEventStart).map(({ name, props }) => ({ name, props })),
        [
          { name: 'chart_share', props: { variant: 'approach_card' } },
          { name: 'share_card_downloaded', props: { variant: 'approach_card' } },
        ],
        'approach analytics must contain only its approved, privacy-safe variant',
      );

      const communicationButton = source.locator('[data-communication-share]');
      assert.equal(await communicationButton.count(), 1,
        'the communication insight must expose one contextual share action');
      assert.equal(await communicationButton.getAttribute('data-card-state'), 'idle',
        'the communication image must be ready before its action is enabled');
      assert.equal((await communicationButton.innerText()).includes('Share this reading'), true,
        'the contextual action must explain what is being shared');
      assert.equal(await source.locator('.calc__comm-part').count(), 3,
        'the shareable communication insight must contain Mercury, Moon, and Mars cards');

      const communicationExpected = await source.locator('.calc__comm').evaluate((section) => {
        const firstSentence = (value) => {
          const text = value.trim();
          const match = /[.!?](?:[\u201d"']?)(?=\s|$)/.exec(text);
          return match ? text.slice(0, match.index + match[0].length).trim() : text;
        };
        const parts = Array.from(section.querySelectorAll('.calc__comm-part')).map((part) => ({
          body: part.querySelector('.mono--label')?.textContent?.trim() ?? '',
          role: part.querySelector('h3')?.textContent?.trim() ?? '',
          sign: part.querySelector('.calc__comm-sign')?.textContent?.trim() ?? '',
          reading: firstSentence(part.querySelector(':scope > p')?.textContent ?? ''),
        }));
        const aspects = Array.from(section.querySelectorAll('.calc__comm-aspects li')).map((item) => {
          const label = item.querySelector('.calc__comm-aspect-label');
          const orb = label?.querySelector('small')?.textContent?.trim() ?? '';
          return (label?.textContent ?? '').replace(orb, '').replace(/\s+/g, ' ').trim();
        });
        return { parts, aspects };
      });
      assert.deepEqual(communicationExpected.parts.map(({ body }) => body), ['Mercury', 'Moon', 'Mars']);
      assert.deepEqual(communicationExpected.parts.map(({ role }) => role), [
        'How you phrase things',
        'What helps you feel heard',
        'How you handle friction',
      ]);

      await source.evaluate(() => {
        globalThis.__t17CanvasText = [];
        globalThis.__t17DownloadClicks = [];
        globalThis.__t17ShareCalls = 0;
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => false });
      });
      const communicationEventStart = (await events(source)).length;
      const communicationTapStart = await source.evaluate(() => performance.now());
      const communicationDownloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await communicationButton.click();
      const communicationDownload = await communicationDownloadPromise;
      await source.waitForFunction((start) => globalThis.__t17Events.length === start + 2,
        communicationEventStart, { timeout: TIMEOUT });
      assert.equal(communicationDownload.suggestedFilename(), 'zodiacs-communication.png',
        'the communication filename must contain no birth input');
      assert.deepEqual(await pngDimensions(communicationDownload), { width: 1080, height: 1350 },
        'communication card must export at 1080×1350');

      const communicationRender = await source.evaluate(() => ({
        canvasCount: globalThis.__t17CanvasText.length,
        downloads: globalThis.__t17DownloadClicks.slice(),
        events: globalThis.__t17Events.slice(),
      }));
      assert.equal(communicationRender.canvasCount, 0,
        'the final communication tap must save the prepared card without rendering again');
      const communicationDownloadAt = communicationRender.downloads
        .find((entry) => entry.filename === 'zodiacs-communication.png')?.at;
      assert.ok(communicationDownloadAt >= communicationTapStart
        && communicationDownloadAt - communicationTapStart < 1000,
      'the prepared communication download must start directly from the final tap');
      const communicationValues = contextualPrepared.communication.map((entry) => entry.value);
      const communicationText = communicationValues.join(' | ');
      const normalizedCommunicationText = communicationValues.join(' ').replace(/\s+/g, ' ').toLowerCase();
      assert.equal(communicationValues.filter((value) => value === 'How I communicate').length, 1,
        'communication PNG must carry its personal title exactly once');
      for (const part of communicationExpected.parts) {
        assert.equal(communicationText.includes(`${part.body.toUpperCase()} · ${part.role.toUpperCase()}`), true,
          `communication PNG must label ${part.body}'s role`);
        assert.equal(communicationText.includes(part.sign), true,
          `communication PNG must name the ${part.body} sign`);
        const readingLead = part.reading.split(/\s+/).slice(0, 5).join(' ').toLowerCase();
        assert.equal(normalizedCommunicationText.includes(readingLead), true,
          `communication PNG must include concise ${part.body} reading copy`);
      }
      assert.equal(communicationValues.filter((value) => value === 'A STRONG MERCURY CONNECTION').length,
        communicationExpected.aspects.length > 0 ? 1 : 0,
        'communication PNG must reserve at most one slot for a Mercury aspect');
      if (communicationExpected.aspects.length > 0) {
        assert.equal(normalizedCommunicationText.includes(`mercury ${communicationExpected.aspects[0].toLowerCase()}`), true,
          'communication PNG must use the tightest Mercury aspect');
        for (const aspect of communicationExpected.aspects.slice(1)) {
          assert.equal(normalizedCommunicationText.includes(`mercury ${aspect.toLowerCase()} ·`), false,
            `communication PNG must omit the looser Mercury ${aspect} aspect`);
        }
      }
      for (const privateValue of [
        BIRTH.date,
        BIRTH.time,
        BIRTH.cityQuery,
        'June 15, 1990',
        'America/New_York',
        '/birth-chart/',
        'http://',
        'https://',
      ]) {
        assert.equal(communicationText.includes(privateValue), false,
          `communication PNG leaked ${privateValue}`);
      }
      assert.equal(communicationText.includes(`Engine ${ENGINE_VERSION}`), true,
        'communication PNG must carry only its engine receipt');
      const communicationWordmark = contextualPrepared.communication
        .find((entry) => entry.value === 'ZODIACS · ORG');
      assert.deepEqual(
        { align: communicationWordmark?.align, x: communicationWordmark?.x, y: communicationWordmark?.y },
        { align: 'right', x: 1016, y: 1304 },
        'communication wordmark must occupy the bottom-right register',
      );
      assert.deepEqual(
        communicationRender.events.slice(communicationEventStart).map(({ name, props }) => ({ name, props })),
        [
          { name: 'chart_share', props: { variant: 'communication_card' } },
          { name: 'share_card_downloaded', props: { variant: 'communication_card' } },
        ],
        'communication analytics must contain only its approved, privacy-safe variant',
      );

      const communicationEventsBeforeCancel = (await events(source)).length;
      await source.evaluate(() => {
        globalThis.__t17CanvasText = [];
        globalThis.__t17DownloadClicks = [];
        globalThis.__t17ShareCalls = 0;
        globalThis.__t17ShareAt = null;
        globalThis.__t17ShareCanvasCount = null;
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(Navigator.prototype, 'share', {
          configurable: true,
          value: () => {
            globalThis.__t17ShareCalls += 1;
            globalThis.__t17ShareAt = performance.now();
            globalThis.__t17ShareCanvasCount = globalThis.__t17CanvasText.length;
            return Promise.reject(new DOMException('cancelled', 'AbortError'));
          },
        });
      });
      const communicationNativeTapStart = await source.evaluate(() => performance.now());
      await communicationButton.click();
      await source.waitForFunction(() => {
        const action = document.querySelector('[data-communication-share]');
        return globalThis.__t17ShareCalls === 1
          && action
          && action.getAttribute('data-card-state') === 'idle';
      }, null, { timeout: TIMEOUT });
      const communicationNative = await source.evaluate(() => ({
        at: globalThis.__t17ShareAt,
        canvasCount: globalThis.__t17ShareCanvasCount,
      }));
      assert.ok(communicationNative.at >= communicationNativeTapStart
        && communicationNative.at - communicationNativeTapStart < 1000,
      'navigator.share must be invoked directly by the final communication tap');
      assert.equal(communicationNative.canvasCount, 0,
        'the native communication share must not await a click-time canvas render');
      assert.equal((await events(source)).length, communicationEventsBeforeCancel,
        'a cancelled communication share sheet must fire no analytics');
      assert.equal(await source.evaluate(() => globalThis.__t17DownloadClicks.length), 0,
        'a cancelled communication share sheet must not fall through to download');
      assert.equal((await communicationButton.innerText()).includes('Share this reading'), true,
        'a cancelled communication share must return the contextual action to idle');

      const preparationFailure = await trackedPage();
      await preparationFailure.setViewportSize({ width: 390, height: 844 });
      await open(preparationFailure, `${baseURL}/birth-chart/`);
      await preparationFailure.evaluate(() => {
        globalThis.__t17ExpectedErrors = [];
        globalThis.__t17OriginalConsoleError = console.error;
        console.error = (...values) => {
          globalThis.__t17ExpectedErrors.push(values.map(String).join(' '));
        };
        globalThis.__t17OriginalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (callback) { callback(null); };
        globalThis.zodiacsAnalytics = {
          track(name, props) { globalThis.__t17Events.push({ name, props, at: performance.now() }); },
        };
      });
      await computeChart(preparationFailure);
      await preparationFailure.evaluate(() => { globalThis.__t17Events = []; });
      const failureFirstReading = preparationFailure.locator('[data-first-reading-start]');
      await failureFirstReading.waitFor({ state: 'visible', timeout: TIMEOUT });
      await failureFirstReading.click();
      const failureTourShare = preparationFailure.locator('[data-tour-share]');
      await failureTourShare.waitFor({ state: 'visible', timeout: TIMEOUT });
      await preparationFailure.waitForFunction(() => {
        const action = document.querySelector('[data-tour-share]');
        return globalThis.__t17ExpectedErrors.length > 0 && action && !action.disabled;
      }, null, { timeout: TIMEOUT });
      assert.equal(await failureTourShare.isDisabled(), false,
        'after image preparation fails, the tour share action must open the surviving link options');
      await failureTourShare.click();
      const failureDialog = preparationFailure.locator('[data-share-dialog]');
      await failureDialog.waitFor({ state: 'visible', timeout: TIMEOUT });
      await failureDialog.locator('[data-positions-link]').click();
      await failureDialog.locator('[data-preview-link]').click();
      await failureDialog.locator('[data-details-link]').click();
      await preparationFailure.waitForFunction(() => globalThis.__t17Clipboard.length === 3, null, { timeout: TIMEOUT });
      const failureLinks = await clipboard(preparationFailure);
      assert.ok(failureLinks[0].includes('#p=2.'),
        'positions-only link must remain usable when every image encoder fails');
      assert.equal(new URL(failureLinks[1]).pathname, '/api/og/chart',
        'preview link must remain usable when every image encoder fails');
      assert.ok(new URL(failureLinks[2]).hash.startsWith('#c=1.'),
        'explicit birth-details link must remain usable when every image encoder fails');
      await preparationFailure.waitForFunction(() => (
        document.querySelector('[data-share-card-action="sheet"]')?.disabled
        && document.querySelector('[data-share-card-action="signature"]')?.disabled
      ), null, { timeout: TIMEOUT });
      assert.match(await failureDialog.locator('[role="alert"]').innerText(), /couldn.t (?:draw the card|create that image)/i,
        'failed image choices must explain their own unavailability');
      const communicationErrorButton = preparationFailure.locator('[data-communication-share]');
      await preparationFailure.waitForFunction(() => {
        const action = document.querySelector('[data-communication-share]');
        return action?.getAttribute('data-card-state') === 'error';
      }, null, { timeout: TIMEOUT });
      assert.equal(await communicationErrorButton.isDisabled(), true,
        'a failed communication preparation must leave an unavailable action disabled');
      assert.equal((await communicationErrorButton.innerText()).includes('Card unavailable'), true,
        'a failed communication preparation must explain that the card is unavailable');
      const communicationError = preparationFailure.locator('.calc__comm [role="alert"]');
      await communicationError.waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.match(await communicationError.innerText(), /couldn.t create that image/i);
      assert.deepEqual((await events(preparationFailure))
        .filter(({ name }) => name === 'chart_share')
        .map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'positions_link' } },
        { name: 'chart_share', props: { variant: 'positions_link' } },
        { name: 'chart_share', props: { variant: 'details_link' } },
      ], 'failed image rendering may record only the three successful bounded link actions');
      assert.equal(await preparationFailure.evaluate(() => globalThis.__t17DownloadClicks.length), 0,
        'a failed pre-render must not start a download');
      assert.match(
        await preparationFailure.evaluate(() => globalThis.__t17ExpectedErrors.join(' ')),
        /png encode failed/i,
        'the communication preparation failure must retain the rendering error for diagnostics',
      );
      await failureDialog.locator('.calc-share-dialog__close').click();
      await failureDialog.waitFor({ state: 'detached', timeout: TIMEOUT });
      await preparationFailure.locator('[data-tour-exit]').click();
      const failureMore = preparationFailure.locator('[data-chart-more]');
      if (!(await failureMore.getAttribute('open'))) await failureMore.locator('summary').click();
      assert.equal(await failureMore.locator('[data-share-options]').isDisabled(), false,
        'image preparation failure must not disable link sharing options');
      await preparationFailure.evaluate(() => {
        HTMLCanvasElement.prototype.toBlob = globalThis.__t17OriginalToBlob;
        console.error = globalThis.__t17OriginalConsoleError;
      });
      await preparationFailure.close();

      const received = await trackedPage();
      await open(received, positionsUrl);
      const positions = received.locator('[data-positions-only]');
      await positions.waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.equal(await received.locator('html[data-chart-share-receiver]').count(), 1,
        'a #p receiver must mark its boundary before shared chrome parses');
      assert.equal(await received.locator(SHARE_WING_LINKS).count(), 0,
        'a #p receiver must be Registry-sterile');
      assert.equal(new URL(received.url()).hash, '', 'successful #p fragment must be consumed and stripped');
      assert.equal((await positions.locator('.notice').innerText()).trim(), 'Positions only — birth details not included.');
      assert.equal(await positions.locator('svg.wheel').count(), 1, 'positions result keeps a static wheel');
      assert.equal(await positions.locator('tbody tr').count(), 14, 'twelve bodies plus encoded ASC/MC must be shown');
      assert.equal(await positions.locator('.xplr, [data-entity], [data-share-card], [data-share-link]').count(), 0,
        'positions result must remain read-only without share/save surfaces');
      assert.ok(await positions.locator('.calc__positions-aspects li').count() > 0,
        'positions receiver must recompute readable major aspects');
      const receivedHeadings = await positions.locator('th').allTextContents();
      assert.equal(receivedHeadings.some((label) => /house/i.test(label)), true,
        'positions receiver must derive whole-sign houses from the shared Ascendant');
      assert.equal(receivedHeadings.some((label) => /motion/i.test(label)), false,
        'positions receiver must not invent motion state');
      assert.equal(await positions.locator('[data-reconstructed-houses]').count(), 1,
        'receiver must disclose that shared houses were reconstructed as whole sign');
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
      assert.equal(await full.locator('html[data-chart-share-receiver]').count(), 1,
        'a #c receiver must mark its boundary before shared chrome parses');
      assert.equal(await full.locator(SHARE_WING_LINKS).count(), 0,
        'a #c receiver must suppress both shared chrome and the post-chart record bridge');
      assert.equal(new URL(full.url()).hash, '', 'legacy #c fragment must still be stripped after compute');
      assert.equal(await full.locator('#birth-date').inputValue(), BIRTH.date, 'legacy #c must still prefill date');
      assert.equal(await full.locator('#birth-time').inputValue(), BIRTH.time, 'legacy #c must still prefill time');
      assert.match(await full.locator('.notice').allInnerTexts().then((items) => items.join(' ')), /birth details came in the link/i);
      assert.equal(await full.locator('[data-share-card]').count(), 1);
      assert.equal(await full.locator('[data-share-link]').count(), 0,
        'the birth-details link must stay inside the explicit share dialog');

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

      const partialShareModes = [];
      for (const fixture of [
        {
          mode: 'moon', route: '/moon-sign/', filename: 'zodiacs-moon-sign.png',
          title: 'Moon sign card', action: 'Share my Moon sign',
        },
        {
          mode: 'rising', route: '/rising-sign/', filename: 'zodiacs-rising-sign.png',
          title: 'Rising sign card', action: 'Share my Rising sign',
        },
      ]) {
        const partial = await trackedPage();
        await open(partial, `${baseURL}${fixture.route}`);
        await computeChart(partial);
        const directShare = partial.locator('[data-share-placement]');
        await partial.waitForFunction(() => {
          const action = document.querySelector('[data-share-placement]');
          return action instanceof HTMLButtonElement && !action.disabled;
        }, null, { timeout: TIMEOUT });
        assert.equal(await directShare.count(), 1,
          `${fixture.mode} result must expose one prepared share affordance`);
        await partial.locator('[data-share-options]').click();
        const partialDialog = partial.locator('[data-share-dialog]');
        await partialDialog.waitFor({ state: 'visible', timeout: TIMEOUT });
        assert.equal(await partialDialog.getAttribute('data-share-mode'), fixture.mode);
        assert.equal(await partialDialog.locator('[data-share-card-action="placement"]').count(), 1,
          `${fixture.mode} dialog must use the single-placement image`);
        assert.equal(await partialDialog.locator('[data-share-primary="placement"] h3').innerText(), fixture.title,
          `${fixture.mode} dialog must name the placement card it previews`);
        assert.equal(await partialDialog.locator('[data-share-placement-preview]').count(), 1,
          `${fixture.mode} dialog must preview one placement instead of the full wheel`);
        assert.match(await partialDialog.locator('[data-share-card-action="placement"]').innerText(), new RegExp(fixture.action),
          `${fixture.mode} dialog must use a placement-specific image action`);
        assert.equal((await partialDialog.innerText()).includes('Share chart sheet'), false,
          `${fixture.mode} dialog must not label a one-placement image as a chart sheet`);
        assert.equal((await partialDialog.innerText()).includes('Share the big three'), false,
          `${fixture.mode} dialog must not label a one-placement image as the big three`);
        assert.equal(await partialDialog.locator('[data-positions-link]').count(), 1,
          `${fixture.mode} dialog must include the positions-only link`);
        assert.equal(await partialDialog.locator('[data-details-link]').count(), 0,
          `${fixture.mode} dialog must not offer the full birth-details link`);
        await partial.waitForFunction(() => {
          const action = document.querySelector('[data-share-card-action="placement"]');
          return action instanceof HTMLButtonElement && !action.disabled;
        }, null, { timeout: TIMEOUT });
        const partialDownloadPromise = partial.waitForEvent('download', { timeout: TIMEOUT });
        await partialDialog.locator('[data-share-card-action="placement"]').click();
        const partialDownload = await partialDownloadPromise;
        assert.equal(partialDownload.suggestedFilename(), fixture.filename);
        assert.deepEqual(await pngDimensions(partialDownload), { width: 1080, height: 1350 });
        await partialDialog.locator('[data-positions-link]').click();
        await partial.waitForFunction(() => globalThis.__t17Clipboard.length === 1, null, { timeout: TIMEOUT });
        assert.equal(v2Wire((await clipboard(partial))[0]).wire.b.length, 12,
          `${fixture.mode} positions link must round-trip the chart positions`);
        partialShareModes.push(fixture.mode);
        await partial.waitForLoadState('networkidle');
        await partial.close();
      }

      const unknownMoon = await trackedPage();
      await open(unknownMoon, `${baseURL}/moon-sign/`);
      await unknownMoon.evaluate(() => { globalThis.__t17CanvasText = []; });
      await computeUnknownTimeChart(unknownMoon);
      await unknownMoon.waitForFunction(() => {
        const action = document.querySelector('[data-share-placement]');
        return action instanceof HTMLButtonElement && !action.disabled;
      }, null, { timeout: TIMEOUT });
      const unknownMoonCardText = await unknownMoon.evaluate(() => (
        globalThis.__t17CanvasText.map((entry) => entry.value).join(' | ')
      ));
      assert.equal(unknownMoonCardText.includes('12:00 reference · Birth time unknown'), true,
        'a no-time Moon image must identify its noon reference');
      assert.equal(unknownMoonCardText.includes('My Moon may change signs without an exact birth time.'), true,
        'a Moon-boundary image must carry the same ambiguity warning as the result');
      assert.match(
        (await unknownMoon.locator('.notice').allInnerTexts()).join(' '),
        /Moon also changed signs that day/i,
        'the no-time result must keep the Moon-boundary explanation visible',
      );
      await unknownMoon.locator('[data-share-options]').click();
      const unknownMoonDialog = unknownMoon.locator('[data-share-dialog]');
      await unknownMoonDialog.waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.equal(await unknownMoonDialog.locator('[data-share-primary="placement"] h3').innerText(), 'Moon sign card');
      assert.match(await unknownMoonDialog.locator('[data-share-card-action="placement"]').innerText(), /Share my Moon sign/);
      await unknownMoon.close();

      // The computed chart sheet is prepared before the mobile action, so one
      // tap reaches native file sharing without an intermediate dialog.
      const mobileContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme: 'dark',
        locale: 'en-US',
        timezoneId: 'UTC',
        reducedMotion: 'reduce',
      });
      await mobileContext.addInitScript(() => {
        globalThis.__mobileSharePayload = null;
        globalThis.__mobileShareCalls = 0;
        Object.defineProperty(Navigator.prototype, 'canShare', {
          configurable: true,
          value: (payload) => Array.isArray(payload?.files) && payload.files.length === 1,
        });
        Object.defineProperty(Navigator.prototype, 'share', {
          configurable: true,
          value: (payload) => {
            globalThis.__mobileShareCalls += 1;
            globalThis.__mobileSharePayload = {
              title: payload?.title ?? null,
              text: payload?.text ?? null,
              url: payload?.url ?? null,
              files: Array.from(payload?.files ?? []).map((file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
              })),
              at: performance.now(),
            };
            return Promise.resolve();
          },
        });
      });
      const mobile = await mobileContext.newPage();
      mobile.on('pageerror', (error) => errors.push(`mobile-pageerror:${error.message}`));
      mobile.on('console', (message) => {
        if (message.type() === 'error') errors.push(`mobile-console:${message.text()}`);
      });
      await open(mobile, `${baseURL}/birth-chart/`);
      await computeChart(mobile);
      await mobile.waitForFunction(() => {
        const action = document.querySelector('[data-share-card]');
        return action instanceof HTMLButtonElement && !action.disabled;
      }, null, { timeout: TIMEOUT });
      const mobileTapStart = await mobile.evaluate(() => performance.now());
      await mobile.locator('[data-share-card]').click();
      await mobile.waitForFunction(() => globalThis.__mobileShareCalls === 1, null, { timeout: TIMEOUT });
      const mobilePayload = await mobile.evaluate(() => globalThis.__mobileSharePayload);
      assert.equal(mobilePayload.files.length, 1, 'one mobile tap must share one prepared file');
      assert.deepEqual(mobilePayload.files[0], {
        name: 'zodiacs-chart-sheet.png',
        type: 'image/png',
        size: mobilePayload.files[0].size,
      });
      assert.ok(mobilePayload.files[0].size > 0, 'the prepared mobile PNG must not be empty');
      assert.equal(mobilePayload.url, null, 'mobile chart sharing must not leak a chart URL');
      assert.ok(mobilePayload.at >= mobileTapStart && mobilePayload.at - mobileTapStart < 1000,
        'the prepared native file share must be invoked directly by the first tap');

      const mobileMore = mobile.locator('[data-chart-more]');
      if (!(await mobileMore.getAttribute('open'))) await mobileMore.locator('summary').click();
      await mobileMore.locator('[data-share-options]').click();
      const mobileSheet = mobile.locator('[data-share-dialog]');
      await mobileSheet.waitFor({ state: 'visible', timeout: TIMEOUT });
      const mobileSheetBox = await mobileSheet.boundingBox();
      assert.ok(mobileSheetBox && Math.abs(mobileSheetBox.y + mobileSheetBox.height - 844) < 2,
        `mobile share sheet must dock to the viewport bottom: ${JSON.stringify(mobileSheetBox)}`);
      assert.ok(mobileSheetBox.height < 844 && mobileSheetBox.width === 390,
        'mobile share sheet must fit the viewport without becoming a blank full-screen layer');
      await mobileContext.close();

      transcript.fullFragment = fullParsed.hash.slice(0, 5);
      transcript.positionsFragment = positionsParsed.hash.slice(0, 5);
      transcript.positionsWireKeys = Object.keys(wire).sort();
      transcript.positionsRows = await positions.locator('tbody tr').count();
      transcript.cardFilename = fullCardDownload.suggestedFilename();
      transcript.approachFilename = approachDownload.suggestedFilename();
      transcript.communicationFilename = communicationDownload.suggestedFilename();
      transcript.fullCardPng = await pngDimensions(fullCardDownload);
      transcript.approachPng = await pngDimensions(approachDownload);
      transcript.communicationPng = await pngDimensions(communicationDownload);
      transcript.fullCardMs = Math.round(fullCardEventAt - fullCardStart);
      transcript.events = (await events(source)).map(({ name, props }) => ({ name, props }));
      transcript.hashesStripped = { positions: true, full: true, ambiguous: true };
      transcript.partialShareModes = partialShareModes;
      transcript.mobileNativeShare = 'one-tap-prepared-chart-sheet';
      transcript.contextualNativeShare = 'prepared-communication-image';
      transcript.zoomEvidence = zoomEvidence;
    } finally {
      await context.close();
    }
  });
} finally {
  await browser.close();
}

assert.deepEqual(errors, [], 'T-17 browser flow emitted errors');
process.stdout.write(`${JSON.stringify(transcript, null, 2)}\n`);
