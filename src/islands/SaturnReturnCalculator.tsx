/**
 * Saturn return calculator: birth date in, return seasons out. The
 * engine and the return-scanner lazy-load together on submit; a date
 * alone is enough — time and place refine dates by days, never years.
 */
import { useState } from 'preact/hooks';
import PlaceSearch from './PlaceSearch';
import SignChip from './SignChip';
import { SATURN_RETURN } from '../lib/interpretations';
import { formatLongitude, signForLongitude } from '../lib/signs';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import type { City } from '../lib/geo/search';
import type { ReturnSeason, SaturnReturnResult } from '../lib/engine/returns';

let modsPromise: Promise<typeof import('../lib/engine/returns')> | null = null;
const loadReturns = () => (modsPromise ??= import('../lib/engine/returns'));

const ORDINAL = ['First', 'Second', 'Third', 'Fourth'];
const AGE_HINT = ['around age 29', 'around age 58', 'around age 88', ''];

const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function seasonStatus(season: ReturnSeason, now: Date): 'past' | 'active' | 'upcoming' {
  if (season.last.getTime() < now.getTime()) return 'past';
  if (season.first.getTime() > now.getTime()) return 'upcoming';
  return 'active';
}

const STATUS_LABEL = { past: 'Complete', active: 'Underway now', upcoming: 'Ahead of you' } as const;

export default function SaturnReturnCalculator() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [result, setResult] = useState<SaturnReturnResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const approximate = !showDetail || time === '' || city === null;

  async function compute(e: Event) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    setError('');
    try {
      const returns = await loadReturns();
      const utc = showDetail && city
        ? resolveLocalToUtc(date, time || '12:00', city.tz).utc
        : new Date(`${date}T12:00:00Z`);
      setResult(returns.saturnReturns(utc));
    } catch (err) {
      setError('Something went wrong computing the return. Please try again.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const now = new Date();
  const natalSign = result ? signForLongitude(result.natalLon) : null;

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={compute}>
        <div class="core calc__core">
          <div class="calc__fields">
            <div class="field">
              <label class="field__label" for="sr-date">Birth date</label>
              <input
                id="sr-date" class="field__input" type="date" required
                min="1800-01-01" max="2199-12-31" value={date}
                onFocus={() => loadReturns()}
                onInput={(e) => setDate((e.target as HTMLInputElement).value)}
              />
              <p class="field__help">
                The date alone pins your return years. Time and place sharpen
                the dates by a few days, never the year.
              </p>
            </div>
          </div>

          {!showDetail ? (
            <button class="sr__more" type="button" onClick={() => setShowDetail(true)}>
              Add birth time and place (optional)
            </button>
          ) : (
            <div class="calc__fields">
              <div class="field">
                <label class="field__label" for="sr-time">Birth time</label>
                <input
                  id="sr-time" class="field__input" type="time" value={time}
                  onInput={(e) => setTime((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="field">
                <label class="field__label" for="sr-place">Birthplace</label>
                <PlaceSearch id="sr-place" selected={city} onSelect={setCity} />
              </div>
            </div>
          )}

          <button class="btn btn--primary calc__submit" type="submit" disabled={!date || busy}>
            <span>{busy ? 'Computing…' : 'Find my Saturn return'}</span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">Computed on your device — your birth data never leaves it.</p>
          {error && <p class="calc__error" role="alert">{error}</p>}
        </div>
      </form>

      {result && natalSign && (
        <div class="calc__result">
          <div class="sr__natal shell tinted" style={`--sign:${natalSign.hue}`}>
            <div class="core tinted sr__natal-core">
              <span class="mono--label">Your natal Saturn</span>
              <span class="sr__natal-sign">
                <SignChip lon={result.natalLon} />
                <span class="mono sr__natal-deg">
                  {formatLongitude(result.natalLon)}{result.natalRetrograde ? ' · Rx' : ''}
                </span>
              </span>
              <p class="sr__reading">{SATURN_RETURN[natalSign.slug]}</p>
            </div>
          </div>

          {approximate && (
            <p class="field__help">
              Dates computed from a noon reading — with a birth time and place
              they can shift by a few days either way.
            </p>
          )}

          <div class="sr__seasons">
            {result.seasons.map((season, i) => {
              const status = seasonStatus(season, now);
              return (
                <div class={`sr__season shell ${status === 'active' ? 'tinted' : ''}`} style={status === 'active' ? `--sign:${natalSign.hue}` : ''}>
                  <div class={`core sr__season-core ${status === 'active' ? 'tinted' : ''}`}>
                    <div class="sr__season-head">
                      <strong>{ORDINAL[i] ?? `${i + 1}th`} return</strong>
                      <span class="mono sr__season-status">{STATUS_LABEL[status]}</span>
                    </div>
                    <p class="sr__season-span mono">
                      {fmt(season.first)}
                      {season.crossings.length > 1 ? ` – ${fmt(season.last)}` : ''}
                      {AGE_HINT[i] ? ` · ${AGE_HINT[i]}` : ''}
                    </p>
                    <ul class="sr__crossings">
                      {season.crossings.map((c) => (
                        <li class="mono">
                          {fmt(c.at)}{c.retrograde ? ' · retrograde pass' : ''}
                        </li>
                      ))}
                    </ul>
                    {season.crossings.length === 3 && (
                      <p class="sr__season-note">
                        Three exact passes: Saturn crosses your degree, backs
                        over it in retrograde, then seals it on the way out.
                        The whole span is the return.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div class="calc__actions">
            <a class="btn btn--ghost" href="/birth-chart/">
              <span>See Saturn in your birth chart</span><span class="orb">↗</span>
            </a>
            <a class="btn btn--ghost" href="/learn/planets/saturn/">
              <span>What Saturn means</span><span class="orb">→</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
