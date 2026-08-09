import { describe, expect, it } from 'vitest';
import {
  LADDER_NOTIONALS,
  USDC_MINT,
  ZODIAC_DECIMALS,
  fetchLadder,
  impactBps,
  priceDecimal,
  priceScaledFromAtomic,
  tokenAmountForNotional,
} from '../src/exchange/depth.mjs';

const MINT = 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv';

// A stub venue answering linearly — hand-computable amounts, nothing clever.
function venueFetch(urls = []) {
  return async (url) => {
    urls.push(String(url));
    const params = new URL(String(url)).searchParams;
    const amount = BigInt(params.get('amount'));
    const inputMint = params.get('inputMint');
    const baseOut = inputMint === USDC_MINT
      ? (amount * 13750n) / 1000n       // tokens out per USDC atomic, base rate
      : (amount * 72n) / 1_000_000n;    // USDC out per token atomic
    return {
      ok: true,
      status: 200,
      json: async () => ({
        inputMint,
        outputMint: params.get('outputMint'),
        inAmount: String(amount),
        outAmount: String(baseOut),
        priceImpactPct: 0.1,
        feeBps: 10,
      }),
    };
  };
}

describe('exact price math', () => {
  it('derives the price from atomic amounts with BigInt division only', () => {
    // 25 USDC (25_000000) buying 343,750 tokens (343750_000000):
    // price = 25 / 343750 = 0.0000727272… exactly at 12 digits.
    const scaled = priceScaledFromAtomic(25_000000n, 343_750_000000n);
    expect(scaled).toBe(72727272n);
    expect(priceDecimal(scaled)).toBe('0.000072727272');
  });

  it('answers null for empty amounts rather than dividing by zero', () => {
    expect(priceScaledFromAtomic(0n, 10n)).toBeNull();
    expect(priceScaledFromAtomic(10n, 0n)).toBeNull();
  });

  it('measures worsening in whole basis points against the smallest rung', () => {
    expect(impactBps(102n, 100n, 'buy')).toBe(200);
    expect(impactBps(98n, 100n, 'sell')).toBe(200);
    // The favourable direction clamps to zero — the ladder never advertises
    // a big trade as better-priced than a small one.
    expect(impactBps(98n, 100n, 'buy')).toBe(0);
    expect(impactBps(102n, 100n, 'sell')).toBe(0);
    expect(impactBps(null, 100n, 'buy')).toBeNull();
  });

  it('sizes sell rungs from the indexed mid without inventing precision', () => {
    expect(tokenAmountForNotional('25', 0.0000727)).toBe('343878.954608');
    expect(tokenAmountForNotional('25', 0)).toBeNull();
    expect(tokenAmountForNotional('25', null)).toBeNull();
  });
});

describe('the ladder', () => {
  it('never sends a taker — a ladder is price display, not an order', async () => {
    const urls = [];
    await fetchLadder({ mint: MINT, side: 'buy', fetchImpl: venueFetch(urls), spacingMs: 0 });
    expect(urls).toHaveLength(LADDER_NOTIONALS.length);
    for (const url of urls) {
      expect(url).not.toMatch(/taker/);
      expect(url).toContain('lite-api.jup.ag/ultra/v1/order');
    }
  });

  it('quotes buys in exact USDC atomic amounts, smallest first', async () => {
    const urls = [];
    const { rungs } = await fetchLadder({
      mint: MINT, side: 'buy', fetchImpl: venueFetch(urls), spacingMs: 0,
    });
    expect(rungs.map((rung) => rung.notional)).toEqual([...LADDER_NOTIONALS]);
    const amounts = urls.map((url) => new URL(url).searchParams.get('amount'));
    expect(amounts).toEqual(['25000000', '100000000', '250000000', '500000000', '1000000000']);
    for (const rung of rungs) {
      expect(rung.error).toBeUndefined();
      expect(typeof rung.price).toBe('string');
    }
  });

  it('sizes sells from the mid and keeps the direction straight', async () => {
    const urls = [];
    const { rungs } = await fetchLadder({
      mint: MINT, side: 'sell', midPriceUsd: 0.0000727, fetchImpl: venueFetch(urls), spacingMs: 0,
    });
    for (const url of urls) {
      const params = new URL(url).searchParams;
      expect(params.get('inputMint')).toBe(MINT);
      expect(params.get('outputMint')).toBe(USDC_MINT);
    }
    expect(rungs.every((rung) => !rung.error)).toBe(true);
  });

  it('marks sells unavailable without a mid rather than guessing one', async () => {
    const { rungs } = await fetchLadder({
      mint: MINT, side: 'sell', midPriceUsd: null, fetchImpl: venueFetch(), spacingMs: 0,
    });
    expect(rungs.every((rung) => rung.error === 'unavailable')).toBe(true);
  });

  it('keeps the rungs that answered when one fails', async () => {
    let calls = 0;
    const flaky = async (url) => {
      calls += 1;
      if (calls === 2) return { ok: true, status: 200, json: async () => ({ error: 'no quote' }) };
      return venueFetch()(url);
    };
    const { rungs } = await fetchLadder({ mint: MINT, side: 'buy', fetchImpl: flaky, spacingMs: 0 });
    expect(rungs).toHaveLength(LADDER_NOTIONALS.length);
    expect(rungs.filter((rung) => rung.error)).toHaveLength(1);
  });

  it('stops where it stands on abort', async () => {
    const controller = new AbortController();
    let calls = 0;
    const counting = async (url) => {
      calls += 1;
      if (calls === 2) controller.abort();
      return venueFetch()(url);
    };
    const { rungs } = await fetchLadder({
      mint: MINT, side: 'buy', fetchImpl: counting, signal: controller.signal, spacingMs: 0,
    });
    expect(rungs.length).toBeLessThan(LADDER_NOTIONALS.length);
  });
});

describe('constants', () => {
  it('keeps the shared USDC identity and six-decimal Zodiacs', () => {
    expect(USDC_MINT).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(ZODIAC_DECIMALS).toBe(6);
  });
});
