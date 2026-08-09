import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildRegistryOutlooks } from '../src/registry/outlook.mjs';

/** Build the public paired Registry outlook from committed astronomy and the
 * timestamped market archive. Kept dependency-free so the daily archive
 * workflow can refresh it without installing the site toolchain. */
export async function buildRegistryOutlookArtifact(repositoryRoot) {
  const root = resolve(repositoryRoot);
  const [daily, ingresses, marketHistory] = await Promise.all([
    readFile(resolve(root, 'src/data/daily.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'src/data/ingresses.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'public/assets/data/registry-market-history.v1.json'), 'utf8').then(JSON.parse),
  ]);
  const start = new Date(`${daily.date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error('Daily facts do not contain a valid Registry outlook date');
  const end = new Date(start.getTime() + (7 * 86_400_000));
  const months = new Set();
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor < end) {
    months.add(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const transitMonths = await Promise.all([...months].map((month) => (
    readFile(resolve(root, `src/data/transits-${month}.json`), 'utf8').then(JSON.parse)
  )));
  const latestMarket = marketHistory.snapshots?.at(-1) ?? null;
  const marketBySign = latestMarket
    ? Object.fromEntries(latestMarket.assets.map(asset => [asset.sign, asset]))
    : undefined;

  return buildRegistryOutlooks({
    date: daily.date,
    transitMonths,
    ingressWindows: ingresses.windows,
    marketBySign,
    marketAsOf: latestMarket?.source?.readAt,
    history: { daysObserved: marketHistory.snapshots?.length ?? 0 },
  });
}
