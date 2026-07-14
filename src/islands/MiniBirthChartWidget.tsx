import { useEffect, useRef, useState } from 'preact/hooks';
import type { City } from '../lib/geo/search';
import { preloadIndex, searchCities } from '../lib/geo/search';
import { SIGNS, signForLongitude, type Sign } from '../lib/signs';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import { WIDGET_EN, widgetSignName } from '../strings/widgets';

interface Placement {
  label: string;
  sign: Sign;
  degree: number;
}

function withinSign(longitude: number): number {
  return ((longitude % 30) + 30) % 30;
}

export default function MiniBirthChartWidget() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [places, setPlaces] = useState<City[]>([]);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placeError, setPlaceError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placements, setPlacements] = useState<Placement[]>([]);
  const timer = useRef<number>();
  const request = useRef(0);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    request.current += 1;
  }, []);

  function updatePlaceQuery(value: string) {
    const token = ++request.current;
    window.clearTimeout(timer.current);
    setQuery(value);
    setCity(null);
    setPlaces([]);
    setPlaceOpen(false);
    setPlaceError(false);
    if (value.trim().length < 2) return;

    timer.current = window.setTimeout(async () => {
      try {
        const matches = await searchCities(value);
        if (token !== request.current) return;
        setPlaces(matches);
        setPlaceOpen(true);
      } catch {
        if (token !== request.current) return;
        setPlaceError(true);
      }
    }, 120);
  }

  function choosePlace(next: City) {
    request.current += 1;
    window.clearTimeout(timer.current);
    setCity(next);
    setQuery('');
    setPlaces([]);
    setPlaceOpen(false);
    setPlaceError(false);
  }

  async function compute(event: Event) {
    event.preventDefault();
    if (!date || !time || !city) {
      setError(WIDGET_EN.widgetError);
      return;
    }

    setBusy(true);
    setError('');
    try {
      const resolution = resolveLocalToUtc(date, time, city.tz);
      const { computeChart } = await import('../lib/engine/full');
      const chart = computeChart({
        utc: resolution.utc,
        latitude: city.lat,
        longitude: city.lon,
        houseSystem: 'whole',
        timeKnown: true,
        flags: resolution.flags,
      });
      const sun = chart.bodies.find((body) => body.body === 'Sun');
      const moon = chart.bodies.find((body) => body.body === 'Moon');
      if (!sun || !moon || !chart.angles) throw new Error('incomplete chart');
      setPlacements([
        { label: WIDGET_EN.sun, sign: signForLongitude(sun.lon), degree: withinSign(sun.lon) },
        { label: WIDGET_EN.moon, sign: signForLongitude(moon.lon), degree: withinSign(moon.lon) },
        { label: WIDGET_EN.rising, sign: signForLongitude(chart.angles.asc), degree: withinSign(chart.angles.asc) },
      ]);
    } catch {
      setError(WIDGET_EN.chartError);
      setPlacements([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="mini-chart" id="widget">
      <header class="mini-chart__header">
        <strong>{WIDGET_EN.chartTitle}</strong>
        <span>{WIDGET_EN.chartIntro}</span>
        <div class="mini-chart__brand-rail" aria-hidden="true">
          {SIGNS.map((sign) => (
            <img key={sign.slug} src={`/assets/zodiac-icons/48/${sign.slug}.webp`} alt="" width="18" height="18" decoding="async" />
          ))}
        </div>
      </header>

      <form action="#widget" onSubmit={compute} class="mini-chart__form">
        <label class="mini-chart__field">
          <span>{WIDGET_EN.dateLabel}</span>
          <input type="date" min="1800-01-01" max="2199-12-31" required value={date} onInput={(event) => setDate((event.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="mini-chart__field">
          <span>{WIDGET_EN.timeLabel}</span>
          <input type="time" required value={time} onInput={(event) => setTime((event.currentTarget as HTMLInputElement).value)} />
        </label>
        <div class="mini-chart__field mini-chart__place">
          <label for="mini-chart-place">{WIDGET_EN.placeLabel}</label>
          {city ? (
            <div class="mini-chart__chosen">
              <span>{city.name} · {[city.admin1, city.country].filter(Boolean).join(', ')}</span>
              <button type="button" onClick={() => setCity(null)}>{WIDGET_EN.changePlace}</button>
            </div>
          ) : (
            <>
              <input
                id="mini-chart-place"
                type="text"
                role="combobox"
                aria-expanded={placeOpen}
                aria-controls="mini-chart-places"
                autoComplete="off"
                placeholder={WIDGET_EN.placePlaceholder}
                value={query}
                onFocus={() => { preloadIndex().catch(() => setPlaceError(true)); }}
                onInput={(event) => updatePlaceQuery((event.currentTarget as HTMLInputElement).value)}
              />
              {placeOpen && (
                <ul id="mini-chart-places" role="listbox" class="mini-chart__places">
                  {places.length > 0 ? places.map((place) => (
                    <li key={`${place.name}-${place.lat}-${place.lon}`} role="none">
                      <button type="button" role="option" onClick={() => choosePlace(place)}>
                        <b>{place.name}</b>
                        <span>{[place.admin1, place.country].filter(Boolean).join(', ')}</span>
                      </button>
                    </li>
                  )) : <li class="mini-chart__empty">{WIDGET_EN.noPlaces}</li>}
                </ul>
              )}
              {placeError && <small role="alert">{WIDGET_EN.placeError}</small>}
            </>
          )}
        </div>
        <button class="mini-chart__submit" type="submit" disabled={busy}>
          {busy ? WIDGET_EN.computing : WIDGET_EN.computeAction}
        </button>
      </form>

      {error && <p class="mini-chart__error" role="alert">{error}</p>}
      {placements.length === 3 && (
        <section class="mini-chart__result" aria-live="polite">
          {placements.map((placement) => (
            <article key={placement.label}>
              <img src={`/assets/zodiac-icons/48/${placement.sign.slug}.webp`} alt="" width="42" height="42" decoding="async" />
              <div>
                <small>{placement.label}</small>
                <strong>{widgetSignName(placement.sign.slug)}</strong>
                <span>{placement.degree.toFixed(1)}°</span>
              </div>
            </article>
          ))}
        </section>
      )}
      <p class="mini-chart__privacy">{WIDGET_EN.chartPrivacy}</p>
      <noscript><p class="mini-chart__error">{WIDGET_EN.requiresJavaScript}</p></noscript>
    </div>
  );
}
