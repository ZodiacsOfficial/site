/**
 * Moon phase, two ways: tonight's (lite math, instant, no ephemeris)
 * and the moon of any date — a birthday, usually — via the lazy-loaded
 * full engine for a precise longitude.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import PlaceSearch from './PlaceSearch';
import SignChip from './SignChip';
import {
  moonIllumination, moonLongitude, moonPhaseAngle, moonPhaseName,
} from '../lib/engine/lite';
import type { MoonPhaseName } from '../lib/engine/lite';
import { formatLongitude, signForLongitude, signName } from '../lib/signs';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import type { City } from '../lib/geo/search';
import { localizePath, normalizeLocale, t, tf, type Locale } from '../lib/i18n';
import { formatDateTime } from '../lib/i18n/dates';
import { moonPhaseLabel } from '../lib/i18n/astrology';
import { useEngine } from '../lib/hooks/useEngine';

/**
 * The lit portion of the disc as one path: the limb on the bright side,
 * back along the terminator ellipse. Angle 0 = new, 180 = full.
 */
function PhaseDisc({
  angle, locale, size = 120, ariaHidden = false,
}: { angle: number; locale: Locale; size?: number; ariaHidden?: boolean }) {
  const r = 44;
  const cosA = Math.cos((angle * Math.PI) / 180);
  const waxing = angle < 180;
  const rx = Math.max(0.5, Math.abs(cosA) * r);
  const limbSweep = waxing ? 1 : 0;
  const bowRight = waxing ? cosA > 0 : cosA < 0;
  const termSweep = bowRight ? 0 : 1;
  const lit = `M 50 ${50 - r} A ${r} ${r} 0 0 ${limbSweep} 50 ${50 + r} A ${rx} ${r} 0 0 ${termSweep} 50 ${50 - r} Z`;
  return (
    <svg
      class="mp__disc" viewBox="0 0 100 100" width={size} height={size}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden ? 'true' : undefined}
      aria-label={ariaHidden ? undefined : tf(locale, 'moonDiscAria', {
        percent: Math.round(moonIlluminationFromAngle(angle) * 100),
      })}
    >
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
  /** Honesty caption for the clock assumptions used, '' when exact. */
  caption: string;
}

export default function MoonPhaseTool({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const loadEngine = useEngine();
  const [now, setNow] = useState<Date | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [result, setResult] = useState<Lookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusAfterComputeRef = useRef(false);

  useEffect(() => { setNow(new Date()); }, []);

  async function lookup(e: Event) {
    e.preventDefault();
    if (!date) return;
    focusAfterComputeRef.current = true;
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

      const caption = city && hasTime
        ? ''
        : city
          ? t(locale, 'middayLocalCaption')
          : hasTime
            ? t(locale, 'utcTimeCaption')
            : t(locale, 'middayUtcCaption');

      setResult({
        phase: moonPhaseName(utc),
        angle,
        illum: moonIlluminationFromAngle(angle),
        lon,
        altLon,
        caption,
      });
    } catch (err) {
      setError(t(locale, 'moonError'));
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
    <div class="calc mp">
      {/* Same shell before hydration so the page doesn't jump. */}
      <div class="mp__tonight shell">
        <div class="core mp__tonight-core">
          <PhaseDisc angle={now ? moonPhaseAngle(now) : 0} locale={locale} ariaHidden={now === null} />
          <div class="mp__tonight-facts">
            <em class="kicker">{t(locale, 'rightNow')}</em>
            <strong class="mp__phase">{now ? moonPhaseLabel(locale, moonPhaseName(now)) : t(locale, 'moonReadingSky')}</strong>
            <span class="mono mp__meta">
              {now
                ? `${Math.round(moonIllumination(now) * 100)}% ${t(locale, 'illuminated')} · ${t(locale, 'moonIn')} ${signName(signForLongitude(moonLongitude(now)), locale)}`
                : '—'}
            </span>
            <span class="mono mp__meta mp__meta--faint">
              {now ? `${formatDateTime(locale, now, {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                timeZone: 'UTC', hour12: false,
              })} UTC` : ' '}
            </span>
          </div>
        </div>
      </div>

      <form class="calc__form shell" onSubmit={lookup} aria-busy={busy}>
        <div class="core calc__core">
          <div class="calc__fields">
            <div class="field">
              <label class="field__label" for="mp-date">{t(locale, 'date')}</label>
              <input
                id="mp-date" class="field__input" type="date" required
                min="1800-01-01" max="2199-12-31" value={date}
                onFocus={() => loadEngine()}
                onInput={(e) => setDate((e.target as HTMLInputElement).value)}
              />
              <p class="field__help">{t(locale, 'dateHelp')}</p>
            </div>
            <div class="field">
              <label class="field__label" for="mp-time">{t(locale, 'time')} <span class="field__optional">{t(locale, 'optional')}</span></label>
              <input
                id="mp-time" class="field__input" type="time" value={time}
                onInput={(e) => setTime((e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="field">
              <label class="field__label" for="mp-place">{t(locale, 'place')} <span class="field__optional">{t(locale, 'optional')}</span></label>
              <PlaceSearch id="mp-place" selected={city} onSelect={setCity} locale={locale} />
              <p class="field__help">{t(locale, 'placeHelpMoon')}</p>
            </div>
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!date || busy}>
            <span>{busy ? t(locale, 'computing') : t(locale, 'findThatMoon')}</span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">{t(locale, 'privacyDevice')}</p>
          {error && <p class="calc__error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        </div>
      </form>

      {result && (
        <div class="calc__result">
          <h2 class="sr-only" tabIndex={-1} ref={resultHeadingRef}>{t(locale, 'moonPhase')}</h2>
          <div class="mp__lookup shell tinted" style={`--sign:${signForLongitude(result.lon).hue}`}>
            <div class="core tinted mp__tonight-core">
              <PhaseDisc angle={result.angle} locale={locale} />
              <div class="mp__tonight-facts">
                <strong class="mp__phase">{moonPhaseLabel(locale, result.phase)}</strong>
                <span class="mono mp__meta">{Math.round(result.illum * 100)}% {t(locale, 'illuminated')}</span>
                <span class="mp__signline">
                  {t(locale, 'moonIn')} <SignChip lon={result.lon} locale={locale} />
                  {result.altLon !== null && (
                    <> {t(locale, 'or')} <SignChip lon={result.altLon} locale={locale} /></>
                  )}
                </span>
                <span class="mono mp__meta mp__meta--faint">{formatLongitude(result.lon, locale)}</span>
              </div>
            </div>
          </div>
          {result.altLon !== null && (
            <p class="notice" role="status">
              {t(locale, 'moonChangedNotice')}
            </p>
          )}
          {result.caption !== '' && result.altLon === null && (
            <p class="field__help">{result.caption}</p>
          )}
          <div class="calc__actions">
            <a class="btn btn--ghost" href={localizePath(locale, '/birth-chart/')}>
              <span>{t(locale, 'birthChartForDate')}</span><span class="orb">↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
