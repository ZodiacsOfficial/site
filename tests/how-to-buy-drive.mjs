import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const registry = JSON.parse(await readFile(new URL('../public/registry/zodiacs.registry.json', import.meta.url), 'utf8'));
const recordFor = (slug) => {
  const asset = registry.assets.find((candidate) => candidate.sign === slug);
  const solana = asset?.representations.find((representation) => representation.chain === 'solana');
  assert.ok(asset && solana?.address, `canonical ${slug} Solana record exists`);
  return { name: asset.displayName, mint: solana.address };
};

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

    await page.locator('[data-load-jupiter]').click();
    await page.locator('.tp[data-state="ready"]').waitFor({ state: 'visible', timeout: 30_000 });
    assert.ok(requests.jupiter >= 1, 'explicit intent requests a Jupiter quote');
    assert.ok(requests.market >= 1, 'explicit intent requests public market context');
    assert.equal(requests.wallet, 0, 'loading a quote does not contact a wallet provider');
    assert.equal(await page.locator('.tp__name').innerText(), 'Buy Virgo');
    assert.equal(await page.locator('.detail a[title]').first().getAttribute('title'), virgo.mint);
    assert.match(await page.locator('.quote').innerText(), /You get, about[\s\S]+Virgo/u);
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
    assert.match(await profilePage.locator('#token').innerText(), /Older snapshot[\s\S]+token accounts, not verified people/u);
    assert.equal(await profilePage.locator('#token [data-trade-panel]').count(), 0);
    if (OUT) await profilePage.screenshot({ path: `${OUT}/registry-supply-mobile.png`, fullPage: false });
    await profile.close();
  });
} finally {
  await browser.close();
}

console.log('how-to-buy browser: PASS — mobile + desktop guide, explicit live Jupiter quote, Registry supply module');
