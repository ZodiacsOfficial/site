/**
 * Moon phase, two ways: tonight's (lite math, instant, no ephemeris)
 * and the moon of any date — a birthday, usually — via the lazy-loaded
 * full engine for a precise longitude.
 */
import { useEffect, useState } from 'preact/hooks';
import PlaceSearch from './PlaceSearch';
import SignChip from './SignChip';
import {
  moonIllumination, moonLongitude, moonPhaseAngle, moonPhaseName,
} from '../lib/engine/lite';
import type { MoonPhaseName } from '../lib/engine/lite';
import { formatLongitude, signForLongitude } from '../lib/signs';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import type { City } from '../lib/geo/search';

let enginePromise: Promise<typeof import('../lib/engine/full')> | null = null;
const loadEngine = () => (enginePromise ??= import('../lib/engine/full'));

/**
 * The lit portion of the disc as one path: the limb on the bright side,
 * back along the terminator ellipse. Angle 0 = new, 180 = full.
 */
function PhaseDisc({ angle, size = 120 }: { angle: number; size?: number }) {
  const r = 44;
  const cosA = Math.cos((angle * Math.PI) / 180);
  const waxing = angle < 180;
  const rx = Math.max(0.5, Math.abs(cosA) * r);
  const limbSweep = waxing ? 1 : 0;
  const bowRight = waxing ? cosA > 0 : cosA < 0;
  const termSweep = bowRight ? 0 : 1;
  const lit = `M 50 ${50 - r} A ${r} ${r} 0 0 ${limbSweep} 50 ${50 + r} A ${rx} ${r} 0 0 ${termSweep} 50 ${50 - r} Z`;
  return (
    <svg class="mp__disc" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Moon, ${Math.round(moonIlluminationFromAngle(angle) * 100)}% illuminated`}>
      <circle cx="50" cy="50" r={r} fill="var(--void-2)" stroke="var(--hair-2)" stroke-width="1" />
      {angle > 2 && angle < 358 && <path d={lit} fill="var(--ink-1, #E8EAF0)" opacity="0.92" />}
    </svg>
  );
}

function moonIlluminationFromAngle(angle: number): number {
  return (1 - Math.cos((angle * Math.PI) / 180)) / 2;
}

interface Lookup {
  phase: MoonPhaseName;
  angle: number;
  illum: number;
  lon: number;
  /** Second sign when a date-only Moon crossed a boundary that day. */
  altLon: number | null;
  approximate: boolean;
}

export default function MoonPhaseTool() {
  const [now, setNow] = useState<Date | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [result, setResult] = useState<Lookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setNow(new Date()); }, []);

  async function lookup(e: Event) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    setError('');
    try {
      const engine = await loadEngine();
      const hasTime = time !== '';
      let utc: Date;
      let dayStart: Date;
      let dayEnd: Date;
      if (city) {
        utc = resolveLocalToUtc(date, hasTime ? time : '12:00', city.tz).utc;
        dayStart = resolveLocalToUtc(date, '00:00', city.tz).utc;
        dayEnd = resolveLocalToUtc(date, '23:59', city.tz).utc;
      } else {
        utc = new Date(`${date}T${hasTime ? time : '12:00'}:00Z`);
        dayStart = new Date(`${date}T00:00:00Z`);
        dayEnd = new Date(`${date}T23:59:00Z`);
      }
      const lon = engine.bodyLongitude('Moon', utc);
      const sunLon = engine.bodyLongitude('Sun', utc);
      const angle = (((lon - sunLon) % 360) + 360) % 360;

      let altLon: number | null = null;
      if (!hasTime) {
        const early = engine.bodyLongitude('Moon', dayStart);
        const late = engine.bodyLongitude('Moon', dayEnd);
        if (signForLongitude(early).slug !== signForLongitude(late).slug) {
          altLon = signForLongitude(lon).slug === signForLongitude(early).slug ? late : early;
        }
      }

      setResult({
        phase: moonPhaseName(utc),
        angle,
        illum: moonIlluminationFromAngle(angle),
        lon,
        altLon,
        approximate: !city || !hasTime,
      });
    } catch (err) {
      setError('Something went wrong computing that moon. Please try again.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="calc mp">
      {now && (
        <div class="mp__tonight shell">
          <div class="core mp__tonight-core">
            <PhaseDisc angle={moonPhaseAngle(now)} />
            <div class="mp__tonight-facts">
              <em class="kicker">Right now</em>
              <strong class="mp__phase">{moonPhaseName(now)}</strong>
              <span class="mono mp__meta">
                {Math.round(moonIllumination(now) * 100)}% illuminated · Moon in {signForLongitude(moonLongitude(now)).name}
              </span>
              <span class="mono mp__meta mp__meta--faint">
                {now.toISOString().replace('T', ' · ').slice(0, 18)} UTC
              </span>
            </div>
          </div>
        </div>
      )}

      <form class="calc__form shell" onSubmit={lookup}>
        <div class="core calc__core">
          <div class="calc__fields">
            <div class="field">
              <label class="field__label" for="mp-date">Date</label>
              <input
                id="mp-date" class="field__input" type="date" required
                min="1800-01-01" max="2199-12-31" value={date}
                onFocus={() => loadEngine()}
                onInput={(e) => setDate((e.target as HTMLInputElement).value)}
              />
              <p class="field__help">A birthday, an anniversary, any date at all.</p>
            </div>
            <div class="field">
              <label class="field__label" for="mp-time">Time <span class="field__optional">optional</span></label>
              <input
                id="mp-time" class="field__input" type="time" value={time}
                onInput={(e) => setTime((e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="field">
              <label class="field__label" for="mp-place">Place <span class="field__optional">optional</span></label>
              <PlaceSearch id="mp-place" selected={city} onSelect={setCity} />
              <p class="field__help">Sharpens the clock conversion; the phase barely needs it.</p>
            </div>
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!date || busy}>
            <span>{busy ? 'Computing…' : 'Find that moon'}</span>
            <span class="orb">↗</span>
          </button>
          {error && <p class="calc__error" role="alert">{error}</p>}
        </div>
      </form>

      {result && (
        <div class="calc__result">
          <div class="mp__lookup shell tinted" style={`--sign:${signForLongitude(result.lon).hue}`}>
            <div class="core tinted mp__tonight-core">
              <PhaseDisc angle={result.angle} />
              <div class="mp__tonight-facts">
                <strong class="mp__phase">{result.phase}</strong>
                <span class="mono mp__meta">{Math.round(result.illum * 100)}% illuminated</span>
                <span class="mp__signline">
                  Moon in <SignChip lon={result.lon} />
                  {result.altLon !== null && (
                    <> or <SignChip lon={result.altLon} /></>
                  )}
                </span>
                <span class="mono mp__meta mp__meta--faint">{formatLongitude(result.lon)}</span>
              </div>
            </div>
          </div>
          {result.altLon !== null && (
            <p class="notice">
              The Moon changed signs that day, and without a time we can’t say
              which side of the line you were born on. The phase is unaffected —
              it moves too slowly for hours to matter.
            </p>
          )}
          {result.approximate && result.altLon === null && (
            <p class="field__help">
              Read {city ? 'at midday local time' : 'at midday universal time'} —
              adding a time and place pins the degree exactly.
            </p>
          )}
          <div class="calc__actions">
            <a class="btn btn--ghost" href="/birth-chart/">
              <span>Get the whole chart for this date</span><span class="orb">↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
