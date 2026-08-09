/**
 * Append or replace today's UTC Registry market snapshot.
 *
 * The public DexScreener batch endpoint requires no API key. The canonical
 * mint list always comes from the committed Registry rather than a second
 * hand-maintained token list.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateRegistryMarketArchive } from './registry-market-snapshot-lib.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = resolve(repositoryRoot, 'public/registry/zodiacs.registry.json');
const archivePath = resolve(repositoryRoot, 'public/assets/data/registry-market-history.v1.json');

const { snapshot, archive } = await updateRegistryMarketArchive({
  registryPath,
  archivePath,
});

console.log(
  `Recorded ${snapshot.date}: ${snapshot.coverage.assetsWithIndexedPools}/` +
    `${snapshot.coverage.canonicalAssetCount} signs with indexed pools ` +
    `(${archive.snapshots.length} daily snapshot${archive.snapshots.length === 1 ? '' : 's'} archived).`,
);
