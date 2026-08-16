import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { REGISTRY_AURA_ENTRY_COPY, injectRegistryAuraLanding } from '../src/lib/registry-aura-entry.mjs';
import { consumerizeRegistryCollection } from '../scripts/registry-consumer-entry.mjs';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const counts = { dex: 0, gecko: 0, wikimedia: 0, jupiter: 0, wallet: 0 };

function quotePayload(url) {
  const encoded = new URL(url).pathname.split('/').at(-1) || '';
  return decodeURIComponent(encoded).split(',').filter(Boolean).map((mint, index) => ({
    chainId: 'solana',
    dexId: 'mock',
    pairAddress: `mock-pool-${index + 1}`,
    url: `https://dexscreener.com/solana/mock-pool-${index + 1}`,
    baseToken: { address: mint },
    priceUsd: String(index === 0 ? 1234.5 : 0.000001 * (index + 1)),
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
  await context.route('**/terminal/**', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const source = await response.text();
    const body = source.replace(
      '<meta name="zodiacs-registry-exchange-enabled" content="0" />',
      '<meta name="zodiacs-registry-exchange-enabled" content="1" />',
    );
    assert.notEqual(body, source, 'the flag simulation must stamp the Pro landing marker');
    return route.fulfill({ response, body, headers: { ...response.headers(), 'content-length': undefined } });
  });
}

async function installCollectionFlag(context) {
  await context.route('**/astrofolio/**', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const source = await response.text();
    const body = consumerizeRegistryCollection(
      injectRegistryAuraLanding(source, { PUBLIC_REGISTRY_COLLECTION_ENABLED: '1' }).output,
      REGISTRY_AURA_ENTRY_COPY,
    );
    assert.notEqual(body, source, 'the flag simulation must stamp the Astrofolio collection marker');
    return route.fulfill({ response, body, headers: { ...response.headers(), 'content-length': undefined } });
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

async function assertFirstScreen(page, { width, height }) {
  const opening = page.locator('.astrofolio-vitrine');
  const viewport = page.viewportSize();
  assert.deepEqual(viewport, { width, height });
  for (const selector of [
    '.terminal-consumer-hero__kicker',
    '#consumer-explorer-title',
    '.vitrine-disc-rail',
    '.vitrine-stage',
    '.vitrine-placard__layer.is-active h2',
    '.vitrine-placard__layer.is-active .vitrine-price',
    '.vitrine-placard__layer.is-active .btn--primary',
  ]) {
    assert.ok(await opening.locator(selector).isVisible(), `${selector} must be visible at ${width}x${height}`);
  }
  const openingBox = await opening.boundingBox();
  const actionBox = await opening.locator('.vitrine-placard__layer.is-active .btn--primary').boundingBox();
  assert.ok(openingBox && openingBox.y < height, 'opening starts in the first screen');
  assert.ok(actionBox && actionBox.y < height, `primary action stays in the first ${width}x${height} screen`);
}

async function assertStaticFirstScreen(page, { width, height, slug = 'leo' }) {
  const viewport = page.viewportSize();
  assert.deepEqual(viewport, { width, height });
  const active = page.locator(`[data-static-sign="${slug}"]`);
  for (const selector of [
    '.static-astrofolio-kicker',
    '#static-astrofolio-title',
    '.static-vitrine__rail',
  ]) {
    assert.ok(await page.locator(selector).isVisible(), `${selector} must be visible without JavaScript at ${width}x${height}`);
  }
  for (const selector of ['.static-vitrine__stage', 'h2', '.static-vitrine__price', '.btn--primary']) {
    assert.ok(await active.locator(selector).isVisible(), `${selector} must be visible without JavaScript at ${width}x${height}`);
  }
  const actionBox = await active.locator('.btn--primary').boundingBox();
  assert.ok(
    actionBox && actionBox.y + actionBox.height <= height,
    `the no-JavaScript primary action stays in the first ${width}x${height} screen`,
  );
}

async function assertPastelSelectorGeometry(page, { width, height, staticView = false }) {
  assert.deepEqual(page.viewportSize(), { width, height });
  const imageSelector = staticView ? '.static-vitrine__rail img' : '.vitrine-disc img';
  const wrapperSelector = staticView
    ? '.static-vitrine__rail label:has(.static-vitrine__choice:checked) .static-vitrine__disc'
    : '.vitrine-disc.is-active picture';
  const activeImageSelector = staticView
    ? '.static-vitrine__rail label:has(.static-vitrine__choice:checked) img'
    : '.vitrine-disc.is-active img';
  const filters = await page.locator(imageSelector).evaluateAll((images) => (
    images.map((image) => getComputedStyle(image).filter)
  ));
  assert.equal(filters.length, 12);
  assert.ok(filters.every((filter) => filter === 'none'), `all twelve selector discs stay pastel at ${width}x${height}`);

  const wrapper = await page.locator(wrapperSelector).boundingBox();
  const image = await page.locator(activeImageSelector).boundingBox();
  assert.ok(wrapper && image);
  const expectedWrapper = width <= 480 ? 46 : 50;
  const expectedImage = width <= 480 ? 38 : 42;
  assert.ok(Math.abs(wrapper.width - expectedWrapper) <= .01 && Math.abs(wrapper.height - expectedWrapper) <= .01);
  assert.ok(Math.abs(image.width - expectedImage) <= .01 && Math.abs(image.height - expectedImage) <= .01);
  const deltaX = (image.x + image.width / 2) - (wrapper.x + wrapper.width / 2);
  const deltaY = (image.y + image.height / 2) - (wrapper.y + wrapper.height / 2);
  assert.ok(Math.abs(deltaX) <= .01 && Math.abs(deltaY) <= .01, `the active pastel ring is concentric at ${width}x${height}: ${deltaX}, ${deltaY}`);
  const style = await page.locator(wrapperSelector).evaluate((node) => ({
    radius: getComputedStyle(node).borderRadius,
    shadow: getComputedStyle(node).boxShadow,
  }));
  assert.equal(style.radius, '50%');
  assert.notEqual(style.shadow, 'none');
  assert.equal(await page.locator(activeImageSelector).evaluate((node) => getComputedStyle(node).opacity), '1');
  const glowHosts = staticView ? '.static-vitrine__disc' : '.vitrine-disc picture';
  const activeGlow = await page.locator(wrapperSelector).evaluate((node) => {
    const style = getComputedStyle(node, '::before');
    return { background: style.backgroundImage, opacity: style.opacity, transition: style.transitionDuration };
  });
  const glows = await page.locator(glowHosts).evaluateAll((nodes) => nodes.map((node) => ({
    background: getComputedStyle(node, '::before').backgroundImage,
    opacity: getComputedStyle(node, '::before').opacity,
  })));
  assert.equal(glows.length, 12);
  assert.ok(glows.every(({ background }) => background.includes('radial-gradient')), 'all twelve discs have a pastel ambient shadow');
  assert.ok(glows.every(({ opacity }) => Number.parseFloat(opacity) >= .4), 'every disc keeps a low matching glow');
  assert.equal(activeGlow.opacity, '1');
  assert.match(activeGlow.transition, /^(?:0s|0ms)(?:, (?:0s|0ms))*$/u);
}

if (OUT) await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: await findChromium(),
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});

try {
  await withPreview({ port: 4382 }, async (baseURL) => {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    });
    await installNetworkHarness(mobile);
    const page = await mobile.newPage();
    const errors = watchErrors(page, 'Astrofolio mobile');
    await page.goto(`${baseURL}/astrofolio/?sign=pisces&rank=liquidity`, { waitUntil: 'load' });
    await waitForTerminal(page, '#consumer-explorer-title');
    assert.equal(await page.locator('.astrofolio-lockup__copy small').innerText(), 'Leo Season · The Twelve');
    assert.equal(await page.locator('.astrofolio-lockup__copy small strong').innerText(), 'Leo');
    assert.match(await page.locator('.astrofolio-lockup__avatar').getAttribute('src') ?? '', /\/assets\/astrofolio\/v2\/zodiac-ring-192\.png$/u);
    assert.match(await page.locator('.astrofolio-lockup__avatar').evaluate((node) => getComputedStyle(node).backgroundImage), /#010204|rgb\(1, 2, 4\)/u);
    assert.equal(await page.locator('.terminal-consumer-hero__kicker').innerText(), 'Astrofolio');
    assert.equal(await page.locator('.wnav__pill .wnav__mark').count(), 1);
    assert.equal(await page.locator('.wnav__pill .wnav__chip').innerText(), 'ASTROFOLIO');
    assert.equal(await page.locator('.wnav__pill .wnav__burger').count(), 1);
    assert.equal(await page.locator('.wnav__pill > .wnav__search').count(), 1);
    assert.equal(await page.locator('.wnav > .wnav__search').count(), 0);
    await page.setViewportSize({ width: 320, height: 844 });
    const compactNav = await page.locator('.wnav').evaluate((nav) => {
      const box = nav.getBoundingClientRect();
      const navStyle = getComputedStyle(nav);
      const search = nav.querySelector('.wnav__search');
      const searchStyle = search ? getComputedStyle(search) : null;
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        left: box.left,
        right: box.right,
        width: box.width,
        navBackground: navStyle.backgroundColor,
        navBackdrop: navStyle.backdropFilter,
        navBorder: navStyle.borderTopWidth,
        navRadius: navStyle.borderRadius,
        searchBackground: searchStyle?.backgroundColor,
        searchBorder: searchStyle?.borderTopWidth,
        searchWidth: searchStyle?.width,
      };
    });
    assert.ok(compactNav.overflow <= 0, 'the 320px navigation does not create horizontal overflow');
    assert.ok(compactNav.left >= 0 && compactNav.right <= 320, 'the single glass capsule stays inside the 320px viewport');
    assert.ok(Math.abs(compactNav.width - 309.5) <= 2, `the capsule matches the live Zodiacs width (${compactNav.width}px)`);
    assert.notEqual(compactNav.navBackground, 'rgba(0, 0, 0, 0)', 'the navigation keeps its liquid-glass tint');
    assert.notEqual(compactNav.navBackdrop, 'none', 'the navigation keeps its refractive or frosted backdrop');
    assert.equal(compactNav.navBorder, '1px', 'the glass capsule keeps its optical hairline');
    assert.equal(compactNav.navRadius, '999px', 'the navigation remains one capsule');
    assert.equal(compactNav.searchBackground, 'rgba(0, 0, 0, 0)', 'search has no separate circle background');
    assert.equal(compactNav.searchBorder, '0px', 'search has no separate circle border');
    assert.equal(compactNav.searchWidth, '34px', 'search remains a compact control inside the capsule');
    await page.setViewportSize({ width: 390, height: 844 });

    await page.waitForFunction(() => document.querySelector('[data-consumer-market-snapshot]')?.getAttribute('aria-busy') === 'false');
    assert.equal(counts.dex, 1, 'the first-screen placard and list share one batched quote request');
    assert.equal(await page.locator('[data-consumer-sign]').count(), 12);
    assert.equal(await page.locator('[data-vitrine-sculpture="pisces"].is-active').count(), 1);
    assert.equal(await page.locator('[data-vitrine-placard="pisces"].is-active').count(), 1);
    assert.match(await page.locator('[data-vitrine-placard="pisces"].is-active').innerText(), /Pisces[\s\S]*February 19 to March 20[\s\S]*\$0\.000012[\s\S]*down 11\.50% today/u);
    assert.equal(await page.locator('[data-vitrine-placard="pisces"].is-active .btn--primary').innerText(), 'View Pisces');
    assert.equal(await page.locator('[data-vitrine-placard="pisces"].is-active .btn--primary').getAttribute('href'), '/registry/pisces/');
    assert.equal(await page.locator('[data-vitrine-placard="pisces"].is-active .btn--ghost').innerText(), 'Check the token');
    assert.equal(await page.locator('[data-vitrine-placard="pisces"].is-active .btn--ghost').getAttribute('href'), '/registry/pisces/#record');
    assert.equal(await page.locator('[data-vitrine-placard="pisces"].is-active .vitrine-placard__record').count(), 0);
    const primaryCtaStyle = await page.locator('[data-vitrine-placard="pisces"].is-active .btn--primary').evaluate((node) => {
      const style = getComputedStyle(node);
      const orb = getComputedStyle(node, '::after');
      return { background: style.backgroundImage, radius: style.borderRadius, shadow: style.boxShadow, orb: orb.content, orbShape: orb.borderRadius };
    });
    assert.notEqual(primaryCtaStyle.background, 'none', 'the primary action uses the shared glass surface');
    assert.equal(primaryCtaStyle.radius, '999px');
    assert.notEqual(primaryCtaStyle.shadow, 'none');
    assert.equal(primaryCtaStyle.orb, '"↗"');
    assert.equal(primaryCtaStyle.orbShape, '50%');
    assert.equal(await page.locator('[data-terminal-preference-banner]').count(), 0);
    assert.equal(await page.locator('.terminal-consumer-hero [data-terminal-view-link="pro"]').count(), 0);
    assert.equal(await page.locator('a[href^="/terminal/"]').count(), 1);
    assert.equal(await page.locator('[data-consumer-market-snapshot] [data-snapshot-sign]').count(), 12);
    assert.equal(await page.locator('.consumer-registry .market-tape, .consumer-registry .pro-aggregate, .consumer-registry [data-landing-trade]').count(), 0);
    assert.equal(counts.gecko, 0);
    assert.equal(counts.wikimedia, 0);
    assert.equal(counts.jupiter, 0);
    assert.equal(counts.wallet, 0);
    await assertPastelSelectorGeometry(page, { width: 390, height: 844 });

    const selector = page.locator('[data-consumer-sign="pisces"]');
    await selector.focus();
    await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-consumer-sign="aries"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-consumer-sign="aries"]').getAttribute('tabindex'), '0');
    await page.keyboard.press('End');
    assert.equal(await page.locator('[data-consumer-sign="pisces"]').getAttribute('aria-pressed'), 'true');

    // Let the opacity-only selection transition settle before capturing the
    // exact owner-requested mobile viewport. The following resize assertion
    // deliberately exercises a shorter browser-chrome height.
    await page.waitForTimeout(200);
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-vitrine-sculpture="pisces"].is-active img');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    await assertFirstScreen(page, { width: 390, height: 844 });
    if (OUT) await page.screenshot({ path: `${OUT}/astrofolio-390x844.png`, fullPage: false });
    const stageBefore = await page.locator('.vitrine-stage').boundingBox();
    await page.setViewportSize({ width: 390, height: 760 });
    const stageAfter = await page.locator('.vitrine-stage').boundingBox();
    assert.ok(stageBefore && stageAfter);
    assert.ok(Math.abs(stageBefore.height - stageAfter.height) <= 1, 'browser-chrome height changes must not move or resize the sculpture stage');

    await page.locator('[data-consumer-sign="aries"]').click();
    await page.waitForFunction(() => document.querySelector('[data-vitrine-sculpture="aries"]')?.classList.contains('is-active'));
    await page.waitForTimeout(40);
    const interruptedOutgoingOpacity = await page.locator('[data-vitrine-sculpture="pisces"]').first().evaluate((node) => {
      const opacity = Number.parseFloat(getComputedStyle(node).opacity);
      document.querySelector('[data-consumer-sign="leo"]')?.click();
      return opacity;
    });
    assert.ok(interruptedOutgoingOpacity > 0, 'the outgoing decoded sculpture remains visible during its fade');
    await page.waitForFunction(() => document.querySelector('[data-vitrine-sculpture="leo"]')?.classList.contains('is-active'));
    const compositeOpacity = await page.locator('.vitrine-stage__layer').evaluateAll((nodes) => nodes.reduce((sum, node) => (
      sum + Number.parseFloat(getComputedStyle(node).opacity)
    ), 0));
    assert.ok(compositeOpacity >= .75, `rapid retargeting preserves the visible sculpture composite (${compositeOpacity})`);
    assert.equal(await page.locator('[data-vitrine-sculpture="pisces"]').count(), 1, 'rapid selection retains the partially faded layer instead of flashing it away');
    await page.waitForFunction(() => (
      document.querySelectorAll('.vitrine-stage__layer').length === 1
      && document.querySelector('[data-vitrine-sculpture="leo"]')?.classList.contains('is-active')
    ));
    assert.equal(new URL(page.url()).searchParams.get('sign'), 'leo');
    assert.equal(await page.locator('.consumer-closing__market').getAttribute('href'), '/terminal/?sign=leo');
    assert.equal(await page.locator('.vitrine-stage__layer').count(), 1, 'an interrupted fade settles to one sculpture layer');
    assert.equal(await page.locator('.vitrine-placard__layer').count(), 1, 'an interrupted fade settles to one placard layer');
    assert.equal(await page.locator('[data-vitrine-sculpture="leo"].is-active').count(), 1);
    assert.equal(await page.locator('[data-vitrine-placard="leo"] [role="status"]').count(), 1);
    assert.equal(await page.locator('[data-vitrine-placard="leo"] [aria-hidden="true"][role="status"]').count(), 0);
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertPastelSelectorGeometry(page, { width: 768, height: 1024 });
    assert.deepEqual(errors, []);
    await mobile.close();

    const legacy = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await installNetworkHarness(legacy);
    const legacyPage = await legacy.newPage();
    await legacyPage.goto(`${baseURL}/terminal/?sign=leo&rank=liquidity#market-snapshot`, { waitUntil: 'load' });
    await legacyPage.waitForURL(/\/astrofolio\/\?sign=leo&rank=liquidity#market-snapshot$/u);
    assert.equal(new URL(legacyPage.url()).pathname, '/astrofolio/');
    await legacy.close();

    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    await installNetworkHarness(desktop);
    const desktopPage = await desktop.newPage();
    const desktopErrors = watchErrors(desktopPage, 'Astrofolio desktop');
    await desktopPage.goto(`${baseURL}/astrofolio/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(desktopPage, '#consumer-explorer-title');
    await desktopPage.waitForFunction(() => document.querySelector('[data-consumer-market-snapshot]')?.getAttribute('aria-busy') === 'false');
    await assertFirstScreen(desktopPage, { width: 1440, height: 900 });
    await assertPastelSelectorGeometry(desktopPage, { width: 1440, height: 900 });
    if (OUT) await desktopPage.screenshot({ path: `${OUT}/astrofolio-1440x900.png`, fullPage: false });
    const desktopStageBefore = await desktopPage.locator('.vitrine-stage').boundingBox();
    await desktopPage.setViewportSize({ width: 1440, height: 760 });
    const desktopStageAfter = await desktopPage.locator('.vitrine-stage').boundingBox();
    assert.ok(desktopStageBefore && desktopStageAfter);
    assert.ok(Math.abs(desktopStageBefore.height - desktopStageAfter.height) <= 1, 'desktop browser-chrome height changes must not resize the sculpture stage');
    assert.ok(Math.abs(desktopStageBefore.y - desktopStageAfter.y) <= 1, 'desktop browser-chrome height changes must not move the sculpture stage');
    await desktopPage.setViewportSize({ width: 1024, height: 900 });
    await assertFirstScreen(desktopPage, { width: 1024, height: 900 });
    await assertPastelSelectorGeometry(desktopPage, { width: 1024, height: 900 });
    const intermediateStage = await desktopPage.locator('.vitrine-stage').boundingBox();
    assert.ok(intermediateStage && Math.abs((intermediateStage.width / intermediateStage.height) - 1.2) <= .01, 'intermediate desktop keeps the 6:5 stage ratio');
    const intermediateWidths = await desktopPage.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(intermediateWidths.scroll <= intermediateWidths.client, 'intermediate desktop has no horizontal overflow');
    await desktopPage.setViewportSize({ width: 1200, height: 900 });
    await assertFirstScreen(desktopPage, { width: 1200, height: 900 });
    const upperIntermediateStage = await desktopPage.locator('.vitrine-stage').boundingBox();
    assert.ok(upperIntermediateStage && Math.abs((upperIntermediateStage.width / upperIntermediateStage.height) - 1.2) <= .01, 'upper-intermediate desktop keeps the 6:5 stage ratio');
    const upperIntermediateWidths = await desktopPage.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(upperIntermediateWidths.scroll <= upperIntermediateWidths.client, 'upper-intermediate desktop has no horizontal overflow');
    assert.deepEqual(desktopErrors, []);
    await desktop.close();

    const frenchLocale = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'fr-FR',
      reducedMotion: 'no-preference',
    });
    await installNetworkHarness(frenchLocale);
    const frenchPage = await frenchLocale.newPage();
    await frenchPage.goto(`${baseURL}/astrofolio/?sign=aries`, { waitUntil: 'load' });
    await waitForTerminal(frenchPage, '#consumer-explorer-title');
    await frenchPage.waitForFunction(() => document.querySelector('[data-consumer-market-snapshot]')?.getAttribute('aria-busy') === 'false');
    const frenchPlacard = frenchPage.locator('[data-vitrine-placard="aries"].is-active');
    assert.equal(await frenchPlacard.locator('.vitrine-price__figure').innerText(), '$1,234.50');
    assert.equal(await frenchPlacard.locator('.vitrine-price__movement').innerText(), 'up 0.50% today');
    await frenchLocale.close();

    const failedArtwork = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await installNetworkHarness(failedArtwork);
    await failedArtwork.route(
      /\/assets\/(?:sculptures\/(?:512|1024)|cabinet-materials\/gold)\/virgo\.webp$/u,
      (route) => route.abort(),
    );
    const failedArtworkPage = await failedArtwork.newPage();
    await failedArtworkPage.goto(`${baseURL}/astrofolio/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(failedArtworkPage, '#consumer-explorer-title');
    await failedArtworkPage.locator('[data-consumer-sign="virgo"]').click();
    await failedArtworkPage.waitForFunction(() => (
      document.querySelector('[data-vitrine-sculpture="virgo"].is-active.is-fallback')
      && document.querySelector('[data-vitrine-placard="virgo"].is-active')
    ));
    assert.equal(await failedArtworkPage.locator('[data-vitrine-sculpture="virgo"].is-fallback img').isVisible(), false);
    assert.equal(await failedArtworkPage.locator('[data-vitrine-sculpture="virgo"] .vitrine-stage__fallback').isVisible(), true);
    assert.equal(await failedArtworkPage.locator('[data-vitrine-sculpture="virgo"] .vitrine-stage__fallback').getAttribute('role'), 'img');
    assert.match(
      await failedArtworkPage.locator('[data-vitrine-sculpture="virgo"] .vitrine-stage__fallback').getAttribute('aria-label') ?? '',
      /^Virgo sculpture unavailable; .+ symbol shown$/u,
    );
    assert.equal(await failedArtworkPage.locator('[data-vitrine-placard="virgo"].is-active h2').innerText(), 'Virgo');
    await failedArtwork.close();

    const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await installNetworkHarness(reduced);
    const reducedPage = await reduced.newPage();
    const reducedErrors = watchErrors(reducedPage, 'Astrofolio reduced motion');
    await reducedPage.goto(`${baseURL}/astrofolio/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(reducedPage, '#consumer-explorer-title');
    await reducedPage.locator('[data-consumer-sign="virgo"]').click();
    await reducedPage.waitForFunction(() => {
      const sculpture = document.querySelector('[data-vitrine-sculpture="virgo"].is-active');
      const placard = document.querySelector('[data-vitrine-placard="virgo"].is-active');
      const image = sculpture?.querySelector('img');
      return sculpture && placard && image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    assert.equal(await reducedPage.locator('.vitrine-stage__layer').count(), 1, 'reduced motion swaps sculpture immediately');
    assert.equal(await reducedPage.locator('.vitrine-placard__layer').count(), 1, 'reduced motion swaps placard immediately');
    assert.equal(await reducedPage.locator('[data-vitrine-sculpture="virgo"].is-active').count(), 1);
    assert.equal(await reducedPage.locator('[data-vitrine-placard="virgo"].is-active').count(), 1);
    const motionState = await reducedPage.locator('.vitrine-stage__layer').evaluate((node) => ({
      animation: getComputedStyle(node).animationName,
      duration: getComputedStyle(node).transitionDuration,
    }));
    assert.equal(motionState.animation, 'none');
    assert.match(motionState.duration, /^(?:0s|0ms)(?:, (?:0s|0ms))*$/u);
    if (OUT) await reducedPage.screenshot({ path: `${OUT}/astrofolio-390x844-reduced-motion.png`, fullPage: false });
    assert.deepEqual(reducedErrors, []);
    await reduced.close();

    const pro = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
    await installNetworkHarness(pro);
    const proPage = await pro.newPage();
    const proErrors = watchErrors(proPage, 'Terminal');
    const beforeProDex = counts.dex;
    await proPage.goto(`${baseURL}/terminal/?sign=PISCES&rank=change#briefing`, { waitUntil: 'load' });
    await waitForTerminal(proPage, '#pro-terminal-title');
    await proPage.waitForFunction(() => document.querySelector('.pro-board table')?.getAttribute('aria-busy') === 'false');
    assert.equal(await proPage.locator('#pro-terminal-title').innerText(), 'Terminal');
    assert.equal(counts.dex, beforeProDex + 1, 'Terminal makes one initial batched quote request');
    assert.equal(await proPage.locator('.pro-board tbody tr').count(), 12);
    assert.equal((await proPage.locator('th[aria-sort="descending"] button').textContent())?.trim(), '24h change');
    assert.equal(await proPage.locator('[data-pro-markets-gateway], a[href^="/terminal/markets/"]').count(), 0);
    await proPage.locator('button', { hasText: 'Indexed liquidity' }).focus();
    await proPage.keyboard.press('Enter');
    assert.equal((await proPage.locator('th[aria-sort="descending"] button').textContent())?.trim(), 'Indexed liquidity');
    assert.match(proPage.url(), /rank=liquidity/u);
    const tapeButton = proPage.locator('.pro-tape-control > button');
    assert.equal(await tapeButton.innerText(), 'Pause tape');
    await tapeButton.click();
    assert.equal(await tapeButton.innerText(), 'Resume tape');
    assert.equal(await proPage.locator('[data-terminal-view-link="consumer"]').getAttribute('href'), '/astrofolio/?sign=pisces');
    assert.deepEqual(proErrors, []);
    await pro.close();

    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(`${baseURL}/astrofolio/`, { waitUntil: 'load' });
    assert.equal(await noJsPage.locator('#static-astrofolio-title').innerText(), 'Choose your sign');
    assert.equal(await noJsPage.locator('.static-astrofolio-kicker').innerText(), 'Astrofolio');
    assert.equal(await noJsPage.locator('.static-astrofolio-lockup small').innerText(), 'Leo Season · The Twelve');
    assert.equal(await noJsPage.locator('.static-vitrine__choice').count(), 12);
    assert.equal(await noJsPage.locator('.static-vitrine__panel').count(), 12);
    assert.equal(await noJsPage.locator('#market-snapshot li').count(), 12);
    assert.equal(await noJsPage.locator('#faq dt').count(), 4);
    assert.equal(await noJsPage.locator('[data-terminal-market-notice]').count(), 1);
    assert.equal(await noJsPage.locator('[data-terminal-static-view="pro"]').count(), 1);
    assert.equal(await noJsPage.locator('[data-terminal-static-view="pro"]').getAttribute('href'), '/terminal/');
    const staticStoryStyle = await noJsPage.locator('.static-story-band').evaluate((node) => {
      const image = node.querySelector('img');
      const picture = node.querySelector('picture')?.getBoundingClientRect();
      const copy = node.querySelector('.static-story-band__copy')?.getBoundingClientRect();
      const button = node.querySelector('.static-story-band__copy b');
      const cardStyle = getComputedStyle(node);
      return {
        background: cardStyle.backgroundColor,
        overflow: cardStyle.overflow,
        radius: cardStyle.borderRadius,
        filter: image ? getComputedStyle(image).filter : '',
        pictureBottom: picture?.bottom,
        copyTop: copy?.top,
        buttonRadius: button ? getComputedStyle(button).borderRadius : '',
      };
    });
    assert.equal(staticStoryStyle.background, 'rgba(15, 18, 26, 0.74)');
    assert.equal(staticStoryStyle.overflow, 'hidden');
    assert.equal(staticStoryStyle.radius, '22px 22px 5px');
    assert.notEqual(staticStoryStyle.filter, 'none');
    assert.doesNotMatch(staticStoryStyle.filter, /grayscale/u);
    assert.ok(staticStoryStyle.pictureBottom <= staticStoryStyle.copyTop + 1, 'the no-JavaScript thesis image sits above its copy');
    assert.equal(staticStoryStyle.buttonRadius, '999px');
    await assertStaticFirstScreen(noJsPage, { width: 390, height: 844 });
    await assertPastelSelectorGeometry(noJsPage, { width: 390, height: 844, staticView: true });
    const staticStageBefore = await noJsPage.locator('[data-static-sign="leo"] .static-vitrine__stage').boundingBox();
    await noJsPage.locator('#astrofolio-leo').focus();
    for (let index = 0; index < 7; index += 1) await noJsPage.keyboard.press('ArrowRight');
    assert.equal(await noJsPage.locator('#astrofolio-pisces').isChecked(), true);
    const railBox = await noJsPage.locator('.static-vitrine__rail').boundingBox();
    const selectedLabelBox = await noJsPage.locator('#astrofolio-pisces-label').boundingBox();
    assert.ok(railBox && selectedLabelBox && selectedLabelBox.x < railBox.x + railBox.width && selectedLabelBox.x + selectedLabelBox.width > railBox.x);
    await noJsPage.setViewportSize({ width: 390, height: 700 });
    const staticStageAfter = await noJsPage.locator('[data-static-sign="pisces"] .static-vitrine__stage').boundingBox();
    assert.ok(staticStageBefore && staticStageAfter);
    assert.ok(Math.abs(staticStageBefore.height - staticStageAfter.height) <= 1, 'the no-JavaScript stage remains stable when browser chrome changes');
    await noJsPage.emulateMedia({ reducedMotion: 'reduce' });
    const staticMotion = await noJsPage.locator('#astrofolio-pisces-label').evaluate((node) => getComputedStyle(node).transitionDuration);
    assert.match(staticMotion, /^(?:0s|0ms)(?:, (?:0s|0ms))*$/u);

    const noJsCollection = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await installCollectionFlag(noJsCollection);
    const noJsCollectionPage = await noJsCollection.newPage();
    await noJsCollectionPage.goto(`${baseURL}/astrofolio/`, { waitUntil: 'load' });
    const staticCabinet = noJsCollectionPage.locator('[data-registry-collection-entry]');
    assert.equal(await staticCabinet.count(), 1);
    assert.equal(await staticCabinet.isVisible(), true);
    assert.equal(await staticCabinet.locator('.consumer-cabinet__seat').count(), 12);
    assert.equal(await staticCabinet.locator('.consumer-cabinet__seat.is-filled').count(), 5);
    assert.equal(await staticCabinet.locator('a').getAttribute('href'), '/registry/collection/');
    assert.equal(await staticCabinet.locator('.static-collection__cta').innerText(), 'Open collection view →');
    assert.equal(await staticCabinet.locator('.static-collection__cta').evaluate((node) => getComputedStyle(node).borderRadius), '999px');
    assert.equal(await noJsCollectionPage.locator('[aria-hidden="true"] [data-registry-collection-entry]').count(), 0);
    await noJsCollection.close();

    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1024, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await noJsPage.setViewportSize(viewport);
      await noJsPage.goto(`${baseURL}/astrofolio/`, { waitUntil: 'load' });
      await assertPastelSelectorGeometry(noJsPage, { ...viewport, staticView: true });
    }
    await noJsPage.goto(`${baseURL}/astrofolio/`, { waitUntil: 'load' });
    await assertStaticFirstScreen(noJsPage, { width: 1440, height: 900 });
    if (OUT) await noJsPage.screenshot({ path: `${OUT}/astrofolio-no-js-1440x900.png`, fullPage: false });
    await noJsPage.goto(`${baseURL}/terminal/`, { waitUntil: 'load' });
    assert.equal(await noJsPage.locator('#pro-static-title').innerText(), 'Terminal');
    assert.equal(await noJsPage.locator('#market tbody tr').count(), 12);
    assert.equal(await noJsPage.locator('#market a', { hasText: 'Official record' }).count(), 12);
    assert.equal(await noJsPage.locator('#research [data-research-empty-state]').count(), 1);
    assert.equal(await noJsPage.locator('a[href="/astrofolio/#verify"]').count() > 0, true);
    assert.equal(await noJsPage.locator('[data-terminal-market-notice]').count(), 1);
    assert.equal(await noJsPage.locator('a[href^="/terminal/markets/"]').count(), 0);
    await noJs.close();

    const collection = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await installNetworkHarness(collection);
    await installCollectionFlag(collection);
    const collectionPage = await collection.newPage();
    await collectionPage.goto(`${baseURL}/astrofolio/`, { waitUntil: 'load' });
    await waitForTerminal(collectionPage, '#consumer-explorer-title');
    assert.equal(await collectionPage.locator('[data-registry-collection]').count(), 1);
    assert.equal(await collectionPage.locator('[data-registry-collection] .consumer-cabinet__seat').count(), 12);
    assert.equal(await collectionPage.locator('[data-registry-collection] .consumer-cabinet__seat.is-filled').count(), 5);
    assert.equal(await collectionPage.locator('[data-registry-collection] .consumer-purpose__cta > span').first().innerText(), 'Open the Cabinet');
    assert.equal(await collectionPage.locator('.consumer-thesis .consumer-purpose__cta').evaluate((node) => getComputedStyle(node).borderRadius), '999px');
    const mobilePurpose = await collectionPage.locator('.consumer-thesis, .consumer-collection').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    assert.ok(mobilePurpose[0].y < mobilePurpose[1].y, 'the restored mobile cards keep Story before Cabinet');
    await collectionPage.setViewportSize({ width: 1280, height: 900 });
    const desktopPurpose = await collectionPage.locator('.consumer-thesis, .consumer-collection').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    assert.ok(desktopPurpose[0].x < desktopPurpose[1].x, 'the restored desktop cards sit side by side');
    assert.ok(desktopPurpose[0].width > desktopPurpose[1].width, 'the Story keeps the older Registry lead-card proportion');
    const thesisFlow = await collectionPage.locator('.consumer-thesis').evaluate((node) => {
      const visual = node.querySelector('.consumer-thesis__visual')?.getBoundingClientRect();
      const essay = node.querySelector('.consumer-purpose__essay')?.getBoundingClientRect();
      return { visualBottom: visual?.bottom, essayTop: essay?.top };
    });
    assert.ok(thesisFlow.visualBottom <= thesisFlow.essayTop + 1, 'the thesis clock is contained above its copy');
    const storyOrder = await collectionPage.locator('#thesis, .consumer-snapshot, #registry').evaluateAll((nodes) => (
      nodes.map((node) => node.id || [...node.classList].find((name) => name === 'consumer-snapshot'))
    ));
    assert.deepEqual(storyOrder, ['thesis', 'consumer-snapshot', 'registry']);
    await collection.close();

    const flagged = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await installNetworkHarness(flagged);
    await installExchangeFlag(flagged);
    const flaggedPage = await flagged.newPage();
    const flaggedErrors = watchErrors(flaggedPage, 'flagged gateway');
    await flaggedPage.goto(`${baseURL}/astrofolio/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(flaggedPage, '#consumer-explorer-title');
    assert.equal(await flaggedPage.locator('meta[name="zodiacs-registry-exchange-enabled"]').count(), 0);
    assert.equal(await flaggedPage.locator('[data-pro-markets-gateway], a[href^="/terminal/markets/"]').count(), 0);
    await flaggedPage.goto(`${baseURL}/terminal/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(flaggedPage, '#pro-terminal-title');
    await flaggedPage.waitForFunction(() => document.querySelector('.pro-board table')?.getAttribute('aria-busy') === 'false');
    const gateway = flaggedPage.locator('[data-pro-markets-gateway]');
    assert.equal(await gateway.count(), 1);
    assert.equal(await gateway.locator('a').getAttribute('href'), '/terminal/markets/#leo');
    const providersBefore = { jupiter: counts.jupiter, wallet: counts.wallet };
    await gateway.locator('a').focus();
    await flaggedPage.locator('[data-market-sign="scorpio"] .pro-board__sign').click();
    assert.equal(await gateway.locator('a').getAttribute('href'), '/terminal/markets/#scorpio');
    assert.deepEqual({ jupiter: counts.jupiter, wallet: counts.wallet }, providersBefore);
    assert.deepEqual(flaggedErrors, []);
    await flagged.close();
  });
  console.log('terminal-split browser verification: PASS');
  console.log(JSON.stringify(counts));
} finally {
  await browser.close();
}
