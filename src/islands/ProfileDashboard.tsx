/**
 * The daily layer of /profile/: today's sky pressed against one saved
 * chart, plus what's coming for that chart. Transits and eclipse hits
 * are pure arithmetic over committed data (no ephemeris); the Saturn
 * window loads the engine once per chart and caches the answer in
 * localStorage keyed by chart id + engine version.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { loadProfile } from '../lib/profile/store';
import type { SavedChart } from '../lib/profile/schema';
import { findInterAspects } from '../lib/engine/synastry';
import { TRANSIT_ORB, transitLine } from '../lib/transits';
import { houseLine, wholeSignHouseFromAsc, type DailyBody } from '../lib/daily';
import {
  DASHBOARD_CACHE_KEY,
  eclipseHitLine,
  monthDay,
  nextEclipseHit,
  saturnWindowLine,
  type EclipseRecord,
  type SaturnWindowCache,
} from '../lib/upcoming';
import { signForLongitude } from '../lib/signs';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';
import daily from '../data/daily.json';
import eclipsesData from '../data/eclipses.json';

interface Props { locale?: Locale }

const MOVERS = new Set(['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);
const ECLIPSES = (eclipsesData as { eclipses: EclipseRecord[] }).eclipses;

type CacheFile = Record<string, SaturnWindowCache>;

const readCache = (): CacheFile => {
  try {
    return JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY) ?? '{}') as CacheFile;
  } catch {
    return {};
  }
};

export default function ProfileDashboard({ locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [saturn, setSaturn] = useState<SaturnWindowCache | null>(null);
  const [saturnBusy, setSaturnBusy] = useState(false);

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

  // Saturn window: cache first; compute (lazy engine) only on a miss.
  useEffect(() => {
    setSaturn(null);
    if (!chart) return;
    const cached = readCache()[chart.id];
    if (cached && cached.engineVersion === chart.summary.engineVersion) {
      setSaturn(cached);
      return;
    }
    let cancelled = false;
    setSaturnBusy(true);
    (async () => {
      try {
        const { saturnReturns } = await import('../lib/engine/returns');
        const result = saturnReturns(new Date(chart.summary.utcISO));
        const entry: SaturnWindowCache = {
          engineVersion: chart.summary.engineVersion,
          computedAt: new Date().toISOString(),
          seasons: result.seasons.map((s) => ({
            index: s.index,
            from: s.first.toISOString(),
            to: s.last.toISOString(),
          })),
        };
        if (cancelled) return;
        try {
          const file = readCache();
          file[chart.id] = entry;
          localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(file));
        } catch { /* cache is best-effort */ }
        setSaturn(entry);
      } catch { /* engine failed to load — the card simply omits the line */ }
      if (!cancelled) setSaturnBusy(false);
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
    const eclipse = nextEclipseHit(ECLIPSES, natal, new Date());
    return { hits, houseLines, eclipse };
  }, [chart]);

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

  const saturnLine = saturn ? saturnWindowLine(saturn.seasons, new Date()) : null;

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
            <h2>{t(locale, 'pfdComing')}</h2>
          </div>
          <ul class="pfd__lines">
            {saturnLine && (
              <li>
                <p>{saturnLine}</p>
                <span class="mono pfd__receipt">
                  Saturn · natal {chart.summary.bodies.find((b) => b.body === 'Saturn')?.lon.toFixed(1)}° · {saturn!.seasons.length} {t(locale, 'pfdWindows')}
                </span>
              </li>
            )}
            {!saturnLine && saturnBusy && <li><p class="pfd__quiet">{t(locale, 'pfdSaturnBusy')}</p></li>}
            {today?.eclipse && (
              <li>
                <p>{eclipseHitLine(today.eclipse)}</p>
                <span class="mono pfd__receipt">
                  {today.eclipse.eclipse.type} · {monthDay(today.eclipse.eclipse.peak)} · {t(locale, 'orb')} {today.eclipse.orb.toFixed(1)}°
                </span>
              </li>
            )}
            {!today?.eclipse && !saturnBusy && !saturnLine && (
              <li><p class="pfd__quiet">{t(locale, 'pfdQuietAhead')}</p></li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
