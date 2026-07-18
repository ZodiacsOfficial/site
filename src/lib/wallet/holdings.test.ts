import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeOfficialHeldSigns,
  normalizeOfficialHoldings,
  resolveOfficialHeldSigns,
  resolveOfficialHoldings,
} from './holdings';

const ADDRESS = '0x0000000000000000000000000000000000000001';
const ENV = {
  NODE_ENV: 'production',
  BASE_RPC_URL: 'https://base-rpc.test/private-key',
};
const SOLANA_ENV = {
  NODE_ENV: 'production',
  SOLANA_RPC_URL: 'https://solana-rpc.test/private-key',
};

interface RpcRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: [string, { mint: string }, unknown] & unknown[];
}

// Public keyless RPC endpoints cap or reject JSON-RPC batches (observed
// 2026-07-17: mainnet-beta 429s getTokenAccountsByOwner, PublicNode caps
// that method at batch size 1, dRPC free tier caps batches at 3). The
// resolver therefore sends each per-asset call as its own single-object
// request, all twelve in parallel — these mocks answer one request per
// fetch call and fail loudly if the resolver ever posts an array again.
function singleFetcher(
  respond: (request: RpcRequest) => unknown,
  okFor: (request: RpcRequest) => boolean = () => true,
): typeof fetch {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const parsed = JSON.parse(String(init?.body)) as RpcRequest | RpcRequest[];
    if (Array.isArray(parsed)) throw new Error('unexpected batch request');
    return {
      ok: okFor(parsed),
      json: async () => respond(parsed),
    } as Response;
  }) as unknown as typeof fetch;
}

function baseResult(request: RpcRequest, result: unknown = '0x0') {
  return { jsonrpc: '2.0', id: request.id, result };
}

function solanaResult(request: RpcRequest, value: unknown = []) {
  return { jsonrpc: '2.0', id: request.id, result: { value } };
}

function solanaAccount(mint: string, amount: string, decimals = 6) {
  return {
    account: {
      data: {
        parsed: { info: { mint, tokenAmount: { amount, decimals } } },
      },
    },
  };
}

function sentRequests(fetcher: typeof fetch): RpcRequest[] {
  return (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls
    .map((call) => JSON.parse(String((call[1] as RequestInit).body)) as RpcRequest);
}

describe('official holdings resolution', () => {
  // Failed lookups warn (address-free) so Vercel function logs show the
  // provider failure mode; keep test output quiet and the spy inspectable.
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it('normalizes official signs to unique zodiac order', () => {
    expect(normalizeOfficialHeldSigns([
      'pisces', 'aries', 'taurus', 'aries', 'unknown',
    ])).toEqual(['aries', 'taurus', 'pisces']);
  });

  it('normalizes cabinet holdings to zodiac order and the strongest valid finish', () => {
    expect(normalizeOfficialHoldings([
      { sign: 'pisces', finish: 'pastel' },
      { sign: 'aries', finish: 'bronze' },
      { sign: 'aries', finish: 'gold', goldCount: '2' },
      { sign: 'aries', finish: 'gold', goldCount: '12' },
      { sign: 'leo', finish: 'gold' },
      { sign: 'virgo', finish: 'gold', goldCount: '01' },
      { sign: 'libra', finish: 'silver', goldCount: '1' },
      { sign: 'taurus', finish: 'invalid' },
      { sign: 'unknown', finish: 'silver' },
    ])).toEqual([
      { sign: 'aries', finish: 'gold', goldCount: '12' },
      { sign: 'pisces', finish: 'pastel' },
    ]);
  });

  it('resolves Base holdings from twelve individual balance calls', async () => {
    const fetcher = singleFetcher((request) => baseResult(
      request,
      request.id === 1 || request.id === 12 ? '0x01' : '0x00',
    ));

    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toEqual(['aries', 'pisces']);

    const requests = sentRequests(fetcher);
    expect(requests).toHaveLength(12);
    expect(new Set(requests.map((request) => request.id)).size).toBe(12);
    expect(requests.every((request) => request.method === 'eth_call')).toBe(true);
  });

  it('classifies exact Base balances without returning amounts', async () => {
    const largeGoldCount = 12_345_678_901_234_567_890n;
    const atomicById = new Map([
      [1, 1n],
      [2, 10_000n * 1_000_000n],
      [3, 100_000n * 1_000_000n],
      [4, 3_999_999n * 1_000_000n + 999_999n],
      [5, largeGoldCount * 1_000_000n * 1_000_000n + 999_999n],
    ]);
    const fetcher = singleFetcher((request) => baseResult(
      request,
      `0x${(atomicById.get(request.id) ?? 0n).toString(16)}`,
    ));

    const holdings = await resolveOfficialHoldings('base', ADDRESS, ENV, fetcher);
    expect(holdings).toEqual([
      { sign: 'aries', finish: 'pastel' },
      { sign: 'taurus', finish: 'bronze' },
      { sign: 'gemini', finish: 'silver' },
      { sign: 'cancer', finish: 'gold', goldCount: '3' },
      { sign: 'leo', finish: 'gold', goldCount: largeGoldCount.toString() },
    ]);
    expect(holdings?.every((holding) => (
      !('amount' in holding) && !('balance' in holding)
    ))).toBe(true);
  });

  it('treats all-zero Base balances as a successful empty lookup', async () => {
    const fetcher = singleFetcher((request) => baseResult(request));
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toEqual([]);
  });

  it('tolerates providers that add an explicit null error member to success responses', async () => {
    const fetcher = singleFetcher((request) => ({
      ...baseResult(request, request.id === 1 ? '0x01' : '0x00'),
      error: null,
    }));
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toEqual(['aries']);
  });

  it('queries the twelve official Solana mints as individual mint-scoped calls', async () => {
    const fetcher = singleFetcher((request) => solanaResult(
      request,
      request.id === 1 || request.id === 12
        ? [solanaAccount(request.params[1].mint, '1000000')]
        : [],
    ));

    await expect(resolveOfficialHeldSigns(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toEqual(['aries', 'pisces']);

    const requests = sentRequests(fetcher);
    expect(requests).toHaveLength(12);
    expect(new Set(requests.map((request) => request.params[1].mint)).size).toBe(12);
    expect(requests.every((request) => (
      request.method === 'getTokenAccountsByOwner'
        && Object.keys(request.params[1]).length === 1
        && typeof request.params[1].mint === 'string'
        && !('programId' in request.params[1])
    ))).toBe(true);
  });

  it('sums all Solana token accounts before assigning a finish', async () => {
    const fetcher = singleFetcher((request) => solanaResult(
      request,
      request.id === 1
        ? [
          solanaAccount(request.params[1].mint, '5000000000'),
          solanaAccount(request.params[1].mint, '5000000000'),
        ]
        : [],
    ));

    await expect(resolveOfficialHoldings(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toEqual([{ sign: 'aries', finish: 'bronze' }]);
  });

  it('computes Gold multiplicity after summing all Solana token accounts', async () => {
    const fetcher = singleFetcher((request) => solanaResult(
      request,
      request.id === 1
        ? [
          solanaAccount(request.params[1].mint, '1500000000000'),
          solanaAccount(request.params[1].mint, '2500000999999'),
        ]
        : [],
    ));

    await expect(resolveOfficialHoldings(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toEqual([{ sign: 'aries', finish: 'gold', goldCount: '4' }]);
  });

  it('treats empty Solana responses as a successful empty lookup', async () => {
    const fetcher = singleFetcher((request) => solanaResult(request));
    await expect(resolveOfficialHeldSigns(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toEqual([]);
  });

  it.each([
    ['mismatched response id', (request: RpcRequest) => baseResult({ ...request, id: 99 })],
    ['provider error', (request: RpcRequest) => (
      request.id === 4
        ? { jsonrpc: '2.0', id: request.id, error: { code: -32000 } }
        : baseResult(request)
    )],
    ['malformed balance', (request: RpcRequest) => baseResult(
      request,
      request.id === 4 ? 'not-hex' : '0x0',
    )],
    ['array payload', (request: RpcRequest) => [baseResult(request)]],
  ])('fails closed when any Base response carries a %s', async (_label, respond) => {
    const fetcher = singleFetcher(respond);
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toBeUndefined();
  });

  it('fails closed when any single Base request fails at HTTP or JSON level', async () => {
    const httpFailure = singleFetcher(
      (request) => baseResult(request),
      (request) => request.id !== 7,
    );
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, httpFailure))
      .resolves.toBeUndefined();

    const jsonFailure = vi.fn(async () => ({
      ok: true,
      json: async () => { throw new Error('invalid JSON'); },
    } as unknown as Response)) as unknown as typeof fetch;
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, jsonFailure))
      .resolves.toBeUndefined();
  });

  it.each([
    ['mismatched response id', (request: RpcRequest) => solanaResult({ ...request, id: 99 })],
    ['provider error', (request: RpcRequest) => (
      request.id === 4
        ? { jsonrpc: '2.0', id: request.id, error: { code: -32000 } }
        : solanaResult(request)
    )],
    ['malformed result', (request: RpcRequest) => (
      request.id === 4
        ? { jsonrpc: '2.0', id: request.id, result: { value: {} } }
        : solanaResult(request)
    )],
    ['wrong returned mint', (request: RpcRequest) => solanaResult(
      request,
      request.id === 4 ? [solanaAccount('wrong-mint', '1')] : [],
    )],
    ['malformed balance', (request: RpcRequest) => solanaResult(
      request,
      request.id === 4 ? [solanaAccount(request.params[1].mint, '1.5')] : [],
    )],
    ['missing decimals', (request: RpcRequest) => solanaResult(
      request,
      request.id === 4
        ? [{ account: { data: { parsed: { info: {
          mint: request.params[1].mint,
          tokenAmount: { amount: '1' },
        } } } } }]
        : [],
    )],
    ['mismatched decimals', (request: RpcRequest) => solanaResult(
      request,
      request.id === 4 ? [solanaAccount(request.params[1].mint, '1', 9)] : [],
    )],
    ['array payload', (request: RpcRequest) => [solanaResult(request)]],
  ])('fails closed when any Solana response carries a %s', async (_label, respond) => {
    const fetcher = singleFetcher(respond);
    await expect(resolveOfficialHeldSigns(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toBeUndefined();
  });

  it('fails closed when any single Solana request fails at the HTTP level', async () => {
    const fetcher = singleFetcher(
      (request) => solanaResult(request),
      (request) => request.id !== 7,
    );
    await expect(resolveOfficialHeldSigns(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toBeUndefined();
  });

  it('retries a failed call once before failing closed', async () => {
    let firstAttemptForId7 = true;
    const fetcher = singleFetcher(
      (request) => baseResult(request, request.id === 1 ? '0x01' : '0x00'),
      (request) => {
        if (request.id === 7 && firstAttemptForId7) {
          firstAttemptForId7 = false;
          return false;
        }
        return true;
      },
    );

    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toEqual(['aries']);
    expect((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(13);
  });

  it('fails closed when the retry also fails, and reports the failure without the address', async () => {
    const fetcher = singleFetcher(
      (request) => baseResult(request),
      (request) => request.id !== 7,
    );
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toBeUndefined();
    expect((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(13);

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = warn.mock.calls[0].map(String).join(' ');
    expect(logged).toContain('base');
    expect(logged).toContain('http-error');
    expect(logged).not.toContain(ADDRESS);
  });

  it('keeps at most four Solana calls in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as RpcRequest;
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return {
        ok: true,
        json: async () => solanaResult(request),
      } as Response;
    }) as unknown as typeof fetch;

    await expect(resolveOfficialHeldSigns(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toEqual([]);
    expect((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(12);
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });

  it('passes the endpoint abort signal to every RPC request', async () => {
    const controller = new AbortController();
    const fetcher = singleFetcher((request) => baseResult(request));
    await resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher, controller.signal);

    const calls = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(12);
    for (const [url, init] of calls) {
      expect(url).toBe(ENV.BASE_RPC_URL);
      expect((init as RequestInit).signal).toBe(controller.signal);
    }
  });
});
