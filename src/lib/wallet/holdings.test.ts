import { describe, expect, it } from 'vitest';
import registryDocument from '../../../public/registry/zodiacs.registry.json' with { type: 'json' };
import { resolveOfficialHeldSigns, resolveOfficialHoldings } from './holdings';

const ENV = { SOLANA_RPC_URL: 'https://rpc.test', BASE_RPC_URL: 'https://base.test' };
const SOLANA_OWNER = 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv';
const BASE_OWNER = '0x0000000000000000000000000000000000000001';

const ariesSolanaMint = registryDocument.assets[0].native.address;
const ariesBaseContract = registryDocument.assets[0].representations
  .find((representation) => representation.chain === 'base')!.address;

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function solanaFetcher(accounts: { mint: string; amount: string }[]): typeof fetch {
  return async () => jsonResponse({
    jsonrpc: '2.0', id: 1,
    result: {
      value: accounts.map(({ mint, amount }) => ({
        account: { data: { parsed: { info: { mint, tokenAmount: { amount } } } } },
      })),
    },
  });
}

function baseFetcher(balancesByContract: Record<string, string>): typeof fetch {
  return async (_url, init) => {
    const requests = JSON.parse(String(init?.body)) as { id: number; params: [{ to: string }, string] }[];
    return jsonResponse(requests.map((request) => ({
      jsonrpc: '2.0', id: request.id,
      result: balancesByContract[request.params[0].to.toLowerCase()] ?? '0x0',
    })));
  };
}

describe('official holdings amounts', () => {
  it('sums Solana token accounts per official mint into ui amounts', async () => {
    const fetcher = solanaFetcher([
      { mint: ariesSolanaMint, amount: '1500000' },
      { mint: ariesSolanaMint, amount: '500000' },
      { mint: 'UnofficialMint1111111111111111111111111111', amount: '9000000' },
    ]);
    const holdings = await resolveOfficialHoldings('solana', SOLANA_OWNER, ENV, fetcher);
    expect(holdings).toEqual([{ sign: 'aries', amount: 2 }]);
    expect(await resolveOfficialHeldSigns('solana', SOLANA_OWNER, ENV, fetcher)).toEqual(['aries']);
  });

  it('keeps whole units exact beyond 2^53 raw units', async () => {
    const holdings = await resolveOfficialHoldings('solana', SOLANA_OWNER, ENV,
      solanaFetcher([{ mint: ariesSolanaMint, amount: '10000000000000500000' }]));
    expect(holdings).toEqual([{ sign: 'aries', amount: 10_000_000_000_000.5 }]);
  });

  it('reads Base balanceOf batches and drops zero balances', async () => {
    const fetcher = baseFetcher({ [ariesBaseContract.toLowerCase()]: '0xf4240' });
    const holdings = await resolveOfficialHoldings('base', BASE_OWNER, ENV, fetcher);
    expect(holdings).toEqual([{ sign: 'aries', amount: 1 }]);
  });

  it('returns undefined on provider failure or an unconfigured chain', async () => {
    const failing: typeof fetch = async () => new Response('rate limited', { status: 429 });
    expect(await resolveOfficialHoldings('solana', SOLANA_OWNER, ENV, failing)).toBeUndefined();
    expect(await resolveOfficialHoldings('base', BASE_OWNER, { SOLANA_RPC_URL: 'https://rpc.test' })).toBeUndefined();
  });
});
