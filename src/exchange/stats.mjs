/**
 * One Dex Screener batch call answers for the whole rail: price, 24h change
 * and indexed liquidity for all twelve mints at once. Dex Screener is an
 * index, not the execution venue, so liquidity is labelled "indexed"
 * everywhere it appears — the same rule as the trade panel's own number.
 */

import { sumIndexedLiquidity } from '../trade/liquidity.mjs';

export const DEXSCREENER_TOKENS_URL = 'https://api.dexscreener.com/tokens/v1/solana';

export function batchUrl(mints, baseUrl = DEXSCREENER_TOKENS_URL) {
  return `${baseUrl}/${mints.map((mint) => encodeURIComponent(mint)).join(',')}`;
}

/**
 * Rows → per-mint stats. The deepest base-side Solana pair is the quote of
 * record for price and 24h change; indexed liquidity sums every unique
 * base-side pair, matching the Registry board. A mint with no indexed pair
 * is simply absent from the result.
 */
export function normalizeBatch(rows, mints) {
  const stats = {};
  if (!Array.isArray(rows)) return stats;
  for (const mint of mints) {
    let best = null;
    let bestLiquidity = -1;
    for (const pair of rows) {
      if (pair?.chainId !== 'solana') continue;
      if (!pair?.pairAddress) continue;
      if (pair?.baseToken?.address !== mint) continue;
      const liquidity = Number(pair?.liquidity?.usd) || 0;
      if (liquidity > bestLiquidity) {
        bestLiquidity = liquidity;
        best = pair;
      }
    }
    if (!best) continue;
    const priceUsd = Number(best.priceUsd);
    const change = Number(best.priceChange?.h24);
    stats[mint] = {
      priceUsd: Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null,
      change24hPct: Number.isFinite(change) ? change : null,
      liquidityUsd: sumIndexedLiquidity(rows, mint),
    };
  }
  return stats;
}

export async function fetchBatchStats({
  mints,
  baseUrl = DEXSCREENER_TOKENS_URL,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  if (!Array.isArray(mints) || mints.length === 0) return { stats: {}, rows: [] };
  const response = await fetchImpl(batchUrl(mints, baseUrl), {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`stats ${response.status}`);
  const rows = await response.json();
  return { stats: normalizeBatch(rows, mints), rows: Array.isArray(rows) ? rows : [] };
}
