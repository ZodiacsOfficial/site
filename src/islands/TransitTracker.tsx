/**
 * The current sky against a natal chart. The natal side flows from a
 * saved summary without loading the ephemeris; the transiting side is
 * live math, so the engine lazy-loads on every run — the same idiom as
 * the chart calculator.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import PlaceSearch from './PlaceSearch';
import SignChip from './SignChip';
import PlanetGlyph from '../components/PlanetGlyph';
import AspectGlyph from '../components/AspectGlyph';
import { loadProfile } from '../lib/profile/store';
import { EMPTY_PROFILE } from '../lib/profile/schema';
import type { Profile, SavedChart } from '../lib/profile/schema';
import { findInterAspects } from '../lib/engine/synastry';
import type { InterAspect, MinimalBody } from '../lib/engine/synastry';
import { transitLine, TRANSIT_ORB } from '../lib/transits';
import { formatLongitude } from '../lib/signs';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import { ENGINE_VERSION } from '../lib/engine/types';
import type { City } from '../lib/geo/search';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';

// The transiting bodies shown in the sky strip (planets only — nodes excluded,
// as before). Glyphs come from the shared PlanetGlyph.
const TRANSIT_BODIES = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);

let enginePromise: Promise<typeof import('../lib/engine/full')> | null = null;
const loadEngine = () => (enginePromise ??= import('../lib/engine/full'));

interface SlotState {
  source: 'saved' | 'form';
  savedId: string;
  date: string;
  time: string;
  timeKnown: boolean;
  city: City | null;
}

interface Natal {
  bodies: MinimalBody[];
  timeKnown: boolean;
}

interface SkyBody {
  body: string;
  lon: number;
  retrograde: boolean;
}

interface Result {
  whenLabel: string;
  sky: SkyBody[];
  natal: Natal;
  hits: InterAspect[];
}

async function resolveSaved(chart: SavedChart): Promise<Natal> {
  const stored: Natal = {
    bodies: chart.summary.bodies.map(({ body, lon }) => ({ body, lon })),
    timeKnown: chart.birth.timeKnown,
  };
  // Stale engine? Recompute from birth input when we can; the stored
  // summary stays the honest fallback.
  if (chart.summary.engineVersion === ENGINE_VERSION || !chart.birth.place) return stored;
  try {
    const engine = await loadEngine();
    const resolved = resolveLocalToUtc(
      chart.birth.date,
      chart.birth.timeKnown && chart.birth.time ? chart.birth.time : '12:00',
      chart.birth.place.tz,
    );
    const result = engine.computeChart({
      utc: resolved.utc,
      latitude: chart.birth.place.lat,
      longitude: chart.birth.place.lon,
      houseSystem: chart.summary.houseSystem,
      timeKnown: chart.birth.timeKnown,
      flags: resolved.flags,
    });
    return {
      bodies: result.bodies.map(({ body, lon }) => ({ body, lon })),
      timeKnown: chart.birth.timeKnown,
    };
  } catch {
    return stored;
  }
}

async function resolveForm(slot: SlotState): Promise<Natal> {
  const engine = await loadEngine();
  const timeKnown = slot.timeKnown && slot.time !== '';
  const resolved = resolveLocalToUtc(slot.date, timeKnown ? slot.time : '12:00', slot.city!.tz);
  const result = engine.computeChart({
    utc: resolved.utc,
    latitude: slot.city!.lat,
    longitude: slot.city!.lon,
    houseSystem: 'whole',
    timeKnown,
    flags: resolved.flags,
  });
  return {
    bodies: result.bodies.map(({ body, lon }) => ({ body, lon })),
    timeKnown,
  };
}

export default function TransitTracker({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  // Starts as the empty profile so the form server-renders; the mount
  // effect swaps in the device's real profile (the dropdown appears then).
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [slot, setSlot] = useState<SlotState>({
    source: 'form', savedId: '', date: '', time: '', timeKnown: true, city: null,
  });
  const [dateStr, setDateStr] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusAfterComputeRef = useRef(false);

  useEffect(() => {
    const load = () => {
      const p = loadProfile();
      setProfile(p);
      // One saved chart and nothing picked yet? Preselect it — most
      // devices hold exactly the owner's chart.
      if (p.charts.length > 0) {
        setSlot((s) => (s.source === 'form' && s.savedId === '' && s.date === ''
          ? { ...s, source: 'saved', savedId: p.charts[0].id }
          : s));
      }
    };
    load();
    const sync = () => setProfile(loadProfile());
    window.addEventListener('zodiacs:profile', sync);
    return () => window.removeEventListener('zodiacs:profile', sync);
  }, []);

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
      const natal = slot.source === 'saved'
        ? await resolveSaved(charts.find((c) => c.id === slot.savedId)!)
        : await resolveForm(slot);
      const engine = await loadEngine();
      const when = dateStr === '' ? new Date() : new Date(`${dateStr}T12:00:00Z`);
      const whenLabel = dateStr === ''
        ? `${when.toISOString().slice(0, 16).replace('T', ' ')} UTC`
        : `${dateStr} · midday UTC`;
      const sky = engine.computeBodies(when)
        .filter((b) => TRANSIT_BODIES.has(b.body))
        .map(({ body, lon, retrograde }) => ({ body, lon, retrograde }));
      // The Moon crosses the whole chart every month — the list would be
      // all Moon. It stays in the sky strip; the aspects leave it out.
      const transiting: MinimalBody[] = sky
        .filter((b) => b.body !== 'Moon')
        .map(({ body, lon }) => ({ body, lon }));
      const hits = findInterAspects(transiting, natal.bodies).filter((h) => h.orb <= TRANSIT_ORB);
      setResult({ whenLabel, sky, natal, hits });
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
                    {charts.map((c) => <option value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {slot.source === 'form' && (
                <>
                  <div class="field">
                    <label class="field__label" for="trans-date">{t(locale, 'birthDate')}</label>
                    <input
                      id="trans-date" class="field__input" type="date" required
                      min="1800-01-01" max="2199-12-31" value={slot.date}
                      onInput={(e) => { const v = (e.target as HTMLInputElement).value; setSlot((s) => ({ ...s, date: v })); }}
                    />
                  </div>
                  <div class="field">
                    <div class="field__labelrow">
                      <label class="field__label" for="trans-time">{t(locale, 'birthTime')}</label>
                      <label class="field__toggle">
                        <input
                          type="checkbox" checked={!slot.timeKnown}
                          onChange={(e) => { const v = !(e.target as HTMLInputElement).checked; setSlot((s) => ({ ...s, timeKnown: v })); }}
                        />
                        {t(locale, 'noBirthTime')}
                      </label>
                    </div>
                    <input
                      id="trans-time" class="field__input" type="time"
                      disabled={!slot.timeKnown} value={slot.time}
                      onFocus={() => loadEngine()}
                      onInput={(e) => { const v = (e.target as HTMLInputElement).value; setSlot((s) => ({ ...s, time: v })); }}
                    />
                  </div>
                  <div class="field">
                    <label class="field__label" for="trans-place">{t(locale, 'birthplace')}</label>
                    <PlaceSearch id="trans-place" selected={slot.city} onSelect={(c) => setSlot((s) => ({ ...s, city: c }))} locale={locale} />
                  </div>
                </>
              )}
            </div>

            <div class="trans__side">
              <span class="mono--label">{t(locale, 'theSky')}</span>
              <div class="field">
                <label class="field__label" for="trans-when">
                  {t(locale, 'date')} <span class="field__optional">{t(locale, 'leaveEmptyNow')}</span>
                </label>
                <input
                  id="trans-when" class="field__input" type="date"
                  min="1900-01-01" max="2199-12-31" value={dateStr}
                  onFocus={() => loadEngine()}
                  onInput={(e) => setDateStr((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!ready || busy}>
            <span>{busy ? t(locale, 'checking') : t(locale, 'checkTransits')}</span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">{t(locale, 'privacyDevice')}</p>
          {charts.length === 0 && (
            <p class="field__help">
              {locale === 'es' ? 'Las cartas que ' : 'Charts you '}
              <a href={localizePath(locale, '/birth-chart/')}>{locale === 'es' ? 'calcules y guardes' : 'calculate and save'}</a>
              {locale === 'es' ? ' aparecerán aquí como opciones de un toque, para que la próxima revisión sea más rápida.' : ' appear here as one-tap choices, so the next check skips the typing.'}
            </p>
          )}
          {error && <p class="calc__error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        </div>
      </form>

      {result && (
        <div class="calc__result">
          <h2 class="sr-only" tabIndex={-1} ref={resultHeadingRef}>{t(locale, 'transits')}</h2>
          {!result.natal.timeKnown && (
            <p class="notice" role="status">
              {t(locale, 'noTransitTimeNotice')}
            </p>
          )}

          <p class="trans__when mono">{t(locale, 'skyAt')} {result.whenLabel}</p>
          <div class="trans__sky">
            {result.sky.map((b) => (
              <span class="trans__pos mono" key={b.body}>
                <PlanetGlyph body={b.body} size={13} class="pg-inline" /> {formatLongitude(b.lon, locale)}{b.retrograde ? ' ℞' : ''}
              </span>
            ))}
          </div>

          <p class="syn__tally mono">
            {result.hits.length === 0
              ? `${t(locale, 'noTransitsWithin')} ${TRANSIT_ORB}° ${t(locale, 'ofExact')}`
              : `${result.hits.length} ${result.hits.length === 1 ? t(locale, 'activeTransitWithin') : t(locale, 'activeTransitsWithin')} ${TRANSIT_ORB}° ${t(locale, 'ofExact')}`}
            {' '}· {t(locale, 'transitMoonOmitted')}
          </p>

          {result.hits.length === 0 && (
            <p class="trans__quiet">
              {t(locale, 'quietSky')}
            </p>
          )}

          <div class="syn__aspects">
            {result.hits.map((h) => (
              <div class="syn__aspect" key={`${h.a}-${h.b}-${h.type}`}>
                <span class="syn__aspect-receipt mono">
                  <PlanetGlyph body={h.a} size={13} class="pg-inline" /> {h.a} <AspectGlyph type={h.type} size={13} class="pg-inline" /> {h.type} natal <PlanetGlyph body={h.b} size={13} class="pg-inline" /> {h.b} · orb {h.orb.toFixed(1)}°
                  {h.type === 'conjunction' && h.a === h.b ? ` · a ${h.a} return` : ''}
                </span>
                <p class="syn__aspect-read">{transitLine(h.a, h.type, h.b)}</p>
              </div>
            ))}
          </div>

          <div class="trans__three">
            {result.natal.bodies
              .filter((b) => b.body === 'Sun' || b.body === 'Moon')
              .map((b) => (
                <span class="syn__placement" key={b.body}>
                  <span class="mono--label">{t(locale, 'natal')} {b.body}</span> <SignChip lon={b.lon} locale={locale} />
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
