/**
 * Read-only market depth for the Acquisition Desk.
 *
 * DexScreener is an index, not the execution venue, so this number is labelled
 * "indexed liquidity" everywhere it appears. To match the Registry board and
 * archive exactly, only unique Solana pairs whose base token is the official
 * mint contribute; malformed, quote-side and duplicate rows contribute nothing.
 */

export const DEXSCREENER_TOKEN_URL = 'https://api.dexscreener.com/tokens/v1/solana';

export function sumIndexedLiquidity(rows, mint) {
  const target = String(mint || '');
  if (!target || !Array.isArray(rows)) return null;
  const seen = new Set();
  let total = 0;

  for (const pair of rows) {
    if (pair?.chainId !== 'solana') continue;
    if (pair?.baseToken?.address !== target) continue;
    const id = String(pair?.pairAddress || '');
    if (!id || seen.has(id)) continue;
    const usd = Number(pair?.liquidity?.usd);
    if (!Number.isFinite(usd) || usd <= 0) continue;
    seen.add(id);
    total += usd;
  }

  return total > 0 ? total : null;
}

export async function fetchIndexedLiquidity({
  mint,
  fetchImpl = globalThis.fetch,
  baseUrl = DEXSCREENER_TOKEN_URL,
  signal,
} = {}) {
  if (!mint || typeof fetchImpl !== 'function') return null;
  const response = await fetchImpl(`${baseUrl}/${encodeURIComponent(mint)}`, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) return null;
  return sumIndexedLiquidity(await response.json(), mint);
}
