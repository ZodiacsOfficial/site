import { describe, expect, it } from 'vitest';
import { EXCHANGE_POOLS, deepestPoolFor, resolvePool } from '../src/exchange/pools.mjs';
import { MARKET_PAIRS, SIGN_ORDER } from './sign-data.mjs';

describe('the pinned pools', () => {
  it('mirror MARKET_PAIRS exactly, so the two can never skew', () => {
    expect(Object.keys(EXCHANGE_POOLS).sort()).toEqual([...SIGN_ORDER].sort());
    for (const slug of SIGN_ORDER) {
      const pinned = MARKET_PAIRS[slug];
      if (pinned) {
        expect(pinned.chainId, slug).toBe('solana');
        expect(EXCHANGE_POOLS[slug], slug).toBe(pinned.pairId);
      } else {
        expect(EXCHANGE_POOLS[slug], slug).toBeNull();
      }
    }
  });

  it('leaves cancer and sagittarius to the fallback', () => {
    expect(EXCHANGE_POOLS.cancer).toBeNull();
    expect(EXCHANGE_POOLS.sagittarius).toBeNull();
  });
});

describe('the deepest-pool fallback', () => {
  const MINT = 'MintAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const rows = [
    { chainId: 'solana', pairAddress: 'shallow', baseToken: { address: MINT }, liquidity: { usd: 900 } },
    { chainId: 'solana', pairAddress: 'deep', baseToken: { address: MINT }, liquidity: { usd: 12000 } },
    // Quote-side, wrong-chain and malformed rows contribute nothing.
    { chainId: 'solana', pairAddress: 'quoteside', baseToken: { address: 'other' }, liquidity: { usd: 99999 } },
    { chainId: 'base', pairAddress: 'wrongchain', baseToken: { address: MINT }, liquidity: { usd: 99999 } },
    { chainId: 'solana', baseToken: { address: MINT }, liquidity: { usd: 99999 } },
    null,
  ];

  it('picks the deepest base-side Solana pair', () => {
    expect(deepestPoolFor(rows, MINT)).toBe('deep');
  });

  it('answers null rather than guessing', () => {
    expect(deepestPoolFor([], MINT)).toBeNull();
    expect(deepestPoolFor(rows, 'unlisted')).toBeNull();
    expect(deepestPoolFor(undefined, MINT)).toBeNull();
  });

  it('prefers the pinned pool when the sign has one', () => {
    expect(resolvePool({ slug: 'aries', mint: MINT, rows })).toBe(EXCHANGE_POOLS.aries);
    expect(resolvePool({ slug: 'cancer', mint: MINT, rows })).toBe('deep');
  });
});
