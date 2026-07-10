/**
 * Saturn return calculator: birth date in, return seasons out. The
 * engine and the return-scanner lazy-load together on submit; a date
 * alone is enough — time and place refine dates by days, never years.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import PlaceSearch from './PlaceSearch';
import SignChip from './SignChip';
import { SATURN_RETURN } from '../lib/interpretations';
import { formatLongitude, signForLongitude } from '../lib/signs';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import type { City } from '../lib/geo/search';
import type { ReturnSeason, SaturnReturnResult } from '../lib/engine/returns';
import { localizePath, normalizeLocale, t, tf, type Locale } from '../lib/i18n';
import { formatShortDate } from '../lib/i18n/dates';

let modsPromise: Promise<typeof import('../lib/engine/returns')> | null = null;
const loadReturns = () => (modsPromise ??= import('../lib/engine/returns'));

function seasonStatus(season: ReturnSeason, now: Date): 'past' | 'active' | 'upcoming' {
  if (season.last.getTime() < now.getTime()) return 'past';
  if (season.first.getTime() > now.getTime()) return 'upcoming';
  return 'active';
}

export default function SaturnReturnCalculator({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const ordinal = [t(locale, 'first'), t(locale, 'second'), t(locale, 'third'), t(locale, 'fourth')];
  const ageHint = [t(locale, 'aroundAge29'), t(locale, 'aroundAge58'), t(locale, 'aroundAge88'), ''];
  const statusLabel = { past: t(locale, 'complete'), active: t(locale, 'underwayNow'), upcoming: t(locale, 'aheadOfYou') } as const;
  const fmt = (d: Date) => formatShortDate(locale, d);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [result, setResult] = useState<SaturnReturnResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusAfterComputeRef = useRef(false);

  const approximate = !showDetail || time === '' || city === null;

  async function compute(e: Event) {
    e.preventDefault();
    if (!date) return;
    focusAfterComputeRef.current = true;
    setBusy(true);
    setError('');
    try {
      const returns = await loadReturns();
      const utc = showDetail && city
        ? resolveLocalToUtc(date, time || '12:00', city.tz).utc
        : new Date(`${date}T12:00:00Z`);
      setResult(returns.saturnReturns(utc));
    } catch (err) {
      setError(t(locale, 'returnError'));
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

  const now = new Date();
  const natalSign = result ? signForLongitude(result.natalLon) : null;

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={compute} aria-busy={busy}>
        <div class="core calc__core">
          <div class="calc__fields">
            <div class="field">
              <label class="field__label" for="sr-date">{t(locale, 'birthDate')}</label>
              <input
                id="sr-date" class="field__input" type="date" required
                min="1800-01-01" max="2199-12-31" value={date}
                onFocus={() => loadReturns()}
                onInput={(e) => setDate((e.target as HTMLInputElement).value)}
              />
              <p class="field__help">
                {t(locale, 'saturnDateHelp')}
              </p>
            </div>
          </div>

          {!showDetail ? (
            <button class="sr__more" type="button" onClick={() => setShowDetail(true)}>
              {t(locale, 'addBirthDetails')}
            </button>
          ) : (
            <div class="calc__fields">
              <div class="field">
                <label class="field__label" for="sr-time">{t(locale, 'birthTime')}</label>
                <input
                  id="sr-time" class="field__input" type="time" value={time}
                  onInput={(e) => setTime((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="field">
                <label class="field__label" for="sr-place">{t(locale, 'birthplace')}</label>
                <PlaceSearch id="sr-place" selected={city} onSelect={setCity} locale={locale} />
              </div>
            </div>
          )}

          <button class="btn btn--primary calc__submit" type="submit" disabled={!date || busy}>
            <span>{busy ? t(locale, 'computing') : t(locale, 'findSaturnReturn')}</span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">{t(locale, 'privacyDevice')}</p>
          {error && <p class="calc__error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        </div>
      </form>

      {result && natalSign && (
        <div class="calc__result">
          <h2 class="sr-only" tabIndex={-1} ref={resultHeadingRef}>{t(locale, 'saturnReturn')}</h2>
          <div class="sr__natal shell tinted" style={`--sign:${natalSign.hue}`}>
            <div class="core tinted sr__natal-core">
              <span class="mono--label">{t(locale, 'natalSaturn')}</span>
              <span class="sr__natal-sign">
                <SignChip lon={result.natalLon} locale={locale} />
                <span class="mono sr__natal-deg">
                  {formatLongitude(result.natalLon, locale)}{result.natalRetrograde ? ' · Rx' : ''}
                </span>
              </span>
              <p class="sr__reading">{SATURN_RETURN[natalSign.slug]}</p>
            </div>
          </div>

          {approximate && (
            <p class="field__help">
              {t(locale, 'returnApprox')}
            </p>
          )}

          <div class="sr__seasons">
            {result.seasons.map((season, i) => {
              const status = seasonStatus(season, now);
              return (
                <div key={season.first.toISOString()} class={`sr__season shell ${status === 'active' ? 'tinted' : ''}`} style={status === 'active' ? `--sign:${natalSign.hue}` : ''}>
                  <div class={`core sr__season-core ${status === 'active' ? 'tinted' : ''}`}>
                    <div class="sr__season-head">
                      <strong>{tf(locale, 'saturnReturnHeading', { ordinal: ordinal[i] ?? String(i + 1) })}</strong>
                      <span class="mono sr__season-status">{statusLabel[status]}</span>
                    </div>
                    <p class="sr__season-span mono">
                      {fmt(season.first)}
                      {season.crossings.length > 1 ? ` – ${fmt(season.last)}` : ''}
                      {ageHint[i] ? ` · ${ageHint[i]}` : ''}
                    </p>
                    <ul class="sr__crossings">
                      {season.crossings.map((c) => (
                        <li class="mono" key={`${c.at.toISOString()}-${c.retrograde ? 'rx' : 'direct'}`}>
                          {fmt(c.at)}{c.retrograde ? ` · ${t(locale, 'retrogradePass')}` : ''}
                        </li>
                      ))}
                    </ul>
                    {season.crossings.length === 3 && (
                      <p class="sr__season-note">
                        {t(locale, 'threePasses')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div class="calc__actions">
            <a class="btn btn--ghost" href={localizePath(locale, '/birth-chart/')}>
              <span>{t(locale, 'seeSaturnChart')}</span><span class="orb">↗</span>
            </a>
            <a class="btn btn--ghost" href="/learn/planets/saturn/">
              <span>{t(locale, 'whatSaturnMeans')}</span><span class="orb">→</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
