/**
 * Manual pre-launch contract probe. It makes four read-only, taker-less
 * requests across three providers and writes no files. A failure keeps the
 * room flag off.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchBatchStats } from '../src/exchange/stats.mjs';
import { fetchOhlcv, fetchTrades } from '../src/exchange/gecko.mjs';
import { EXCHANGE_POOLS } from '../src/exchange/pools.mjs';
import { assertOrderMatches, fetchOrder, VENUE_FEE_CEILING_BPS } from '../src/trade/ultra.mjs';
import { USDC_MINT } from '../src/trade/panel-model.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROBE_DEADLINE_MS = 12_000;

async function withinDeadline(run, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_DEADLINE_MS);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`exchange probe: ${label} timed out`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const registry = JSON.parse(await readFile(
  resolve(root, 'public/registry/zodiacs.registry.json'),
  'utf8',
));
const assets = registry.assets ?? [];
const aries = assets.find((asset) => asset.sign === 'aries');
if (!aries?.native?.address || assets.length !== 12) {
  throw new Error('exchange probe: Registry identity is incomplete');
}

const mint = aries.native.address;
const amount = 25_000_000n;
const order = await fetchOrder({ inputMint: USDC_MINT, outputMint: mint, amount });
assertOrderMatches(order, { inputMint: USDC_MINT, outputMint: mint, amount });

const { stats } = await withinDeadline(
  (signal) => fetchBatchStats({
    mints: assets.map((asset) => asset.native.address),
    signal,
  }),
  'Dex Screener',
);
if (!stats[mint]?.priceUsd || !stats[mint]?.liquidityUsd) {
  throw new Error('exchange probe: Dex Screener did not return the Aries market contract');
}

const candles = await fetchOhlcv({ pool: EXCHANGE_POOLS.aries, timeframe: '1h' });
if (candles.length === 0) {
  throw new Error('exchange probe: GeckoTerminal returned no valid Aries candles');
}
const trades = await fetchTrades({ pool: EXCHANGE_POOLS.aries, mint });
if (trades.length === 0) {
  throw new Error('exchange probe: GeckoTerminal returned no valid Aries trades');
}

process.stdout.write(`${JSON.stringify({
  provider: 'legacy-ultra-pilot',
  feeBps: order.feeBps,
  feeCeilingBps: VENUE_FEE_CEILING_BPS,
  indexedPrice: true,
  indexedLiquidity: true,
  chartRows: candles.length,
  tradeRows: trades.length,
})}\n`);
