import { describe, expect, it } from 'vitest';
import { fetchIndexedLiquidity, sumIndexedLiquidity } from '../src/trade/liquidity.mjs';

const MINT = 'OfficialZodiacMint';

describe('indexed liquidity', () => {
  const rows = [
    {
      chainId: 'solana', pairAddress: 'pool-a',
      baseToken: { address: MINT }, quoteToken: { address: 'USDC' }, liquidity: { usd: 12_500 },
    },
    {
      chainId: 'solana', pairAddress: 'pool-b',
      baseToken: { address: 'SOL' }, quoteToken: { address: MINT }, liquidity: { usd: 7_000 },
    },
    {
      chainId: 'solana', pairAddress: 'pool-a',
      baseToken: { address: MINT }, quoteToken: { address: 'USDC' }, liquidity: { usd: 12_500 },
    },
    {
      chainId: 'ethereum', pairAddress: 'pool-c',
      baseToken: { address: MINT }, quoteToken: { address: 'USDC' }, liquidity: { usd: 99_000 },
    },
  ];

  it('sums each unique Solana pair with the official mint as base once', () => {
    expect(sumIndexedLiquidity(rows, MINT)).toBe(12_500);
  });

  it('returns null when the index has no usable depth', () => {
    expect(sumIndexedLiquidity([], MINT)).toBeNull();
    expect(sumIndexedLiquidity(rows, 'DifferentMint')).toBeNull();
  });

  it('uses the public index as read-only context', async () => {
    const calls = [];
    const result = await fetchIndexedLiquidity({
      mint: MINT,
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => rows };
      },
    });
    expect(result).toBe(12_500);
    expect(calls[0].url).toContain(encodeURIComponent(MINT));
    expect(calls[0].options.method).toBe('GET');
  });
});
