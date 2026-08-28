import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const LIVE_PROVIDERS = process.env.HOW_TO_BUY_LIVE === '1';
const registry = JSON.parse(await readFile(new URL('../public/registry/zodiacs.registry.json', import.meta.url), 'utf8'));
const recordFor = (slug) => {
  const asset = registry.assets.find((candidate) => candidate.sign === slug);
  const solana = asset?.representations.find((representation) => representation.chain === 'solana');
  assert.ok(asset && solana?.address, `canonical ${slug} Solana record exists`);
  return { name: asset.displayName, mint: solana.address };
};

async function installProviderHarness(context) {
  if (LIVE_PROVIDERS) return;
  await context.route('https://lite-api.jup.ag/**', (route) => {
    const url = new URL(route.request().url());
    const inputMint = url.searchParams.get('inputMint');
    const outputMint = url.searchParams.get('outputMint');
    const inAmount = url.searchParams.get('amount');
    return route.fulfill({
      json: {
        inputMint,
        outputMint,
        inAmount,
        outAmount: '625000000000',
        priceImpactPct: '0.12',
        platformFee: { feeBps: 10, feeMint: inputMint },
        routePlan: [{ swapInfo: { label: 'Deterministic QA route' } }],
        requestId: 'how-to-buy-browser-fixture',
        transaction: null,
        inUsdValue: 25,
        outUsdValue: 24.95,
      },
    });
  });
  await context.route('https://api.dexscreener.com/**', (route) => {
    const mint = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1) ?? '');
    return route.fulfill({
      json: [{
        chainId: 'solana',
        pairAddress: 'how-to-buy-browser-fixture-pool',
        baseToken: { address: mint },
        liquidity: { usd: 82_500 },
      }],
    });
  });
}

if (OUT) await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: await findChromium(),
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});

try {
  await withPreview({ port: 4386 }, async (baseURL) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    });
    await installProviderHarness(context);
    const requests = { jupiter: 0, market: 0, wallet: 0 };
    context.on('request', (request) => {
      const url = request.url().toLowerCase();
      if (url.includes('lite-api.jup.ag')) requests.jupiter += 1;
      if (url.includes('api.dexscreener.com')) requests.market += 1;
      if (/phantom|solflare|walletconnect/u.test(url)) requests.wallet += 1;
    });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(`${baseURL}/astrofolio/how-to-buy/leo/`, { waitUntil: 'load' });
    const leo = recordFor('leo');
    assert.equal(await page.locator('h1').innerText(), 'How to buy Leo');
    assert.equal(await page.locator('[data-select-sign]').count(), 12);
    assert.equal(await page.locator('[data-select-sign="leo"]').getAttribute('aria-current'), 'true');
    assert.equal(await page.locator('[data-sign-mint]').first().innerText(), leo.mint);
    assert.equal(await page.locator('[data-jupiter-host]').isHidden(), true);
    assert.equal(await page.locator('[data-load-jupiter]').isDisabled(), true);
    assert.equal(await page.locator('.zfooter .email-capture--footer').count(), 1);
    assert.equal(await page.locator('.zfooter .email-capture--footer').isHidden(), true);
    assert.equal(await page.locator('.zfooter__note').count(), 1);
    assert.equal(await page.locator('.zfooter__note').isHidden(), true);
    assert.equal(
      await page.locator('#eligibility-title').innerText(),
      'I am at least 18 and may lawfully use a third-party swap service where I live.',
    );
    assert.equal(await page.locator('script[data-zodiac-trade-runtime]').count(), 0);
    assert.deepEqual(requests, { jupiter: 0, market: 0, wallet: 0 });

    const mobileGeometry = await page.locator('.buy-guide').evaluate((node) => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      width: node.getBoundingClientRect().width,
      navCurrent: document.querySelector('.nav__chip')?.getAttribute('aria-current'),
      startColumns: getComputedStyle(document.querySelector('.start-paths__grid')).gridTemplateColumns,
    }));
    assert.ok(mobileGeometry.overflow <= 1, `mobile has no horizontal overflow (${mobileGeometry.overflow}px)`);
    assert.equal(mobileGeometry.navCurrent, 'page');
    assert.ok(!mobileGeometry.startColumns.includes(' '), 'the two starting paths stack on mobile');

    const virgo = recordFor('virgo');
    await page.locator('[data-select-sign="virgo"]').click();
    assert.equal(new URL(page.url()).pathname, '/astrofolio/how-to-buy/virgo/');
    assert.equal(await page.locator('h1').innerText(), 'How to buy Virgo');
    assert.equal(await page.locator('[data-sign-mint]').first().innerText(), virgo.mint);
    assert.equal(requests.jupiter, 0, 'changing sign does not request a quote');
    assert.equal(requests.market, 0, 'changing sign does not request market data');

    await page.locator('[data-eligibility-confirm]').check();
    assert.equal(await page.locator('[data-load-jupiter]').isEnabled(), true);
    await page.locator('[data-load-jupiter]').click();
    await page.locator('.tp[data-state="ready"]').waitFor({ state: 'visible', timeout: 30_000 });
    assert.ok(requests.jupiter >= 1, 'explicit intent requests a Jupiter quote');
    assert.ok(requests.market >= 1, 'explicit intent requests public market context');
    assert.equal(requests.wallet, 0, 'loading a quote does not contact a wallet provider');
    assert.equal(await page.locator('.tp__name').innerText(), 'Buy Virgo');
    assert.equal(await page.locator('.detail a[title]').first().getAttribute('title'), virgo.mint);
    assert.match(await page.locator('.quote').innerText(), /You get, about[\s\S]+Virgo/iu);
    assert.match(await page.locator('[data-jupiter-status]').innerText(), /Live Jupiter quote ready for verified Virgo/u);
    assert.equal(await page.locator('.tp__go').isVisible(), false, 'the funding path does not ask for wallet approval');
    assert.equal(errors.length, 0, errors.join('\n'));

    if (OUT) await page.screenshot({ path: `${OUT}/how-to-buy-mobile.png`, fullPage: true });
    await context.close();

    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
    const desktopPage = await desktop.newPage();
    await desktopPage.goto(`${baseURL}/astrofolio/how-to-buy/leo/`, { waitUntil: 'load' });
    const desktopGeometry = await desktopPage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      startColumns: getComputedStyle(document.querySelector('.start-paths__grid')).gridTemplateColumns.split(' ').length,
      guideColumns: getComputedStyle(document.querySelector('.guide-layout')).gridTemplateColumns.split(' ').length,
      readyPosition: getComputedStyle(document.querySelector('.ready-card')).position,
      loadHeight: document.querySelector('[data-load-jupiter]').getBoundingClientRect().height,
    }));
    assert.ok(desktopGeometry.overflow <= 1, `desktop has no horizontal overflow (${desktopGeometry.overflow}px)`);
    assert.equal(desktopGeometry.startColumns, 2);
    assert.equal(desktopGeometry.guideColumns, 2);
    assert.equal(desktopGeometry.readyPosition, 'sticky');
    assert.ok(desktopGeometry.loadHeight >= 44);
    if (OUT) await desktopPage.screenshot({ path: `${OUT}/how-to-buy-desktop.png`, fullPage: true });
    await desktop.close();

    const profile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const profilePage = await profile.newPage();
    await profilePage.goto(`${baseURL}/registry/leo/`, { waitUntil: 'load' });
    await profilePage.locator('#token').scrollIntoViewIfNeeded();
    assert.equal(await profilePage.locator('#token h2').innerText(), 'Supply & ownership');
    assert.equal(await profilePage.locator('.ownership-bar span').count(), 4);
    const supplyText = await profilePage.locator('#token').innerText();
    assert.match(supplyText, /Older snapshot/u);
    assert.match(supplyText, /token accounts, but not who the people behind those accounts are/u);
    assert.equal(await profilePage.locator('#token [data-trade-panel]').count(), 0);
    if (OUT) await profilePage.screenshot({ path: `${OUT}/registry-supply-mobile.png`, fullPage: false });
    await profile.close();
  });
} finally {
  await browser.close();
}

console.log(`how-to-buy browser: PASS — mobile + desktop guide, explicit ${LIVE_PROVIDERS ? 'live' : 'provider-mocked'} Jupiter quote, Registry supply module`);
