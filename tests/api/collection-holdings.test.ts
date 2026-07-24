import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCollectionHoldingsCache,
  handleCollectionHoldings,
} from '../../api/collection-holdings.js';

const ADDRESS = '0x0000000000000000000000000000000000000001';
const ENV = {
  NODE_ENV: 'production',
  PUBLIC_COLLECTION_ENABLED: '1',
  SOLANA_RPC_URL: 'https://rpc.test',
  BASE_RPC_URL: 'https://base.test',
};

function request(body: unknown = { address: ADDRESS }, method = 'POST') {
  return {
    method,
    headers: { origin: 'https://zodiacs.org', host: 'zodiacs.org' },
    body,
  };
}

function responseRecorder() {
  return {
    statusCode: 0,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) { this.headers.set(name, value); },
    end(value: string) { this.body = value; },
  };
}

beforeEach(() => clearCollectionHoldingsCache());

describe('collection holdings endpoint', () => {
  it('rejects non-POST and cross-origin requests', async () => {
    const method = responseRecorder();
    await handleCollectionHoldings(request(undefined, 'GET'), method, { env: ENV });
    expect(method.statusCode).toBe(405);
    expect(method.headers.get('Allow')).toBe('POST');

    const origin = responseRecorder();
    await handleCollectionHoldings({
      ...request(),
      headers: { origin: 'https://attacker.test', host: 'zodiacs.org' },
    }, origin, { env: ENV });
    expect(origin.statusCode).toBe(403);
  });

  it('is disabled without its own flag and honest about malformed addresses', async () => {
    const disabled = responseRecorder();
    await handleCollectionHoldings(request(), disabled, {
      env: { NODE_ENV: 'production', SOLANA_RPC_URL: 'https://rpc.test' },
    });
    expect(disabled.statusCode).toBe(404);
    expect(JSON.parse(disabled.body)).toEqual({ error: 'disabled' });

    const invalid = responseRecorder();
    await handleCollectionHoldings(request({ address: 'not-an-address' }), invalid, { env: ENV });
    expect(invalid.statusCode).toBe(400);
    expect(JSON.parse(invalid.body)).toEqual({ error: 'invalid_address' });
  });

  it('caches successful reads (including empty) and stamps checkedAt', async () => {
    const resolveHoldings = vi.fn().mockResolvedValue([
      { sign: 'aries', amount: 1.5 },
      { sign: 'leo', amount: 0.5 },
    ]);
    const first = responseRecorder();
    await handleCollectionHoldings(request(), first, { env: ENV, resolveHoldings, now: () => 1_000 });
    const second = responseRecorder();
    await handleCollectionHoldings(request(), second, { env: ENV, resolveHoldings, now: () => 2_000 });

    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toEqual({
      chain: 'base',
      address: ADDRESS,
      holdings: [{ sign: 'aries', amount: 1.5 }, { sign: 'leo', amount: 0.5 }],
      totalAmount: 2,
      checkedAt: new Date(1_000).toISOString(),
    });
    expect(resolveHoldings).toHaveBeenCalledTimes(1);
    expect(second.statusCode).toBe(200);
    expect(first.headers.get('Cache-Control')).toBe('private, no-store');

    clearCollectionHoldingsCache();
    const empty = responseRecorder();
    const resolveEmpty = vi.fn().mockResolvedValue([]);
    await handleCollectionHoldings(request(), empty, { env: ENV, resolveHoldings: resolveEmpty, now: () => 1_000 });
    expect(empty.statusCode).toBe(200);
    expect(JSON.parse(empty.body).holdings).toEqual([]);
    expect(JSON.parse(empty.body).totalAmount).toBe(0);
  });

  it('treats best-effort failure as 503 and never caches it', async () => {
    const resolveHoldings = vi.fn().mockResolvedValue(undefined);
    const first = responseRecorder();
    await handleCollectionHoldings(request(), first, { env: ENV, resolveHoldings, now: () => 1_000 });
    const second = responseRecorder();
    await handleCollectionHoldings(request(), second, { env: ENV, resolveHoldings, now: () => 2_000 });

    expect(first.statusCode).toBe(503);
    expect(JSON.parse(first.body)).toEqual({ error: 'unavailable' });
    expect(resolveHoldings).toHaveBeenCalledTimes(2);
  });

  it('is unavailable for a parsed chain that is not configured', async () => {
    const response = responseRecorder();
    await handleCollectionHoldings(request(), response, {
      env: { ...ENV, BASE_RPC_URL: undefined },
    });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ error: 'unavailable' });
  });
});
