/**
 * Zodiac Markets' flag-on browser story with every provider stubbed locally.
 * The committed page remains flag-off; this drive stamps an in-memory copy.
 */

import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { injectRegistryPro } from '../src/pro/entry.mjs';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const outputDirectory = process.env.OUT_DIR ? resolve(ROOT, process.env.OUT_DIR) : null;
if (outputDirectory) await mkdir(outputDirectory, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });
const registry = JSON.parse(await readFile(resolve(ROOT, 'public/registry/zodiacs.registry.json'), 'utf8'));
const committed = await readFile(resolve(ROOT, 'public/registry/pro/index.html'), 'utf8');
const bundle = await readFile(resolve(ROOT, 'public/assets/registry-pro.js'), 'utf8');
const ariesMint = registry.assets.find((asset) => asset.sign === 'aries').native.address;
const pool = 'HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS';

const stamped = injectRegistryPro(committed, {
  PUBLIC_REGISTRY_PRO_ENABLED: '1',
  PUBLIC_REGISTRY_PRO_CHAT_ENABLED: '1',
}).output
  .replace('<head>', '<head><base href="https://zodiacs.org/">')
  .replace(/\s*<script[^>]+src="[^"]+"[^>]*><\/script>/gu, '');

const browser = await chromium.launch({
  executablePath: await findChromium(),
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});

try {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const pageErrors = [];
    const quoteBodies = [];
    const requestUrls = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('request', (request) => requestUrls.push(request.url()));

    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.hostname === 'zodiacs.org' && url.pathname === '/registry/zodiacs.registry.json') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(registry) });
        return;
      }
      if (url.hostname === 'zodiacs.org' && url.pathname === '/api/registry-pro-quotes') {
        const body = request.postDataJSON();
        quoteBodies.push(body);
        const observedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 800).toISOString();
        await new Promise((settle) => setTimeout(settle, 80));
        if (body.amount === '200000000') {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              version: 1,
              sign: body.sign,
              side: body.side,
              status: 'unavailable',
              highestQuotedOutputProvider: null,
              observedAt,
              results: [
                { provider: 'jupiter', status: 'failed', error: 'rate_limited', retryAfterMs: 12_000 },
                { provider: 'raydium', status: 'failed', error: 'stale', retryAfterMs: 0 },
              ],
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            version: 1,
            sign: body.sign,
            side: body.side,
            status: 'complete',
            highestQuotedOutputProvider: 'jupiter',
            observedAt,
            results: [
              {
                provider: 'jupiter', status: 'ready', quote: {
                  provider: 'jupiter', providerLabel: 'Swap V2 Meta-Aggregator · Ultra mode',
                  inputMint: body.side === 'buy' ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' : ariesMint,
                  outputMint: body.side === 'buy' ? ariesMint : 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  inputAmount: body.amount, outputAmount: '125000000000', minimumOutput: null,
                  slippageBps: 26,
                  feeBps: 10, platformFeeBps: 10, priceImpactPct: null,
                  route: ['iris'], observedAt, expiresAt: null, executable: false,
                },
              },
              {
                provider: 'raydium', status: 'ready', quote: {
                  provider: 'raydium', providerLabel: 'Raydium route',
                  inputMint: body.side === 'buy' ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' : ariesMint,
                  outputMint: body.side === 'buy' ? ariesMint : 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  inputAmount: body.amount, outputAmount: '124000000000', minimumOutput: '123380000000',
                  slippageBps: body.slippageBps,
                  feeBps: null, platformFeeBps: null, priceImpactPct: 0.18,
                  route: [pool], observedAt, expiresAt, executable: false,
                },
              },
            ],
          }),
        });
        return;
      }
      if (url.hostname === 'api.dexscreener.com') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            chainId: 'solana', pairAddress: pool,
            baseToken: { address: ariesMint },
            liquidity: { usd: 12000 }, priceUsd: '0.0002', priceChange: { h24: 2.4 },
          }]),
        });
        return;
      }
      if (url.hostname === 'api.geckoterminal.com' && url.pathname.includes('/ohlcv/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { attributes: { ohlcv_list: [
            [1_786_320_000, 0.00018, 0.00022, 0.00017, 0.0002, 420],
            [1_786_316_400, 0.00017, 0.00019, 0.00016, 0.00018, 300],
          ] } } }),
        });
        return;
      }
      if (url.hostname === 'api.geckoterminal.com' && url.pathname.endsWith('/trades')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [{
            id: 'trade-1',
            attributes: {
              block_timestamp: new Date().toISOString(), kind: 'buy',
              to_token_address: ariesMint, to_token_amount: '1000',
              price_to_in_usd: '0.0002', volume_in_usd: '0.20', tx_hash: 'fixture',
            },
          }] }),
        });
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });

    await page.setContent(stamped, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ content: bundle });
    await page.locator('.rp').waitFor({ timeout: 10_000 });
    await page.locator('.rp-market').first().waitFor({ timeout: 10_000 });
    check(`${viewport.width}: mounts twelve markets`, await page.locator('.rp-market').count() === 12);
    check(`${viewport.width}: no eager quote`, quoteBodies.length === 0);
    const badges = await page.locator('.rp__badges').textContent() ?? '';
    check(`${viewport.width}: read-only capability badges`,
      badges.includes('No wallet') && badges.includes('No submission'));
    check(`${viewport.width}: independently enabled Market Chat is static`,
      await page.locator('.rp-chat__title').textContent() === 'Market Chat'
      && await page.locator('.rp-chat__composer-input').isDisabled()
      && await page.locator('.rp-chat__submit').isDisabled());

    await page.locator('.rp-tape__row').first().waitFor({ timeout: 10_000 });
    const tapeBefore = await page.locator('.rp-tape__row').count();
    await page.locator('.rp-timeframe[data-timeframe="15m"]').click();
    await page.locator('.rp-chart__state.is-ready').waitFor({ timeout: 10_000 });
    check(`${viewport.width}: timeframe preserves the independent trade tape`,
      tapeBefore === 1
      && await page.locator('.rp-tape__row').count() === 1
      && (await page.locator('.rp-tape > .rp-status').textContent() ?? '').includes('1 recent indexed trades'));
    check(`${viewport.width}: chart has a screen-reader data alternative`,
      await page.locator('.rp-chart canvas').getAttribute('role') === 'img'
      && await page.locator('.rp-chart-data__table tbody tr').count() === 2
      && await page.locator('.rp-chart-data__scroll').getAttribute('tabindex') === '0'
      && await page.locator('.rp-tape__scroll').getAttribute('tabindex') === '0');

    const quoteButton = page.locator('.rp-ticket__button');
    await quoteButton.focus();
    await quoteButton.click();
    check(`${viewport.width}: quote request keeps keyboard focus`,
      await page.evaluate(() => document.activeElement?.classList.contains('rp-ticket__button')));
    await page.locator('.rp-quote').first().waitFor({ timeout: 10_000 });
    check(`${viewport.width}: explicit comparison returns two providers`, await page.locator('.rp-quote').count() === 2);
    check(`${viewport.width}: honest ranking label`,
      (await page.locator('.rp-ticket__quotes').textContent() ?? '').includes('Highest quoted output'));
    check(`${viewport.width}: Jupiter product and attribution stay visible`,
      (await page.locator('.rp-ticket__attribution').textContent() ?? '')
        === 'Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode'
      && (await page.locator('.rp-quote__head').first().textContent() ?? '')
        .includes('Swap V2 Meta-Aggregator · Ultra mode'));
    check(`${viewport.width}: exact safe request body`, JSON.stringify(quoteBodies[0]) === JSON.stringify({
      sign: 'aries', side: 'buy', amount: '25000000', slippageBps: 50,
    }));
    await page.locator('input[name="amount"]').fill('100');
    check(`${viewport.width}: editing intent removes old snapshots`,
      await page.locator('.rp-quote').count() === 0
      && (await page.locator('.rp-ticket__status').textContent() ?? '').includes('Amount changed'));
    await quoteButton.click();
    await page.locator('.rp-quote').first().waitFor({ timeout: 10_000 });
    await page.getByText('Provider snapshots expired. Request a fresh comparison.').waitFor({ timeout: 3_000 });
    check(`${viewport.width}: expiring provider snapshots leave the current view`,
      await page.locator('.rp-quote').count() === 0);
    await page.locator('input[name="amount"]').fill('200');
    await quoteButton.click();
    await page.locator('.rp-quote').first().waitFor({ timeout: 3_000 });
    check(`${viewport.width}: unavailable comparison preserves independent provider states`,
      await page.locator('.rp-quote.is-unavailable').count() === 2
      && (await page.locator('.rp-ticket__quotes').textContent() ?? '').includes('Provider budget is cooling down')
      && (await page.locator('.rp-ticket__quotes').textContent() ?? '').includes('quote expired'));
    await page.getByRole('button', { name: 'Sell' }).click();
    await page.locator('input[name="amount"]').fill('25');
    await quoteButton.click();
    await page.locator('.rp-quote').first().waitFor({ timeout: 3_000 });
    check(`${viewport.width}: sell comparison preserves direction and output unit`,
      quoteBodies.at(-1)?.side === 'sell'
      && quoteBodies.at(-1)?.amount === '25000000'
      && (await page.locator('.rp-quote__amount').first().textContent() ?? '').endsWith(' USDC'));
    check(`${viewport.width}: no horizontal overflow`,
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${viewport.width}: no browser exceptions`, pageErrors.length === 0, pageErrors.join('; '));

    const unexpectedNetwork = requestUrls.filter((value) => {
      const hostname = new URL(value).hostname;
      return !['zodiacs.org', 'api.dexscreener.com', 'api.geckoterminal.com'].includes(hostname);
    });
    check(`${viewport.width}: network origin allowlist`, unexpectedNetwork.length === 0, unexpectedNetwork.join(', '));
    if (outputDirectory) {
      await page.screenshot({
        path: resolve(outputDirectory, `registry-pro-${viewport.width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  process.stdout.write(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? ` — ${result.detail}` : ''}\n`);
}
if (failed.length) {
  process.stderr.write(`Zodiac Markets browser drive failed ${failed.length}/${results.length} checks.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Zodiac Markets browser drive passed ${results.length}/${results.length} checks.\n`);
}
