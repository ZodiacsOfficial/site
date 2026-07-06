/**
 * The current sky against a natal chart. The natal side flows from a
 * saved summary without loading the ephemeris; the transiting side is
 * live math, so the engine lazy-loads on every run — the same idiom as
 * the chart calculator.
 */
import { useEffect, useState } from 'preact/hooks';
import PlaceSearch from './PlaceSearch';
import SignChip from './SignChip';
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

const GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

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

export default function TransitTracker() {
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
        .filter((b) => b.body in GLYPHS)
        .map(({ body, lon, retrograde }) => ({ body, lon, retrograde }));
      // The Moon crosses the whole chart every month — the list would be
      // all Moon. It stays in the sky strip; the aspects leave it out.
      const transiting: MinimalBody[] = sky
        .filter((b) => b.body !== 'Moon')
        .map(({ body, lon }) => ({ body, lon }));
      const hits = findInterAspects(transiting, natal.bodies).filter((h) => h.orb <= TRANSIT_ORB);
      setResult({ whenLabel, sky, natal, hits });
    } catch (err) {
      setError('Something went wrong computing the transits. Please try again.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={check}>
        <div class="core calc__core">
          <div class="trans__grid">
            <div class="trans__side">
              <span class="mono--label">Your chart</span>

              {charts.length > 0 && (
                <div class="field">
                  <label class="field__label" for="trans-source">Chart</label>
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
                    <option value="">Enter birth details…</option>
                    {charts.map((c) => <option value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {slot.source === 'form' && (
                <>
                  <div class="field">
                    <label class="field__label" for="trans-date">Birth date</label>
                    <input
                      id="trans-date" class="field__input" type="date" required
                      min="1800-01-01" max="2199-12-31" value={slot.date}
                      onInput={(e) => { const v = (e.target as HTMLInputElement).value; setSlot((s) => ({ ...s, date: v })); }}
                    />
                  </div>
                  <div class="field">
                    <div class="field__labelrow">
                      <label class="field__label" for="trans-time">Birth time</label>
                      <label class="field__toggle">
                        <input
                          type="checkbox" checked={!slot.timeKnown}
                          onChange={(e) => { const v = !(e.target as HTMLInputElement).checked; setSlot((s) => ({ ...s, timeKnown: v })); }}
                        />
                        Not known
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
                    <label class="field__label" for="trans-place">Birthplace</label>
                    <PlaceSearch id="trans-place" selected={slot.city} onSelect={(c) => setSlot((s) => ({ ...s, city: c }))} />
                  </div>
                </>
              )}
            </div>

            <div class="trans__side">
              <span class="mono--label">The sky</span>
              <div class="field">
                <label class="field__label" for="trans-when">
                  Date <span class="field__optional">leave empty for right now</span>
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
            <span>{busy ? 'Checking…' : 'Check my transits'}</span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">Computed on your device — birth data never leaves it.</p>
          {charts.length === 0 && (
            <p class="field__help">
              Charts you <a href="/birth-chart/">calculate and save</a> appear here as
              one-tap choices, so the next check skips the typing.
            </p>
          )}
          {error && <p class="calc__error" role="alert">{error}</p>}
        </div>
      </form>

      {result && (
        <div class="calc__result">
          {!result.natal.timeKnown && (
            <p class="notice" role="status">
              No birth time on this chart, so its Moon is a midday estimate —
              it can sit up to six degrees off, and a transit to the Moon near
              the edge of its orb may come or go with the real time.
            </p>
          )}

          <p class="trans__when mono">Sky at {result.whenLabel}</p>
          <div class="trans__sky">
            {result.sky.map((b) => (
              <span class="trans__pos mono" key={b.body}>
                {GLYPHS[b.body]} {formatLongitude(b.lon)}{b.retrograde ? ' ℞' : ''}
              </span>
            ))}
          </div>

          <p class="syn__tally mono">
            {result.hits.length === 0
              ? `No transits within ${TRANSIT_ORB}° of exact`
              : `${result.hits.length} active ${result.hits.length === 1 ? 'transit' : 'transits'} within ${TRANSIT_ORB}° of exact`}
            {' '}· transiting Moon left out — it crosses the whole chart every month
          </p>

          {result.hits.length === 0 && (
            <p class="trans__quiet">
              A quiet sky by the tight orb this page uses. Nothing pressing —
              check back in a few days, or widen your reading to the month's
              events below.
            </p>
          )}

          <div class="syn__aspects">
            {result.hits.map((h) => (
              <div class="syn__aspect" key={`${h.a}-${h.b}-${h.type}`}>
                <span class="syn__aspect-receipt mono">
                  {GLYPHS[h.a]} {h.a} {h.type} natal {GLYPHS[h.b]} {h.b} · orb {h.orb.toFixed(1)}°
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
                  <span class="mono--label">Natal {b.body}</span> <SignChip lon={b.lon} />
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
