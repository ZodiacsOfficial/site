import { useEffect, useMemo, useState } from 'preact/hooks';
import eclipsesData from '../../data/eclipses.json';
import ingressesData from '../../data/ingresses.json';
import type { SavedChart } from '../profile/schema';
import { signForLongitude } from '../signs';
import type { EclipseRecord } from '../upcoming';
import {
  YEAR_AHEAD_CACHE_KEY,
  aspectEvents,
  assembleYearAhead,
  eclipseEvents,
  ingressEvents,
  saturnSeasonEvents,
  solarReturnEvents,
  yearCacheFresh,
  type IngressWindow,
  type YearAheadEvent,
  type YearScanCache,
} from '../year-ahead';

type YearCacheFile = Record<string, YearScanCache>;

const ECLIPSES = (eclipsesData as { eclipses: EclipseRecord[] }).eclipses;
const INGRESSES = (ingressesData as { windows: IngressWindow[] }).windows;
const YEAR_MS = 366 * 86_400_000;

function readYearCache(): YearCacheFile {
  try {
    return JSON.parse(localStorage.getItem(YEAR_AHEAD_CACHE_KEY) ?? '{}') as YearCacheFile;
  } catch {
    return {};
  }
}

export interface YearAheadState {
  timeline: YearAheadEvent[];
  busy: boolean;
}

/**
 * One shared client-side year-ahead source for Profile and Today. The costly
 * engine scan remains lazy and cached; committed ingress/eclipse events are
 * available while it loads.
 */
export function useYearAhead(chart: SavedChart | null): YearAheadState {
  const [year, setYear] = useState<YearScanCache | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setYear(null);
    setBusy(false);
    if (!chart) return;
    const cached = readYearCache()[chart.id];
    if (cached && yearCacheFresh(cached, chart.summary.engineVersion, new Date())) {
      setYear(cached);
      return;
    }

    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const { yearScan } = await import('../engine/year-scan');
        const bodies = chart.summary.bodies;
        const sunLon = bodies.find((body) => body.body === 'Sun')?.lon;
        if (sunLon == null) return;
        const from = new Date();
        const to = new Date(from.getTime() + YEAR_MS);
        const scan = yearScan({
          sunLon,
          moonLon: bodies.find((body) => body.body === 'Moon')?.lon ?? null,
          ascLon: chart.birth.timeKnown ? chart.summary.angles?.asc ?? null : null,
          birthUtc: new Date(chart.summary.utcISO),
        }, from, to);
        const entry: YearScanCache = {
          engineVersion: chart.summary.engineVersion,
          computedAt: from.toISOString(),
          from: from.toISOString(),
          to: to.toISOString(),
          scan,
        };
        if (cancelled) return;
        try {
          const cache = readYearCache();
          cache[chart.id] = entry;
          localStorage.setItem(YEAR_AHEAD_CACHE_KEY, JSON.stringify(cache));
        } catch {
          // Cache failure never blocks the reading.
        }
        setYear(entry);
      } catch {
        // The committed-data portion remains useful if the engine cannot load.
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [chart?.id, chart?.summary.engineVersion]);

  const timeline = useMemo(() => {
    if (!chart) return [];
    const now = new Date();
    const to = new Date(now.getTime() + YEAR_MS);
    const natal = chart.summary.bodies.map(({ body, lon }) => ({ body, lon }));
    const sunLon = natal.find((point) => point.body === 'Sun')?.lon;
    const sunSign = sunLon == null ? '' : signForLongitude(sunLon).slug;
    const asc = chart.birth.timeKnown ? chart.summary.angles?.asc : null;
    const risingSign = asc == null ? null : signForLongitude(asc).slug;
    const parts = [
      ingressEvents(INGRESSES, sunSign, risingSign, now, to),
      eclipseEvents(ECLIPSES, natal, now, to),
    ];
    if (year) {
      parts.push(
        solarReturnEvents(year.scan),
        aspectEvents(year.scan),
        saturnSeasonEvents(year.scan.saturnSeasons, now, to),
      );
    }
    return assembleYearAhead(parts)
      .filter((event) => new Date(event.endAt ?? event.at) >= now);
  }, [chart, year]);

  return { timeline, busy };
}
