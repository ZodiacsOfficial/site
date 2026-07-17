import { describe, expect, it, vi } from 'vitest';
import {
  normalizeOfficialHeldSigns,
  resolveOfficialHeldSigns,
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

function solanaAccount(mint: string, amount: string) {
  return {
    account: {
      data: {
        parsed: { info: { mint, tokenAmount: { amount } } },
      },
    },
  };
}

function sentRequests(fetcher: typeof fetch): RpcRequest[] {
  return (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls
    .map(([, init]: [unknown, RequestInit]) => JSON.parse(String(init.body)) as RpcRequest);
}

describe('official holdings resolution', () => {
  it('normalizes official signs to unique zodiac order', () => {
    expect(normalizeOfficialHeldSigns([
      'pisces', 'aries', 'taurus', 'aries', 'unknown',
    ])).toEqual(['aries', 'taurus', 'pisces']);
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
