import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { REGISTRY_AURA_ENTRY_COPY, injectRegistryAuraLanding } from '../src/lib/registry-aura-entry.mjs';
import { resolveAstrofolioSeasonUtc, seasonsFromRegistry } from '../scripts/astrofolio-season.mjs';
import { consumerizeRegistryCollection } from '../scripts/registry-consumer-entry.mjs';
import { EXCHANGE_POOLS } from '../src/exchange/pools.mjs';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const counts = { dex: 0, dexPairs: 0, gecko: 0, wikimedia: 0, jupiter: 0, wallet: 0 };
const registry = JSON.parse(await readFile(new URL('../public/registry/zodiacs.registry.json', import.meta.url), 'utf8'));
const expectedSeason = resolveAstrofolioSeasonUtc(new Date(), seasonsFromRegistry(registry));
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

function fixturePair({ mint, pairAddress, index, canonical = false }) {
  const libra = mint === '7Zt2KUh5mkpEpPGcNcFy51aGkh9Ycb5ELcqRH1n2GmAe';
  if (libra && !canonical) {
    return {
      chainId: 'solana',
      dexId: 'meteora',
      pairAddress: '7hoH1PPnRaAZ6gyafuSSJpVYCemXpwPz9rAxnzTb71sX',
      url: 'https://dexscreener.com/solana/7hoh1ppnraaz6gyafussjpvycemxpwpz9raxnztb71sx',
      baseToken: { address: mint },
      quoteToken: { address: 'BgCeigJo2iY3dJhqS2z9w4pjjufFd4F9oKS3FrkMbmbJ' },
      priceUsd: '0.7562',
      priceChange: { h24: 27.54 },
      liquidity: { usd: 52_510.03 },
      volume: { h24: 11_828.34 },
      marketCap: 756_238_771,
      fdv: 756_238_771,
    };
  }
  const marketCap = libra ? 171_386 : (12 - index) * 100_000;
  return {
    chainId: 'solana',
    dexId: 'mock',
    pairAddress,
    url: `https://dexscreener.com/solana/${pairAddress}`,
    baseToken: { address: mint },
    quoteToken: { address: WSOL_MINT },
    priceUsd: String(libra ? 0.0001713 : index === 0 ? 1234.5 : 0.000001 * (index + 1)),
    priceChange: { h24: libra ? 30 : index % 2 === 0 ? index + 0.5 : -(index + 0.5) },
    liquidity: { usd: libra ? 28_443.76 : (index + 1) * 10_000 },
    volume: { h24: libra ? 9_516.09 : (index + 1) * 2_000 },
    marketCap,
    fdv: marketCap,
  };
}

function quotePayload(url) {
  const encoded = new URL(url).pathname.split('/').at(-1) || '';
  return decodeURIComponent(encoded).split(',').filter(Boolean).map((mint, index) => fixturePair({
    mint,
    index,
    pairAddress: `mock-pool-${index + 1}`,
  }));
}

function pinnedQuotePayload(url) {
  const encoded = new URL(url).pathname.split('/').at(-1) || '';
  const pairs = decodeURIComponent(encoded).split(',').filter(Boolean).flatMap((pairAddress) => {
    const sign = Object.entries(EXCHANGE_POOLS).find(([, id]) => id === pairAddress)?.[0];
    const index = registry.assets.findIndex((asset) => asset.sign === sign);
    const mint = index >= 0 ? registry.assets[index].native.address : null;
    return mint ? [fixturePair({ mint, pairAddress, index, canonical: true })] : [];
  });
  return { schemaVersion: '1.0.0', pairs };
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
    if (url.includes('api.dexscreener.com/latest/dex/pairs/solana/')) counts.dexPairs += 1;
    if (url.includes('api.geckoterminal.com/')) counts.gecko += 1;
    if (url.includes('wikimedia.org/')) counts.wikimedia += 1;
    if (url.includes('jup.ag') || url.includes('jupiter')) counts.jupiter += 1;
    if (/wallet|phantom|solflare/u.test(url)) counts.wallet += 1;
  });
  await context.route('https://api.dexscreener.com/**', (route) => {
    const url = route.request().url();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(url.includes('/latest/dex/pairs/solana/') ? pinnedQuotePayload(url) : quotePayload(url)),
    });
  });
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
  const stampLanding = async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const source = await response.text();
    const body = source.replace(
      '<meta name="zodiacs-registry-exchange-enabled" content="0" />',
      '<meta name="zodiacs-registry-exchange-enabled" content="1" />',
    );
    assert.notEqual(body, source, 'the flag simulation must stamp the landing marker');
    return route.fulfill({ response, body, headers: { ...response.headers(), 'content-length': undefined } });
  };
  await context.route('**/terminal/**', stampLanding);
  await context.route('**/astrofolio/**', stampLanding);
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

async function waitForConsumerQuote(page, slug) {
  await page.waitForFunction((sign) => (
    /^\$/u.test(document.querySelector(`[data-look="${sign}"] .vitrine-price__figure`)?.textContent?.trim() ?? '')
  ), slug, { timeout: 30_000 });
}

async function assertBuyActionInView(page, scope, { width, height }, label) {
  const action = page.locator(`${scope} .btn--fomo`);
  assert.equal(await action.count(), 1, `${label}: one Fomo action`);
  // The bag slides in; measure it once it has settled.
  await page.waitForFunction((selector) => {
    const box = document.querySelector(`${selector} .btn--fomo`)?.getBoundingClientRect();
    return box && box.top >= 0 && box.bottom <= window.innerHeight;
  }, scope, { timeout: 5_000 }).catch(() => {});
  assert.ok(await action.isVisible(), `${label}: the Fomo action is visible at ${width}x${height}`);
  const box = await action.boundingBox();
  assert.ok(box && box.y >= 0 && box.y + box.height <= height && box.x >= 0 && box.x + box.width <= width, `${label}: the complete Fomo action stays in the ${width}x${height} screen`);
  assert.ok(Math.abs(box.height - 48) <= .5, `${label}: the Fomo action keeps its 48px target`);
  assert.ok(await action.locator('strong').evaluate((node) => node.clientWidth > 0 && node.scrollWidth <= node.clientWidth), `${label}: Buy with Fomo fits without clipping`);
}

async function assertFirstScreen(page, { width, height }) {
  assert.deepEqual(page.viewportSize(), { width, height });
  for (const selector of ['.campaign-hero__film', '#campaign-hero-title', '.terminal-consumer-hero__kicker']) {
    assert.ok(await page.locator(selector).isVisible(), `${selector} must be visible at ${width}x${height}`);
  }
  const title = await page.locator('#campaign-hero-title').boundingBox();
  assert.ok(title && title.y >= 0 && title.y + title.height <= height, `the headline sits in the first ${width}x${height} screen`);
  assert.equal(await page.locator('.campaign-bag').getAttribute('aria-hidden'), null, 'the bag is live in the first phone screen');
  await assertBuyActionInView(page, '.campaign-bag', { width, height }, 'hydrated bag');
  // The site-wide Guide launcher rises above the bag rather than covering it.
  await page.locator('.zguide-launcher').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(360);
  const overlap = await page.evaluate(() => {
    const launcher = document.querySelector('.zguide-launcher')?.getBoundingClientRect();
    const bag = document.querySelector('.campaign-bag')?.getBoundingClientRect();
    if (!launcher || !bag || launcher.width === 0) return null;
    return !(launcher.right <= bag.left || launcher.left >= bag.right || launcher.bottom <= bag.top || launcher.top >= bag.bottom);
  });
  assert.notEqual(overlap, true, `the Guide launcher does not cover the bag at ${width}x${height}`);
  const captionClear = await page.evaluate(() => {
    const launcher = document.querySelector('.zguide-launcher')?.getBoundingClientRect();
    const caption = document.querySelector('.campaign-hero__caption')?.getBoundingClientRect();
    if (!launcher || !caption || launcher.width === 0) return null;
    return launcher.top >= caption.bottom;
  });
  assert.notEqual(captionClear, false, `the Guide launcher stays clear of the opening caption at ${width}x${height}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, `no horizontal overflow at ${width}x${height}`);
}

async function assertStaticFirstScreen(page, { width, height, slug }) {
  assert.deepEqual(page.viewportSize(), { width, height });
  for (const selector of ['.static-astrofolio-kicker', '#static-astrofolio-title', '.campaign-hero__film']) {
    assert.ok(await page.locator(selector).isVisible(), `${selector} must be visible without JavaScript at ${width}x${height}`);
  }
  assert.equal(await page.locator(`.campaign-bag--static[data-campaign-bag="${slug}"]`).count(), 1, 'the no-JavaScript bag carries the season sign');
  await assertBuyActionInView(page, '.campaign-bag--static', { width, height }, 'no-JavaScript bag');
}

async function assertSignPicker(page, { width, height }) {
  assert.deepEqual(page.viewportSize(), { width, height });
  const picker = await page.locator('.campaign-runway__dots').evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    return {
      columns: getComputedStyle(node).gridTemplateColumns.split(' ').length,
      left: bounds.left,
      right: bounds.right,
      choices: [...node.querySelectorAll('.campaign-dot')].map((choice) => {
        const rect = choice.getBoundingClientRect();
        const image = choice.querySelector('img');
        return {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          filter: image ? getComputedStyle(image).filter : '',
          ring: getComputedStyle(choice, '::after').opacity,
          ringBorder: getComputedStyle(choice, '::after').borderTopWidth,
          ringRadius: getComputedStyle(choice, '::after').borderRadius,
          ringMotion: getComputedStyle(choice, '::after').transitionDuration,
          pressed: choice.getAttribute('aria-pressed'),
        };
      }),
    };
  });
  assert.equal(picker.columns, width <= 900 ? 6 : 12);
  assert.equal(picker.choices.length, 12);
  assert.ok(picker.choices.every((choice) => choice.width >= 44 && choice.height >= 44), `every sign remains touch-safe at ${width}x${height}`);
  assert.ok(picker.choices.every((choice) => choice.left >= -1 && choice.right <= width + 1), `every sign is fully exposed at ${width}x${height}`);
  assert.ok(picker.choices.every(({ filter }) => filter === 'none'), 'all twelve discs stay pastel');
  const pressed = picker.choices.filter((choice) => choice.pressed === 'true');
  assert.equal(pressed.length, 1, 'exactly one sign is chosen');
  assert.equal(pressed[0].ring, '1');
  assert.equal(pressed[0].ringBorder, '1px');
  assert.equal(pressed[0].ringRadius, '50%');
  assert.ok(picker.choices.filter((choice) => choice.pressed !== 'true').every((choice) => choice.ring === '0'), 'only the chosen sign carries the ring');
  assert.ok(picker.choices.every(({ ringMotion }) => ringMotion.split(',').every((duration) => Number.parseFloat(duration) <= .18)), 'the ring settles within 180ms');
}

async function assertFomoBranding(action) {
  const style = await action.evaluate((node) => {
    const computed = getComputedStyle(node);
    const logo = node.querySelector('img')?.getBoundingClientRect();
    const arrow = node.querySelector('.btn--fomo__arrow');
    const arrowStyle = arrow ? getComputedStyle(arrow) : null;
    return {
      background: computed.backgroundImage,
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      radius: computed.borderRadius,
      shadow: computed.boxShadow,
      logoWidth: logo?.width,
      arrowWidth: arrow?.getBoundingClientRect().width,
      arrowBackground: arrowStyle?.backgroundColor,
      arrowShape: arrowStyle?.borderRadius ?? '',
    };
  });
  assert.notEqual(style.background, 'none', 'the primary action keeps its branded highlight');
  assert.equal(style.backgroundColor, 'rgb(241, 240, 236)');
  assert.equal(style.color, 'rgb(17, 19, 24)');
  assert.equal(style.radius, '999px');
  assert.notEqual(style.shadow, 'none');
  assert.equal(style.logoWidth, 34);
  assert.equal(style.arrowWidth, 31);
  assert.equal(style.arrowBackground, 'rgb(83, 93, 221)');
  assert.equal(style.arrowShape, '50%');
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
    await waitForTerminal(page, '#campaign-hero-title');
    assert.equal(await page.locator('#campaign-hero-title').innerText(), 'The twelve official Zodiacs.');
    assert.equal(await page.locator('.astrofolio-lockup__copy small').innerText(), `${expectedSeason.displayName} Season`);
    assert.equal(await page.locator('.astrofolio-lockup__copy small strong').innerText(), expectedSeason.displayName);
    assert.match(await page.locator('.astrofolio-lockup__avatar').getAttribute('src') ?? '', /\/assets\/astrofolio\/v2\/zodiac-ring-192\.png$/u);
    assert.match(await page.locator('.astrofolio-lockup__avatar').evaluate((node) => getComputedStyle(node).backgroundImage), /#010204|rgb\(1, 2, 4\)/u);
    assert.equal(await page.locator('.terminal-consumer-hero__kicker').innerText(), 'Astrofolio');
    assert.equal(await page.locator('.wnav > .wnav__mark').count(), 1);
    assert.equal(await page.locator('.wnav > .wnav__chip').innerText(), 'ASTROFOLIO');
    assert.equal(await page.locator('.wnav > .wnav__burger').count(), 1);
    assert.equal(await page.locator('.wnav > .wnav__search').count(), 1);
    await page.setViewportSize({ width: 320, height: 844 });
    const compactNav = await page.locator('.wnav').evaluate((nav) => {
      const box = nav.getBoundingClientRect();
      const navStyle = getComputedStyle(nav);
      const search = nav.querySelector('.wnav__search');
      const searchStyle = search ? getComputedStyle(search) : null;
      const chip = nav.querySelector('.wnav__chip');
      const chipStyle = chip ? getComputedStyle(chip) : null;
      const burger = nav.querySelector('.wnav__burger');
      const burgerStyle = burger ? getComputedStyle(burger) : null;
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
        searchHeight: searchStyle?.height,
        chipHeight: chipStyle?.height,
        burgerWidth: burgerStyle?.width,
        burgerHeight: burgerStyle?.height,
      };
    });
    assert.ok(compactNav.overflow <= 0, 'the 320px navigation does not create horizontal overflow');
    assert.ok(compactNav.left >= 0 && compactNav.right <= 320, 'the single glass capsule stays inside the 320px viewport');
    assert.ok(compactNav.width <= 308, `the compact capsule leaves viewport breathing room (${compactNav.width}px)`);
    assert.notEqual(compactNav.navBackground, 'rgba(0, 0, 0, 0)', 'the navigation keeps its liquid-glass tint');
    assert.notEqual(compactNav.navBackdrop, 'none', 'the navigation keeps its refractive or frosted backdrop');
    assert.equal(compactNav.navBorder, '1px', 'the glass capsule keeps its optical hairline');
    assert.equal(compactNav.navRadius, '999px', 'the navigation remains one capsule');
    assert.equal(compactNav.searchBackground, 'rgba(0, 0, 0, 0)', 'search has no separate circle background');
    assert.equal(compactNav.searchBorder, '0px', 'search has no separate circle border');
    assert.equal(compactNav.searchWidth, '44px', 'search keeps a 44px touch target inside the capsule');
    assert.equal(compactNav.searchHeight, '44px', 'search keeps a 44px touch target inside the capsule');
    assert.ok(Number.parseFloat(compactNav.chipHeight) >= 44, 'the Astrofolio chip keeps a 44px touch target');
    assert.equal(compactNav.burgerWidth, '44px', 'the menu keeps a 44px touch target');
    assert.equal(compactNav.burgerHeight, '44px', 'the menu keeps a 44px touch target');
    await page.setViewportSize({ width: 390, height: 844 });

    // One batched read feeds the bag, all twelve looks, and the leaderboard.
    await waitForConsumerQuote(page, 'pisces');
    assert.equal(counts.dex, 1, 'the first screen uses one batched quote request');
    assert.equal(counts.dexPairs, 1, 'one pair overlay repairs the token batch without per-sign requests');
    assert.equal(await page.locator('[data-consumer-sign]').count(), 12);
    assert.equal(await page.locator('[data-consumer-sign="pisces"][aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator('#the-twelve').getAttribute('data-mode'), 'carousel', 'phones swipe the runway rather than pinning it');
    assert.equal(await page.locator('#campaign-runway-title').innerText(), 'All twelve, starting with Pisces.');
    assert.equal(await page.locator('.campaign-runway__track > .campaign-look').count(), 12);
    assert.equal(await page.locator('.campaign-runway__track > .campaign-look').first().getAttribute('data-look'), 'pisces');
    assert.equal(await page.locator(`.campaign-look.is-season[data-look="${expectedSeason.sign}"]`).count(), 1);
    assert.equal(await page.locator('.campaign-look.is-season').count(), 1);

    const bag = page.locator('.campaign-bag[data-campaign-bag="pisces"]');
    assert.equal(await bag.count(), 1, 'the bag follows the chosen sign');
    assert.match(await bag.innerText(), /Pisces[\s\S]*\$0\.000012[\s\S]*-11\.50%/u);
    assert.equal(await bag.locator('.campaign-bag__move').evaluate((node) => getComputedStyle(node).color), 'rgb(242, 142, 135)');
    const bagCta = bag.locator('.btn--fomo');
    assert.equal(await bagCta.getAttribute('href'), 'https://fomo.family/coin?address=3JsSsmGzjWDNe9XCw2L9vznC5JU9wSqQeB6ns5pAkPeE&chainId=1399811149');
    assert.equal(await bagCta.getAttribute('aria-label'), 'Open Fomo to buy Pisces');
    await assertFomoBranding(bagCta);

    const activeLook = page.locator('[data-look="pisces"]');
    const activeLookText = await activeLook.innerText();
    assert.match(activeLookText, /Pisces/u);
    assert.match(activeLookText, /\$0\.000012[\s\S]*down 11\.50% today/u);
    assert.match(activeLookText, /February 19 to March 20/u);
    const exploreCta = activeLook.locator('.campaign-look__explore');
    assert.equal(await exploreCta.innerText(), 'Explore Pisces');
    assert.equal(await exploreCta.getAttribute('href'), '/registry/pisces/');
    assert.ok((await exploreCta.boundingBox()).height >= 44, 'Explore keeps a touch-safe target');
    const fomoCta = activeLook.locator('.btn--fomo');
    assert.equal(await fomoCta.getAttribute('href'), 'https://fomo.family/coin?address=3JsSsmGzjWDNe9XCw2L9vznC5JU9wSqQeB6ns5pAkPeE&chainId=1399811149');
    assert.equal(await fomoCta.getAttribute('aria-label'), 'Open Fomo to buy Pisces');
    assert.equal(await fomoCta.locator('img[src="/assets/venues/fomo-official.svg"]').count(), 1);
    assert.equal(await fomoCta.locator('.btn--fomo__copy small').textContent(), 'Pisces ♓️');
    assert.equal(await fomoCta.locator('.btn--fomo__copy strong').innerText(), 'Buy with Fomo');
    assert.doesNotMatch(await fomoCta.innerText(), /selected/iu);
    assert.ok(Math.abs((await fomoCta.boundingBox()).height - 48) <= .5, 'the look keeps the 48px Fomo target');
    assert.ok(await fomoCta.locator('strong').evaluate((node) => node.clientWidth > 0 && node.scrollWidth <= node.clientWidth), 'the complete Buy with Fomo label fits without clipping');
    await assertFomoBranding(fomoCta);
    assert.equal(await activeLook.locator('.vitrine-buy-options a').innerText(), 'Other ways to buy');
    assert.equal(await activeLook.locator('.vitrine-buy-options a').getAttribute('href'), '/astrofolio/how-to-buy/pisces/');
    assert.ok(await activeLook.locator('.vitrine-buy-options a').evaluate((node) => node.getBoundingClientRect().height >= 32));
    const movementStyle = await activeLook.locator('.vitrine-price__movement').evaluate((node) => ({
      className: node.className,
      color: getComputedStyle(node).color,
    }));
    assert.match(movementStyle.className, /\bis-down\b/u);
    assert.equal(movementStyle.color, 'rgb(242, 142, 135)');
    assert.equal(await page.locator('[role="status"]').filter({ hasText: /Prices read/u }).count(), 1, 'one polite price status for the runway');
    assert.equal(await page.locator('[data-terminal-preference-banner]').count(), 0);
    assert.equal(await page.locator('.campaign-hero [data-terminal-view-link="pro"]').count(), 0);

    await assertFirstScreen(page, { width: 390, height: 844 });
    if (OUT) await page.screenshot({ path: `${OUT}/astrofolio-390x844.png`, fullPage: false });
    await page.setViewportSize({ width: 375, height: 600 });
    await assertFirstScreen(page, { width: 375, height: 600 });
    await page.setViewportSize({ width: 390, height: 844 });

    const marketGateway = page.locator('#market-layer');
    assert.equal(await marketGateway.count(), 1);
    assert.equal(await marketGateway.locator('.consumer-market-leaderboard ol > li').count(), 12);
    assert.equal(await marketGateway.locator('.consumer-market-leaderboard__icon img').count(), 12);
    const leaderboardIconBoxes = await marketGateway.locator('.consumer-market-leaderboard__icon').evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    assert.ok(leaderboardIconBoxes.every(({ width, height }) => width >= 34 && height >= 34 && Math.abs(width - height) <= 1), 'leaderboard icons stay large and circular');
    assert.equal(await marketGateway.locator('.consumer-market-leaderboard li.is-active .consumer-market-leaderboard__icon img').getAttribute('src'), '/assets/zodiac-icons/48/pisces.webp');
    const libraLeaderboardRow = marketGateway.locator('a[href="/astrofolio/?sign=libra#consumer-sign-preview"]');
    assert.match(await libraLeaderboardRow.innerText(), /\$171\.4K/u);
    assert.doesNotMatch(await marketGateway.innerText(), /\$756\.2M/u);
    assert.equal(await marketGateway.locator('.consumer-market-gateway__action').count(), 2);
    assert.equal(await marketGateway.locator('a[href="/registry/technical/#market-transparency"] > span').first().innerText(), 'How ranking works');
    assert.equal(await marketGateway.locator('a[href="/terminal/?rank=marketCap"] > span').first().innerText(), 'View full market');
    assert.deepEqual(await marketGateway.locator('.consumer-market-leaderboard__identity strong').allInnerTexts().then((items) => [items[0], items.at(-1)]), ['Aries', 'Pisces']);
    assert.equal(await marketGateway.locator('.consumer-market-leaderboard li.is-active .consumer-market-leaderboard__identity strong').innerText(), 'Pisces');
    const marketGatewayLayout = await marketGateway.evaluate((node) => {
      const links = [...node.querySelectorAll('.consumer-market-gateway__action')];
      const rows = [...node.querySelectorAll('.consumer-market-leaderboard li > a')];
      const names = [...node.querySelectorAll('.consumer-market-leaderboard__identity strong')];
      const moves = [...node.querySelectorAll('.consumer-market-leaderboard__move')];
      const metrics = [...node.querySelectorAll('.consumer-market-leaderboard__metric strong')];
      const shell = node.querySelector('.consumer-market-gateway__shell')?.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        shellWidth: shell?.width,
        viewport: document.documentElement.clientWidth,
        buttons: links.map((link) => ({
          height: link.getBoundingClientRect().height,
          radius: getComputedStyle(link).borderRadius,
        })),
        rowHeights: rows.map((row) => row.getBoundingClientRect().height),
        nameOverflow: names.map((name) => name.scrollWidth - name.clientWidth),
        moveDisplays: moves.map((move) => getComputedStyle(move).display),
        metricFonts: metrics.map((metric) => Number.parseFloat(getComputedStyle(metric).fontSize)),
      };
    });
    assert.ok(marketGatewayLayout.overflow <= 0, 'the market gateway creates no horizontal overflow');
    assert.ok(marketGatewayLayout.shellWidth <= marketGatewayLayout.viewport, 'the market gateway stays inside the mobile viewport');
    assert.ok(marketGatewayLayout.buttons.every((button) => button.height >= 52 && button.radius === '999px'), 'both market actions keep equal pill geometry');
    assert.ok(marketGatewayLayout.rowHeights.every((height) => height >= 48), 'every leaderboard row keeps a touch-safe height');
    assert.ok(marketGatewayLayout.nameOverflow.every((overflow) => overflow <= 0), 'every leaderboard sign name remains fully visible on mobile');
    assert.ok(marketGatewayLayout.moveDisplays.every((display) => display === 'none'), 'mobile prioritizes market cap over the secondary 24h column');
    assert.ok(marketGatewayLayout.metricFonts.every((size) => size >= 11), 'mobile market-cap values remain consumer-readable');
    assert.equal(await page.locator('a[href^="/terminal/"]').count(), 1);
    assert.equal(await page.locator('.consumer-shop a[href="https://shop.app/m/41mzeq7f2h"]').count(), 1);
    assert.equal(await page.locator('.consumer-shop a[href^="https://shop.app/products/"]').count(), 3);
    assert.equal(await page.locator('#registry .consumer-verify.is-embedded#verify').count(), 1);
    assert.equal(await page.locator('#registry .campaign-record__address').innerText(), '3JsSsmGzjWDNe9XCw2L9vznC5JU9wSqQeB6ns5pAkPeE');
    assert.equal(await page.locator('#faq summary').count(), 7);
    assert.deepEqual(await page.locator('#faq summary').allInnerTexts().then((items) => items.slice(-2)), ['What are the risks?', 'What is the Terminal?']);
    assert.equal(await page.locator('[data-consumer-market-snapshot], .consumer-snapshot').count(), 0);
    assert.equal(await page.getByText('Data & methodology', { exact: true }).count(), 1);
    assert.equal(await page.locator('.consumer-registry .market-tape, .consumer-registry .pro-aggregate, .consumer-registry [data-landing-trade]').count(), 0);
    assert.equal(await page.locator('#buy a[href="https://apps.apple.com/us/app/fomo-never-miss-out/id6741115427"]').count(), 1);
    assert.equal(await page.locator('#buy a[href="https://play.google.com/store/apps/details?id=family.fomo.app"]').count(), 1);
    assert.equal(counts.gecko, 0);
    assert.equal(counts.wikimedia, 0);
    assert.equal(counts.jupiter, 0);
    assert.equal(counts.wallet, 0);
    await assertSignPicker(page, { width: 390, height: 844 });

    // Choosing a sign moves the swipeable runway to it and hands the bag,
    // the record, and the address bar the choice.
    await page.locator('[data-consumer-sign="aquarius"]').click();
    await page.waitForFunction(() => {
      const look = document.querySelector('[data-look="aquarius"]')?.getBoundingClientRect();
      const track = document.querySelector('.campaign-runway__track')?.getBoundingClientRect();
      return look && track && look.left >= track.left - 1 && look.right <= track.right + 1;
    });
    assert.equal(new URL(page.url()).searchParams.get('sign'), 'aquarius');
    assert.equal(await page.locator('.campaign-bag').getAttribute('data-campaign-bag'), 'aquarius');
    assert.equal(await page.locator('[data-look="aquarius"].is-active').count(), 1);

    const selector = page.locator('[data-consumer-sign="aquarius"]');
    await selector.focus();
    await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-consumer-sign="aries"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-consumer-sign="aries"]').getAttribute('tabindex'), '0');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('[data-consumer-sign="libra"]').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator('[data-consumer-sign="aries"]').getAttribute('aria-pressed'), 'true');
    const keyboardRingMotion = await page.locator('.campaign-dot').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node, '::after').transitionDuration));
    assert.ok(keyboardRingMotion.every((duration) => /^(?:0s|0ms)(?:, (?:0s|0ms))*$/u.test(duration)), 'keyboard selection is immediate for incoming and outgoing rings');
    await page.setViewportSize({ width: 320, height: 844 });
    await assertSignPicker(page, { width: 320, height: 844 });
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-consumer-sign="taurus"]').getAttribute('aria-pressed'), 'true');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press('End');
    assert.equal(await page.locator('[data-consumer-sign="pisces"]').getAttribute('aria-pressed'), 'true');
    assert.equal(new URL(page.url()).searchParams.get('sign'), 'pisces');
    assert.equal(await page.locator('.campaign-bag').getAttribute('data-campaign-bag'), 'pisces');

    // Swiping the runway moves along it without changing the chosen sign.
    await page.locator('.campaign-runway__track').evaluate((node) => { node.scrollLeft = node.scrollWidth; });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-consumer-sign="pisces"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.campaign-bag').getAttribute('data-campaign-bag'), 'pisces');
    const lookHeightTall = await page.locator('[data-look="pisces"]').evaluate((node) => node.getBoundingClientRect().height);
    await page.setViewportSize({ width: 390, height: 760 });
    const lookHeightShort = await page.locator('[data-look="pisces"]').evaluate((node) => node.getBoundingClientRect().height);
    assert.ok(Math.abs(lookHeightTall - lookHeightShort) <= 1, 'browser-chrome height changes do not resize the swipeable looks');
    await page.setViewportSize({ width: 390, height: 844 });

    // The bag rests while the runway fills the screen and over the ending.
    await page.locator('#the-twelve').evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.campaign-bag')?.classList.contains('is-hidden'));
    assert.equal(await page.locator('.campaign-bag').getAttribute('aria-hidden'), 'true');
    await page.locator('#buy').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('.campaign-bag')?.classList.contains('is-hidden'));
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.campaign-bag')?.classList.contains('is-hidden'));

    await page.locator('#shop').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('.consumer-shop__product img')].every((image) => (
      image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    )));
    const hydratedShopImages = await page.locator('.consumer-shop__product img').evaluateAll((images) => images.map((image) => {
      const box = image.getBoundingClientRect();
      return {
        sameOrigin: new URL(image.currentSrc).origin === window.location.origin,
        path: new URL(image.currentSrc).pathname,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        width: box.width,
        height: box.height,
      };
    }));
    assert.deepEqual(hydratedShopImages.map(({ path }) => path), [
      '/assets/astrofolio/merch/hoodie-800.webp',
      '/assets/astrofolio/merch/cap-800.webp',
      '/assets/astrofolio/merch/t-shirt-800.webp',
    ]);
    assert.ok(hydratedShopImages.every((image) => image.sameOrigin && image.naturalWidth > 0 && image.naturalHeight > 0 && image.width > 0 && image.height > 0), 'every hydrated merchandise image loads visibly from the site origin');
    if (OUT) await page.screenshot({ path: `${OUT}/astrofolio-merch-mobile.png`, fullPage: false });
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertSignPicker(page, { width: 768, height: 1024 });
    const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(tabletOverflow <= 0, 'the tablet layout has no horizontal overflow');
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
    await waitForTerminal(desktopPage, '#campaign-hero-title');
    await waitForConsumerQuote(desktopPage, 'leo');
    // The closed film sits inside the wordmark and the headline waits until
    // it has opened; the bag is live from the first screen, below the film.
    const closed = await desktopPage.evaluate(() => {
      const film = document.querySelector('.campaign-hero__film').getBoundingClientRect();
      const astro = document.querySelector('.campaign-hero__word--astro').getBoundingClientRect();
      const folio = document.querySelector('.campaign-hero__word--folio').getBoundingClientRect();
      const bag = document.querySelector('.campaign-bag').getBoundingClientRect();
      const foot = document.querySelector('.campaign-hero__foot p').getBoundingClientRect();
      return {
        film: film.toJSON(),
        astro: astro.toJSON(),
        folio: folio.toJSON(),
        bag: bag.toJSON(),
        foot: foot.toJSON(),
        caption: getComputedStyle(document.querySelector('.campaign-hero__caption')).opacity,
        bagHidden: document.querySelector('.campaign-bag').classList.contains('is-hidden'),
        heroHeight: document.getElementById('official-twelve').offsetHeight,
      };
    });
    assert.ok(Math.abs(closed.film.width - Math.min(1440 * .27, 900 * .40)) <= 1, 'the closed film keeps its wordmark width');
    assert.ok(Math.abs(closed.film.x + closed.film.width / 2 - 720) <= 1 && Math.abs(closed.film.y + closed.film.height / 2 - 450) <= 1, 'the closed film is centred');
    assert.ok(closed.astro.right <= closed.film.x && closed.folio.left >= closed.film.right, 'Astro and folio flank the film');
    assert.ok(closed.astro.left >= 0 && closed.folio.right <= 1440, 'the wordmark stays inside the screen');
    assert.equal(closed.caption, '0');
    assert.equal(closed.bagHidden, false, 'the bag is live in the first desktop screen');
    assert.ok(closed.bag.top >= closed.film.bottom, 'the bag sits below the closed film');
    assert.ok(closed.foot.width === 0 || closed.foot.right <= closed.bag.left, 'the foot copy stays clear of the bag');
    await assertBuyActionInView(desktopPage, '.campaign-bag', { width: 1440, height: 900 }, 'first desktop screen');
    assert.equal(await desktopPage.locator('.campaign-bag').getAttribute('data-campaign-bag'), 'leo');
    assert.ok(closed.heroHeight > 900 * 2, 'the opening pins for more than two screens of scroll');
    if (OUT) await desktopPage.screenshot({ path: `${OUT}/astrofolio-1440x900.png`, fullPage: false });
    await desktopPage.evaluate(() => {
      const hero = document.getElementById('official-twelve');
      window.scrollTo({ top: hero.offsetHeight - window.innerHeight, behavior: 'instant' });
    });
    await desktopPage.waitForFunction(() => document.getElementById('official-twelve')?.dataset.caption === 'live');
    const opened = await desktopPage.evaluate(() => {
      const film = document.querySelector('.campaign-hero__film').getBoundingClientRect();
      return {
        film: film.toJSON(),
        caption: getComputedStyle(document.querySelector('.campaign-hero__caption')).opacity,
        words: getComputedStyle(document.querySelector('.campaign-hero__word--astro')).opacity,
      };
    });
    assert.ok(opened.film.x <= 0 && opened.film.y <= 0 && opened.film.right >= 1440 && opened.film.bottom >= 900, 'the opened film covers the screen');
    assert.equal(opened.caption, '1');
    assert.equal(Number.parseFloat(opened.words), 0);
    await desktopPage.waitForFunction(() => !document.querySelector('.campaign-bag')?.classList.contains('is-hidden'));
    await assertBuyActionInView(desktopPage, '.campaign-bag', { width: 1440, height: 900 }, 'desktop bag');
    await assertFomoBranding(desktopPage.locator('.campaign-bag .btn--fomo'));
    if (OUT) await desktopPage.screenshot({ path: `${OUT}/astrofolio-1440x900-opened.png`, fullPage: false });

    // The runway pins and carries the looks sideways, starting with the sign
    // the visit opened with.
    await desktopPage.evaluate(() => window.scrollTo({ top: document.getElementById('the-twelve').offsetTop, behavior: 'instant' }));
    await desktopPage.waitForFunction(() => document.getElementById('the-twelve')?.dataset.mode === 'pinned');
    await desktopPage.waitForFunction(() => document.querySelector('.campaign-bag')?.classList.contains('is-hidden'));
    assert.equal(await desktopPage.locator('#campaign-runway-title').innerText(), 'All twelve, starting with Leo.');
    assert.equal(await desktopPage.locator('.campaign-runway__count').innerText(), '01 / 12');
    const runwayStart = await desktopPage.evaluate(() => {
      const pin = document.querySelector('.campaign-runway__pin').getBoundingClientRect();
      const first = document.querySelector('.campaign-runway__track > .campaign-look').getBoundingClientRect();
      const section = document.getElementById('the-twelve');
      return { pinTop: pin.top, pinHeight: pin.height, firstLeft: first.left, firstRight: first.right, sectionHeight: section.offsetHeight };
    });
    assert.ok(Math.abs(runwayStart.pinTop) <= 1 && Math.abs(runwayStart.pinHeight - 900) <= 1, 'the runway pins to the screen');
    assert.ok(runwayStart.firstLeft >= 0 && runwayStart.firstRight <= 1440, 'the first look starts in view');
    assert.ok(runwayStart.sectionHeight > 900 * 3, 'the runway spends scroll on its sideways travel');
    await assertSignPicker(desktopPage, { width: 1440, height: 900 });
    if (OUT) await desktopPage.screenshot({ path: `${OUT}/astrofolio-1440x900-runway.png`, fullPage: false });
    await desktopPage.evaluate(() => {
      const section = document.getElementById('the-twelve');
      window.scrollTo({ top: section.offsetTop + (section.offsetHeight - window.innerHeight) / 2, behavior: 'instant' });
    });
    await desktopPage.waitForFunction(() => document.querySelector('.campaign-runway__count b')?.textContent !== '01');
    assert.match(await desktopPage.locator('.campaign-runway__track').evaluate((node) => node.style.transform), /translate3d\(-\d/u);
    assert.equal(await desktopPage.locator('[data-consumer-sign="leo"]').getAttribute('aria-pressed'), 'true', 'passing looks never changes the chosen sign');
    // Keyboard focus inside the pinned runway brings its look into view.
    await desktopPage.locator('[data-look="gemini"] .campaign-look__explore').focus();
    await desktopPage.keyboard.press('Shift+Tab');
    await desktopPage.keyboard.press('Tab');
    await desktopPage.waitForFunction(() => {
      const look = document.querySelector('[data-look="gemini"]')?.getBoundingClientRect();
      return look && look.left >= 0 && look.right <= window.innerWidth;
    });
    // Choosing a far sign travels there and hands the bag the choice.
    await desktopPage.locator('[data-consumer-sign="virgo"]').click();
    await desktopPage.waitForFunction(() => {
      const look = document.querySelector('[data-look="virgo"]')?.getBoundingClientRect();
      return look && Math.abs(look.left + look.width / 2 - window.innerWidth / 2) <= 2;
    });
    assert.equal(new URL(desktopPage.url()).searchParams.get('sign'), 'virgo');
    assert.equal(await desktopPage.locator('.campaign-bag').getAttribute('data-campaign-bag'), 'virgo');
    await desktopPage.locator('#buy').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await desktopPage.waitForFunction(() => !document.querySelector('.campaign-bag')?.classList.contains('is-hidden'));
    assert.equal(await desktopPage.locator('#registry .campaign-record__label').innerText(), 'Virgo · Solana origin');

    for (const [width, height] of [[1024, 900], [1200, 900], [901, 900], [1280, 680]]) {
      await desktopPage.setViewportSize({ width, height });
      await desktopPage.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await desktopPage.waitForTimeout(80);
      await desktopPage.waitForFunction(() => !document.querySelector('.campaign-bag')?.classList.contains('is-hidden'));
      const geometry = await desktopPage.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        astroLeft: document.querySelector('.campaign-hero__word--astro').getBoundingClientRect().left,
        folioRight: document.querySelector('.campaign-hero__word--folio').getBoundingClientRect().right,
        film: document.querySelector('.campaign-hero__film').getBoundingClientRect().toJSON(),
        bag: document.querySelector('.campaign-bag').getBoundingClientRect().toJSON(),
        foot: document.querySelector('.campaign-hero__foot p').getBoundingClientRect().toJSON(),
      }));
      assert.ok(geometry.scroll <= geometry.client, `${width}px desktop has no horizontal overflow`);
      assert.ok(geometry.astroLeft >= 0 && geometry.folioRight <= geometry.client, `${width}px keeps the wordmark inside the screen`);
      assert.ok(geometry.bag.top >= geometry.film.bottom, `${width}px keeps the bag below the closed film`);
      assert.ok(geometry.foot.width === 0 || geometry.foot.right <= geometry.bag.left, `${width}px keeps the foot copy clear of the bag`);
      await assertSignPicker(desktopPage, { width, height });
    }
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
    await waitForTerminal(frenchPage, '#campaign-hero-title');
    await waitForConsumerQuote(frenchPage, 'aries');
    const frenchLook = frenchPage.locator('[data-look="aries"]');
    assert.equal(await frenchLook.locator('.vitrine-price__figure').innerText(), '$1,234.50');
    assert.equal(await frenchLook.locator('.vitrine-price__movement').innerText(), 'up 0.50% today');
    assert.match(await frenchLook.locator('.vitrine-price__movement').getAttribute('class'), /\bis-up\b/u);
    assert.equal(await frenchLook.locator('.vitrine-price__movement').evaluate((node) => getComputedStyle(node).color), 'rgb(141, 217, 173)');
    assert.match(await frenchPage.locator('.campaign-bag').innerText(), /\$1,234\.50[\s\S]*\+0\.50%/u);
    assert.equal(await frenchPage.locator('.campaign-bag__move').evaluate((node) => getComputedStyle(node).color), 'rgb(141, 217, 173)');
    await frenchLocale.close();

    const failedArtwork = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await installNetworkHarness(failedArtwork);
    await failedArtwork.route(
      /\/assets\/(?:sculptures\/(?:512|1024)|cabinet-materials\/gold)\/virgo\.webp$/u,
      (route) => route.abort(),
    );
    const failedArtworkPage = await failedArtwork.newPage();
    await failedArtworkPage.goto(`${baseURL}/astrofolio/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(failedArtworkPage, '#campaign-hero-title');
    await failedArtworkPage.locator('[data-consumer-sign="virgo"]').click();
    await failedArtworkPage.waitForFunction(() => document.querySelector('[data-look="virgo"] .campaign-look__art.is-fallback'));
    assert.equal(await failedArtworkPage.locator('[data-look="virgo"] .campaign-look__figure').isVisible(), false);
    assert.equal(await failedArtworkPage.locator('[data-look="virgo"] .campaign-look__fallback').isVisible(), true);
    assert.equal(await failedArtworkPage.locator('[data-look="virgo"] .campaign-look__fallback').getAttribute('role'), 'img');
    assert.match(
      await failedArtworkPage.locator('[data-look="virgo"] .campaign-look__fallback').getAttribute('aria-label') ?? '',
      /^Virgo artwork unavailable; .+ symbol shown$/u,
    );
    assert.equal(await failedArtworkPage.locator('[data-look="virgo"] h3').innerText(), 'Virgo');
    assert.equal(await failedArtworkPage.locator('[data-look="virgo"] .btn--fomo').isVisible(), true, 'a missing artwork never removes the way to buy');
    await failedArtwork.close();

    const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await installNetworkHarness(reduced);
    const reducedPage = await reduced.newPage();
    const reducedErrors = watchErrors(reducedPage, 'Astrofolio reduced motion');
    await reducedPage.goto(`${baseURL}/astrofolio/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(reducedPage, '#campaign-hero-title');
    await reducedPage.waitForTimeout(400);
    const reducedFilm = await reducedPage.evaluate(() => {
      const video = document.querySelector('.campaign-hero__video');
      return {
        playing: document.querySelector('.campaign-hero__film')?.dataset.playing,
        currentSrc: video?.currentSrc ?? null,
        pending: video?.querySelectorAll('source[data-src]').length,
        cue: getComputedStyle(document.querySelector('.campaign-hero__foot i')).animationName,
        bag: getComputedStyle(document.querySelector('.campaign-bag')).transitionDuration,
      };
    });
    assert.equal(reducedFilm.playing, 'false', 'reduced motion keeps the film as its poster');
    assert.equal(reducedFilm.currentSrc, '', 'reduced motion never attaches film sources');
    assert.equal(reducedFilm.pending, 2);
    assert.equal(reducedFilm.cue, 'none');
    assert.match(reducedFilm.bag, /^(?:0s|0ms)(?:, (?:0s|0ms))*$/u);
    await reducedPage.locator('[data-consumer-sign="virgo"]').click();
    await reducedPage.waitForFunction(() => {
      const look = document.querySelector('[data-look="virgo"]')?.getBoundingClientRect();
      const track = document.querySelector('.campaign-runway__track')?.getBoundingClientRect();
      return look && track && look.left >= track.left - 1 && look.right <= track.right + 1;
    });
    const reducedRingMotion = await reducedPage.locator('.campaign-dot.is-active').evaluate((node) => getComputedStyle(node, '::after').transitionDuration);
    assert.match(reducedRingMotion, /^(?:0s|0ms)(?:, (?:0s|0ms))*$/u);
    if (OUT) await reducedPage.screenshot({ path: `${OUT}/astrofolio-390x844-reduced-motion.png`, fullPage: false });
    await reducedPage.setViewportSize({ width: 1440, height: 900 });
    await reducedPage.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await reducedPage.waitForFunction(() => document.getElementById('the-twelve')?.dataset.mode === 'carousel');
    const reducedDesktop = await reducedPage.evaluate(() => ({
      heroHeight: document.getElementById('official-twelve').getBoundingClientRect().height,
      caption: getComputedStyle(document.querySelector('.campaign-hero__caption')).opacity,
      runwayHeight: document.getElementById('the-twelve').style.height,
    }));
    assert.ok(Math.abs(reducedDesktop.heroHeight - 900) <= 1, 'reduced motion does not pin the opening');
    assert.equal(reducedDesktop.caption, '1');
    assert.equal(reducedDesktop.runwayHeight, '', 'reduced motion does not pin the runway');
    await assertBuyActionInView(reducedPage, '.campaign-bag', { width: 1440, height: 900 }, 'reduced-motion desktop bag');
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
    await proPage.locator('.pro-board th button', { hasText: 'Indexed liquidity' }).focus();
    await proPage.keyboard.press('Enter');
    assert.equal((await proPage.locator('th[aria-sort="descending"] button').textContent())?.trim(), 'Indexed liquidity');
    assert.match(proPage.url(), /rank=liquidity/u);
    assert.equal(await proPage.locator('.pro-tape-control > button').count(), 0);
    assert.equal(await proPage.locator('[data-market-tape], .pro-static-tape').count(), 0);
    assert.equal(await proPage.locator('.wnav__chip').innerText(), 'ASTROFOLIO');
    assert.equal(await proPage.locator('.wnav__chip').getAttribute('href'), '/astrofolio/');
    const briefingRail = await proPage.locator('#briefing').evaluate((node) => {
      const box = node.getBoundingClientRect();
      const selected = document.querySelector('#selected')?.getBoundingClientRect();
      return { left: box.left, width: box.width, selectedLeft: selected?.left, selectedWidth: selected?.width };
    });
    assert.ok(Math.abs(briefingRail.left - briefingRail.selectedLeft) <= 1, 'briefing aligns to the selected-market rail');
    assert.ok(Math.abs(briefingRail.width - briefingRail.selectedWidth) <= 1, 'briefing matches the selected-market width');
    await proPage.setViewportSize({ width: 390, height: 844 });
    assert.equal(await proPage.locator('.pro-board__mobile > li').count(), 12);
    assert.equal(await proPage.locator('.pro-board__scroll').isVisible(), false);
    assert.deepEqual(proErrors, []);
    await pro.close();

    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(`${baseURL}/astrofolio/`, { waitUntil: 'load' });
    assert.equal(await noJsPage.locator('#static-astrofolio-title').innerText(), 'The twelve official Zodiacs.');
    assert.equal(await noJsPage.locator('.static-astrofolio-kicker').innerText(), 'Astrofolio');
    assert.equal(await noJsPage.locator('.static-astrofolio-lockup small').innerText(), `${expectedSeason.displayName} Season`);
    assert.equal(await noJsPage.locator('#the-twelve .campaign-look').count(), 12);
    assert.equal(await noJsPage.locator('#the-twelve .campaign-look.is-season').count(), 1);
    assert.equal(await noJsPage.locator(`#the-twelve .campaign-look.is-season[data-static-sign="${expectedSeason.sign}"]`).count(), 1, 'the release marks the real season in the no-JavaScript runway');
    assert.equal(await noJsPage.locator(`[data-static-sign="${expectedSeason.sign}"] .campaign-look__tag`).innerText(), 'In season now');
    assert.equal(await noJsPage.locator('#market-snapshot').count(), 1);
    assert.equal(await noJsPage.locator('#consumer-sign-preview').count(), 1);
    assert.equal(await noJsPage.locator('.static-snapshot').count(), 0);
    assert.equal(await noJsPage.locator('#faq details').count(), 7);
    assert.deepEqual(await noJsPage.locator('#faq summary').allInnerTexts().then((items) => items.slice(-2)), ['What are the risks?', 'What is the Terminal?']);
    assert.equal(await noJsPage.locator('#shop a[href="https://shop.app/m/41mzeq7f2h"]').count(), 1);
    assert.equal(await noJsPage.locator('#shop a[href^="https://shop.app/products/"]').count(), 6);
    assert.equal(await noJsPage.locator('#registry #verify').count(), 1);
    assert.equal(await noJsPage.locator('.zfooter--compact a[href="https://shop.app/m/41mzeq7f2h"]').count(), 0);
    assert.equal(await noJsPage.locator('[data-terminal-market-notice]').count(), 1);
    assert.equal(await noJsPage.locator('[data-terminal-static-view="pro"]').count(), 0);
    assert.equal(await noJsPage.locator('a[href^="/astrofolio/how-to-buy/"]').count(), 12);
    assert.equal(await noJsPage.locator('a[href="/astrofolio/how-to-buy/aries/"]').count(), 1);
    assert.equal(await noJsPage.locator('#the-twelve [data-fomo-buy]').count(), 12);
    assert.equal(await noJsPage.locator('[data-fomo-buy]').count(), 13, 'twelve looks and the season bag');
    assert.equal(await noJsPage.locator(`.campaign-bag--static [data-fomo-buy="${expectedSeason.sign}"]`).count(), 1);
    assert.equal(await noJsPage.locator('#the-twelve [data-fomo-buy="aries"]').getAttribute('href'), 'https://fomo.family/coin?address=GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv&chainId=1399811149');
    assert.equal(await noJsPage.locator('#the-twelve [data-fomo-buy="aries"] .btn--fomo__copy small').textContent(), 'Aries ♈️');
    assert.doesNotMatch(await noJsPage.locator('#the-twelve [data-fomo-buy="aries"]').innerText(), /selected/iu);
    assert.equal(await noJsPage.locator('a[href^="/terminal/?sign="]').count(), 0);
    assert.equal(await noJsPage.locator('video').count(), 0, 'the no-JavaScript opening is the film poster');
    assert.equal(await noJsPage.locator('#buy a[href="https://apps.apple.com/us/app/fomo-never-miss-out/id6741115427"]').count(), 1);
    assert.equal(await noJsPage.locator('#market-layer a[href="/registry/technical/#market-transparency"]').count(), 1);
    assert.equal(await noJsPage.locator('#market-layer a[href="/terminal/?rank=marketCap"]').count(), 1);
    assert.equal(await noJsPage.locator('#market-layer .consumer-market-leaderboard ol > li').count(), 12);
    assert.equal(await noJsPage.locator('#market-layer .consumer-market-leaderboard__icon img').count(), 12);
    const staticIconBoxes = await noJsPage.locator('#market-layer .consumer-market-leaderboard__icon').evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    assert.ok(staticIconBoxes.every(({ width, height }) => width >= 34 && height >= 34 && Math.abs(width - height) <= 1), 'no-JavaScript leaderboard icons keep the larger size');
    assert.equal(await noJsPage.locator('#market-layer .consumer-market-leaderboard__icon img').first().getAttribute('src'), '/assets/zodiac-icons/48/gemini.webp');
    assert.equal(await noJsPage.locator('#market-layer .consumer-market-leaderboard__identity strong').first().innerText(), 'Gemini');
    const seasonLook = noJsPage.locator(`#the-twelve [data-static-sign="${expectedSeason.sign}"]`);
    await seasonLook.scrollIntoViewIfNeeded();
    const staticLookGeometry = await seasonLook.evaluate((node) => {
      const fomo = node.querySelector('.btn--fomo');
      const explore = node.querySelector('.campaign-look__explore')?.getBoundingClientRect();
      const logo = fomo?.querySelector('img')?.getBoundingClientRect();
      const label = fomo?.querySelector('strong');
      return {
        fomoHeight: fomo?.getBoundingClientRect().height,
        exploreHeight: explore?.height,
        logoWidth: logo?.width,
        labelFits: Boolean(label && label.clientWidth > 0 && label.scrollWidth <= label.clientWidth),
      };
    });
    assert.ok(Math.abs(staticLookGeometry.fomoHeight - 48) <= .5, 'the no-JavaScript Fomo action keeps its 48px target');
    assert.ok(staticLookGeometry.exploreHeight >= 44, 'the no-JavaScript Explore link stays touch-safe');
    assert.ok(staticLookGeometry.labelFits, 'the no-JavaScript Buy with Fomo label fits without clipping');
    assert.equal(staticLookGeometry.logoWidth, 34);
    const staticTrack = await noJsPage.locator('#the-twelve .campaign-runway__track').evaluate((node) => ({
      overflowX: getComputedStyle(node).overflowX,
      snap: getComputedStyle(node).scrollSnapType,
      scrollable: node.scrollWidth > node.clientWidth,
    }));
    assert.equal(staticTrack.overflowX, 'auto', 'all twelve looks are reachable without JavaScript');
    assert.match(staticTrack.snap, /x mandatory/u);
    assert.equal(staticTrack.scrollable, true);
    await noJsPage.locator('#shop').scrollIntoViewIfNeeded();
    await noJsPage.waitForFunction(() => [...document.querySelectorAll('.static-shop__image img')].every((image) => (
      image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    )));
    const staticPageGeometry = await noJsPage.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      shopImages: [...document.querySelectorAll('.static-shop__image')].map((link) => {
        const box = link.getBoundingClientRect();
        const image = link.querySelector('img');
        const current = image?.currentSrc ? new URL(image.currentSrc) : null;
        return {
          left: box.left,
          right: box.right,
          width: box.width,
          height: box.height,
          sameOrigin: current?.origin === window.location.origin,
          path: current?.pathname,
          naturalWidth: image?.naturalWidth,
          naturalHeight: image?.naturalHeight,
        };
      }),
    }));
    assert.ok(staticPageGeometry.scrollWidth <= staticPageGeometry.viewport, 'the no-JavaScript Astrofolio page has no horizontal overflow');
    assert.ok(staticPageGeometry.shopImages.every(({ left, right, width }) => left >= 0 && right <= staticPageGeometry.viewport && width > 0), 'every no-JavaScript shop image stays inside the mobile viewport');
    assert.deepEqual(staticPageGeometry.shopImages.map(({ path }) => path), [
      '/assets/astrofolio/merch/hoodie-800.webp',
      '/assets/astrofolio/merch/cap-800.webp',
      '/assets/astrofolio/merch/t-shirt-800.webp',
    ]);
    assert.ok(staticPageGeometry.shopImages.every((image) => image.sameOrigin && image.naturalWidth > 0 && image.naturalHeight > 0 && image.height > 0), 'every no-JavaScript merchandise image loads visibly from the site origin');
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
    assert.equal(staticStoryStyle.buttonRadius, '999px');
    assert.notEqual(staticStoryStyle.filter, 'none');
    assert.doesNotMatch(staticStoryStyle.filter, /grayscale/u);
    assert.ok(staticStoryStyle.pictureBottom <= staticStoryStyle.copyTop + 1, 'the no-JavaScript thesis image sits above its copy');
    await noJsPage.evaluate(() => window.scrollTo(0, 0));
    await assertStaticFirstScreen(noJsPage, { width: 390, height: 844, slug: expectedSeason.sign });
    await noJsPage.setViewportSize({ width: 375, height: 600 });
    await assertStaticFirstScreen(noJsPage, { width: 375, height: 600, slug: expectedSeason.sign });
    await noJsPage.setViewportSize({ width: 390, height: 844 });
    await noJsPage.emulateMedia({ reducedMotion: 'reduce' });
    const staticMotion = await noJsPage.locator('.campaign-bag--static .btn--fomo').evaluate((node) => getComputedStyle(node).transitionDuration);
    assert.match(staticMotion, /^(?:0s|0ms)(?:, (?:0s|0ms))*$/u);
    const staticCueMotion = await noJsPage.locator('.campaign-hero__foot i').evaluate((node) => getComputedStyle(node).animationName);
    assert.equal(staticCueMotion, 'none');
    await noJsPage.emulateMedia({ reducedMotion: 'no-preference' });

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
      const overflow = await noJsPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `the no-JavaScript page has no horizontal overflow at ${viewport.width}px`);
    }
    await noJsPage.setViewportSize({ width: 768, height: 1024 });
    await noJsPage.goto(`${baseURL}/astrofolio/`, { waitUntil: 'load' });
    await assertStaticFirstScreen(noJsPage, { width: 768, height: 1024, slug: expectedSeason.sign });
    // Wide screens open on the closed film exactly as the application does,
    // so hydration never moves the first screen; the caption follows it.
    await noJsPage.setViewportSize({ width: 1440, height: 900 });
    await noJsPage.goto(`${baseURL}/astrofolio/`, { waitUntil: 'load' });
    const staticWide = await noJsPage.evaluate(() => {
      const film = document.querySelector('.campaign-hero__film').getBoundingClientRect();
      const title = document.getElementById('static-astrofolio-title').getBoundingClientRect();
      return {
        film: film.toJSON(),
        titleTop: title.top,
        bagDisplay: getComputedStyle(document.querySelector('.campaign-bag--static')).display,
        astroLeft: document.querySelector('.campaign-hero__word--astro').getBoundingClientRect().left,
        folioRight: document.querySelector('.campaign-hero__word--folio').getBoundingClientRect().right,
      };
    });
    assert.ok(Math.abs(staticWide.film.width - Math.min(1440 * .27, 900 * .40)) <= 1, 'the no-JavaScript film matches the application width');
    assert.ok(Math.abs(staticWide.film.x + staticWide.film.width / 2 - 720) <= 1 && Math.abs(staticWide.film.y + staticWide.film.height / 2 - 450) <= 1, 'the no-JavaScript film matches the application position');
    assert.ok(staticWide.astroLeft >= 0 && staticWide.folioRight <= 1440);
    assert.ok(staticWide.titleTop >= 900, 'the no-JavaScript caption follows the first wide screen');
    assert.notEqual(staticWide.bagDisplay, 'none', 'the wide no-JavaScript opening carries the season bag, as the application does');
    await assertStaticFirstScreen(noJsPage, { width: 1440, height: 900, slug: expectedSeason.sign });
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
    await waitForTerminal(collectionPage, '#campaign-hero-title');
    assert.equal(await collectionPage.locator('[data-registry-collection]').count(), 1);
    assert.equal(await collectionPage.locator('[data-registry-collection] .consumer-cabinet__seat').count(), 12);
    assert.equal(await collectionPage.locator('[data-registry-collection] .consumer-cabinet__seat.is-filled').count(), 5);
    assert.equal(await collectionPage.locator('[data-registry-collection] .consumer-purpose__cta > span').first().innerText(), 'Open the Cabinet');
    const storyAction = collectionPage.locator('.consumer-thesis .consumer-story__cta');
    const storySizing = await collectionPage.locator('.consumer-purpose__essay').evaluate((essay) => ({
      action: essay.querySelector('.consumer-story__cta')?.getBoundingClientRect().width,
      copy: essay.getBoundingClientRect().width,
    }));
    assert.ok(storySizing.action < storySizing.copy * .6, 'the Story action remains compact rather than spanning its card');
    const storyStyle = await storyAction.evaluate((node) => {
      const arrow = node.querySelector('.consumer-purpose__arrow');
      return {
        color: getComputedStyle(node).color,
        background: getComputedStyle(node).backgroundColor,
        radius: getComputedStyle(node).borderRadius,
        arrowBackground: arrow ? getComputedStyle(arrow).backgroundColor : '',
        arrowRadius: arrow ? getComputedStyle(arrow).borderRadius : '',
      };
    });
    assert.equal(storyStyle.color, 'rgb(17, 19, 24)');
    assert.equal(storyStyle.background, 'rgb(240, 238, 232)');
    assert.equal(storyStyle.radius, '999px');
    assert.equal(storyStyle.arrowBackground, 'rgb(17, 19, 24)');
    assert.equal(storyStyle.arrowRadius, '50%');
    await collectionPage.locator('.consumer-thesis__link').hover();
    assert.equal(await storyAction.evaluate((node) => getComputedStyle(node).color), storyStyle.color, 'the Story action color remains stable on hover');
    const mobilePurpose = await collectionPage.locator('.consumer-thesis, .consumer-collection').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    assert.ok(mobilePurpose[0].y < mobilePurpose[1].y, 'the mobile hierarchy keeps Story before Cabinet');
    await collectionPage.setViewportSize({ width: 1280, height: 900 });
    const desktopPurpose = await collectionPage.locator('.consumer-thesis, .consumer-collection').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    assert.ok(desktopPurpose[0].y < desktopPurpose[1].y, 'the desktop hierarchy keeps Story before Cabinet');
    const thesisFlow = await collectionPage.locator('.consumer-thesis').evaluate((node) => {
      const visual = node.querySelector('.consumer-thesis__visual')?.getBoundingClientRect();
      const essay = node.querySelector('.consumer-purpose__essay')?.getBoundingClientRect();
      return { visualRight: visual?.right, essayLeft: essay?.left };
    });
    assert.ok(thesisFlow.visualRight <= thesisFlow.essayLeft + 1, 'the thesis clock is contained beside its copy');
    const storyOrder = await collectionPage.locator('#official-twelve, #the-twelve, #buy, #thesis, #shop, #cabinet, #registry, #faq, #market-layer').evaluateAll((nodes) => (
      nodes.map((node) => node.id)
    ));
    assert.deepEqual(storyOrder, ['official-twelve', 'the-twelve', 'buy', 'thesis', 'shop', 'cabinet', 'registry', 'market-layer', 'faq']);
    assert.equal(
      await collectionPage.locator('#market-layer a[href^="/terminal/markets/"]').count(),
      0,
      'flag-off Astrofolio carries no venue-route entry',
    );
    await collection.close();

    const flagged = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await installNetworkHarness(flagged);
    await installExchangeFlag(flagged);
    const flaggedPage = await flagged.newPage();
    const flaggedErrors = watchErrors(flaggedPage, 'flagged gateway');
    await flaggedPage.goto(`${baseURL}/astrofolio/?sign=leo`, { waitUntil: 'load' });
    await waitForTerminal(flaggedPage, '#campaign-hero-title');
    // Owner addendum 2026-08-31: flag-on Astrofolio carries the marker and
    // one venue-route entry at the market gateway; the pro gateway stays off
    // this surface and the full-market handoff remains, demoted to secondary.
    assert.equal(await flaggedPage.locator('meta[name="zodiacs-registry-exchange-enabled"][content="1"]').count(), 1);
    assert.equal(await flaggedPage.locator('[data-pro-markets-gateway]').count(), 0);
    assert.equal(await flaggedPage.locator('#market-layer a[href="/terminal/?rank=marketCap"]').count(), 1);
    const consumerVenueEntry = flaggedPage.locator('#market-layer a[href="/terminal/markets/#leo"]');
    assert.equal(await consumerVenueEntry.count(), 1);
    assert.match(await consumerVenueEntry.getAttribute('class'), /\bis-primary\b/);
    assert.match(
      await flaggedPage.locator('#market-layer a[href="/terminal/?rank=marketCap"]').getAttribute('class'),
      /\bis-secondary\b/,
    );
    const consumerProvidersBefore = { jupiter: counts.jupiter, wallet: counts.wallet };
    await consumerVenueEntry.focus();
    assert.deepEqual({ jupiter: counts.jupiter, wallet: counts.wallet }, consumerProvidersBefore);
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
