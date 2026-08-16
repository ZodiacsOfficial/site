import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  REGISTRY_MARKET_ARCHIVE_SCHEMA,
  buildRegistryMarketSnapshot,
  canonicalSolanaAssets,
  emptyRegistryMarketArchive,
  fetchDexScreenerPairs,
  upsertRegistryMarketSnapshot,
} from './registry-market-snapshot-lib.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ASSETS = [
  { sign: 'aries', displayName: 'Aries', symbol: 'ARIES', mint: 'AriesMint' },
  { sign: 'taurus', displayName: 'Taurus', symbol: 'TAURUS', mint: 'TaurusMint' },
];

function pair({
  mint = 'AriesMint',
  pairAddress,
  liquidity,
  volume,
  price = '0.01',
  change = 2,
  marketCap,
  fdv,
  chainId = 'solana',
  quoteMint,
}) {
  return {
    chainId,
    dexId: 'mock-dex',
    pairAddress,
    url: `https://dexscreener.com/solana/${pairAddress}`,
    baseToken: { address: mint },
    quoteToken: quoteMint ? { address: quoteMint } : undefined,
    priceUsd: price,
    priceChange: { h24: change },
    marketCap,
    fdv,
    liquidity: liquidity === undefined ? undefined : { usd: liquidity },
    volume: volume === undefined ? undefined : { h24: volume },
  };
}

describe('Registry market snapshot archive', () => {
  it('runs after a completed Daily Sky attempt and lets the dated artifact check decide freshness', async () => {
    const workflow = await readFile(
      resolve(repositoryRoot, '.github/workflows/registry-market-snapshot.yml'),
      'utf8',
    );
    expect(workflow).toContain('workflows: ["Daily Sky"]');
    expect(workflow).toContain("types: [completed]");
    expect(workflow).toContain("Require today's committed Daily Sky");
    expect(workflow).toContain('run: node scripts/build-sign-pages.mjs');
    expect(workflow).toContain('public/registry/*/index.html');
    expect(workflow).not.toContain("workflow_run.conclusion == 'success'");
  });

  it('uses the canonical twelve Solana mints from the Registry', async () => {
    const registry = JSON.parse(
      await readFile(resolve(repositoryRoot, 'public/registry/zodiacs.registry.json'), 'utf8'),
    );
    const assets = canonicalSolanaAssets(registry);

    expect(assets).toHaveLength(12);
    expect(new Set(assets.map(({ mint }) => mint)).size).toBe(12);
    expect(assets[0]).toMatchObject({
      sign: 'aries',
      symbol: 'ARIES',
      mint: registry.assets[0].native.address,
    });
  });

  it('fetches one public batch and keeps market cap separate from FDV', async () => {
    const payload = [
      pair({ pairAddress: 'shallow', liquidity: 100, volume: 5, marketCap: 1_000, fdv: 2_000 }),
      pair({ pairAddress: 'deep', liquidity: 900, volume: 20, price: '0.02', change: -3, fdv: 9_000 }),
      // Duplicate pool: the more complete/deeper record wins, but is still counted once.
      pair({ pairAddress: 'deep', liquidity: 800, volume: 10, price: '0.03', marketCap: 8_000, fdv: 8_000 }),
      pair({ mint: 'TaurusMint', pairAddress: 'taurus', liquidity: 300, volume: 30, marketCap: 3_000, fdv: 4_000 }),
      pair({ mint: 'UnknownMint', quoteMint: 'AriesMint', pairAddress: 'aries-as-quote', liquidity: 50, volume: 2 }),
      pair({ pairAddress: 'base-chain', liquidity: 10_000, volume: 99, chainId: 'base' }),
      pair({ mint: 'UnknownMint', pairAddress: 'unknown', liquidity: 10_000, volume: 99 }),
    ];
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => payload }));
    const fetched = await fetchDexScreenerPairs({ assets: ASSETS, fetchImpl, timeoutMs: 100 });
    const snapshot = buildRegistryMarketSnapshot({
      assets: ASSETS,
      pairs: fetched.pairs,
      sourceUrl: fetched.url,
      readAt: '2026-08-09T06:31:00.000Z',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://api.dexscreener.com/tokens/v1/solana/AriesMint,TaurusMint',
    );
    expect(snapshot).toMatchObject({
      date: '2026-08-09',
      source: { provider: 'DexScreener', readAt: '2026-08-09T06:31:00.000Z' },
      coverage: { canonicalAssetCount: 2, assetsWithIndexedPools: 2, assetsWithMarketCap: 1, assetsWithFdv: 2 },
      totals: {
        marketCapUsd: 3_000,
        marketCapAssetCount: 1,
        fdvUsd: 13_000,
        liquidityUsd: 1_300,
        volume24hUsd: 55,
        indexedPoolCount: 3,
      },
    });
    expect(snapshot.assets[0]).toMatchObject({
      sign: 'aries',
      priceUsd: 0.02,
      change24hPct: -3,
      marketCapUsd: null,
      fdvUsd: 9_000,
      liquidityUsd: 1_000,
      volume24hUsd: 25,
      indexedPoolCount: 2,
      deepestPool: { pairAddress: 'deep', liquidityUsd: 900 },
    });
    expect(snapshot.assets[0].marketCapUsd).not.toBe(snapshot.assets[0].fdvUsd);
  });

  it('replaces the same UTC date instead of creating a duplicate and sorts history', () => {
    const archive = {
      ...emptyRegistryMarketArchive(),
      snapshots: [
        { date: '2026-08-10', marker: 'tomorrow' },
        { date: '2026-08-09', marker: 'old' },
      ],
    };
    const updated = upsertRegistryMarketSnapshot(archive, {
      date: '2026-08-09',
      marker: 'replacement',
    });

    expect(updated.schema).toBe(REGISTRY_MARKET_ARCHIVE_SCHEMA);
    expect(updated.snapshots).toEqual([
      { date: '2026-08-09', marker: 'replacement' },
      { date: '2026-08-10', marker: 'tomorrow' },
    ]);
  });

  it('refuses to overwrite an archive with an unknown schema', () => {
    expect(() =>
      upsertRegistryMarketSnapshot(
        { schema: 'zodiacs.registry-market-history.v2', version: 2, snapshots: [] },
        { date: '2026-08-09' },
      ),
    ).toThrow('Unsupported Registry market archive schema');
  });

  it('rejects an HTTP failure without manufacturing an empty observation', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 }));
    await expect(fetchDexScreenerPairs({ assets: ASSETS, fetchImpl, timeoutMs: 100 })).rejects.toThrow(
      'HTTP 503',
    );
  });
});
