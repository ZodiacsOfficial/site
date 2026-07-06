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

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
    return r.json() as Promise<T>;
  });
}

export function preloadIndex(): Promise<CityIndex> {
  indexPromise ??= fetchJson<CityIndex>('/data/cities/index.json');
  return indexPromise;
}

function shard(key: string): Promise<Row[]> {
  let p = shardCache.get(key);
  if (!p) {
    p = fetchJson<Row[]>(`/data/cities/${key}.json`);
    shardCache.set(key, p);
  }
  return p;
}

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function searchCities(query: string, limit = 8): Promise<City[]> {
  const q = fold(query.trim());
  if (q.length < 2) return [];

  const index = await preloadIndex();
  const key = /^[a-z]/.test(q) ? q[0] : '0';
  if (!index.shards.includes(key)) return [];
  const rows = await shard(key);

  const starts: Row[] = [];
  const contains: Row[] = [];
  for (const row of rows) {
    const ascii = fold(typeof row[1] === 'string' ? row[1] : row[0]);
    if (ascii.startsWith(q)) starts.push(row);
    else if (q.length >= 3 && ascii.includes(q)) contains.push(row);
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
