/**
 * Client-side birthplace search over the sharded GeoNames index.
 * Shards load on demand (first keystroke per letter) and stay cached.
 */

export interface City {
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
  pop: number;
}

interface CityIndex {
  tz: string[];
  admin1: string[];
  countries: string[];
  shards: string[];
}

type Row = [string, string | 0, number, number, number, number, number, number];

let indexPromise: Promise<CityIndex> | null = null;
const shardCache = new Map<string, Promise<Row[]>>();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch ${url}: ${response.status}`);
  return response.json() as Promise<T>;
}

export function preloadIndex(): Promise<CityIndex> {
  indexPromise ??= fetchJson<CityIndex>('/data/cities/index.json');
  return indexPromise;
}

function shard(key: string): Promise<Row[]> {
  const p = shardCache.get(key) || fetchJson<Row[]>(`/data/cities/${key}.json`);
  shardCache.set(key, p);
  return p;
}

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function searchCities(query: string, limit = 8): Promise<City[]> {
  const q = fold(query.trim());
  if (!q[1]) return [];

  const index = await preloadIndex();
  const key = /^[a-z]/.test(q) ? q[0] : '0';
  if (!index.shards.includes(key)) return [];
  const rows = await shard(key);

  const starts: Row[] = [];
  const contains: Row[] = [];
  for (const row of rows) {
    const ascii = fold(row[1] === 0 ? row[0] : row[1]);
    const match = ascii.indexOf(q);
    // `indexOf` is 0 for a prefix and -1 (whose bitwise complement is 0)
    // for no match, so one lookup serves both result tiers.
    if (!match) starts.push(row);
    else if (q[2] && ~match) contains.push(row);
    if (starts.length >= limit * 3) break;
  }

  // Rows are population-sorted within the shard already.
  return [...starts, ...contains].slice(0, limit).map((r) => ({
    name: r[0],
    admin1: index.admin1[r[2]] ?? '',
    country: index.countries[r[3]] ?? '',
    lat: r[4] / 100,
    lon: r[5] / 100,
    tz: index.tz[r[6]],
    pop: r[7],
  }));
}
