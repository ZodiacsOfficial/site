import { useEffect, useRef, useState } from 'preact/hooks';
import { BirthFields } from './BirthFields';
import type { City } from '../lib/geo/search';
import { preloadIndex } from '../lib/geo/search';
import { useEngine } from '../lib/hooks/useEngine';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import { formatLongitude, signForLongitude, signName } from '../lib/signs';
import { bigThree } from '../lib/interpretations';
import { chartHandoffFragment } from '../lib/chart-handoff';
import type { Chart } from '../lib/engine/types';
import type { PreparedChartCard } from '../lib/share-card';

/**
 * Three fields, one answer: Sun, Moon, and Rising from the same client-side
 * engine as the full calculator, with a share image and a hand-off into the
 * whole chart. The ephemeris loads on demand (warmed when the time field is
 * focused) and never enters this route's static bundle; the share card and
 * its renderer load only after a chart exists. Nothing leaves the browser:
 * the hand-off travels in a URL fragment.
 */

type CardModule = typeof import('../lib/share-card');

interface Placement {
  kind: 'sun' | 'moon' | 'rising';
  title: string;
  lon: number;
}

const TITLES: Record<Placement['kind'], string> = { sun: 'Sun', moon: 'Moon', rising: 'Rising' };

function track(name: string, props: Record<string, string>): void {
  const analytics = (window as Window & {
    zodiacsAnalytics?: { track?: (name: string, props: Record<string, string>) => void };
  }).zodiacsAnalytics;
  analytics?.track?.(name, props);
}

export default function BigThreeQuick() {
  const loadEngine = useEngine();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [handoff, setHandoff] = useState('');
  const [card, setCard] = useState<{ module: CardModule; prepared: PreparedChartCard } | null>(null);
  const [cardState, setCardState] = useState<'idle' | 'preparing' | 'ready' | 'shared' | 'downloaded' | 'failed'>('idle');
  const resultRef = useRef<HTMLDivElement>(null);
  const generation = useRef(0);

  useEffect(() => { void preloadIndex(); }, []);

  async function compute(event: Event): Promise<void> {
    event.preventDefault();
    if (!date || !time || !city) {
      setError('Enter a birth date, a birth time, and a birthplace.');
      return;
    }
    const run = ++generation.current;
    setBusy(true);
    setError('');
    setCard(null);
    setCardState('idle');
    try {
      const resolution = resolveLocalToUtc(date, time, city.tz);
      const engine = await loadEngine();
      const chart: Chart = engine.computeChart({
        utc: resolution.utc,
        latitude: city.lat,
        longitude: city.lon,
        houseSystem: 'whole',
        timeKnown: true,
        flags: resolution.flags,
      });
      if (run !== generation.current) return;
      const sun = chart.bodies.find((body) => body.body === 'Sun');
      const moon = chart.bodies.find((body) => body.body === 'Moon');
      if (!sun || !moon || !chart.angles) throw new Error('incomplete chart');
      setPlacements([
        { kind: 'sun', title: TITLES.sun, lon: sun.lon },
        { kind: 'moon', title: TITLES.moon, lon: moon.lon },
        { kind: 'rising', title: TITLES.rising, lon: chart.angles.asc },
      ]);
      setHandoff(`/birth-chart/#${chartHandoffFragment({
        date,
        time,
        timeKnown: true,
        lat: city.lat,
        lon: city.lon,
        tz: city.tz,
        place: city.name,
        houseSystem: 'whole',
      })}`);
      track('chart_computed', { mode: 'rising', source: 'fresh' });
      track('result_rendered', { mode: 'rising' });
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

      // Render the card now so the share tap can reach navigator.share
      // synchronously from the gesture (iOS activation).
      setCardState('preparing');
      const module = await import('../lib/share-card');
      const prepared = await module.prepareBigThreeCard(
        { bodies: chart.bodies, angles: chart.angles, engineVersion: chart.engineVersion },
        'en',
      );
      if (run !== generation.current) return;
      setCard({ module, prepared });
      setCardState('ready');
    } catch (cause) {
      if (run !== generation.current) return;
      if (cause instanceof RangeError) setError('That date or time is not valid.');
      else setError('The chart could not be computed. Check the date, time, and place and try again.');
      setPlacements(null);
      setCardState('idle');
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }

  function share(): void {
    if (!card) return;
    track('chart_share', { variant: 'big_three_card' });
    void card.module.savePreparedChartCard(card.prepared).then((outcome) => {
      if (outcome === 'shared' || outcome === 'downloaded') {
        setCardState(outcome);
        track('share_card_downloaded', { variant: 'big_three_card' });
      }
    }).catch(() => setCardState('failed'));
  }

  return (
    <div class="big-three" id="big-three">
      <form class="big-three__form calc__form" onSubmit={compute} noValidate>
        <BirthFields
          locale="en"
          dateId="bt-date"
          timeId="bt-time"
          placeId="bt-place"
          date={date}
          time={time}
          timeKnown={true}
          city={city}
          onDateChange={setDate}
          onTimeChange={setTime}
          onTimeKnownChange={() => {}}
          onCityChange={setCity}
          onWarm={() => { void loadEngine(); }}
          showUnknownTime={false}
          requireKnownTime
          timeHelp="Rising needs the time; the Sun and Moon usually don't."
        />
        <div class="big-three__actions">
          <button type="submit" class="btn btn--primary" disabled={busy} data-big-three-submit>
            <span>{busy ? 'Computing…' : 'Show my Big Three'}</span>
            <span class="orb">→</span>
          </button>
          {error && <p class="field__error big-three__error" role="alert">{error}</p>}
        </div>
      </form>

      {placements && (
        <div class="big-three__result" ref={resultRef} data-big-three-result>
          <div class="calc__three calc__three--3">
            {placements.map(({ kind, title, lon }) => {
              const s = signForLongitude(lon);
              return (
                <div class="three-card shell tinted" style={`--sign:${s.hue}`} key={kind}>
                  <div class="core tinted three-card__core">
                    <span class="mono--label">{title}</span>
                    <span class="three-card__sign">
                      <picture class="three-card__icon">
                        <source srcset={`/assets/zodiac-icons/128/${s.slug}.avif`} type="image/avif" />
                        <img src={`/assets/zodiac-icons/128/${s.slug}.webp`} width="44" height="44" alt="" decoding="async" />
                      </picture>
                      {signName(s, 'en')}
                    </span>
                    <span class="mono three-card__deg">{formatLongitude(lon, 'en')}</span>
                    <p class="three-card__read">{bigThree(kind, s.slug)}</p>
                    <a class="three-card__more" href={`/${s.slug}/`}>Read {signName(s, 'en')} →</a>
                  </div>
                </div>
              );
            })}
          </div>

          <div class="big-three__next">
            <a class="btn btn--primary" href={handoff} data-big-three-full>
              <span>See the whole chart</span>
              <span class="orb">↗</span>
            </a>
            <button
              type="button"
              class="btn btn--glass"
              onClick={share}
              disabled={cardState !== 'ready' && cardState !== 'shared' && cardState !== 'downloaded'}
              data-big-three-share
            >
              <span>
                {cardState === 'preparing' ? 'Preparing your card…'
                  : cardState === 'shared' ? 'Shared'
                    : cardState === 'downloaded' ? 'Saved'
                      : cardState === 'failed' ? 'Card unavailable'
                        : 'Share your Big Three'}
              </span>
              <span class="orb">↑</span>
            </button>
          </div>
          <p class="big-three__note">
            The full chart adds every planet, the houses, and the aspects between them. Your birth details travel in the
            link's fragment, so they stay in this browser.
          </p>
        </div>
      )}
    </div>
  );
}
