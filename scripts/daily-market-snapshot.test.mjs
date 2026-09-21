import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureDailyMarketSnapshot } from './daily-market-snapshot.mjs';
import { EXCHANGE_POOLS } from '../src/exchange/pools.mjs';
import { SOLANA_WRAPPED_SOL_MINT } from './registry-market-snapshot-lib.mjs';

const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'daily-market-'));
  roots.push(root);
  const registry = JSON.parse(await readFile(new URL('../public/registry/zodiacs.registry.json', import.meta.url), 'utf8'));
  await mkdir(join(root, 'public/registry'), { recursive: true });
  await writeFile(join(root, 'public/registry/zodiacs.registry.json'), JSON.stringify(registry));
  const pairs = registry.assets.map((asset) => ({
    chainId: 'solana', pairAddress: EXCHANGE_POOLS[asset.sign],
    baseToken: { address: asset.native.address },
    quoteToken: { address: SOLANA_WRAPPED_SOL_MINT },
    priceUsd: '0.01', liquidity: { usd: 100 }, volume: { h24: 20 },
  }));
  const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => pairs }));
  const archivePath = join(root, 'public/assets/data/registry-market-history.v1.json');
  const run = (readAt) => ensureDailyMarketSnapshot({ root, readAt, fetchImpl });
  return { root, archivePath, fetchImpl, run };
}

describe('daily market publication retries', () => {
  it('records the first observation, then leaves bytes unchanged without network on a same-day retry', async () => {
    const f = await fixture();
    expect((await f.run('2026-09-20T00:10:00Z')).reused).toBe(false);
    const before = await readFile(f.archivePath, 'utf8');
    f.fetchImpl.mockClear();
    f.fetchImpl.mockRejectedValue(new Error('network unavailable'));
    expect((await f.run('2026-09-20T06:53:00Z')).reused).toBe(true);
    expect(f.fetchImpl).not.toHaveBeenCalled();
    expect(await readFile(f.archivePath, 'utf8')).toBe(before);
  });

  it('records a new UTC day and preserves the previous observation', async () => {
    const f = await fixture();
    const first = await f.run('2026-09-20T23:59:00Z');
    const next = await f.run('2026-09-21T00:01:00Z');
    expect(next.reused).toBe(false);
    expect(next.archive.snapshots.map((s) => s.date)).toEqual(['2026-09-20', '2026-09-21']);
    expect(next.archive.snapshots[0]).toEqual(first.snapshot);
  });

  it.each(['missing coverage', 'future timestamp', 'different mint'])('repairs a same-day observation with %s', async (problem) => {
    const f = await fixture();
    const { archive } = await f.run('2026-09-20T00:10:00Z');
    const snapshot = archive.snapshots[0];
    if (problem === 'missing coverage') snapshot.coverage.assetsWithIndexedPools = 0;
    if (problem === 'future timestamp') snapshot.source.readAt = '2026-09-20T23:59:00Z';
    if (problem === 'different mint') snapshot.assets[0].mint = 'obsolete-mint';
    await writeFile(f.archivePath, JSON.stringify(archive));
    const result = await f.run('2026-09-20T06:53:00Z');
    expect(result.reused).toBe(false);
    expect(result.archive.snapshots).toHaveLength(1);
    expect(result.snapshot.coverage.assetsWithIndexedPools).toBe(12);
    expect(result.snapshot.source.readAt).toBe('2026-09-20T06:53:00.000Z');
    expect(result.snapshot.assets[0].mint).not.toBe('obsolete-mint');
  });

  it('preserves the existing archive when the next-day provider fails', async () => {
    const f = await fixture();
    await f.run('2026-09-20T00:10:00Z');
    const before = await readFile(f.archivePath, 'utf8');
    f.fetchImpl.mockRejectedValue(new Error('provider unavailable'));
    await expect(f.run('2026-09-21T00:10:00Z')).rejects.toThrow('provider unavailable');
    expect(await readFile(f.archivePath, 'utf8')).toBe(before);
  });

  it('refuses an unsupported archive before fetching or writing', async () => {
    const f = await fixture();
    const { archive } = await f.run('2026-09-20T00:10:00Z');
    archive.version = 999;
    const before = JSON.stringify(archive);
    await writeFile(f.archivePath, before);
    f.fetchImpl.mockClear();
    await expect(f.run('2026-09-20T06:53:00Z')).rejects.toThrow('Unsupported Registry market archive');
    expect(f.fetchImpl).not.toHaveBeenCalled();
    expect(await readFile(f.archivePath, 'utf8')).toBe(before);
  });
});
