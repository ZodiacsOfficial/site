/**
 * The transit page's island: birth input in, the animated Transit Ring out.
 * The natal side resolves once (from a saved chart or the form); the ring
 * itself — the bi-wheel + scrubber — is a lazy chunk loaded on the first
 * "check", so /transits/ carries the wheel and its animation only when a
 * chart exists to draw. The transiting side is live engine math.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { BirthFields } from './BirthFields';
import type { MinimalBody } from '../lib/engine/synastry';
import type { Chart } from '../lib/engine/types';
import type { SavedChart } from '../lib/profile/schema';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import type { City } from '../lib/geo/search';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';
import { useEngine, type EngineLoader } from '../lib/hooks/useEngine';
import { useProfile } from '../lib/hooks/useProfile';
import type { TransitSky } from './transit/TransitRing';
import type { CalendarPositionsSource } from './CalendarSubscribe';
import type {
  NatalPoint,
  NatalTransitChart,
  TransitBody,
  TransitContact,
} from '../lib/engine/transit-scan';

type RingModule = typeof import('./transit/TransitRing');
type SearchModule = typeof import('./transit/TransitSearch');

// The transiting bodies drawn on the outer ring (planets + the Moon; the Moon
// circles fast and is left out of the aspect list, but shown so you can watch it).
const TRANSIT_BODIES = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);

interface SlotState {
  source: 'saved' | 'form';
  savedId: string;
  date: string;
  time: string;
  timeKnown: boolean;
  city: City | null;
}

interface NatalWheel {
  bodies: { body: string; lon: number; retrograde?: boolean }[];
  asc: number | null;
  mc: number | null;
  cusps: number[] | null;
  minimal: MinimalBody[];
  timeKnown: boolean;
  calendarPositions: CalendarPositionsSource | null;
}

interface Result {
  natal: NatalWheel;
  computeSky: (when: Date) => TransitSky[];
  nowMs: number;
}

interface TransitFocusRequest {
  contact: TransitContact;
}

function wheelFromChart(
  r: Chart,
  timeKnown: boolean,
  houseSystem: CalendarPositionsSource['houseSystem'] = r.houses?.system ?? 'whole',
): NatalWheel {
  return {
    // South Node stays off the drawn wheel — the site-wide convention
    // (share card, demo chart, calculator scene all hide it). `minimal`
    // keeps every body; the aspect search filters by ASPECT_BODIES itself.
    bodies: r.bodies
      .filter((b) => b.body !== 'South Node')
      .map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
    asc: r.angles?.asc ?? null,
    mc: r.angles?.mc ?? null,
    cusps: timeKnown ? (r.houses?.cusps ?? null) : null,
    minimal: r.bodies.map(({ body, lon }) => ({ body, lon })),
    timeKnown,
    calendarPositions: {
      bodies: r.bodies,
      angles: r.angles ? { asc: r.angles.asc, mc: r.angles.mc } : null,
      houseSystem,
      engineVersion: r.engineVersion,
    },
  };
}

type Engine = Awaited<ReturnType<EngineLoader>>;

function calendarPositionsFromSaved(chart: SavedChart): CalendarPositionsSource {
  return {
    bodies: chart.summary.bodies,
    angles: chart.summary.angles,
    houseSystem: chart.summary.houseSystem,
    engineVersion: chart.summary.engineVersion,
  };
}

function natalFromForm(slot: SlotState, engine: Engine): NatalWheel {
  const timeKnown = slot.timeKnown && slot.time !== '';
  const resolved = resolveLocalToUtc(slot.date, timeKnown ? slot.time : '12:00', slot.city!.tz);
  const r = engine.computeChart({
    utc: resolved.utc,
    latitude: slot.city!.lat,
    longitude: slot.city!.lon,
    houseSystem: 'whole',
    timeKnown,
    flags: resolved.flags,
  });
  return wheelFromChart(r, timeKnown);
}

function natalFromSaved(chart: SavedChart, engine: Engine): NatalWheel {
  if (chart.birth.place) {
    const timeKnown = chart.birth.timeKnown && Boolean(chart.birth.time);
    const resolved = resolveLocalToUtc(
      chart.birth.date,
      timeKnown && chart.birth.time ? chart.birth.time : '12:00',
      chart.birth.place.tz,
    );
    const r = engine.computeChart({
      utc: resolved.utc,
      latitude: chart.birth.place.lat,
      longitude: chart.birth.place.lon,
      houseSystem: chart.summary.houseSystem,
      timeKnown,
      flags: resolved.flags,
    });
    return wheelFromChart(r, timeKnown, chart.summary.houseSystem);
  }
  // No stored place — draw from the summary (bodies + ascendant), no house ring.
  return {
    bodies: chart.summary.bodies
      .filter((b) => b.body !== 'South Node')
      .map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
    asc: chart.summary.angles?.asc ?? null,
    mc: chart.summary.angles?.mc ?? null,
    cusps: null,
    minimal: chart.summary.bodies.map(({ body, lon }) => ({ body, lon })),
    timeKnown: chart.birth.timeKnown,
    calendarPositions: calendarPositionsFromSaved(chart),
  };
}

export default function TransitTracker({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const loadEngine = useEngine();
  const { profile, ready: profileReady } = useProfile();
  const [slot, setSlot] = useState<SlotState>({
    source: 'form', savedId: '', date: '', time: '', timeKnown: true, city: null,
  });
  const [result, setResult] = useState<Result | null>(null);
  const [ringMod, setRingMod] = useState<RingModule | null>(null);
  const [searchMod, setSearchMod] = useState<SearchModule | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchFocus, setSearchFocus] = useState<TransitFocusRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusAfterComputeRef = useRef(false);
  const initialProfileReadRef = useRef(false);

  useEffect(() => {
    if (!profileReady || initialProfileReadRef.current) return;
    initialProfileReadRef.current = true;
    // One saved chart and nothing picked yet? Preselect it.
    if (profile.charts.length > 0) {
      setSlot((s) => (s.source === 'form' && s.savedId === '' && s.date === ''
        ? { ...s, source: 'saved', savedId: profile.charts[0].id }
        : s));
    }
  }, [profileReady, profile]);

  const charts = profile.charts;

  const ready = slot.source === 'saved'
    ? charts.some((c) => c.id === slot.savedId)
    : slot.date !== '' && slot.city !== null;

  async function check(e?: Event) {
    e?.preventDefault();
    if (!ready || busy) return;
    focusAfterComputeRef.current = e !== undefined;
    setBusy(true);
    setError('');
    try {
      const [engine, mod] = await Promise.all([
        loadEngine(),
        ringMod ? Promise.resolve(ringMod) : import('./transit/TransitRing'),
      ]);
      const natal = slot.source === 'saved'
        ? natalFromSaved(charts.find((c) => c.id === slot.savedId)!, engine)
        : natalFromForm(slot, engine);
      const computeSky = (when: Date): TransitSky[] =>
        engine.computeBodies(when)
          .filter((b) => TRANSIT_BODIES.has(b.body))
          .map(({ body, lon, retrograde }) => ({ body, lon, retrograde }));
      setRingMod(mod);
      setSearchFocus(null);
      setResult({ natal, computeSky, nowMs: Date.now() });
    } catch (err) {
      setError(t(locale, 'transitError'));
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (busy || !focusAfterComputeRef.current) return;
    if (error) {
      errorRef.current?.focus();
      focusAfterComputeRef.current = false;
      return;
    }
    if (result) {
      resultHeadingRef.current?.focus();
      focusAfterComputeRef.current = false;
    }
  }, [busy, error, result]);

  const RingComponent = ringMod?.default;
  const SearchComponent = searchMod?.TransitSearch;
  const searchNatal: NatalTransitChart | null = result ? {
    bodies: result.natal.minimal
      .filter((body) => TRANSIT_BODIES.has(body.body))
      .map((body) => ({ body: body.body as TransitBody, lon: body.lon })),
    angles: result.natal.asc != null && result.natal.mc != null
      ? { asc: result.natal.asc, mc: result.natal.mc }
      : null,
  } : null;
  const searchNatalPoints = searchNatal ? [
    ...searchNatal.bodies.map(({ body }) => ({ name: body as NatalPoint })),
    ...(searchNatal.angles ? [
      { name: 'ASC' as const },
      { name: 'MC' as const },
    ] : []),
  ] : [];

  function openSearch(event: Event): void {
    if (!(event.currentTarget as HTMLDetailsElement).open || searchMod || searchLoading) return;
    setSearchLoading(true);
    setSearchError('');
    void import('./transit/TransitSearch')
      .then(setSearchMod)
      .catch(() => setSearchError('The transit search could not load. Close this section and try again.'))
      .finally(() => setSearchLoading(false));
  }

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={check} aria-busy={busy}>
        <div class="core calc__core">
          <div class="trans__grid">
            <div class="trans__side">
              <span class="mono--label">{t(locale, 'yourChart')}</span>

              {charts.length > 0 && (
                <div class="field">
                  <label class="field__label" for="trans-source">{t(locale, 'chart')}</label>
                  <select
                    id="trans-source" class="field__input"
                    value={slot.source === 'saved' ? slot.savedId : ''}
                    onChange={(e) => {
                      const v = (e.target as HTMLSelectElement).value;
                      setSlot((s) => (v === ''
                        ? { ...s, source: 'form', savedId: '' }
                        : { ...s, source: 'saved', savedId: v }));
                    }}
                  >
                    <option value="">{t(locale, 'enterBirthDetails')}</option>
                    {charts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {slot.source === 'form' && (
                <BirthFields
                  locale={locale}
                  dateId="trans-date"
                  timeId="trans-time"
                  placeId="trans-place"
                  date={slot.date}
                  time={slot.time}
                  timeKnown={slot.timeKnown}
                  city={slot.city}
                  onDateChange={(date) => setSlot((s) => ({ ...s, date }))}
                  onTimeChange={(time) => setSlot((s) => ({ ...s, time }))}
                  onTimeKnownChange={(timeKnown) => setSlot((s) => ({ ...s, timeKnown }))}
                  onCityChange={(city) => setSlot((s) => ({ ...s, city }))}
                  onWarm={loadEngine}
                />
              )}
            </div>

            <div class="trans__side">
              <span class="mono--label">{t(locale, 'theSky')}</span>
              <p class="field__help">{t(locale, 'transitRingLede')}</p>
            </div>
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!ready || busy}>
            <span>{busy ? t(locale, 'checking') : t(locale, 'checkTransits')}</span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">{t(locale, 'privacyDevice')}</p>
          {charts.length === 0 && (
            <p class="field__help">
              {t(locale, 'savedChartHelp')}{' '}
              <a href={localizePath(locale, '/birth-chart/')}>{t(locale, 'getBirthChart')} →</a>
            </p>
          )}
          {error && <p class="calc__error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        </div>
      </form>

      {result && RingComponent && (
        <div class="calc__result">
          <h2 class="sr-only" tabIndex={-1} ref={resultHeadingRef}>{t(locale, 'transits')}</h2>
          {!result.natal.timeKnown && (
            <p class="notice" role="status">{t(locale, 'noTransitTimeNotice')}</p>
          )}
          {/* Keyed on the compute instant: a fresh result remounts the ring,
              so a stale scrub offset or focused contact never carries over
              from a previous chart. */}
          <RingComponent
            key={result.nowMs}
            locale={locale}
            natal={result.natal}
            computeSky={result.computeSky}
            nowMs={result.nowMs}
            focusRequest={searchFocus}
          />
        </div>
      )}

      {locale === 'en' && (
        <details class="tsearch-host shell" onToggle={openSearch} data-transit-search-host>
          <summary class="tsearch-host__summary">
            <span>Find a transit</span>
            <span class="orb" aria-hidden="true">↗</span>
          </summary>
          <div class="core tsearch-host__core">
            {SearchComponent ? (
              <SearchComponent
                key={result?.nowMs ?? 'no-chart'}
                natal={searchNatal}
                natalPoints={searchNatalPoints}
                nowMs={result?.nowMs ?? Date.now()}
                onShowOnRing={(contact) => setSearchFocus({ contact })}
              />
            ) : (
              searchError
                ? <p class="calc__error" role="alert">{searchError}</p>
                : (
                    <p class="tsearch__status mono" role="status">
                      {searchLoading ? 'Loading transit search…' : 'Open to load the transit search.'}
                    </p>
                  )
            )}
          </div>
        </details>
      )}
    </div>
  );
}
