/** Reuse today's archived observation during publication retries/backstops.
 * The original build-registry-market-snapshot.mjs remains an explicit refresh.
 * Derivative outlook/research builders and their validation still run afterward.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REGISTRY_MARKET_ARCHIVE_SCHEMA,
  REGISTRY_MARKET_ARCHIVE_VERSION,
  REGISTRY_MARKET_METHOD,
  canonicalSolanaAssets,
  updateRegistryMarketArchive,
} from './registry-market-snapshot-lib.mjs';

export async function ensureDailyMarketSnapshot({
  root = fileURLToPath(new URL('../', import.meta.url)),
  readAt = new Date(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const now = new Date(readAt);
  const date = now.toISOString().slice(0, 10);
  const registryPath = resolve(root, 'public/registry/zodiacs.registry.json');
  const archivePath = resolve(root, 'public/assets/data/registry-market-history.v1.json');
  const assets = canonicalSolanaAssets(JSON.parse(await readFile(registryPath, 'utf8')));
  let archive;
  try {
    archive = JSON.parse(await readFile(archivePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (archive && (archive.schema !== REGISTRY_MARKET_ARCHIVE_SCHEMA
    || archive.version !== REGISTRY_MARKET_ARCHIVE_VERSION
    || !Array.isArray(archive.snapshots))) {
    throw new Error('Unsupported Registry market archive; refusing to replace it');
  }
  const snapshots = archive?.snapshots.filter((entry) => entry.date === date) ?? [];
  const snapshot = snapshots[0];
  const observed = snapshot?.source?.readAt;
  const reusable = snapshots.length === 1
    && archive.snapshots.at(-1) === snapshot
    && JSON.stringify(archive.method) === JSON.stringify(REGISTRY_MARKET_METHOD)
    && snapshot.source?.provider === 'DexScreener'
    && typeof observed === 'string' && observed.startsWith(`${date}T`)
    && Number.isFinite(Date.parse(observed)) && Date.parse(observed) <= now.getTime()
    && snapshot.coverage?.assetsWithIndexedPools > 0
    && snapshot.coverage?.canonicalAssetCount === assets.length
    && Array.isArray(snapshot.assets) && snapshot.assets.length === assets.length
    && assets.every((asset, index) => snapshot.assets[index]?.sign === asset.sign
      && snapshot.assets[index]?.mint === asset.mint);
  if (reusable) return { archive, snapshot, reused: true };
  return {
    ...await updateRegistryMarketArchive({ registryPath, archivePath, readAt: now, fetchImpl }),
    reused: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { snapshot, reused } = await ensureDailyMarketSnapshot();
  console.log(`${reused ? 'Reused' : 'Recorded'} daily market observation ${snapshot.date} (${snapshot.source.readAt})`);
}
