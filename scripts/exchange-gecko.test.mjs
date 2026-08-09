import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  GECKO_BASE_URL,
  TIMEFRAMES,
  createRateBudget,
  fetchOhlcv,
  fetchTrades,
  normalizeOhlcv,
  normalizeTrades,
  ohlcvUrl,
  tradesUrl,
} from '../src/exchange/gecko.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POOL = 'HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS';
const MINT = 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv';
const WSOL = 'So11111111111111111111111111111111111111112';

describe('the URLs', () => {
  it('reach only the documented read-only endpoints', () => {
    for (const timeframe of Object.keys(TIMEFRAMES)) {
      const url = new URL(ohlcvUrl({ pool: POOL, timeframe }));
      expect(url.origin).toBe('https://api.geckoterminal.com');
      expect(url.pathname).toBe(
        `/api/v2/networks/solana/pools/${POOL}/ohlcv/${TIMEFRAMES[timeframe].path}`,
      );
      expect([...url.searchParams.keys()].sort()).toEqual(['aggregate', 'limit']);
    }
    const trades = new URL(tradesUrl({ pool: POOL }));
    expect(trades.origin).toBe('https://api.geckoterminal.com');
    expect(trades.pathname).toBe(`/api/v2/networks/solana/pools/${POOL}/trades`);
    expect([...trades.searchParams.keys()]).toEqual([]);
  });

  it('carry no key, token, referral, or fee parameter anywhere', () => {
    for (const url of [
      ohlcvUrl({ pool: POOL, timeframe: '1h' }),
      tradesUrl({ pool: POOL }),
      GECKO_BASE_URL,
    ]) {
      expect(url).not.toMatch(/api[-_]?key|token=|referral|fee|secret|auth/i);
    }
  });

  it('sends no visitor identifier and no auth header', async () => {
    let seen;
    const fetchImpl = async (url, init) => {
      seen = { url, init };
      return { ok: true, status: 200, json: async () => ({ data: { attributes: { ohlcv_list: [] } } }) };
    };
    await fetchOhlcv({ pool: POOL, timeframe: '1h', fetchImpl });
    expect(Object.keys(seen.init.headers)).toEqual(['accept']);
    expect(seen.init.method).toBe('GET');
  });
});

describe('no key can hide in the sources', () => {
  it('keeps the whole exchange bundle free of key and referral parameters', async () => {
    for (const file of [
      'src/exchange/gecko.mjs', 'src/exchange/stats.mjs', 'src/exchange/depth.mjs',
      'src/exchange/terminal.mjs', 'src/exchange/pools.mjs', 'src/exchange/browser.mjs',
      'public/assets/exchange.js',
    ]) {
      const source = await readFile(resolve(root, file), 'utf8');
      expect(source, file).not.toMatch(/x-api-key|apiKey|api_key|referral|feeAccount|platformFeeBps/i);
    }
  });
});

describe('normalizing candles', () => {
  it('sorts ascending and drops malformed rows', () => {
    const payload = {
      data: {
        attributes: {
          ohlcv_list: [
            [1786291200, 2, 3, 1, 2.5, 70.5],
            [1786233600, 1, 2, 0.5, 1.5, 11.19],
            ['bad', 1, 2, 0.5, 1.5, 11.19],
            [1786240000, 0, 2, 0.5, 1.5, 11.19],
            null,
          ],
        },
      },
    };
    const candles = normalizeOhlcv(payload);
    expect(candles.map((c) => c.ts)).toEqual([1786233600, 1786291200]);
    expect(candles[1]).toEqual({ ts: 1786291200, o: 2, h: 3, l: 1, c: 2.5, v: 70.5 });
  });

  it('refuses an unreadable payload', () => {
    expect(() => normalizeOhlcv({})).toThrow(/not readable/);
  });
});

describe('normalizing trades', () => {
  const trade = (over = {}) => ({
    id: 'solana_1_tx_1',
    attributes: {
      block_timestamp: '2026-08-09T16:57:37Z',
      kind: 'buy',
      from_token_amount: '0.0244',
      to_token_amount: '26003.243382',
      price_from_in_usd: '77.29',
      price_to_in_usd: '0.0000727',
      volume_in_usd: '1.89',
      from_token_address: WSOL,
      to_token_address: MINT,
      tx_hash: 'tx',
      ...over,
    },
  });

  it('reads the Zodiac side of the trade by mint, newest first', () => {
    const rows = normalizeTrades({
      data: [
        trade(),
        trade({
          kind: 'sell',
          block_timestamp: '2026-08-09T16:59:00Z',
          from_token_address: MINT,
          to_token_address: WSOL,
          from_token_amount: '346751.95',
          price_from_in_usd: '0.0000726',
        }),
      ],
    }, MINT);
    expect(rows).toHaveLength(2);
    expect(rows[0].side).toBe('sell');
    expect(rows[0].tokenAmount).toBeCloseTo(346751.95);
    expect(rows[0].priceUsd).toBeCloseTo(0.0000726);
    expect(rows[1].side).toBe('buy');
    expect(rows[1].tokenAmount).toBeCloseTo(26003.243382);
  });

  it('drops rows that do not involve the official mint rather than guessing', () => {
    const stray = trade({ from_token_address: WSOL, to_token_address: 'SomethingElse' });
    expect(normalizeTrades({ data: [stray] }, MINT)).toHaveLength(0);
  });

  it('drops malformed rows', () => {
    const rows = normalizeTrades({
      data: [trade({ block_timestamp: 'nope' }), trade({ kind: 'other' }), null],
    }, MINT);
    expect(rows).toHaveLength(0);
  });
});

describe('failure states', () => {
  const response = (status) => async () => ({ ok: false, status, json: async () => ({}) });

  it('names a rate limit as a rate limit', async () => {
    await expect(fetchTrades({ pool: POOL, mint: MINT, fetchImpl: response(429) }))
      .rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('names a missing pool as not indexed', async () => {
    await expect(fetchOhlcv({ pool: POOL, timeframe: '1d', fetchImpl: response(404) }))
      .rejects.toMatchObject({ code: 'not_indexed' });
  });

  it('lets an abort pass through untouched', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    await expect(fetchOhlcv({
      pool: POOL, timeframe: '1d', fetchImpl: async () => { throw abort; },
    })).rejects.toBe(abort);
  });
});

describe('the rate budget', () => {
  it('refuses past the ceiling and recovers as the window slides', () => {
    let clock = 0;
    const budget = createRateBudget({ limit: 2, windowMs: 1000, now: () => clock });
    expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(false);
    clock = 1001;
    expect(budget.take()).toBe(true);
  });
});
