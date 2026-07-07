/**
 * The daily layer of /profile/: today's sky pressed against one saved
 * chart, plus the chart's next twelve months. Transits are pure
 * arithmetic over committed data (no ephemeris); the year scan — solar
 * return, Jupiter/Saturn hits on Sun/Moon/ASC, Saturn-return seasons —
 * loads the engine once per chart and caches in localStorage keyed by
 * chart id + engine version, refreshed every two weeks.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { loadProfile } from '../lib/profile/store';
import type { SavedChart } from '../lib/profile/schema';
import { findInterAspects } from '../lib/engine/synastry';
import { TRANSIT_ORB, transitLine } from '../lib/transits';
import { houseLine, wholeSignHouseFromAsc, type DailyBody } from '../lib/daily';
import { type EclipseRecord } from '../lib/upcoming';
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
  type YearScanCache,
} from '../lib/year-ahead';
import { signForLongitude } from '../lib/signs';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';
import daily from '../data/daily.json';
import eclipsesData from '../data/eclipses.json';
import ingressesData from '../data/ingresses.json';

interface Props { locale?: Locale }

const MOVERS = new Set(['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);
const ECLIPSES = (eclipsesData as { eclipses: EclipseRecord[] }).eclipses;
const INGRESSES = (ingressesData as { windows: IngressWindow[] }).windows;
const YEAR_MS = 366 * 86400_000;

type YearCacheFile = Record<string, YearScanCache>;

const readYearCache = (): YearCacheFile => {
  try {
    return JSON.parse(localStorage.getItem(YEAR_AHEAD_CACHE_KEY) ?? '{}') as YearCacheFile;
  } catch {
    return {};
  }
};

export default function ProfileDashboard({ locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [year, setYear] = useState<YearScanCache | null>(null);
  const [yearBusy, setYearBusy] = useState(false);

  useEffect(() => {
    const pick = () => {
      const p = loadProfile();
      setCharts([...p.charts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    };
    pick();
    window.addEventListener('zodiacs:profile', pick);
    return () => window.removeEventListener('zodiacs:profile', pick);
  }, []);

  const chart = charts.find((c) => c.id === sel) ?? charts[0] ?? null;

  // Year scan: cache first; compute (lazy engine) only on a miss or after
  // two weeks, so repeat visits stay ephemeris-free.
  useEffect(() => {
    setYear(null);
    if (!chart) return;
    const cached = readYearCache()[chart.id];
    if (cached && yearCacheFresh(cached, chart.summary.engineVersion, new Date())) {
      setYear(cached);
      return;
    }
    let cancelled = false;
    setYearBusy(true);
    (async () => {
      try {
        const { yearScan } = await import('../lib/engine/year-scan');
        const bodies = chart.summary.bodies;
        const sunLon = bodies.find((b) => b.body === 'Sun')?.lon;
        if (sunLon == null) return;
        const from = new Date();
        const to = new Date(from.getTime() + YEAR_MS);
        const scan = yearScan(
          {
            sunLon,
            moonLon: bodies.find((b) => b.body === 'Moon')?.lon ?? null,
            ascLon: chart.birth.timeKnown ? chart.summary.angles?.asc ?? null : null,
            birthUtc: new Date(chart.summary.utcISO),
          },
          from,
          to,
        );
        const entry: YearScanCache = {
          engineVersion: chart.summary.engineVersion,
          computedAt: from.toISOString(),
          from: from.toISOString(),
          to: to.toISOString(),
          scan,
        };
        if (cancelled) return;
        try {
          const file = readYearCache();
          file[chart.id] = entry;
          localStorage.setItem(YEAR_AHEAD_CACHE_KEY, JSON.stringify(file));
        } catch { /* cache is best-effort */ }
        setYear(entry);
      } catch { /* engine failed to load — the card shows the quiet line */ }
      if (!cancelled) setYearBusy(false);
    })();
    return () => { cancelled = true; };
  }, [chart?.id, chart?.summary.engineVersion]);

  const today = useMemo(() => {
    if (!chart) return null;
    const natal = chart.summary.bodies.map(({ body, lon }) => ({ body, lon }));
    const sky = daily.bodies.filter((b) => MOVERS.has(b.body)).map(({ body, lon }) => ({ body, lon }));
    const hits = findInterAspects(sky, natal)
      .filter((a) => a.orb <= TRANSIT_ORB)
      .sort((x, y) => x.orb - y.orb)
      .slice(0, 4);

    // Real natal houses (whole sign from the ascendant) when the birth
    // time is known — the Sun and Moon read from YOUR rooms, not solar ones.
    let houseLines: ReturnType<typeof houseLine>[] = [];
    const asc = chart.summary.angles?.asc;
    if (chart.birth.timeKnown && asc != null && chart.summary.houseSystem === 'whole') {
      const ascSign = signForLongitude(asc).slug;
      houseLines = daily.bodies
        .filter((b) => b.body === 'Sun' || b.body === 'Moon')
        .map((b) => houseLine(b as DailyBody, wholeSignHouseFromAsc(b.sign, ascSign)));
    }
    return { hits, houseLines };
  }, [chart]);

  // The merged twelve-month timeline: engine-scanned events from the
  // cache, plus ingresses and eclipse hits from committed data.
  const timeline = useMemo(() => {
    if (!chart) return [];
    const now = new Date();
    const to = new Date(now.getTime() + YEAR_MS);
    const natal = chart.summary.bodies.map(({ body, lon }) => ({ body, lon }));
    const sunLon = natal.find((n) => n.body === 'Sun')?.lon;
    const sunSign = sunLon != null ? signForLongitude(sunLon).slug : '';
    const asc = chart.birth.timeKnown ? chart.summary.angles?.asc : null;
    const risingSign = asc != null ? signForLongitude(asc).slug : null;
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
    // Keep windows still running; drop events fully in the past.
    return assembleYearAhead(parts)
      .filter((e) => new Date(e.endAt ?? e.at) >= now)
      .slice(0, 8);
  }, [chart, year]);

  if (!chart) {
    return (
      <section class="shell pfd" aria-label={t(locale, 'pfdEmptyTitle')}>
        <div class="core pfd__core pfd__empty">
          <h2>{t(locale, 'pfdEmptyTitle')}</h2>
          <p>{t(locale, 'pfdEmptyBody')}</p>
          <a class="btn btn--primary" href={localizePath(locale, '/birth-chart/')}>
            <span>{t(locale, 'getBirthChart')}</span><span class="orb">↗</span>
          </a>
        </div>
      </section>
    );
  }

  return (
    <section class="pfd" aria-label={t(locale, 'pfdToday')}>
      <div class="shell">
        <div class="core pfd__core">
          <div class="pfd__head">
            <h2>{t(locale, 'pfdToday')}</h2>
            <span class="mono pfd__stamp">
              {daily.date} · {daily.moon.phase}
            </span>
          </div>
          {charts.length > 1 && (
            <label class="pfd__pick">
              <span class="mono">{t(locale, 'pfdChartPick')}</span>
              <select
                class="field__input"
                value={chart.id}
                onChange={(e) => setSel((e.target as HTMLSelectElement).value)}
              >
                {charts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}
          {today && today.houseLines.length > 0 && (
            <ul class="pfd__lines">
              {today.houseLines.map((l) => (
                <li key={l.receipt}>
                  <p>{l.text}</p>
                  <span class="mono pfd__receipt">{l.receipt}</span>
                </li>
              ))}
            </ul>
          )}
          {today && today.hits.length > 0 ? (
            <ul class="pfd__lines">
              {today.hits.map((a) => (
                <li key={`${a.a}-${a.b}-${a.type}`}>
                  <p>{transitLine(a.a, a.type, a.b)}</p>
                  <span class="mono pfd__receipt">
                    {a.a} {a.type} {t(locale, 'natal')} {a.b} · {t(locale, 'orb')} {a.orb.toFixed(1)}°
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p class="pfd__quiet">{t(locale, 'pfdQuietSky')}</p>
          )}
          <a class="pfd__more" href={localizePath(locale, '/transits/')}>{t(locale, 'allTransits')} →</a>
        </div>
      </div>

      <div class="shell">
        <div class="core pfd__core">
          <div class="pfd__head">
            <h2>{t(locale, 'pfdYearAhead')}</h2>
            <span class="mono pfd__stamp">{t(locale, 'pfdYearNote')}</span>
          </div>
          {timeline.length > 0 ? (
            <ul class="pfd__lines">
              {timeline.map((ev) => (
                <li key={`${ev.kind}-${ev.at}-${ev.receipt}`}>
                  <p>{ev.line}</p>
                  <span class="mono pfd__receipt">{ev.receipt}</span>
                </li>
              ))}
            </ul>
          ) : yearBusy ? (
            <p class="pfd__quiet">{t(locale, 'pfdYearBusy')}</p>
          ) : (
            <p class="pfd__quiet">{t(locale, 'pfdQuietAhead')}</p>
          )}
          {timeline.length > 0 && yearBusy && (
            <p class="pfd__quiet">{t(locale, 'pfdYearBusy')}</p>
          )}
        </div>
      </div>
    </section>
  );
}
