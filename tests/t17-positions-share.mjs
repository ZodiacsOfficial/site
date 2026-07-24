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
      // The positions-only codec remains a supported receiver, but the chart
      // share sheet now intentionally offers one full-chart image only. Keep
      // receiver coverage with a canonical fixture rather than surfacing a
      // second sharing choice in that dialog.
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

      const moreActions = source.locator('[data-chart-more]');
      if (!(await moreActions.getAttribute('open'))) await moreActions.locator('summary').click();
      await moreActions.locator('[data-share-link]').click();
      await source.waitForFunction(() => globalThis.__t17Clipboard.length === 1, null, { timeout: TIMEOUT });
      const fullUrl = (await clipboard(source))[0];
      const fullParsed = new URL(fullUrl);
      assert.equal(fullParsed.hash.startsWith('#c=1.'), true, 'the explicit full-detail link must preserve v1 #c');

      await source.evaluate(() => {
        globalThis.__t17CanvasText = [];
        globalThis.__t17DownloadClicks = [];
        globalThis.__t17Events = [];
      });
      await source.locator('[data-share-card]').click();
      const dialog = source.locator('[data-share-dialog]');
      await dialog.waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.equal(await dialog.getAttribute('open') !== null, true, 'share dialog must be modal/open');
      assert.equal(await dialog.getAttribute('data-share-mode'), 'chart-and-big-three');
      assert.equal(await dialog.locator('[data-hide-birth-details]').count(), 0,
        'the share sheet must not expose the retired birth-detail toggle');
      assert.equal(await dialog.locator('[data-share-options]').count(), 0,
        'the share sheet must not depend on a second options opener');
      assert.equal(await dialog.locator('[data-share-signature]').count(), 0,
        'the share sheet must not offer a chart-signature preview');
      assert.equal(await dialog.locator('[data-share-card-action="signature"]').count(), 0,
        'the share sheet must not offer a chart-signature card');
      assert.equal(await dialog.locator('[data-share-card-action="big-three"]').count(), 1,
        'the share sheet must offer one Big Three card beside the full chart');
      assert.equal(await dialog.locator('[data-share-link]').count(), 0,
        'the image sheet must not mix in a positions-only link choice');

      const fullCardAction = dialog.locator('[data-share-card-action="full"]');
      const bigThreeCardAction = dialog.locator('[data-share-card-action="big-three"]');
      await source.waitForFunction(() => {
        const full = document.querySelector('[data-share-card-action="full"]');
        const bigThree = document.querySelector('[data-share-card-action="big-three"]');
        return full instanceof HTMLButtonElement && !full.disabled
          && bigThree instanceof HTMLButtonElement && !bigThree.disabled;
      }, null, { timeout: TIMEOUT });
      assert.equal(await source.evaluate(() => globalThis.__t17Events.length), 0,
        'pre-rendering the full chart must not count as a share');
      const preparedFull = await source.evaluate(() => ({
        text: globalThis.__t17CanvasText.slice(),
        at: performance.now(),
      }));
      const preparedFullText = preparedFull.text.map((entry) => entry.value).join(' | ');
      assert.equal(preparedFullText.includes('A birth chart'), true,
        'the full chart image must be rendered before the final share tap');
      assert.equal(preparedFullText.includes('STANDOUT'), false,
        'the full chart image must not bake in a chart-signature callout');
      assert.equal(preparedFullText.includes('My chart signature'), false,
        'the full chart image must not bake in the retired signature card');
      assert.equal(preparedFullText.includes(`Engine ${ENGINE_VERSION}`), true,
        'the full chart PNG must carry only its engine receipt');

      const fullCardStart = await source.evaluate(() => performance.now());
      const fullCardDownloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await fullCardAction.click();
      await source.waitForFunction(() => globalThis.__t17Events.length === 2, null, { timeout: TIMEOUT });
      await source.waitForFunction(() => {
        const action = document.querySelector('[data-share-card-action="full"]');
        return action instanceof HTMLButtonElement
          && !action.disabled
          && !action.textContent?.includes('Rendering');
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
      const fullCardEventAt = fullCardRender.events.findLast((entry) => entry.name === 'share_card_downloaded')?.at;
      assert.ok(fullCardDownloadAt >= fullCardStart, 'full-chart download must start after the action');
      assert.ok(fullCardEventAt >= fullCardDownloadAt,
        'share_card_downloaded must fire only after the non-cancelled full-chart download starts');
      assert.ok(fullCardEventAt - fullCardStart < 1000,
        `full-chart PNG action took ${(fullCardEventAt - fullCardStart).toFixed(1)}ms; expected <1000ms`);
      assert.deepEqual((await events(source)).map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'full_chart_card' } },
        { name: 'share_card_downloaded', props: { variant: 'full_chart_card' } },
      ], 'the single full-card action must fire exactly one privacy-safe analytics pair');

      const privacy = await dialog.locator('.calc-share-dialog__note').innerText();
      assert.match(privacy, /not a name, birth date, time, place, coordinates, or chart link/i);

      const bigThreeDownloadPromise = source.waitForEvent('download', { timeout: TIMEOUT });
      await bigThreeCardAction.click();
      await source.waitForFunction(() => globalThis.__t17Events.length === 4, null, { timeout: TIMEOUT });
      const bigThreeDownload = await bigThreeDownloadPromise;
      assert.equal(bigThreeDownload.suggestedFilename(), 'zodiacs-big-three.png',
        'Big Three filename must contain no birth input');
      assert.deepEqual(await pngDimensions(bigThreeDownload), { width: 1080, height: 1350 },
        'Big Three must export at the reviewed 1080×1350 size');
      const bigThreeRender = await source.evaluate(() => ({
        text: globalThis.__t17CanvasText.slice(),
        events: globalThis.__t17Events.slice(),
      }));
      const bigThreeText = bigThreeRender.text.map((entry) => entry.value).join(' | ');
      assert.equal(bigThreeText.includes('Your big three'), true,
        'the prepared Big Three artifact must carry its accurate title');
      for (const privateValue of [BIRTH.date, BIRTH.time, BIRTH.cityQuery, 'June 15, 1990', 'America/New_York']) {
        assert.equal(bigThreeText.includes(privateValue), false, `Big Three PNG leaked ${privateValue}`);
      }
      assert.deepEqual((await events(source)).map(({ name, props }) => ({ name, props })), [
        { name: 'chart_share', props: { variant: 'full_chart_card' } },
        { name: 'share_card_downloaded', props: { variant: 'full_chart_card' } },
        { name: 'chart_share', props: { variant: 'big_three_card' } },
        { name: 'share_card_downloaded', props: { variant: 'big_three_card' } },
      ], 'each selected chart card must fire its own privacy-safe analytics pair');

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
      await source.waitForFunction(() => {
        const action = document.querySelector('[data-share-card-action="full"]');
        return globalThis.__t17ShareCalls === 1
          && action
          && !action.textContent?.includes('Rendering');
      }, null, { timeout: TIMEOUT });
      assert.equal((await events(source)).length, eventCountBeforeCancel,
        'a cancelled share sheet must not fire chart_share or share_card_downloaded');
      assert.equal(await source.evaluate(() => globalThis.__t17DownloadClicks.length), 0,
        'a cancelled share sheet must not fall through to download');
      const cardIconRequests = iconRequests.filter((request) => request.type === 'fetch');
      assert.ok(cardIconRequests.length >= 6,
        'the full-chart and Big Three cards must both request canonical zodiac art');
      assert.equal(cardIconRequests.every(({ path }) => /^\/assets\/zodiac-icons\/128\/[a-z-]+\.webp$/.test(path)), true,
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
      assert.equal((await events(preparationFailure)).some(({ name }) => (
        name === 'chart_share' || name === 'share_card_downloaded'
      )), false, 'a failed pre-render must fire no share-success analytics');
      assert.equal(await preparationFailure.evaluate(() => globalThis.__t17DownloadClicks.length), 0,
        'a failed pre-render must not start a download');
      assert.match(
        await preparationFailure.evaluate(() => globalThis.__t17ExpectedErrors.join(' ')),
        /png encode failed/i,
        'the communication preparation failure must retain the rendering error for diagnostics',
      );
      await preparationFailure.evaluate(() => {
        HTMLCanvasElement.prototype.toBlob = globalThis.__t17OriginalToBlob;
        console.error = globalThis.__t17OriginalConsoleError;
      });
      await preparationFailure.close();

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

      // Mobile uses the same deliberate two-step contract: open the compact
      // sheet, prepare the full chart, then invoke file sharing from the final tap.
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
      await mobile.locator('[data-share-card]').click();
      const mobileSheet = mobile.locator('[data-share-dialog]');
      await mobileSheet.waitFor({ state: 'visible', timeout: TIMEOUT });
      assert.equal(await mobile.evaluate(() => globalThis.__mobileShareCalls), 0,
        'opening the mobile share sheet must not immediately invoke native sharing');
      assert.equal(await mobile.locator('[data-share-options]').count(), 0,
        'mobile must not expose a separate share-options control');
      const mobileBigThreeAction = mobileSheet.locator('[data-share-card-action="big-three"]');
      await mobile.waitForFunction(() => {
        const action = document.querySelector('[data-share-card-action="big-three"]');
        return action instanceof HTMLButtonElement && !action.disabled;
      }, null, { timeout: TIMEOUT });
      const mobileSheetBox = await mobileSheet.boundingBox();
      assert.ok(mobileSheetBox && Math.abs(mobileSheetBox.y + mobileSheetBox.height - 844) < 2,
        `mobile share sheet must dock to the viewport bottom: ${JSON.stringify(mobileSheetBox)}`);
      assert.ok(mobileSheetBox.height < 844 && mobileSheetBox.width === 390,
        'mobile share sheet must fit the viewport without becoming a blank full-screen layer');
      const mobileTapStart = await mobile.evaluate(() => performance.now());
      await mobileBigThreeAction.click();
      await mobile.waitForFunction(() => globalThis.__mobileShareCalls === 1, null, { timeout: TIMEOUT });
      const mobilePayload = await mobile.evaluate(() => globalThis.__mobileSharePayload);
      assert.equal(mobilePayload.files.length, 1, 'the final mobile tap must share one prepared file');
      assert.deepEqual(mobilePayload.files[0], {
        name: 'zodiacs-big-three.png',
        type: 'image/png',
        size: mobilePayload.files[0].size,
      });
      assert.ok(mobilePayload.files[0].size > 0, 'the prepared mobile PNG must not be empty');
      assert.equal(mobilePayload.url, null, 'mobile chart sharing must not leak a chart URL');
      assert.ok(mobilePayload.at >= mobileTapStart && mobilePayload.at - mobileTapStart < 1000,
        'the prepared native file share must be invoked directly by the final tap');
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
      transcript.mobileNativeShare = 'prepared-full-chart-image';
      transcript.contextualNativeShare = 'prepared-communication-image';
    } finally {
      await context.close();
    }
  });
} finally {
  await browser.close();
}

assert.deepEqual(errors, [], 'T-17 browser flow emitted errors');
process.stdout.write(`${JSON.stringify(transcript, null, 2)}\n`);
