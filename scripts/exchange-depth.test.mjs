import { describe, expect, it } from 'vitest';
import {
  LADDER_NOTIONALS,
  LADDER_QUOTE_SPACING_MS,
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
      expect(url).toContain('api.jup.ag/swap/v2/order');
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

  it('refuses substituted amounts, mints, empty output, and an excessive fee', async () => {
    const cases = [
      { outputMint: 'WrongMint' },
      { inAmount: '1' },
      { outAmount: '0' },
      { platformFee: { feeBps: 11 } },
    ];
    for (const override of cases) {
      const fetchImpl = async (url) => {
        const params = new URL(String(url)).searchParams;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            inputMint: params.get('inputMint'),
            outputMint: params.get('outputMint'),
            inAmount: params.get('amount'),
            outAmount: '1000000',
            priceImpactPct: 0.1,
            feeBps: 10,
            ...override,
          }),
        };
      };
      const { rungs } = await fetchLadder({
        mint: MINT,
        side: 'buy',
        notionals: ['25'],
        fetchImpl,
        spacingMs: 0,
      });
      expect(rungs[0].error, JSON.stringify(override)).toBeTruthy();
    }
  });

  it('stops the walk on the first 429 and carries its retry hint', async () => {
    let calls = 0;
    const rateLimited = async () => {
      calls += 1;
      return {
        ok: false,
        status: 429,
        headers: { get: () => '45' },
        json: async () => ({}),
      };
    };
    const result = await fetchLadder({
      mint: MINT, side: 'buy', fetchImpl: rateLimited, spacingMs: 0,
    });
    expect(calls).toBe(1);
    expect(result).toMatchObject({ halted: 'rate_limited', retryAfterMs: 45_000 });
    expect(result.rungs).toHaveLength(0);
  });

  it('bounds a depth response that never finishes', async () => {
    const hanging = async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        reject(Object.assign(new Error('deadline'), { name: 'AbortError' }));
      }, { once: true });
    });
    const { rungs } = await fetchLadder({
      mint: MINT,
      side: 'buy',
      notionals: ['25'],
      fetchImpl: hanging,
      spacingMs: 0,
      deadlineMs: 5,
    });
    expect(rungs).toEqual([{ notional: '25', error: 'network' }]);
  });

  it('drops the "vs best" figure entirely when the smallest rung fails', async () => {
    let calls = 0;
    const firstFails = async (url) => {
      calls += 1;
      if (calls === 1) return { ok: true, status: 200, json: async () => ({ error: 'no quote' }) };
      return venueFetch()(url);
    };
    const { rungs } = await fetchLadder({
      mint: MINT, side: 'buy', fetchImpl: firstFails, spacingMs: 0,
    });
    expect(rungs[0].error).toBeTruthy();
    // A later rung is not "best", so nothing is measured against it.
    for (const rung of rungs.slice(1)) expect(rung.impactBps).toBeNull();
  });

  it('marks a zero-amount answer unavailable instead of pricing it at 0', async () => {
    const zeroed = async (url) => {
      const params = new URL(String(url)).searchParams;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          inputMint: params.get('inputMint'),
          outputMint: params.get('outputMint'),
          inAmount: params.get('amount'),
          outAmount: '1',
          priceImpactPct: 0,
          feeBps: 10,
        }),
      };
    };
    // outAmount 1 atomic against USDC atomic input is fine; force the zero
    // through the sell side, where the venue's USDC answer is the numerator.
    const { rungs } = await fetchLadder({
      mint: MINT, side: 'buy', fetchImpl: zeroed, spacingMs: 0, notionals: ['25'],
    });
    expect(rungs[0].error).toBeUndefined();
    const zeroOut = async (url) => {
      const params = new URL(String(url)).searchParams;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          inputMint: params.get('inputMint'),
          outputMint: params.get('outputMint'),
          inAmount: params.get('amount'),
          outAmount: '0',
          priceImpactPct: 0,
          feeBps: 10,
        }),
      };
    };
    const zeroRungs = await fetchLadder({
      mint: MINT, side: 'buy', fetchImpl: zeroOut, spacingMs: 0, notionals: ['25'],
    });
    expect(zeroRungs.rungs[0].error).toBeTruthy();
  });

  it('contains a pathological indexed mid to its own rungs instead of killing the ladder', async () => {
    // A mid so large the sized token amount rounds to zero: every sell rung
    // reports an error, nothing throws, and the walk completes.
    const { rungs } = await fetchLadder({
      mint: MINT, side: 'sell', midPriceUsd: 1e30, fetchImpl: venueFetch(), spacingMs: 0,
    });
    expect(rungs).toHaveLength(LADDER_NOTIONALS.length);
    expect(rungs.every((rung) => rung.error)).toBe(true);
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

  it('paces keyless ladder quotes below one request every two seconds', () => {
    expect(LADDER_QUOTE_SPACING_MS).toBeGreaterThanOrEqual(2_000);
  });
});
