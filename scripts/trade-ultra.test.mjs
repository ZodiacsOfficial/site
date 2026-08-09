import { describe, expect, it } from 'vitest';
import {
  assertOrderMatches,
  atomicFromDecimal,
  decimalFromAtomic,
  executeOrder,
  fetchOrder,
  isSignable,
  normalizeOrder,
  priceImpactBand,
  SOL_DECIMALS,
  TradeError,
  VENUE_FEE_CEILING_BPS,
  WSOL_MINT,
} from '../src/trade/ultra.mjs';

const ARIES = 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv';
const TAURUS = 'EjkkxYpfSwS6TAtKKuiJuNMMngYvumc1t1v9ZX1WJKMp';
const ZODIAC_DECIMALS = 6;

/** Shaped after a real 0.1 SOL → ARIES response captured on 2026-08-02. */
function orderPayload(overrides = {}) {
  return {
    inputMint: WSOL_MINT,
    outputMint: ARIES,
    inAmount: '100000000',
    outAmount: '105937985569',
    priceImpactPct: '0.010113282234297822',
    routePlan: [{ swapInfo: { label: 'Raydium CP' } }],
    platformFee: { feeBps: 10, feeMint: WSOL_MINT },
    requestId: '019fc3b0-269f-709b-bada-915ed5c6b672',
    transaction: null,
    inUsdValue: 7.324,
    outUsdValue: 7.398,
    ...overrides,
  };
}

function jsonResponse(body, { status = 200, ok = status < 400 } = {}) {
  return { ok, status, json: async () => body };
}

function expectTradeError(run, code) {
  try {
    const result = run();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => { throw new Error(`expected a ${code} TradeError, got success`); },
        (error) => {
          expect(error, String(error)).toBeInstanceOf(TradeError);
          expect(error.code).toBe(code);
        },
      );
    }
  } catch (error) {
    expect(error, String(error)).toBeInstanceOf(TradeError);
    expect(error.code).toBe(code);
    return undefined;
  }
  throw new Error(`expected a ${code} TradeError, got success`);
}

describe('amounts stay exact', () => {
  it('converts decimal input to atomic units without floating point', () => {
    expect(atomicFromDecimal('0.1', SOL_DECIMALS)).toBe(100000000n);
    expect(atomicFromDecimal('1', SOL_DECIMALS)).toBe(1000000000n);
    expect(atomicFromDecimal('0.000000001', SOL_DECIMALS)).toBe(1n);
    // 0.1 + 0.2 is the classic float trap; as integers it is exact.
    expect(atomicFromDecimal('0.3', SOL_DECIMALS))
      .toBe(atomicFromDecimal('0.1', SOL_DECIMALS) + atomicFromDecimal('0.2', SOL_DECIMALS));
    // A large balance stays exact well past Number.MAX_SAFE_INTEGER.
    expect(atomicFromDecimal('9007199.254740993', SOL_DECIMALS)).toBe(9007199254740993n);
  });

  it('round-trips through the display formatter', () => {
    for (const value of ['0.1', '1', '12.345678', '0.000001', '1000000']) {
      expect(decimalFromAtomic(atomicFromDecimal(value, ZODIAC_DECIMALS), ZODIAC_DECIMALS))
        .toBe(value.replace(/\.0+$/, ''));
    }
    expect(decimalFromAtomic(105937985569n, ZODIAC_DECIMALS)).toBe('105937.985569');
    expect(decimalFromAtomic(105937985569n, ZODIAC_DECIMALS, { maxFractionDigits: 2 }))
      .toBe('105937.98');
    expect(decimalFromAtomic(100000000n, SOL_DECIMALS)).toBe('0.1');
    expect(decimalFromAtomic(0n, SOL_DECIMALS)).toBe('0');
  });

  it('refuses amounts it cannot honour exactly', () => {
    // More precision than the token carries would have to be truncated.
    expectTradeError(() => atomicFromDecimal('0.0000001', ZODIAC_DECIMALS), 'invalid_amount');
    for (const bad of ['', ' ', '.', 'abc', '1,5', '-1', '1e9', '0', '0.0', '1.2.3', '  ']) {
      expectTradeError(() => atomicFromDecimal(bad, SOL_DECIMALS), 'invalid_amount');
    }
  });
});

describe('price impact bands', () => {
  it('separates a quiet trade from one that moves a thin pool', () => {
    expect(priceImpactBand('0.010113282234297822')).toBe('low');
    expect(priceImpactBand(0.99)).toBe('low');
    expect(priceImpactBand(1)).toBe('notable');
    expect(priceImpactBand(4.9)).toBe('notable');
    expect(priceImpactBand(5)).toBe('severe');
    expect(priceImpactBand(42)).toBe('severe');
    expect(priceImpactBand(-7)).toBe('severe');
    expect(priceImpactBand('not a number')).toBe('unknown');
  });
});

describe('order normalisation', () => {
  it('keeps amounts as integers and surfaces the venue fee and route', () => {
    const order = normalizeOrder(orderPayload());
    expect(order.inAmount).toBe(100000000n);
    expect(order.outAmount).toBe(105937985569n);
    expect(order.feeBps).toBe(10);
    expect(order.routeLabels).toEqual(['Raydium CP']);
    expect(order.priceImpactPct).toBeCloseTo(0.0101, 4);
  });

  it('reads the fee from either shape the venue uses', () => {
    expect(normalizeOrder(orderPayload({ platformFee: undefined, feeBps: 10 })).feeBps).toBe(10);
    expect(normalizeOrder(orderPayload({ platformFee: undefined, feeBps: undefined })).feeBps).toBe(0);
  });

  it('rejects an incomplete order rather than displaying blanks', () => {
    expectTradeError(() => normalizeOrder(null), 'unavailable');
    expectTradeError(() => normalizeOrder(orderPayload({ outAmount: undefined })), 'unavailable');
  });

  it('treats a quote as unsignable until it carries a transaction', () => {
    expect(isSignable(normalizeOrder(orderPayload()))).toBe(false);
    expect(isSignable(normalizeOrder(orderPayload({ transaction: 'AQAB...' })))).toBe(true);
    expect(isSignable(normalizeOrder(orderPayload({ transaction: 'AQAB...', requestId: null })))).toBe(false);
  });
});

describe('the substitution guard', () => {
  const expected = { inputMint: WSOL_MINT, outputMint: ARIES, amount: 100000000n };

  it('accepts the order the panel displayed', () => {
    expect(assertOrderMatches(normalizeOrder(orderPayload()), expected).outAmount)
      .toBe(105937985569n);
  });

  it('refuses an order for a different token', () => {
    expectTradeError(
      () => assertOrderMatches(normalizeOrder(orderPayload({ outputMint: TAURUS })), expected),
      'order_mismatch',
    );
    expectTradeError(
      () => assertOrderMatches(normalizeOrder(orderPayload({ inputMint: TAURUS })), expected),
      'order_mismatch',
    );
  });

  it('refuses an order that would spend a different amount', () => {
    expectTradeError(
      () => assertOrderMatches(normalizeOrder(orderPayload({ inAmount: '900000000' })), expected),
      'order_mismatch',
    );
  });

  it('refuses an order that returns nothing', () => {
    expectTradeError(
      () => assertOrderMatches(normalizeOrder(orderPayload({ outAmount: '0' })), expected),
      'order_mismatch',
    );
  });

  it('refuses a fee larger than the venue has ever published', () => {
    const inflated = orderPayload({ platformFee: { feeBps: VENUE_FEE_CEILING_BPS + 1 } });
    expectTradeError(() => assertOrderMatches(normalizeOrder(inflated), expected), 'unexpected_fee');
    // The venue's own 10 bps passes; the site adds none of its own.
    expect(assertOrderMatches(normalizeOrder(orderPayload()), expected).feeBps).toBe(10);
  });

  it('refuses a fee it cannot read rather than waving it through as zero', () => {
    const malformed = orderPayload({ platformFee: { feeBps: 'not-a-number' } });
    expectTradeError(() => assertOrderMatches(normalizeOrder(malformed), expected), 'unexpected_fee');
  });
});

describe('fetching an order', () => {
  it('quotes without a taker and asks for a transaction with one', async () => {
    const seen = [];
    const fetchImpl = async (url) => { seen.push(url); return jsonResponse(orderPayload()); };
    await fetchOrder({ inputMint: WSOL_MINT, outputMint: ARIES, amount: 100000000n, fetchImpl });
    await fetchOrder({ inputMint: WSOL_MINT, outputMint: ARIES, amount: 100000000n, taker: 'Wa11et', fetchImpl });

    expect(seen[0]).toContain('/ultra/v1/order');
    expect(seen[0]).toContain(`inputMint=${WSOL_MINT}`);
    expect(seen[0]).toContain(`outputMint=${ARIES}`);
    expect(seen[0]).toContain('amount=100000000');
    // No address leaves the browser merely to show a price.
    expect(seen[0]).not.toContain('taker=');
    expect(seen[1]).toContain('taker=Wa11et');
    // The site never asks the venue to attach a fee on its behalf.
    for (const url of seen) {
      expect(url).not.toMatch(/referral|feeAccount|platformFeeBps/i);
    }
  });

  it('maps venue failures onto codes the panel can speak', async () => {
    const cases = [
      [jsonResponse({ error: 'Failed to get quotes' }), 'no_route'],
      [jsonResponse({}, { status: 429 }), 'rate_limited'],
      [jsonResponse({}, { status: 503 }), 'unavailable'],
      [jsonResponse({ error: 'bad request' }, { status: 400 }), 'unavailable'],
    ];
    for (const [response, code] of cases) {
      await expectTradeError(
        () => fetchOrder({ inputMint: WSOL_MINT, outputMint: ARIES, amount: 1n, fetchImpl: async () => response }),
        code,
      );
    }
  });

  it('reports a dropped connection as a network problem', async () => {
    await expectTradeError(
      () => fetchOrder({
        inputMint: WSOL_MINT,
        outputMint: ARIES,
        amount: 1n,
        fetchImpl: async () => { throw new TypeError('Failed to fetch'); },
      }),
      'network',
    );
  });

  it('lets an abort propagate untouched so a stale quote can be cancelled', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    await expect(fetchOrder({
      inputMint: WSOL_MINT,
      outputMint: ARIES,
      amount: 1n,
      fetchImpl: async () => { throw abort; },
    })).rejects.toBe(abort);
  });
});

describe('executing a signed transaction', () => {
  it('sends exactly the two fields the venue validates', async () => {
    let captured;
    const fetchImpl = async (url, init) => {
      captured = { url, body: JSON.parse(init.body), method: init.method };
      return jsonResponse({ status: 'Success', signature: 'sig', slot: 1 });
    };
    const result = await executeOrder({ signedTransaction: 'AQAB', requestId: 'rid', fetchImpl });

    expect(captured.method).toBe('POST');
    expect(captured.url).toContain('/ultra/v1/execute');
    expect(Object.keys(captured.body).sort()).toEqual(['requestId', 'signedTransaction']);
    expect(result.signature).toBe('sig');
  });

  it('refuses to post an incomplete signature', async () => {
    await expectTradeError(
      () => executeOrder({ signedTransaction: '', requestId: 'rid', fetchImpl: async () => jsonResponse({}) }),
      'execute_failed',
    );
  });

  it('treats a venue rejection as a failed trade', async () => {
    await expectTradeError(
      () => executeOrder({
        signedTransaction: 'AQAB',
        requestId: 'rid',
        fetchImpl: async () => jsonResponse({ status: 'Failed', error: 'slippage exceeded' }),
      }),
      'execute_failed',
    );
  });

  it('reports a dropped connection as unconfirmed rather than failed', async () => {
    // A submitted trade can still land after the socket dies; saying "failed"
    // would invite a visitor to pay twice.
    await expectTradeError(
      () => executeOrder({
        signedTransaction: 'AQAB',
        requestId: 'rid',
        fetchImpl: async () => { throw new TypeError('Failed to fetch'); },
      }),
      'network',
    );
  });
});
