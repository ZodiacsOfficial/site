/**
 * The engine-bound half of "your year ahead": exact-date scans for one
 * chart over the next twelve months — the solar return instant, and
 * every Jupiter/Saturn aspect (conjunction, square, opposition) to the
 * natal Sun, Moon, and ascendant, with retrograde re-passes grouped
 * into single events. Lives beside full.ts and is only ever lazy-loaded
 * (the returns.ts precedent); the phrasing layer in ../year-ahead.ts is
 * engine-free.
 */
import { findLongitudeCrossings, groupIntoSeasons, saturnReturns } from './returns';
import type { BodyName } from './types';

export interface ScanAspectEvent {
  body: 'Jupiter' | 'Saturn';
  aspect: 'conjunction' | 'square' | 'opposition';
  /** Natal point the transit presses on. */
  natal: 'Sun' | 'Moon' | 'ASC';
  /** First and last exact pass (equal for a single clean pass). */
  from: string;
  to: string;
  passes: number;
}

export interface YearScanResult {
  /** Exact solar-return instants in the window (normally one). */
  solarReturns: string[];
  aspects: ScanAspectEvent[];
  /** Saturn-return seasons for the whole chart (not window-clipped). */
  saturnSeasons: { index: number; from: string; to: string }[];
}

const ASPECT_OFFSETS: { aspect: ScanAspectEvent['aspect']; offsets: number[] }[] = [
  { aspect: 'conjunction', offsets: [0] },
  { aspect: 'square', offsets: [90, 270] },
  { aspect: 'opposition', offsets: [180] },
];

/**
 * Scan the year for one chart. ~26 longitude-crossing scans plus one
 * Saturn-return sweep — a couple of seconds of arithmetic at worst,
 * cached by the caller.
 */
export function yearScan(
  natal: { sunLon: number; moonLon: number | null; ascLon: number | null; birthUtc: Date },
  from: Date,
  to: Date,
): YearScanResult {
  const solarReturns = findLongitudeCrossings('Sun', natal.sunLon, from, to, 1)
    .map((c) => c.at.toISOString());

  const points: { name: ScanAspectEvent['natal']; lon: number }[] = [
    { name: 'Sun', lon: natal.sunLon },
  ];
  if (natal.moonLon != null) points.push({ name: 'Moon', lon: natal.moonLon });
  if (natal.ascLon != null) points.push({ name: 'ASC', lon: natal.ascLon });

  const aspects: ScanAspectEvent[] = [];
  for (const body of ['Jupiter', 'Saturn'] as const) {
    for (const point of points) {
      for (const { aspect, offsets } of ASPECT_OFFSETS) {
        const crossings = offsets
          .flatMap((off) =>
            findLongitudeCrossings(body as BodyName, (point.lon + off) % 360, from, to))
          .sort((a, b) => a.at.getTime() - b.at.getTime());
        // Re-passes of one station loop belong to one event; two squares
        // from opposite sides of the chart stay separate via the gap.
        for (const season of groupIntoSeasons(crossings, 300)) {
          aspects.push({
            body,
            aspect,
            natal: point.name,
            from: season.first.toISOString(),
            to: season.last.toISOString(),
            passes: season.crossings.length,
          });
        }
      }
    }
  }
  aspects.sort((a, b) => a.from.localeCompare(b.from));

  const saturnSeasons = saturnReturns(natal.birthUtc).seasons.map((s) => ({
    index: s.index,
    from: s.first.toISOString(),
    to: s.last.toISOString(),
  }));

  return { solarReturns, aspects, saturnSeasons };
}
