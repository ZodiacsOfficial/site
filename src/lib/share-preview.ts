/**
 * The query string of a chart link with a preview. It carries the Sun, the
 * Moon and the Rising sign to the whole degree, and the house system, for the
 * preview image and nothing else. The full positions code travels in the
 * link's fragment, which browsers do not send to a server.
 */
import type { PositionsShareChart } from './share-positions';

export type PreviewHouses = PositionsShareChart['houseSystem'];

export interface PreviewPlacements {
  /** Whole-degree ecliptic longitudes, 0 to 359. */
  sun: number;
  moon: number;
  /** Null for a chart without a birth time; houses is null with it. */
  rising: number | null;
  houses: PreviewHouses | null;
}

export const PREVIEW_QUERY_KEYS: readonly string[] = Object.freeze(['sun', 'moon', 'rising', 'houses']);

const WHOLE_DEGREE_RE = /^(?:0|[1-9][0-9]?|[12][0-9]{2}|3[0-5][0-9])$/u;

function wholeDegree(longitude: number): number {
  return Math.floor(((longitude % 360) + 360) % 360);
}

export interface PreviewSource {
  bodies: readonly { body: string; lon: number }[];
  angles: { asc: number } | null;
  houseSystem: PreviewHouses;
}

export function previewPlacements(chart: PreviewSource): PreviewPlacements | null {
  const sun = chart.bodies.find((row) => row.body === 'Sun');
  const moon = chart.bodies.find((row) => row.body === 'Moon');
  if (!sun || !moon || !Number.isFinite(sun.lon) || !Number.isFinite(moon.lon)) return null;
  if (chart.angles && !Number.isFinite(chart.angles.asc)) return null;
  return {
    sun: wholeDegree(sun.lon),
    moon: wholeDegree(moon.lon),
    rising: chart.angles ? wholeDegree(chart.angles.asc) : null,
    houses: chart.angles ? chart.houseSystem : null,
  };
}

export function previewQuery(placements: PreviewPlacements): string {
  const params = new URLSearchParams({ sun: String(placements.sun), moon: String(placements.moon) });
  if (placements.rising !== null && placements.houses !== null) {
    params.set('rising', String(placements.rising));
    params.set('houses', placements.houses);
  }
  return params.toString();
}

/**
 * Accept exactly sun and moon, or sun, moon, rising and houses, each once,
 * with canonical whole degrees. Anything else is not a preview query.
 */
export function parsePreviewQuery(params: URLSearchParams): PreviewPlacements | null {
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length || !keys.every((key) => PREVIEW_QUERY_KEYS.includes(key))) return null;
  const timed = params.has('rising');
  if (timed !== params.has('houses') || keys.length !== (timed ? 4 : 2)) return null;

  const degree = (key: string): number | null => {
    const value = params.get(key);
    return value !== null && WHOLE_DEGREE_RE.test(value) ? Number(value) : null;
  };
  const sun = degree('sun');
  const moon = degree('moon');
  if (sun === null || moon === null) return null;
  if (!timed) return { sun, moon, rising: null, houses: null };

  const rising = degree('rising');
  const houses = params.get('houses');
  if (rising === null || (houses !== 'whole' && houses !== 'placidus')) return null;
  return { sun, moon, rising, houses };
}
