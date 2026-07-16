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
  id: number;
}

interface SolanaRpcRequest extends RpcRequest {
  method: string;
  params: [string, { mint: string }, unknown];
}

function baseFetcher(
  responseFor: (requests: RpcRequest[]) => unknown,
  ok = true,
): typeof fetch {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const requests = JSON.parse(String(init?.body)) as RpcRequest[];
    return {
      ok,
      json: async () => responseFor(requests),
    } as Response;
  }) as unknown as typeof fetch;
}

function completeBatch(
  requests: RpcRequest[],
  resultFor: (id: number) => unknown = () => '0x0',
) {
  return requests.map(({ id }) => ({ jsonrpc: '2.0', id, result: resultFor(id) }));
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

function completeSolanaBatch(
  requests: SolanaRpcRequest[],
  valueFor: (request: SolanaRpcRequest) => unknown[] = () => [],
) {
  return requests.map((request) => ({
    jsonrpc: '2.0',
    id: request.id,
    result: { value: valueFor(request) },
  }));
}

function solanaFetcher(
  responseFor: (requests: SolanaRpcRequest[]) => unknown,
  ok = true,
): typeof fetch {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const requests = JSON.parse(String(init?.body)) as SolanaRpcRequest[];
    return {
      ok,
      json: async () => responseFor(requests),
    } as Response;
  }) as unknown as typeof fetch;
}

describe('official holdings resolution', () => {
  it('normalizes official signs to unique zodiac order', () => {
    expect(normalizeOfficialHeldSigns([
      'pisces', 'aries', 'taurus', 'aries', 'unknown',
    ])).toEqual(['aries', 'taurus', 'pisces']);
  });

  it('accepts a complete Base batch in any response order', async () => {
    const fetcher = baseFetcher((requests) => completeBatch(
      requests,
      (id) => id === 1 || id === 12 ? '0x01' : '0x00',
    ).reverse());
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toEqual(['aries', 'pisces']);
  });

  it('treats a complete all-zero Base batch as a successful empty lookup', async () => {
    const fetcher = baseFetcher((requests) => completeBatch(requests));
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toEqual([]);
  });

  it('tolerates providers that add an explicit null error member to success entries', async () => {
    const fetcher = baseFetcher((requests) => completeBatch(
      requests,
      (id) => (id === 1 ? '0x01' : '0x00'),
    ).map((entry) => ({ ...entry, error: null })));
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toEqual(['aries']);
  });

  it('queries only the twelve official Solana mints in one batch', async () => {
    const fetcher = solanaFetcher((requests) => completeSolanaBatch(
      requests,
      (request) => request.id === 1 || request.id === 12
        ? [solanaAccount(request.params[1].mint, '1000000')]
        : [],
    ).reverse());

    await expect(resolveOfficialHeldSigns(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toEqual(['aries', 'pisces']);

    const body = JSON.parse(String((fetcher as any).mock.calls[0][1].body)) as SolanaRpcRequest[];
    expect(body).toHaveLength(12);
    expect(body.every((request) => (
      request.method === 'getTokenAccountsByOwner'
        && Object.keys(request.params[1]).length === 1
        && typeof request.params[1].mint === 'string'
        && !('programId' in request.params[1])
    ))).toBe(true);
  });

  it('treats a complete empty Solana batch as a successful empty lookup', async () => {
    const fetcher = solanaFetcher((requests) => completeSolanaBatch(requests));
    await expect(resolveOfficialHeldSigns(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toEqual([]);
  });

  it.each([
    ['missing response', (requests: RpcRequest[]) => completeBatch(requests).slice(0, -1)],
    ['duplicate response id', (requests: RpcRequest[]) => {
      const payload = completeBatch(requests);
      payload[payload.length - 1] = { ...payload[0] };
      return payload;
    }],
    ['unknown response id', (requests: RpcRequest[]) => {
      const payload = completeBatch(requests);
      payload[payload.length - 1] = { jsonrpc: '2.0', id: 99, result: '0x0' };
      return payload;
    }],
    ['per-call provider error', (requests: RpcRequest[]) => completeBatch(requests).map((entry, index) => (
      index === 3 ? { jsonrpc: '2.0', id: entry.id, error: { code: -32000 } } : entry
    ))],
    ['malformed balance', (requests: RpcRequest[]) => completeBatch(
      requests,
      (id) => id === 4 ? 'not-hex' : '0x0',
    )],
    ['non-array payload', () => ({ jsonrpc: '2.0', result: [] })],
  ])('fails closed for a Base batch with a %s', async (_label, responseFor) => {
    const fetcher = baseFetcher(responseFor);
    await expect(resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher))
      .resolves.toBeUndefined();
  });

  it('fails closed for HTTP and JSON provider failures', async () => {
    const httpFailure = baseFetcher(() => [], false);
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
    ['missing response', (requests: SolanaRpcRequest[]) => completeSolanaBatch(requests).slice(0, -1)],
    ['duplicate response id', (requests: SolanaRpcRequest[]) => {
      const payload = completeSolanaBatch(requests);
      payload[payload.length - 1] = { ...payload[0] };
      return payload;
    }],
    ['unknown response id', (requests: SolanaRpcRequest[]) => {
      const payload = completeSolanaBatch(requests);
      payload[payload.length - 1] = { jsonrpc: '2.0', id: 99, result: { value: [] } };
      return payload;
    }],
    ['per-call provider error', (requests: SolanaRpcRequest[]) => completeSolanaBatch(requests).map((entry, index) => (
      index === 3 ? { jsonrpc: '2.0', id: entry.id, error: { code: -32000 } } : entry
    ))],
    ['malformed result', (requests: SolanaRpcRequest[]) => completeSolanaBatch(requests).map((entry, index) => (
      index === 3 ? { jsonrpc: '2.0', id: entry.id, result: { value: {} } } : entry
    ))],
    ['wrong returned mint', (requests: SolanaRpcRequest[]) => completeSolanaBatch(
      requests,
      (request) => request.id === 4 ? [solanaAccount('wrong-mint', '1')] : [],
    )],
    ['malformed balance', (requests: SolanaRpcRequest[]) => completeSolanaBatch(
      requests,
      (request) => request.id === 4 ? [solanaAccount(request.params[1].mint, '1.5')] : [],
    )],
    ['non-array payload', () => ({ jsonrpc: '2.0', result: { value: [] } })],
  ])('fails closed for a Solana batch with a %s', async (_label, responseFor) => {
    const fetcher = solanaFetcher(responseFor);
    await expect(resolveOfficialHeldSigns(
      'solana',
      '11111111111111111111111111111111',
      SOLANA_ENV,
      fetcher,
    )).resolves.toBeUndefined();
  });

  it('passes the endpoint abort signal to the RPC request', async () => {
    const controller = new AbortController();
    const fetcher = baseFetcher((requests) => completeBatch(requests));
    await resolveOfficialHeldSigns('base', ADDRESS, ENV, fetcher, controller.signal);
    expect(fetcher).toHaveBeenCalledWith(
      ENV.BASE_RPC_URL,
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
