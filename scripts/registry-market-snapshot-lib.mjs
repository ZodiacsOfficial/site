import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const REGISTRY_MARKET_ARCHIVE_SCHEMA = 'zodiacs.registry-market-history.v1';
export const REGISTRY_MARKET_ARCHIVE_VERSION = 1;
export const DEXSCREENER_SOLANA_TOKENS_API =
  'https://api.dexscreener.com/tokens/v1/solana';

export const REGISTRY_MARKET_METHOD = Object.freeze({
  pricing:
    'Price, 24h change, market cap, and FDV are read from the returned Solana pool with the greatest reported USD liquidity in which each canonical mint is the base token.',
  liquidity:
    'Liquidity and 24h volume are summed across distinct Solana pair addresses in which each canonical mint is the base token. Duplicate pair records are counted once.',
  valuation:
    'Market cap is recorded only when DexScreener reports marketCap. FDV is stored separately and is never used as a market-cap substitute.',
  limitations:
    'DexScreener is an independent index. A snapshot can be delayed, incomplete, or wrong, and does not represent a recommendation.',
});

function finiteNumber(value, { allowNegative = false } = {}) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (!allowNegative && number < 0) return null;
  return number;
}

function isoTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('readAt must be a valid date');
  return date.toISOString();
}

function pairKey(pair) {
  return `${pair.chainId}:${pair.pairAddress}`;
}

function pairLiquidity(pair) {
  return finiteNumber(pair?.liquidity?.usd);
}

function pairVolume24h(pair) {
  return finiteNumber(pair?.volume?.h24);
}

function chooseDuplicatePair(left, right) {
  const leftLiquidity = pairLiquidity(left) ?? -1;
  const rightLiquidity = pairLiquidity(right) ?? -1;
  if (leftLiquidity !== rightLiquidity) return rightLiquidity > leftLiquidity ? right : left;

  const leftVolume = pairVolume24h(left) ?? -1;
  const rightVolume = pairVolume24h(right) ?? -1;
  if (leftVolume !== rightVolume) return rightVolume > leftVolume ? right : left;

  // A final lexical tie-break makes output stable even if the API returns
  // duplicate records in a different order.
  return JSON.stringify(right) < JSON.stringify(left) ? right : left;
}

function sumReported(pairs, readValue) {
  let total = 0;
  let reportedPairCount = 0;
  for (const pair of pairs) {
    const value = readValue(pair);
    if (value === null) continue;
    total += value;
    reportedPairCount += 1;
  }
  return {
    value: reportedPairCount > 0 ? Math.round(total * 100_000_000) / 100_000_000 : null,
    reportedPairCount,
  };
}

function sumKnown(values) {
  const known = values.filter((value) => value !== null);
  return {
    value:
      known.length > 0
        ? Math.round(known.reduce((total, value) => total + value, 0) * 100_000_000) /
          100_000_000
        : null,
    assetCount: known.length,
  };
}

export function canonicalSolanaAssets(registry, { expectedCount = 12 } = {}) {
  if (!registry || !Array.isArray(registry.assets)) {
    throw new Error('Registry must contain an assets array');
  }

  const assets = registry.assets.map((asset) => {
    const native = asset?.native;
    if (
      !native ||
      native.chain !== 'solana' ||
      native.kind !== 'native' ||
      native.isCanonicalOrigin !== true ||
      typeof native.address !== 'string' ||
      !native.address
    ) {
      throw new Error(`Registry asset ${asset?.sign ?? '(unknown)'} lacks a canonical Solana mint`);
    }
    if (native.sign !== asset.sign) {
      throw new Error(`Registry asset ${asset.sign} has a mismatched native sign`);
    }
    return {
      sign: asset.sign,
      displayName: asset.displayName,
      symbol: native.symbol,
      mint: native.address,
    };
  });

  if (expectedCount !== null && assets.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} canonical Solana assets; found ${assets.length}`);
  }
  if (new Set(assets.map(({ sign }) => sign)).size !== assets.length) {
    throw new Error('Canonical Registry signs must be unique');
  }
  if (new Set(assets.map(({ mint }) => mint)).size !== assets.length) {
    throw new Error('Canonical Registry Solana mints must be unique');
  }
  return assets;
}

export function dexscreenerBatchUrl(assets) {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error('At least one canonical asset is required');
  }
  if (assets.length > 30) {
    throw new Error('DexScreener token batch supports at most 30 addresses');
  }
  return `${DEXSCREENER_SOLANA_TOKENS_API}/${assets.map(({ mint }) => mint).join(',')}`;
}

export async function fetchDexScreenerPairs({
  assets,
  fetchImpl = globalThis.fetch,
  timeoutMs = 20_000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  const url = dexscreenerBatchUrl(assets);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'zodiacs.org Registry market archive (https://zodiacs.org/registry/)',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response?.ok) {
    throw new Error(`DexScreener request failed with HTTP ${response?.status ?? 'unknown'}`);
  }
  const payload = await response.json();
  const pairs = Array.isArray(payload) ? payload : payload?.pairs;
  if (!Array.isArray(pairs)) throw new Error('DexScreener response did not contain a pair array');
  return { url, pairs };
}

export function buildRegistryMarketSnapshot({ assets, pairs, readAt = new Date(), sourceUrl } = {}) {
  if (!Array.isArray(assets) || assets.length === 0) throw new Error('assets are required');
  if (!Array.isArray(pairs)) throw new Error('pairs must be an array');
  const observedAt = isoTimestamp(readAt);
  const mintSet = new Set(assets.map(({ mint }) => mint));
  const byMint = new Map(assets.map(({ mint }) => [mint, new Map()]));
  const allPairs = new Map();

  for (const pair of pairs) {
    const mint = pair?.baseToken?.address;
    if (
      pair?.chainId !== 'solana' ||
      typeof pair?.pairAddress !== 'string' ||
      !pair.pairAddress ||
      !mintSet.has(mint)
    ) {
      continue;
    }
    const key = pairKey(pair);
    const signPairs = byMint.get(mint);
    signPairs.set(key, signPairs.has(key) ? chooseDuplicatePair(signPairs.get(key), pair) : pair);
    allPairs.set(key, allPairs.has(key) ? chooseDuplicatePair(allPairs.get(key), pair) : pair);
  }

  const signSnapshots = assets.map((asset) => {
    const indexedPairs = [...byMint.get(asset.mint).values()];
    const poolsWithDepth = indexedPairs.filter((pair) => pairLiquidity(pair) !== null);
    const deepest = poolsWithDepth.sort((left, right) => {
      const depthDifference = pairLiquidity(right) - pairLiquidity(left);
      if (depthDifference !== 0) return depthDifference;
      return String(left.pairAddress).localeCompare(String(right.pairAddress));
    })[0] ?? null;
    const liquidity = sumReported(indexedPairs, pairLiquidity);
    const volume24h = sumReported(indexedPairs, pairVolume24h);

    return {
      sign: asset.sign,
      displayName: asset.displayName,
      symbol: asset.symbol,
      mint: asset.mint,
      priceUsd: deepest ? finiteNumber(deepest.priceUsd) : null,
      change24hPct: deepest ? finiteNumber(deepest.priceChange?.h24, { allowNegative: true }) : null,
      marketCapUsd: deepest ? finiteNumber(deepest.marketCap) : null,
      fdvUsd: deepest ? finiteNumber(deepest.fdv) : null,
      liquidityUsd: liquidity.value,
      liquidityReportedPoolCount: liquidity.reportedPairCount,
      volume24hUsd: volume24h.value,
      volume24hReportedPoolCount: volume24h.reportedPairCount,
      indexedPoolCount: indexedPairs.length,
      deepestPool: deepest
        ? {
            pairAddress: deepest.pairAddress,
            dexId: deepest.dexId ?? null,
            url: deepest.url ?? null,
            liquidityUsd: pairLiquidity(deepest),
          }
        : null,
    };
  });

  const uniquePairs = [...allPairs.values()];
  const liquidity = sumReported(uniquePairs, pairLiquidity);
  const volume24h = sumReported(uniquePairs, pairVolume24h);
  const marketCap = sumKnown(signSnapshots.map(({ marketCapUsd }) => marketCapUsd));
  const fdv = sumKnown(signSnapshots.map(({ fdvUsd }) => fdvUsd));

  return {
    date: observedAt.slice(0, 10),
    source: {
      provider: 'DexScreener',
      url: sourceUrl ?? dexscreenerBatchUrl(assets),
      readAt: observedAt,
    },
    coverage: {
      canonicalAssetCount: assets.length,
      assetsWithIndexedPools: signSnapshots.filter(({ indexedPoolCount }) => indexedPoolCount > 0).length,
      assetsWithMarketCap: marketCap.assetCount,
      assetsWithFdv: fdv.assetCount,
    },
    totals: {
      marketCapUsd: marketCap.value,
      marketCapAssetCount: marketCap.assetCount,
      fdvUsd: fdv.value,
      fdvAssetCount: fdv.assetCount,
      liquidityUsd: liquidity.value,
      liquidityReportedPoolCount: liquidity.reportedPairCount,
      volume24hUsd: volume24h.value,
      volume24hReportedPoolCount: volume24h.reportedPairCount,
      indexedPoolCount: uniquePairs.length,
    },
    assets: signSnapshots,
  };
}

export function emptyRegistryMarketArchive() {
  return {
    schema: REGISTRY_MARKET_ARCHIVE_SCHEMA,
    version: REGISTRY_MARKET_ARCHIVE_VERSION,
    method: REGISTRY_MARKET_METHOD,
    snapshots: [],
  };
}

export function upsertRegistryMarketSnapshot(archive, snapshot) {
  const base = archive ?? emptyRegistryMarketArchive();
  if (base.schema !== REGISTRY_MARKET_ARCHIVE_SCHEMA || base.version !== REGISTRY_MARKET_ARCHIVE_VERSION) {
    throw new Error(`Unsupported Registry market archive schema: ${base.schema ?? '(missing)'}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot?.date ?? '')) {
    throw new Error('Snapshot date must be an ISO UTC date');
  }
  const snapshots = (Array.isArray(base.snapshots) ? base.snapshots : [])
    .filter((entry) => entry?.date !== snapshot.date)
    .concat(snapshot)
    .sort((left, right) => left.date.localeCompare(right.date));

  return {
    ...base,
    schema: REGISTRY_MARKET_ARCHIVE_SCHEMA,
    version: REGISTRY_MARKET_ARCHIVE_VERSION,
    method: REGISTRY_MARKET_METHOD,
    snapshots,
  };
}

export async function updateRegistryMarketArchive({
  registryPath,
  archivePath,
  fetchImpl = globalThis.fetch,
  readAt = new Date(),
} = {}) {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const assets = canonicalSolanaAssets(registry);
  const { url, pairs } = await fetchDexScreenerPairs({ assets, fetchImpl });
  const snapshot = buildRegistryMarketSnapshot({ assets, pairs, readAt, sourceUrl: url });
  if (snapshot.coverage.assetsWithIndexedPools === 0) {
    throw new Error('DexScreener returned no indexed Solana pools for the canonical Registry mints');
  }

  let archive = emptyRegistryMarketArchive();
  try {
    archive = JSON.parse(await readFile(archivePath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const nextArchive = upsertRegistryMarketSnapshot(archive, snapshot);

  await mkdir(dirname(archivePath), { recursive: true });
  const temporaryPath = `${archivePath}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(nextArchive, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, archivePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
  return { archive: nextArchive, snapshot };
}
