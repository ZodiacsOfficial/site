/**
 * Which pool answers for a sign's chart and tape.
 *
 * The ten pinned IDs are the Dex Screener pairs of record, copied from
 * scripts/sign-data.mjs MARKET_PAIRS — a test pins the copy against the
 * source. On Solana a Dex Screener pairAddress is the AMM pool account, which
 * is also how GeckoTerminal keys its pools (verified live against the Aries
 * pool, 2026-08-09). Cancer and Sagittarius were added after their canonical
 * SOL pools became indexed; all twelve now resolve to a pair of record.
 */

export const EXCHANGE_POOLS = {
  aries: 'HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS',
  taurus: '2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu',
  gemini: 'HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9',
  cancer: 'DaTEcH6da4i1evZU37F9ibQirYXhLKZpKDzDno346nSW',
  leo: '48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ',
  virgo: '5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh',
  libra: 'DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9',
  scorpio: '3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta',
  sagittarius: '7mP6WeVYBNt3eao5szsMPmuHughHjNRx26TcrgJXZRky',
  capricorn: '549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin',
  aquarius: 'BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv',
  pisces: 'Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko',
};

/**
 * The deepest indexed Solana pool whose base token is the official mint,
 * from a Dex Screener token-endpoint answer. Malformed, quote-side and
 * liquidity-less rows contribute nothing.
 */
export function deepestPoolFor(rows, mint) {
  if (!Array.isArray(rows) || !mint) return null;
  let best = null;
  let bestLiquidity = -1;
  for (const pair of rows) {
    if (pair?.chainId !== 'solana') continue;
    if (!pair?.pairAddress) continue;
    if (pair?.baseToken?.address !== mint) continue;
    const liquidity = Number(pair?.liquidity?.usd);
    if (!Number.isFinite(liquidity) || liquidity <= 0) continue;
    if (liquidity > bestLiquidity) {
      bestLiquidity = liquidity;
      best = String(pair.pairAddress);
    }
  }
  return best;
}

/** Pinned pool if the sign has one; the deepest indexed pool otherwise. */
export function resolvePool({ slug, mint, rows }) {
  return EXCHANGE_POOLS[slug] ?? deepestPoolFor(rows, mint);
}
