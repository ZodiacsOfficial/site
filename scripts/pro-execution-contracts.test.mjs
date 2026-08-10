import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ProQuoteError,
  QUOTE_ONLY_CAPABILITIES,
  USDC_MINT,
  atomicToDecimal,
  decimalToAtomic,
  isSolanaAddress,
  normalizeQuoteIntent,
  parseRetryAfter,
} from '../src/pro/execution/contracts.mjs';
import {
  JUPITER_CAPABILITIES,
  fetchJupiterQuote,
  jupiterQuoteUrl,
  normalizeJupiterQuote,
} from '../src/pro/execution/jupiter-v2.mjs';
import {
  RAYDIUM_CAPABILITIES,
  fetchRaydiumQuote,
  normalizeRaydiumQuote,
  raydiumQuoteUrl,
} from '../src/pro/execution/raydium.mjs';
import { compareProviderQuotes } from '../src/pro/execution/coordinator.mjs';
import {
  intentForMarket,
  normalizeRegistryMarkets,
} from '../src/pro/catalog.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const registry = JSON.parse(await readFile(resolve(ROOT, 'public/registry/zodiacs.registry.json'), 'utf8'));
const markets = normalizeRegistryMarkets(registry);
const ARIES = markets.get('aries').mint;
const TAURUS = markets.get('taurus').mint;
const POOL = 'HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS';
const officialMints = new Set([...markets.values()].map((market) => market.mint));
const intent = intentForMarket(markets, {
  sign: 'aries', side: 'buy', amount: '25000000', slippageBps: 50,
});

function jupiterPayload(overrides = {}) {
  return {
    inputMint: USDC_MINT,
    outputMint: ARIES,
    inAmount: '25000000',
    outAmount: '125000000000',
    transaction: null,
    requestId: 'ephemeral-handle-must-not-escape',
    router: 'metis',
    mode: 'ultra',
    swapMode: 'ExactIn',
    slippageBps: 26,
    priceImpact: -0.18,
    feeBps: 10,
    feeMint: USDC_MINT,
    platformFee: { amount: '25000', feeBps: 10, feeMint: USDC_MINT },
    ...overrides,
  };
}

function raydiumPayload(overrides = {}) {
  return {
    id: 'opaque-handle-must-not-escape',
    success: true,
    version: 'V1',
    data: {
      swapType: 'BaseIn',
      inputMint: USDC_MINT,
      inputAmount: '25000000',
      outputMint: ARIES,
      outputAmount: '124000000000',
      otherAmountThreshold: '123380000000',
      slippageBps: 50,
      priceImpactPct: 0.18,
      referrerAmount: '0',
      routePlan: [{
        poolId: POOL,
        inputMint: USDC_MINT,
        outputMint: ARIES,
        feeAmount: '6250',
        feeMint: USDC_MINT,
      }],
      ...overrides,
    },
  };
}

describe('Registry Pro atomic and market contracts', () => {
  it('keeps exact arithmetic beyond Number.MAX_SAFE_INTEGER', () => {
    expect(decimalToAtomic('9007199254740993.123456', 6)).toBe('9007199254740993123456');
    expect(atomicToDecimal('9007199254740993123456', 6)).toBe('9007199254740993.123456');
    expect(decimalToAtomic('0.000001', 6)).toBe('1');
  });

  it.each(['1e6', '-1', '+1', '01', '1.0000001', ''])(
    'refuses non-canonical exact input %s',
    (value) => expect(() => decimalToAtomic(value, 6)).toThrow(ProQuoteError),
  );

  it('refuses JavaScript numbers at exact-amount boundaries', () => {
    expect(() => atomicToDecimal(Number.MAX_SAFE_INTEGER, 6)).toThrow(ProQuoteError);
  });

  it('accepts only official Zodiac/USDC pairs and rejects wallet or compensation fields', () => {
    expect(normalizeQuoteIntent(intent, { officialMints })).toEqual(intent);
    expect(() => normalizeQuoteIntent({ ...intent, inputMint: ARIES, outputMint: TAURUS }, { officialMints }))
      .toThrow(/pair/u);
    expect(() => normalizeQuoteIntent({ ...intent, taker: '11111111111111111111111111111111' }, { officialMints }))
      .toThrow(/Wallet and compensation/u);
    expect(() => normalizeQuoteIntent({ ...intent, referralFee: 50 }, { officialMints }))
      .toThrow(/Wallet and compensation/u);
  });

  it('derives both buy and sell directions from Registry identity and pins slippage edges', () => {
    const sell = intentForMarket(markets, {
      sign: 'aries', side: 'sell', amount: '125000000000', slippageBps: 50,
    });
    expect(sell).toEqual({
      inputMint: ARIES,
      outputMint: USDC_MINT,
      amount: '125000000000',
      slippageBps: 50,
    });
    for (const slippageBps of [10, 100]) {
      expect(intentForMarket(markets, {
        sign: 'aries', side: 'buy', amount: '25000000', slippageBps,
      }).slippageBps).toBe(slippageBps);
    }
    for (const slippageBps of [9, 101]) {
      expect(() => intentForMarket(markets, {
        sign: 'aries', side: 'buy', amount: '25000000', slippageBps,
      })).toThrow(/Slippage must be an integer from 10 to 100 bps/u);
    }
  });

  it('derives provider identity only from all twelve committed Registry records', () => {
    expect(markets.size).toBe(12);
    expect(markets.get('aries')).toMatchObject({ mint: ARIES, decimals: 6, symbol: 'ARIES' });
    const changed = structuredClone(registry);
    changed.assets.find((asset) => asset.sign === 'aries').native.address = USDC_MINT;
    expect(() => normalizeRegistryMarkets(changed)).toThrow(/Aries Registry record/u);
  });

  it('recognizes exact 32-byte Solana addresses', () => {
    expect(isSolanaAddress(ARIES)).toBe(true);
    expect(isSolanaAddress(POOL)).toBe(true);
    expect(isSolanaAddress(`${ARIES}0`)).toBe(false);
    expect(isSolanaAddress('111')).toBe(false);
  });

  it('bounds Retry-After seconds and dates', () => {
    expect(parseRetryAfter('12', 0)).toBe(12_000);
    expect(parseRetryAfter('Thu, 01 Jan 1970 00:00:45 GMT', 30_000)).toBe(15_000);
    expect(parseRetryAfter('600', 0)).toBe(120_000);
    expect(parseRetryAfter('bad', 0)).toBe(0);
  });
});

describe('Jupiter Swap V2 quote-only adapter', () => {
  it('emits only the three quote parameters and retains no execution capability', () => {
    const url = new URL(jupiterQuoteUrl(intent));
    expect([...url.searchParams.keys()]).toEqual(['inputMint', 'outputMint', 'amount']);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      inputMint: USDC_MINT, outputMint: ARIES, amount: '25000000',
    });
    expect(JUPITER_CAPABILITIES).toBe(QUOTE_ONLY_CAPABILITIES);
    expect(JUPITER_CAPABILITIES).toEqual({ quote: true, prepare: false, sign: false, submit: false });
  });

  it('normalizes exact quote fields while dropping request and transaction handles', () => {
    const quote = normalizeJupiterQuote(jupiterPayload(), intent, { now: 1_000 });
    expect(quote).toMatchObject({
      provider: 'jupiter', inputAmount: '25000000', outputAmount: '125000000000',
      feeBps: 10, platformFeeBps: 10, slippageBps: 26,
      priceImpactPct: -0.18, route: ['metis'], executable: false,
    });
    expect(quote).not.toHaveProperty('requestId');
    expect(quote).not.toHaveProperty('transaction');
  });

  it.each([
    ['transaction', { transaction: 'base64' }],
    ['missing null transaction proof', { transaction: undefined }],
    ['transaction alias', { swapTransaction: 'base64' }],
    ['substituted mint', { outputMint: TAURUS }],
    ['substituted amount', { inAmount: '25000001' }],
    ['unknown router', { router: 'new-router' }],
    ['manual mode', { mode: 'manual' }],
    ['non-exact-input mode', { swapMode: 'ExactOut' }],
    ['missing RTSE slippage', { slippageBps: undefined }],
    ['string RTSE slippage', { slippageBps: '26' }],
    ['missing current price impact', { priceImpact: undefined }],
    ['string current price impact', { priceImpact: '-0.18' }],
    ['unbounded current price impact', { priceImpact: -100.01 }],
    ['malformed explicit expiry', { expireAt: 'not-a-date' }],
    ['invalid fee', { feeBps: 51 }],
    ['platform fee above total', { platformFee: { feeBps: 11 }, feeBps: 10 }],
  ])('fails closed on %s', (_label, override) => {
    expect(() => normalizeJupiterQuote(jupiterPayload(override), intent)).toThrow(ProQuoteError);
  });

  it('accepts only the documented Swap V2 routers', () => {
    for (const router of ['metis', 'jupiterz', 'dflow', 'okx']) {
      expect(normalizeJupiterQuote(jupiterPayload({ router }), intent).route).toEqual([router]);
    }
    expect(() => normalizeJupiterQuote(jupiterPayload({ router: 'iris' }), intent))
      .toThrow(expect.objectContaining({ code: 'schema_changed' }));
  });

  it('classifies malformed Jupiter atomic output as a provider schema change', () => {
    expect(() => normalizeJupiterQuote(jupiterPayload({ outAmount: 123 }), intent))
      .toThrow(expect.objectContaining({ code: 'schema_changed' }));
  });

  it('sends the API key only in a server header and maps rate limits', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '17' }),
      json: vi.fn(),
    }));
    await expect(fetchJupiterQuote({
      intent, apiKey: 'server-key-1234567890', fetchImpl, now: () => 0,
    })).rejects.toMatchObject({ code: 'rate_limited', retryAfterMs: 17_000 });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/swap/v2/order?'),
      expect.objectContaining({
        method: 'GET', redirect: 'error',
        headers: { accept: 'application/json', 'x-api-key': 'server-key-1234567890' },
      }),
    );
    expect(fetchImpl.mock.calls[0][0]).not.toMatch(/taker|wallet|referr|fee/iu);
  });
});

describe('Raydium quote-only adapter', () => {
  it('uses the keyless exact-input compute endpoint and no transaction path', () => {
    const url = new URL(raydiumQuoteUrl(intent));
    expect(url.pathname).toBe('/compute/swap-base-in');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      inputMint: USDC_MINT,
      outputMint: ARIES,
      amount: '25000000',
      slippageBps: '50',
      txVersion: 'V0',
    });
    expect(url.toString()).not.toMatch(/transaction\/swap|wallet|referr/iu);
    expect(RAYDIUM_CAPABILITIES).toEqual({ quote: true, prepare: false, sign: false, submit: false });
  });

  it('normalizes a continuous exact route without retaining the quote handle', () => {
    const quote = normalizeRaydiumQuote(raydiumPayload(), intent, { now: 1_000 });
    expect(quote).toMatchObject({
      provider: 'raydium', inputAmount: '25000000', outputAmount: '124000000000',
      minimumOutput: '123380000000', priceImpactPct: 0.18, route: [POOL], executable: false,
    });
    expect(quote).not.toHaveProperty('id');
  });

  it.each([
    ['substituted mint', { outputMint: TAURUS }],
    ['substituted amount', { inputAmount: '25000001' }],
    ['nonzero referrer', { referrerAmount: '1' }],
    ['missing referrer proof', { referrerAmount: undefined }],
    ['transaction-shaped response', { transaction: 'base64' }],
    ['bad threshold', { otherAmountThreshold: '125000000000' }],
    ['bad slippage', { slippageBps: 51 }],
    ['string price impact', { priceImpactPct: '0.18' }],
    ['disconnected route', { routePlan: [{ poolId: POOL, inputMint: ARIES, outputMint: USDC_MINT, feeAmount: '1', feeMint: ARIES }] }],
  ])('fails closed on %s', (_label, override) => {
    expect(() => normalizeRaydiumQuote(raydiumPayload(override), intent)).toThrow(ProQuoteError);
  });

  it('uses GET only and maps logical no-route answers', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: false, msg: 'No route found' }),
    }));
    await expect(fetchRaydiumQuote({ intent, fetchImpl })).rejects.toMatchObject({ code: 'no_route' });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/compute/swap-base-in?'),
      expect.objectContaining({ method: 'GET', redirect: 'error' }),
    );
  });

  it('classifies malformed Raydium atomic output as a provider schema change', () => {
    expect(() => normalizeRaydiumQuote(raydiumPayload({ outputAmount: 123 }), intent))
      .toThrow(expect.objectContaining({ code: 'schema_changed' }));
  });
});

describe('provider-neutral quote coordinator', () => {
  beforeEach(() => vi.useRealTimers());

  it('orders identical intents by exact BigInt output and names the result honestly', async () => {
    const larger = normalizeJupiterQuote(jupiterPayload({ outAmount: '9007199254740993123457' }), intent, { now: 1_000 });
    const smaller = normalizeRaydiumQuote(raydiumPayload({ outputAmount: '9007199254740993123456' }), intent, { now: 1_000 });
    const result = await compareProviderQuotes({
      intent,
      providers: [
        { id: 'raydium', quote: async () => smaller },
        { id: 'jupiter', quote: async () => larger },
      ],
      now: 2_000,
    });
    expect(result.status).toBe('complete');
    expect(result.highestQuotedOutputProvider).toBe('jupiter');
    expect(result).not.toHaveProperty('bestExecution');
  });

  it('retains partial failures and deterministic ties', async () => {
    const tiedJupiter = normalizeJupiterQuote(jupiterPayload({ outAmount: '124000000000' }), intent, { now: 1_000 });
    const tiedRaydium = normalizeRaydiumQuote(raydiumPayload(), intent, { now: 1_000 });
    const complete = await compareProviderQuotes({
      intent,
      providers: [
        { id: 'raydium', quote: async () => tiedRaydium },
        { id: 'jupiter', quote: async () => tiedJupiter },
      ],
      now: 2_000,
    });
    expect(complete.highestQuotedOutputProvider).toBe('jupiter');

    const partial = await compareProviderQuotes({
      intent,
      providers: [
        { id: 'jupiter', quote: async () => tiedJupiter },
        { id: 'raydium', quote: async () => { throw new ProQuoteError('rate_limited', 'pause', { retryAfterMs: 10_000 }); } },
      ],
      now: 2_000,
    });
    expect(partial.status).toBe('partial');
    expect(partial.results).toEqual([
      expect.objectContaining({ provider: 'jupiter', status: 'ready' }),
      { provider: 'raydium', status: 'failed', error: 'rate_limited', retryAfterMs: 10_000 },
    ]);
  });

  it('rejects quotes that arrive outside their provider lifetime', async () => {
    const stale = normalizeRaydiumQuote(raydiumPayload(), intent, { now: 1_000 });
    const result = await compareProviderQuotes({
      intent,
      providers: [{ id: 'raydium', quote: async () => stale }],
      now: 31_001,
    });
    expect(result.status).toBe('unavailable');
    expect(result.results[0]).toMatchObject({ error: 'stale' });
  });

  it('preserves an explicit expired Jupiter boundary so it cannot gain fallback freshness', async () => {
    const expired = normalizeJupiterQuote(jupiterPayload({
      expireAt: '1970-01-01T00:00:00.900Z',
    }), intent, { now: 1_000 });
    expect(expired.expiresAt).toBe('1970-01-01T00:00:00.900Z');
    const result = await compareProviderQuotes({
      intent,
      providers: [{ id: 'jupiter', quote: async () => expired }],
      now: 1_000,
    });
    expect(result.results[0]).toMatchObject({ provider: 'jupiter', error: 'stale' });
  });

  it('checks freshness after a provider answers instead of freezing request-start time', async () => {
    let clock = 1_000;
    const result = await compareProviderQuotes({
      intent,
      providers: [{
        id: 'raydium',
        quote: async () => {
          clock = 1_001;
          return normalizeRaydiumQuote(raydiumPayload(), intent, { now: clock });
        },
      }],
      now: () => clock,
    });
    expect(result.status).toBe('complete');
    expect(result.results[0]).toMatchObject({ provider: 'raydium', status: 'ready' });
  });
});
