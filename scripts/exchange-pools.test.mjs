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

  it('pins the two newly indexed SOL pools as well', () => {
    expect(EXCHANGE_POOLS.cancer).toBe('DaTEcH6da4i1evZU37F9ibQirYXhLKZpKDzDno346nSW');
    expect(EXCHANGE_POOLS.sagittarius).toBe('7mP6WeVYBNt3eao5szsMPmuHughHjNRx26TcrgJXZRky');
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
    expect(deepestPoolFor([
      { chainId: 'solana', pairAddress: 'empty', baseToken: { address: MINT }, liquidity: {} },
      { chainId: 'solana', pairAddress: 'zero', baseToken: { address: MINT }, liquidity: { usd: 0 } },
    ], MINT)).toBeNull();
  });

  it('prefers the pinned pool when the sign has one', () => {
    expect(resolvePool({ slug: 'aries', mint: MINT, rows })).toBe(EXCHANGE_POOLS.aries);
    expect(resolvePool({ slug: 'cancer', mint: MINT, rows })).toBe(EXCHANGE_POOLS.cancer);
    expect(resolvePool({ slug: 'sagittarius', mint: MINT, rows })).toBe(EXCHANGE_POOLS.sagittarius);
  });

  it('keeps Libra on its pair of record when an unrelated quote pool looks deeper', () => {
    const libraMint = '7Zt2KUh5mkpEpPGcNcFy51aGkh9Ycb5ELcqRH1n2GmAe';
    const adversarialRows = [
      { chainId: 'solana', pairAddress: EXCHANGE_POOLS.libra, baseToken: { address: libraMint }, liquidity: { usd: 28_443 } },
      { chainId: 'solana', pairAddress: '7hoH1PPnRaAZ6gyafuSSJpVYCemXpwPz9rAxnzTb71sX', baseToken: { address: libraMint }, liquidity: { usd: 52_510 } },
    ];
    expect(resolvePool({ slug: 'libra', mint: libraMint, rows: adversarialRows })).toBe(EXCHANGE_POOLS.libra);
  });
});
