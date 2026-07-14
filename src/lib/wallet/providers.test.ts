import { describe, expect, it, vi } from 'vitest';
import {
  BaseExplorerWalletBirthProvider,
  BaseRpcWalletBirthProvider,
  HistoryCostBoundaryError,
  SolanaWalletBirthProvider,
} from './providers';

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Solana wallet birth provider', () => {
  it('paginates to the oldest signature and chooses the earliest non-null block time', async () => {
    const fullPage = Array.from({ length: 1_000 }, (_, index) => ({
      signature: `signature-${index}`,
      blockTime: 2_000 - index,
    }));
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ result: fullPage }))
      .mockResolvedValueOnce(json({ result: [
        { signature: 'oldest', blockTime: 500 },
        { signature: 'unknown-time', blockTime: null },
      ] }));
    const provider = new SolanaWalletBirthProvider('https://solana.test', fetcher as any, 5);

    const result = await provider.resolveEarliestTransaction('wallet');

    expect(result?.birthTimestamp).toBe(new Date(500_000).toISOString());
    expect(result?.source).toBe('solana-rpc');
    const secondBody = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(secondBody.params[1].before).toBe('signature-999');
  });

  it('refuses to publish a partial timestamp at the page-cost boundary', async () => {
    const fullPage = Array.from({ length: 1_000 }, (_, index) => ({ signature: `s-${index}`, blockTime: 2_000 }));
    const provider = new SolanaWalletBirthProvider(
      'https://solana.test',
      vi.fn().mockResolvedValue(json({ result: fullPage })) as any,
      1,
    );
    await expect(provider.resolveEarliestTransaction('wallet')).rejects.toBeInstanceOf(HistoryCostBoundaryError);
  });
});

describe('Base wallet birth providers', () => {
  it('asks the explorer for a single ascending history row', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({
      status: '1', message: 'OK', result: [{ timeStamp: '1700000000' }],
    }));
    const provider = new BaseExplorerWalletBirthProvider('secret', undefined, fetcher as any);
    const result = await provider.resolveEarliestTransaction('0x0000000000000000000000000000000000000001');
    expect(result?.source).toBe('base-explorer');
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.searchParams.get('chainid')).toBe('8453');
    expect(url.searchParams.get('sort')).toBe('asc');
    expect(url.searchParams.get('offset')).toBe('1');
  });

  it('binary-searches an archive RPC and labels the result outgoing-only', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body));
      if (request.method === 'eth_blockNumber') return json({ result: '0x4' });
      if (request.method === 'eth_getTransactionCount') {
        const tag = request.params[1];
        if (tag === 'latest') return json({ result: '0x1' });
        return json({ result: Number.parseInt(tag, 16) >= 2 ? '0x1' : '0x0' });
      }
      if (request.method === 'eth_getBlockByNumber') {
        return json({ result: { timestamp: '0x64', transactions: [{ from: address }] } });
      }
      return json({ error: { message: 'unexpected' } });
    });
    const provider = new BaseRpcWalletBirthProvider('https://base.test', fetcher as any);
    const result = await provider.resolveEarliestTransaction(address);
    expect(result).toEqual({
      chain: 'base',
      address,
      birthTimestamp: new Date(100_000).toISOString(),
      source: 'base-rpc-outgoing',
    });
  });
});

