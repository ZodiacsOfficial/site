import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const counts = { dex: 0, gecko: 0, wikimedia: 0, jupiter: 0, wallet: 0 };

function quotePayload(url) {
  const encoded = new URL(url).pathname.split('/').at(-1) || '';
  return decodeURIComponent(encoded).split(',').filter(Boolean).map((mint, index) => ({
    chainId: 'solana',
    dexId: 'mock',
    pairAddress: `mock-pool-${index + 1}`,
    url: `https://dexscreener.com/solana/mock-pool-${index + 1}`,
    baseToken: { address: mint },
    priceUsd: String(0.000001 * (index + 1)),
    priceChange: { h24: index % 2 === 0 ? index + 0.5 : -(index + 0.5) },
    liquidity: { usd: (index + 1) * 10_000 },
    volume: { h24: (index + 1) * 2_000 },
    marketCap: (12 - index) * 100_000,
    fdv: (12 - index) * 120_000,
  }));
}

function hourlyPayload() {
  const hour = 60 * 60;
  const end = Math.floor(Date.now() / (hour * 1000)) * hour;
  return { data: { attributes: { ohlcv_list: Array.from({ length: 24 }, (_, index) => {
    const open = 0.00001 + index * 0.0000001;
    return [end - ((24 - index) * hour), open, open * 1.02, open * 0.98, open * 1.01, 100 + index];
  }) } } };
}

async function installNetworkHarness(context) {
  context.on('request', (request) => {
    const url = request.url().toLowerCase();
    if (url.includes('api.dexscreener.com/tokens/v1/solana/')) counts.dex += 1;
    if (url.includes('api.geckoterminal.com/')) counts.gecko += 1;
    if (url.includes('wikimedia.org/')) counts.wikimedia += 1;
    if (url.includes('jup.ag') || url.includes('jupiter')) counts.jupiter += 1;
    if (/wallet|phantom|solflare/u.test(url)) counts.wallet += 1;
  });
  await context.route('https://api.dexscreener.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(quotePayload(route.request().url())),
  }));
  await context.route('https://api.geckoterminal.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(hourlyPayload()),
  }));
  await context.route('https://plausible.io/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: '',
  }));
  await context.route('**/api/registry/news', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [] }),
  }));
}

async function installExchangeFlag(context) {
  await context.route('**/terminal/pro/**', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const source = await response.text();
    const body = source.replace(
      '<meta name="zodiacs-registry-exchange-enabled" content="0" />',
      '<meta name="zodiacs-registry-exchange-enabled" content="1" />',
    );
    assert.notEqual(body, source, 'the flag simulation must stamp the Pro landing marker');
    return route.fulfill({
      response,
      body,
      headers: { ...response.headers(), 'content-length': undefined },
    });
  });
}

function watchErrors(page, label) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource/iu.test(message.text())) {
      errors.push(`${label}: ${message.text()}`);
    }
  });
  return errors;
}

async function waitForTerminal(page, selector) {
  await page.locator(selector).waitFor({ state: 'visible', timeout: 30_000 });
  assert.equal(await page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay').count(), 0);
  assert.ok((await page.locator('body').innerText()).trim().length > 500);
}

const browser = await chromium.launch({
  executablePath: await findChromium(),
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});

try {
  await withPreview({ port: 4382 }, async (baseURL) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    });
    await installNetworkHarness(context);
    const page = await context.newPage();
    const errors = watchErrors(page, 'interactive');
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return String(type).startsWith('webgl') ? null : getContext.call(this, type, ...args);
      };
    });

    await page.goto(`${baseURL}/terminal/?sign=pisces&rank=liquidity`, { waitUntil: 'load' });
    await waitForTerminal(page, '#consumer-explorer-title');
    await page.waitForTimeout(500);
    assert.equal(counts.dex, 0, 'consumer opening must not request market quotes');
    assert.equal(await page.locator('[data-consumer-sign]').count(), 12);
    assert.equal(await page.locator('[data-consumer-preview="pisces"]').count(), 1);
    assert.equal(await page.locator('.stage-placard__quote, .stage-market, [data-landing-trade]').count(), 0);
    assert.match(await page.locator('.stage-placard').innerText(), /This is my sign/u);
    assert.doesNotMatch(await page.locator('.stage-placard').innerText(), /liquidity|market cap|volume|buy/iu);
    await page.locator('.stage-placard__pill.btn--primary').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('zodiacs:today-sun-sign:v1')), 'pisces');

    const consumerQuoteRequest = page.waitForRequest((request) => (
      request.url().includes('api.dexscreener.com/tokens/v1/solana/')
    ));
    await page.locator('.consumer-snapshot').scrollIntoViewIfNeeded();
    await consumerQuoteRequest;
    await page.waitForFunction(() => document.querySelector('[data-consumer-market-snapshot]')?.getAttribute('aria-busy') === 'false');
    assert.equal(counts.dex, 1, 'consumer snapshot must use one batched quote request');
    assert.equal(await page.locator('[data-snapshot-sign]').count(), 12);
    assert.equal(counts.gecko, 0);
    assert.equal(counts.wikimedia, 0);
    if (process.env.OUT_DIR) {
      await page.screenshot({ path: `${process.env.OUT_DIR}/terminal-consumer-mobile.png` });
    }

    const beforeLegacyDex = counts.dex;
    await page.goto(`${baseURL}/terminal/?sign=PISCES&rank=change&junk=drop#outlook`, { waitUntil: 'load' });
    await page.waitForURL(/\/terminal\/pro\/\?sign=pisces&rank=change#briefing$/u);
    await waitForTerminal(page, '#pro-terminal-title');
    await page.waitForFunction(() => document.querySelector('.pro-board table')?.getAttribute('aria-busy') === 'false');
    assert.equal(counts.dex, beforeLegacyDex + 1, 'Pro must make one initial batched quote request');
    assert.equal(await page.locator('.pro-board tbody tr').count(), 12);
    assert.equal((await page.locator('th[aria-sort="descending"] button').textContent())?.trim(), '24h change');
    assert.equal(await page.locator('[data-pro-markets-gateway], a[href^="/terminal/markets/"]').count(), 0);

    await page.locator('button', { hasText: 'Indexed liquidity' }).focus();
    assert.match(await page.evaluate(() => document.activeElement?.textContent || ''), /Indexed liquidity/u);
    await page.keyboard.press('Enter');
    assert.equal((await page.locator('th[aria-sort="descending"] button').textContent())?.trim(), 'Indexed liquidity');
    assert.match(page.url(), /rank=liquidity/u);

    const tapeButton = page.locator('.pro-tape-control > button');
    assert.equal(await tapeButton.innerText(), 'Pause tape');
    await tapeButton.click();
    assert.equal(await tapeButton.innerText(), 'Resume tape');
    assert.equal(await page.locator('[data-market-tape]').getAttribute('data-paused'), '');
    assert.equal(await page.locator('[data-terminal-view-link="consumer"]').getAttribute('href'), '/terminal/?sign=pisces');

    const beforeSelected = counts.gecko;
    await page.locator('.pro-selected').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    assert.ok(counts.gecko - beforeSelected <= 1, 'only one selected-sign history request is allowed');
    assert.equal(counts.wikimedia, 0);
    await page.locator('#research').scrollIntoViewIfNeeded();
    await page.locator('[data-research-empty]').waitFor({ state: 'visible' });
    assert.match(await page.locator('[data-research-empty]').innerText(), /Drafts never appear here/u);
    assert.equal(await page.locator('#research [data-research-status="draft"]').count(), 0);
    assert.equal(await page.locator('#verify a').getAttribute('href'), '/terminal/?sign=pisces#verify');
    assert.equal(counts.jupiter, 0);
    assert.equal(counts.wallet, 0);
    await page.setViewportSize({ width: 1280, height: 900 });
    if (process.env.OUT_DIR) {
      await page.screenshot({ path: `${process.env.OUT_DIR}/terminal-pro-desktop.png` });
    }

    await page.evaluate(() => {
      localStorage.setItem('zodiacs:terminal-view:v1', 'pro');
      sessionStorage.removeItem('zodiacs:terminal-pro-banner-dismissed:v1');
    });
    await page.goto(`${baseURL}/terminal/?sign=pisces`, { waitUntil: 'load' });
    await waitForTerminal(page, '#consumer-explorer-title');
    assert.match(page.url(), /\/terminal\/\?sign=pisces$/u, 'saved Pro preference must never redirect');
    await page.locator('[data-terminal-preference-banner]').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Dismiss Pro terminal reminder' }).click();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('zodiacs:terminal-pro-banner-dismissed:v1')), '1');
    assert.equal(await page.evaluate(() => localStorage.getItem('zodiacs:terminal-view:v1')), 'pro');
    await page.reload({ waitUntil: 'load' });
    await waitForTerminal(page, '#consumer-explorer-title');
    assert.equal(await page.locator('[data-terminal-preference-banner]').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();

    const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await installNetworkHarness(reduced);
    const reducedPage = await reduced.newPage();
    const reducedErrors = watchErrors(reducedPage, 'reduced-motion');
    await reducedPage.goto(`${baseURL}/terminal/pro/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(reducedPage, '#pro-terminal-title');
    assert.equal(await reducedPage.locator('.pro-tape-control > button').innerText(), 'Resume tape');
    assert.deepEqual(reducedErrors, []);
    await reduced.close();

    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(`${baseURL}/terminal/`, { waitUntil: 'load' });
    assert.equal(await noJsPage.locator('#static-capital-title').innerText(), 'Zodiac Terminal');
    assert.equal(await noJsPage.locator('#market-snapshot li').count(), 12);
    assert.equal(await noJsPage.locator('[data-terminal-market-notice]').count(), 1);
    assert.equal(await noJsPage.locator('[data-terminal-static-view="pro"]').first().getAttribute('href'), '/terminal/pro/?sign=leo');
    await noJsPage.goto(`${baseURL}/terminal/pro/`, { waitUntil: 'load' });
    assert.equal(await noJsPage.locator('#pro-static-title').innerText(), 'Zodiac Terminal Pro');
    assert.equal(await noJsPage.locator('#market tbody tr').count(), 12);
    assert.equal(await noJsPage.locator('#market a', { hasText: 'Official record' }).count(), 12);
    assert.equal(await noJsPage.locator('#research [data-research-empty-state]').count(), 1);
    assert.equal(await noJsPage.locator('a[href="/terminal/#verify"]').count() > 0, true);
    assert.equal(await noJsPage.locator('[data-terminal-market-notice]').count(), 1);
    assert.equal(await noJsPage.locator('a[href^="/terminal/markets/"]').count(), 0);
    await noJs.close();

    const flagged = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await installNetworkHarness(flagged);
    await installExchangeFlag(flagged);
    const flaggedPage = await flagged.newPage();
    const flaggedErrors = watchErrors(flaggedPage, 'flagged-gateway');
    await flaggedPage.goto(`${baseURL}/terminal/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(flaggedPage, '#consumer-explorer-title');
    assert.equal(await flaggedPage.locator('meta[name="zodiacs-registry-exchange-enabled"]').count(), 0);
    assert.equal(await flaggedPage.locator('[data-pro-markets-gateway], a[href^="/terminal/markets/"]').count(), 0);

    await flaggedPage.goto(`${baseURL}/terminal/pro/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(flaggedPage, '#pro-terminal-title');
    await flaggedPage.waitForFunction(() => document.querySelector('.pro-board table')?.getAttribute('aria-busy') === 'false');
    assert.equal(await flaggedPage.locator('meta[name="zodiacs-registry-exchange-enabled"]').getAttribute('content'), '1');
    const gateway = flaggedPage.locator('[data-pro-markets-gateway]');
    assert.equal(await gateway.count(), 1);
    assert.equal(await gateway.locator('a').getAttribute('href'), '/terminal/markets/#leo');
    const providersBeforeGatewayInteraction = { jupiter: counts.jupiter, wallet: counts.wallet };
    await gateway.locator('a').focus();
    await flaggedPage.locator('[data-market-sign="scorpio"] .pro-board__sign').click();
    assert.equal(await gateway.locator('a').getAttribute('href'), '/terminal/markets/#scorpio');
    assert.deepEqual(
      { jupiter: counts.jupiter, wallet: counts.wallet },
      providersBeforeGatewayInteraction,
      'mount, focus, and sign selection must not contact execution or wallet providers',
    );
    assert.deepEqual(flaggedErrors, []);
    await flagged.close();
  });
  console.log('terminal-split browser verification: PASS');
  console.log(JSON.stringify(counts));
} finally {
  await browser.close();
}
