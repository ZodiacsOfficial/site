import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectRpcOutcomes,
  formatPercentageTenths,
  formatRawTokenAmount,
  formatUiAmountString,
  hydrateDisclosure,
  hydrateReviewedProse,
  percentageTenths,
  sumTokenAmounts,
} from './build-thesis-disclosure.mjs';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const pending = () => ({ value: null, status: 'pending', asOf: null, verifyUrl: null });
const stale = (value) => ({
  value,
  status: 'filled',
  asOf: '2026-01-01',
  verifyUrl: 'https://old.example/receipt',
});
const row = () => ({
  supply: pending(),
  mintAuthority: pending(),
  freezeAuthority: pending(),
  topTenHolders: pending(),
  liquidity: pending(),
  bridge: pending(),
  treasury: pending(),
  continuity: pending(),
});
const disclosureFor = (signs) => ({
  $comment: 'fixture',
  signs: Object.fromEntries(signs.map((sign) => [sign, row()])),
  aggregate: row(),
});

const ok = (result) => ({ ok: true, result });
const failed = (error) => ({ ok: false, error });
const supplyResult = (amount, decimals, uiAmountString) => ({
  value: { amount, decimals, uiAmount: null, uiAmountString },
});
const accountInfoResult = (decimals, authorityFields) => ({
  value: {
    data: {
      parsed: {
        type: 'mint',
        info: { decimals, ...authorityFields },
      },
      program: 'spl-token',
      space: 82,
    },
  },
});
const largestResult = (amounts, decimals) => ({
  value: amounts.map((amount, index) => ({
    address: `Account${index + 1}`,
    amount,
    decimals,
    uiAmount: null,
    uiAmountString: amount,
  })),
});

describe('thesis disclosure formatting', () => {
  it('formats exact decimal strings and rounds percentages with BigInt arithmetic', () => {
    expect(formatUiAmountString('0001234567.890000')).toBe('1,234,567.890000');
    expect(formatRawTokenAmount(1_234_567_890_000n, 6)).toBe('1,234,567.89');
    expect(percentageTenths(1n, 6n)).toBe(167n);
    expect(formatPercentageTenths(167n)).toBe('16.7%');
    expect(sumTokenAmounts([
      { amount: 1n, decimals: 0 },
      { amount: 25n, decimals: 1 },
    ])).toEqual({ amount: 35n, decimals: 1 });
  });
});

describe('collectRpcOutcomes', () => {
  it('retries a transient server failure sequentially without reaching the network', async () => {
    const payloads = [
      new Response('{"error":"busy"}', { status: 503 }),
      Response.json({ jsonrpc: '2.0', id: 2, result: supplyResult('1000', 6, '0.001') }),
      Response.json({
        jsonrpc: '2.0',
        id: 3,
        result: accountInfoResult(6, { mintAuthority: null, freezeAuthority: null }),
      }),
      Response.json({
        jsonrpc: '2.0',
        id: 4,
        result: largestResult(Array(10).fill('10'), 6),
      }),
    ];
    const fetchMock = vi.fn(async () => payloads.shift());
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const outcomes = await collectRpcOutcomes(
      [{ sign: 'aries', mint: 'MintAries', decimals: 6 }],
      { url: 'https://rpc.invalid', delayMs: 0, retries: 1, retryDelayMs: 0 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).method)).toEqual([
      'getTokenSupply',
      'getTokenSupply',
      'getAccountInfo',
      'getTokenLargestAccounts',
    ]);
    expect(outcomes.aries.supply).toEqual(ok(supplyResult('1000', 6, '0.001')));
    expect(outcomes.aries.accountInfo.ok).toBe(true);
    expect(outcomes.aries.largestAccounts.ok).toBe(true);
  });
});

describe('hydrateReviewedProse', () => {
  const reviewedSource = () => ({
    asOf: '2026-07-14',
    signs: {
      aries: {
        liquidity: {
          value: '7.8% of supply · Raydium pool · LP unlocked',
          verifyUrl: 'https://solscan.io/account/PoolAries',
        },
        bridge: {
          value: 'Wormhole BridgeToken · lock-and-mint from Solana',
          verifyUrl: 'https://basescan.org/token/0x0000000000000000000000000000000000000001',
        },
      },
    },
    aggregate: {
      liquidity: {
        value: '7.8–7.8% per sign · Raydium pools · LP: 0 burned, 1 unlocked',
        verifyUrl: 'https://raydium.io/liquidity-pools/',
      },
      bridge: {
        value: '1 Wormhole BridgeToken contract · lock-and-mint from Solana',
        verifyUrl: 'https://wormhole.com/docs/products/token-transfers/wrapped-token-transfers/overview/',
      },
    },
    treasury: {
      status: 'pending',
      reason: 'Owner confirmation is required.',
    },
    continuity: {
      value: "Astrofolio.xyz · the registry's companion app carries the records forward",
      verifyUrl: 'https://astrofolio.xyz/',
    },
  });

  it('materializes reviewed fields while preserving an explicit treasury stop', () => {
    const existing = disclosureFor(['aries']);
    const before = JSON.stringify(existing);
    const { disclosure, report } = hydrateReviewedProse(
      existing,
      [{ sign: 'aries', mint: 'MintAries', decimals: 6 }],
      reviewedSource(),
    );

    expect(disclosure.signs.aries.liquidity).toEqual({
      value: '7.8% of supply · Raydium pool · LP unlocked',
      status: 'filled',
      asOf: '2026-07-14',
      verifyUrl: 'https://solscan.io/account/PoolAries',
    });
    expect(disclosure.signs.aries.bridge.status).toBe('filled');
    expect(disclosure.signs.aries.continuity.value).toBe(
      "Astrofolio.xyz · the registry's companion app carries the records forward",
    );
    expect(disclosure.signs.aries.treasury).toEqual(pending());
    expect(disclosure.aggregate.treasury).toEqual(pending());
    expect(report).toEqual(expect.arrayContaining([
      {
        path: 'signs.aries.treasury',
        status: 'pending',
        reason: 'Owner confirmation is required.',
      },
      {
        path: 'aggregate.treasury',
        status: 'pending',
        reason: 'Owner confirmation is required.',
      },
    ]));
    expect(JSON.stringify(existing)).toBe(before);
  });

  it('rejects a filled reviewed field without a stranger-checkable URL', () => {
    const source = reviewedSource();
    source.signs.aries.liquidity.verifyUrl = null;

    expect(() => hydrateReviewedProse(
      disclosureFor(['aries']),
      [{ sign: 'aries', mint: 'MintAries', decimals: 6 }],
      source,
    )).toThrow('signs.aries.liquidity.verifyUrl must be a non-empty string');
  });
});

describe('hydrateDisclosure', () => {
  it('maps pinned RPC payloads to the exact disclosure contract', () => {
    const existing = disclosureFor(['aries']);
    const assets = [{ sign: 'aries', mint: 'MintAries', decimals: 6 }];
    const outcomes = {
      aries: {
        supply: ok(supplyResult('1000000000', 6, '1000')),
        accountInfo: ok(accountInfoResult(6, {
          mintAuthority: null,
          freezeAuthority: 'FreezeAuthority111',
        })),
        largestAccounts: ok(largestResult(Array(10).fill('25000000'), 6)),
      },
    };

    const { disclosure, report } = hydrateDisclosure(existing, assets, outcomes, '2026-07-12');
    const verifyUrl = 'https://solscan.io/token/MintAries';

    expect(disclosure).toEqual({
      $comment: 'fixture',
      signs: {
        aries: {
          supply: { value: '1,000 total', status: 'filled', asOf: '2026-07-12', verifyUrl },
          mintAuthority: { value: 'renounced', status: 'filled', asOf: '2026-07-12', verifyUrl },
          freezeAuthority: {
            value: 'FreezeAuthority111', status: 'filled', asOf: '2026-07-12', verifyUrl,
          },
          topTenHolders: {
            value: '25.0% · top-10 token accounts', status: 'filled', asOf: '2026-07-12', verifyUrl,
          },
          liquidity: pending(),
          bridge: pending(),
          treasury: pending(),
          continuity: pending(),
        },
      },
      aggregate: {
        supply: { value: '1,000 total', status: 'filled', asOf: '2026-07-12', verifyUrl: null },
        mintAuthority: {
          value: '1 of 1 renounced', status: 'filled', asOf: '2026-07-12', verifyUrl: null,
        },
        freezeAuthority: {
          value: '0 of 1 renounced', status: 'filled', asOf: '2026-07-12', verifyUrl: null,
        },
        topTenHolders: {
          value: 'lowest 25.0% – highest 25.0%',
          status: 'filled',
          asOf: '2026-07-12',
          verifyUrl: null,
        },
        liquidity: pending(),
        bridge: pending(),
        treasury: pending(),
        continuity: pending(),
      },
    });
    expect(JSON.stringify(disclosure.signs.aries.supply)).toBe(
      '{"value":"1,000 total","status":"filled","asOf":"2026-07-12","verifyUrl":"https://solscan.io/token/MintAries"}',
    );
    expect(report).toEqual([
      { path: 'signs.aries.supply', status: 'filled', value: '1,000 total' },
      { path: 'signs.aries.mintAuthority', status: 'filled', value: 'renounced' },
      { path: 'signs.aries.freezeAuthority', status: 'filled', value: 'FreezeAuthority111' },
      {
        path: 'signs.aries.topTenHolders',
        status: 'filled',
        value: '25.0% · top-10 token accounts',
      },
      { path: 'aggregate.supply', status: 'filled', value: '1,000 total' },
      { path: 'aggregate.mintAuthority', status: 'filled', value: '1 of 1 renounced' },
      { path: 'aggregate.freezeAuthority', status: 'filled', value: '0 of 1 renounced' },
      {
        path: 'aggregate.topTenHolders',
        status: 'filled',
        value: 'lowest 25.0% – highest 25.0%',
      },
    ]);
    expect(existing).toEqual(disclosureFor(['aries']));
  });

  it('preserves stale fields exactly when an RPC result or property is unavailable', () => {
    const existing = disclosureFor(['aries']);
    existing.signs.aries.supply = stale('900 total');
    existing.signs.aries.freezeAuthority = stale('OldFreezeAuthority');
    existing.signs.aries.topTenHolders = stale('40.0% · top-10 token accounts');
    existing.aggregate.supply = stale('10,800 total');
    existing.aggregate.freezeAuthority = stale('4 of 12 renounced');
    existing.aggregate.topTenHolders = stale('lowest 20.0% – highest 40.0%');
    const before = JSON.stringify(existing);
    const assets = [{ sign: 'aries', mint: 'MintAries', decimals: 6 }];
    const outcomes = {
      aries: {
        supply: failed('getTokenSupply: HTTP 429'),
        accountInfo: ok(accountInfoResult(6, { mintAuthority: null })),
        largestAccounts: ok(largestResult(Array(10).fill('10000000'), 6)),
      },
    };

    const { disclosure, report } = hydrateDisclosure(existing, assets, outcomes, '2026-07-12');

    expect(disclosure.signs.aries.supply).toEqual(existing.signs.aries.supply);
    expect(disclosure.signs.aries.topTenHolders).toEqual(existing.signs.aries.topTenHolders);
    expect(disclosure.signs.aries.freezeAuthority).toEqual(existing.signs.aries.freezeAuthority);
    expect(disclosure.aggregate.supply).toEqual(existing.aggregate.supply);
    expect(disclosure.aggregate.topTenHolders).toEqual(existing.aggregate.topTenHolders);
    expect(disclosure.aggregate.freezeAuthority).toEqual(existing.aggregate.freezeAuthority);
    expect(disclosure.signs.aries.mintAuthority.value).toBe('renounced');
    expect(report).toEqual(expect.arrayContaining([
      { path: 'signs.aries.supply', status: 'skipped', reason: 'getTokenSupply: HTTP 429' },
      {
        path: 'signs.aries.freezeAuthority',
        status: 'skipped',
        reason: 'invalid getAccountInfo payload: Mint account is missing freezeAuthority',
      },
      {
        path: 'signs.aries.topTenHolders',
        status: 'skipped',
        reason: 'current getTokenSupply result is required',
      },
    ]));
    expect(JSON.stringify(existing)).toBe(before);
  });

  it('fills honest twelve-sign aggregates and preserves a partial top-ten aggregate', () => {
    const assets = SIGNS.map((sign, index) => ({ sign, mint: `Mint${index + 1}`, decimals: 0 }));
    const outcomes = Object.fromEntries(SIGNS.map((sign, index) => {
      const topTenAmount = String(100 + index * 10);
      return [sign, {
        supply: ok(supplyResult('1000', 0, '1000')),
        accountInfo: ok(accountInfoResult(0, {
          mintAuthority: index < 7 ? null : `MintAuthority${index + 1}`,
          freezeAuthority: index < 9 ? null : `FreezeAuthority${index + 1}`,
        })),
        largestAccounts: ok(largestResult([topTenAmount, ...Array(9).fill('0')], 0)),
      }];
    }));

    const full = hydrateDisclosure(disclosureFor(SIGNS), assets, outcomes, '2026-07-12').disclosure;
    expect(full.aggregate).toEqual({
      supply: { value: '12,000 total', status: 'filled', asOf: '2026-07-12', verifyUrl: null },
      mintAuthority: {
        value: '7 of 12 renounced', status: 'filled', asOf: '2026-07-12', verifyUrl: null,
      },
      freezeAuthority: {
        value: '9 of 12 renounced', status: 'filled', asOf: '2026-07-12', verifyUrl: null,
      },
      topTenHolders: {
        value: 'lowest 10.0% – highest 21.0%',
        status: 'filled',
        asOf: '2026-07-12',
        verifyUrl: null,
      },
      liquidity: pending(),
      bridge: pending(),
      treasury: pending(),
      continuity: pending(),
    });

    const partialExisting = disclosureFor(SIGNS);
    partialExisting.aggregate.topTenHolders = stale('old concentration range');
    const partialOutcomes = JSON.parse(JSON.stringify(outcomes));
    partialOutcomes.pisces.largestAccounts = failed('getTokenLargestAccounts: HTTP 429');
    const partial = hydrateDisclosure(
      partialExisting,
      assets,
      partialOutcomes,
      '2026-07-12',
    ).disclosure;

    expect(partial.aggregate.supply.value).toBe('12,000 total');
    expect(partial.aggregate.mintAuthority.value).toBe('7 of 12 renounced');
    expect(partial.aggregate.freezeAuthority.value).toBe('9 of 12 renounced');
    expect(partial.aggregate.topTenHolders).toEqual(partialExisting.aggregate.topTenHolders);
    expect(partial.signs.pisces.topTenHolders).toEqual(partialExisting.signs.pisces.topTenHolders);
  });
});
