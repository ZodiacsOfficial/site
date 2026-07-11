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

type RingModule = typeof import('./transit/TransitRing');

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
}

interface Result {
  natal: NatalWheel;
  computeSky: (when: Date) => TransitSky[];
  nowMs: number;
}

function wheelFromChart(r: Chart, timeKnown: boolean): NatalWheel {
  return {
    bodies: r.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
    asc: r.angles?.asc ?? null,
    mc: r.angles?.mc ?? null,
    cusps: timeKnown ? (r.houses?.cusps ?? null) : null,
    minimal: r.bodies.map(({ body, lon }) => ({ body, lon })),
    timeKnown,
  };
}

type Engine = Awaited<ReturnType<EngineLoader>>;

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
    return wheelFromChart(r, timeKnown);
  }
  // No stored place — draw from the summary (bodies + ascendant), no house ring.
  return {
    bodies: chart.summary.bodies.map(({ body, lon }) => ({ body, lon })),
    asc: chart.summary.angles?.asc ?? null,
    mc: chart.summary.angles?.mc ?? null,
    cusps: null,
    minimal: chart.summary.bodies.map(({ body, lon }) => ({ body, lon })),
    timeKnown: chart.birth.timeKnown,
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
          <RingComponent
            locale={locale}
            natal={result.natal}
            computeSky={result.computeSky}
            nowMs={result.nowMs}
          />
        </div>
      )}
    </div>
  );
}
