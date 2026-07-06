/**
 * The calculator island — birth data in, chart out, entirely on-device.
 * The ephemeris (engine/full) is lazy-loaded so the form is interactive
 * immediately; a prefetch warms it on first focus.
 *
 * mode:
 *   'full'   — the flagship: big three, wheel, placements, aspects
 *   'moon'   — moon-focused result view (same engine)
 *   'rising' — rising-focused result view (time required)
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import PlaceSearch from './PlaceSearch';
import SignChip from './SignChip';
import Wheel from '../lib/wheel/Wheel';
import { formatLongitude, signForLongitude } from '../lib/signs';
import { bigThree } from '../lib/interpretations';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import { houseOf } from '../lib/engine/houses';
import { moonPhaseName } from '../lib/engine/lite';
import { saveChart } from '../lib/profile/store';
import { decodeChartLink, encodeChartLink } from '../lib/share';
import type { ShareChartInput } from '../lib/share';
import { ENGINE_VERSION } from '../lib/engine/types';
import type { Chart, HouseSystem } from '../lib/engine/types';
import type { City } from '../lib/geo/search';

type Mode = 'full' | 'moon' | 'rising';

interface Props { mode: Mode }

const GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋',
};

let enginePromise: Promise<typeof import('../lib/engine/full')> | null = null;
const loadEngine = () => (enginePromise ??= import('../lib/engine/full'));

export default function ChartCalculator({ mode }: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeKnown, setTimeKnown] = useState(true);
  const [city, setCity] = useState<City | null>(null);
  const [houseSystem, setHouseSystem] = useState<HouseSystem>('whole');
  const [chart, setChart] = useState<Chart | null>(null);
  const [moonAmbiguous, setMoonAmbiguous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<'idle' | 'saved' | 'full' | 'error'>('idle');
  const [shareInput, setShareInput] = useState<ShareChartInput | null>(null);
  const [share, setShare] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [card, setCard] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');
  const [fromLink, setFromLink] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Warm the ephemeris while the visitor types.
  useEffect(() => {
    const warm = () => { loadEngine(); };
    const idle = (window as any).requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 2500));
    idle(warm);
  }, []);

  // A shared chart arrives in the fragment (#c=…) — parse, prefill,
  // compute, then strip the token from the bar so screenshots and
  // copied URLs don't carry someone's birth data further than intended.
  useEffect(() => {
    if (mode !== 'full') return;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('c');
    if (!token) return;
    const decoded = decodeChartLink(token);
    if (!decoded) return;
    const linkCity: City = {
      name: decoded.place ?? 'Shared birthplace', admin1: '', country: '',
      lat: decoded.lat, lon: decoded.lon, tz: decoded.tz, pop: 0,
    };
    setDate(decoded.date);
    setTime(decoded.time ?? '');
    setTimeKnown(decoded.timeKnown);
    setCity(linkCity);
    setHouseSystem(decoded.houseSystem);
    setFromLink(true);
    history.replaceState(null, '', window.location.pathname + window.location.search);
    runChart({
      date: decoded.date, time: decoded.time ?? '', timeKnown: decoded.timeKnown,
      city: linkCity, houseSystem: decoded.houseSystem,
    });
  }, []);

  const canCompute = date !== '' && city !== null && (!timeKnown || time !== '')
    && !(mode === 'rising' && !timeKnown);

  interface RunInput {
    date: string; time: string; timeKnown: boolean; city: City; houseSystem: HouseSystem;
  }

  async function runChart(input: RunInput) {
    setBusy(true);
    setError('');
    setSaved('idle');
    setShare('idle');
    setCard('idle');
    setMoonAmbiguous(false);
    try {
      const engine = await loadEngine();
      const effectiveTime = input.timeKnown ? input.time : '12:00';
      const resolved = resolveLocalToUtc(input.date, effectiveTime, input.city.tz);
      const result = engine.computeChart({
        utc: resolved.utc,
        latitude: input.city.lat,
        longitude: input.city.lon,
        houseSystem: input.houseSystem,
        timeKnown: input.timeKnown,
        flags: resolved.flags,
      });
      setChart(result);
      setShareInput({
        date: input.date,
        time: input.timeKnown ? input.time : null,
        timeKnown: input.timeKnown,
        lat: input.city.lat,
        lon: input.city.lon,
        tz: input.city.tz,
        place: input.city.name || undefined,
        houseSystem: input.houseSystem,
      });

      if (!input.timeKnown) {
        // Does the Moon change signs across this civil day?
        const early = resolveLocalToUtc(input.date, '00:00', input.city.tz);
        const late = resolveLocalToUtc(input.date, '23:59', input.city.tz);
        const moonEarly = signForLongitude(engine.computeBodies(early.utc).find((b) => b.body === 'Moon')!.lon);
        const moonLate = signForLongitude(engine.computeBodies(late.utc).find((b) => b.body === 'Moon')!.lon);
        setMoonAmbiguous(moonEarly.slug !== moonLate.slug);
      }

      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError('Something went wrong computing the chart. Please try again.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function compute(e: Event) {
    e.preventDefault();
    if (!canCompute || !city) return;
    runChart({ date, time, timeKnown, city, houseSystem });
  }

  function onSave() {
    if (!chart || !city) return;
    const sun = chart.bodies.find((b) => b.body === 'Sun')!;
    const defaultName = `${signForLongitude(sun.lon).name} Sun · ${date}`;
    const status = saveChart({
      id: crypto.randomUUID(),
      name: defaultName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      birth: {
        date,
        time: timeKnown ? time : null,
        timeKnown,
        place: {
          name: city.name, admin1: city.admin1, country: city.country,
          lat: city.lat, lon: city.lon, tz: city.tz,
        },
      },
      summary: {
        engineVersion: ENGINE_VERSION,
        utcISO: chart.input.utc.toISOString(),
        houseSystem: chart.houses?.system ?? houseSystem,
        bodies: chart.bodies.map((b) => ({ body: b.body, lon: b.lon, retrograde: b.retrograde })),
        angles: chart.angles ? { asc: chart.angles.asc, mc: chart.angles.mc } : null,
        flags: chart.flags,
      },
    });
    setSaved(status === 'updated' ? 'saved' : status);
  }

  const shareUrl = () =>
    `${window.location.origin}/birth-chart/#c=${encodeChartLink(shareInput!)}`;

  async function onCopyLink() {
    if (!shareInput) return;
    try {
      await navigator.clipboard.writeText(shareUrl());
      setShare('copied');
    } catch {
      setShare('manual');
    }
  }

  async function onCard() {
    if (!chart || !shareInput) return;
    setCard('busy');
    try {
      const { saveChartCard } = await import('../lib/share-card');
      const outcome = await saveChartCard(chart, shareInput);
      setCard(outcome === 'cancelled' ? 'idle' : 'saved');
    } catch (err) {
      console.error(err);
      setCard('error');
    }
  }

  const placements = useMemo(() => {
    if (!chart) return [];
    return chart.bodies.map((b) => ({
      ...b,
      label: formatLongitude(b.lon),
      house: chart.houses ? houseOf(b.lon, chart.houses.cusps) : null,
    }));
  }, [chart]);

  const sun = chart?.bodies.find((b) => b.body === 'Sun');
  const moon = chart?.bodies.find((b) => b.body === 'Moon');
  const asc = chart?.angles?.asc ?? null;

  const heroCards = useMemo(() => {
    if (!chart || !sun || !moon) return [];
    const cards: { kind: 'sun' | 'moon' | 'rising'; title: string; lon: number | null }[] =
      mode === 'moon'
        ? [{ kind: 'moon', title: 'Your Moon sign', lon: moon.lon }]
        : mode === 'rising'
          ? [{ kind: 'rising', title: 'Your Rising sign', lon: asc }]
          : [
            { kind: 'sun', title: 'Sun', lon: sun.lon },
            { kind: 'moon', title: 'Moon', lon: moon.lon },
            { kind: 'rising', title: 'Rising', lon: asc },
          ];
    return cards;
  }, [chart, mode, sun, moon, asc]);

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={compute}>
        <div class="core calc__core">
          <div class="calc__fields">
            <div class="field">
              <label class="field__label" for="birth-date">Birth date</label>
              <input
                id="birth-date" class="field__input" type="date" required
                min="1800-01-01" max="2199-12-31" value={date}
                onInput={(e) => setDate((e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="field">
              <div class="field__labelrow">
                <label class="field__label" for="birth-time">Birth time</label>
                {mode !== 'rising' && (
                  <label class="field__toggle">
                    <input
                      type="checkbox"
                      checked={!timeKnown}
                      onChange={(e) => setTimeKnown(!(e.target as HTMLInputElement).checked)}
                    />
                    I don’t know it
                  </label>
                )}
              </div>
              <input
                id="birth-time" class="field__input" type="time"
                disabled={!timeKnown} required={timeKnown} value={time}
                onFocus={() => loadEngine()}
                onInput={(e) => setTime((e.target as HTMLInputElement).value)}
              />
              <p class="field__help">
                {mode === 'rising'
                  ? 'Rising signs change every two hours — the clock matters here.'
                  : 'No birth time? You’ll still get your sun and moon — rising needs the clock.'}
              </p>
            </div>

            <div class="field">
              <label class="field__label" for="place">Birthplace</label>
              <PlaceSearch selected={city} onSelect={setCity} />
              <p class="field__help">Search covers ~34,000 places · GeoNames (CC BY 4.0)</p>
            </div>

            {mode === 'full' && (
              <div class="field">
                <label class="field__label" for="house-system">House system</label>
                <select
                  id="house-system" class="field__input"
                  value={houseSystem}
                  onChange={(e) => setHouseSystem((e.target as HTMLSelectElement).value as HouseSystem)}
                >
                  <option value="whole">Whole sign (default)</option>
                  <option value="placidus">Placidus</option>
                </select>
              </div>
            )}
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!canCompute || busy}>
            <span>
              {busy ? 'Computing…'
                : mode === 'moon' ? 'Find your moon sign'
                : mode === 'rising' ? 'Find your rising sign'
                : 'Get your free birth chart'}
            </span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">Computed on your device. Saved charts sync only if you turn on account sync.</p>
          {error && <p class="calc__error" role="alert">{error}</p>}
        </div>
      </form>

      {chart && sun && moon && (
        <div class="calc__result" ref={resultRef}>
          {/* Notices */}
          {chart.flags.includes('dst-gap') && (
            <p class="notice" role="status">That clock time fell inside a daylight-saving jump, so it never quite existed — we shifted forward across the gap, the standard convention.</p>
          )}
          {chart.flags.includes('dst-fold') && (
            <p class="notice" role="status">Clocks repeated that hour where you were born; we used the earlier pass. If you know it was the later one, your chart barely changes — the Moon moves about half a degree an hour.</p>
          )}
          {chart.flags.includes('lmt') && (
            <p class="notice" role="status">Born before standardized time zones — we used local mean time for that era ({city?.tz}), the same convention professional software uses. <a href="/methodology/">How we compute</a>.</p>
          )}
          {chart.flags.includes('polar-fallback') && (
            <p class="notice" role="status">Placidus houses aren’t defined that close to the pole, so this chart uses whole sign houses instead.</p>
          )}
          {chart.flags.includes('no-time') && (
            <p class="notice" role="status">
              Without a birth time we compute for noon: planets are exact to the day, but rising sign and houses need the clock.
              {moonAmbiguous && ' The Moon also changed signs that day — reading both neighbors is fair until you find the time.'}
            </p>
          )}
          {fromLink && (
            <p class="notice" role="status">
              Opened from a shared link — the birth details came in the link
              itself, and the chart was computed on your device just now.
            </p>
          )}

          {/* Big three / hero cards */}
          <div class={`calc__three calc__three--${heroCards.length}`}>
            {heroCards.map(({ kind, title, lon }) => {
              if (lon === null) {
                return (
                  <div class="three-card shell" key={kind}>
                    <div class="core three-card__core">
                      <span class="mono--label">{title}</span>
                      <p class="three-card__missing">Needs a birth time</p>
                    </div>
                  </div>
                );
              }
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
                      {s.name}
                    </span>
                    <span class="mono three-card__deg">{formatLongitude(lon)}</span>
                    <p class="three-card__read">{bigThree(kind, s.slug)}</p>
                    <a class="three-card__more" href={`/${s.slug}/`}>Read {s.name} →</a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Moon-mode extra: phase at birth */}
          {mode === 'moon' && (
            <p class="calc__phase mono">Moon phase at birth: {moonPhaseName(chart.input.utc)}</p>
          )}

          {/* Rising-mode extra: chart ruler */}
          {mode === 'rising' && asc !== null && (() => {
            const rising = signForLongitude(asc);
            const rulerName = rising.ruler === 'Pluto' || rising.ruler === 'Uranus' || rising.ruler === 'Neptune'
              ? (rising.classicRuler ?? rising.ruler)
              : rising.ruler;
            const ruler = chart.bodies.find((b) => b.body === rulerName);
            return ruler ? (
              <p class="calc__phase mono">
                Chart ruler: {rulerName} {GLYPHS[rulerName]} in {signForLongitude(ruler.lon).name} — the planet steering your {rising.name} rising.
              </p>
            ) : null;
          })()}

          {/* Wheel + placements (full mode) */}
          {mode === 'full' && (
            <>
              <div class="calc__wheel shell">
                <div class="core calc__wheel-core">
                  <Wheel
                    bodies={chart.bodies.filter((b) => b.body !== 'South Node')}
                    asc={asc}
                    mc={chart.angles?.mc ?? null}
                    cusps={chart.houses?.cusps ?? null}
                    aspects={chart.aspects.filter((a) => a.orb < 6)}
                    animate
                  />
                  <p class="calc__receipt mono">
                    {chart.input.utc.toISOString().replace('T', ' · ').slice(0, 21)} UTC
                    {city ? ` · ${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°` : ''}
                    {chart.houses ? ` · ${chart.houses.system === 'whole' ? 'Whole sign' : 'Placidus'} houses` : ''}
                    {' · engine v'}{chart.engineVersion}
                  </p>
                </div>
              </div>

              <div class="calc__table-wrap">
                <table class="calc__table">
                  <thead>
                    <tr><th>Body</th><th>Position</th><th>Sign</th>{chart.houses && <th>House</th>}<th></th></tr>
                  </thead>
                  <tbody>
                    {placements.map((p) => (
                      <tr key={p.body}>
                        <td><span class="calc__glyph">{GLYPHS[p.body]}</span> {p.body}</td>
                        <td class="mono">{p.label.split(' ')[0]}</td>
                        <td><SignChip lon={p.lon} /></td>
                        {chart.houses && <td class="mono">{p.house}</td>}
                        <td class="mono calc__retro">{p.retrograde ? 'Rx' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {chart.aspects.length > 0 && (
                <details class="calc__aspects">
                  <summary>Aspects — {chart.aspects.length} found</summary>
                  <ul>
                    {chart.aspects.map((a) => (
                      <li key={`${a.a}${a.b}${a.type}`} class="mono">
                        {GLYPHS[a.a]} {a.a} {a.type} {GLYPHS[a.b]} {a.b} · orb {a.orb.toFixed(1)}° {a.applying ? '· applying' : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}

          {/* Save + next steps */}
          <div class="calc__actions">
            <button class="btn btn--primary" type="button" onClick={onSave} disabled={saved === 'saved'}>
              <span>{saved === 'saved' ? 'Saved · on this device' : 'Save this chart'}</span>
              <span class="orb">{saved === 'saved' ? '✓' : '+'}</span>
            </button>
            {mode !== 'full' && (
              <a class="btn btn--ghost" href="/birth-chart/"><span>Get your birth chart</span><span class="orb">↗</span></a>
            )}
            {mode === 'full' && (
              <a class="btn btn--ghost" href="/profile/"><span>Saved charts</span><span class="orb">→</span></a>
            )}
          </div>
          {saved === 'saved' && <p class="sr-only" role="status">Chart saved on this device.</p>}
          {saved === 'full' && <p class="calc__error" role="alert">You can save up to 20 charts — remove one first.</p>}
          {saved === 'error' && <p class="calc__error" role="alert">Couldn’t save — your browser may be blocking local storage.</p>}
          {saved === 'saved' && <p class="calc__saved">Saved to your charts. Sign in <a href="/profile/">here</a> when you want them on every device.</p>}

          {/* Share: the link carries the data; no server involved */}
          {mode === 'full' && shareInput && (
            <div class="calc__share">
              <div class="calc__actions">
                <button class="btn btn--ghost" type="button" onClick={onCopyLink} data-share-link>
                  <span>{share === 'copied' ? 'Link copied' : 'Copy a link to this chart'}</span>
                  <span class="orb">{share === 'copied' ? '✓' : '⧉'}</span>
                </button>
                <button class="btn btn--ghost" type="button" onClick={onCard} disabled={card === 'busy'} data-share-card>
                  <span>{card === 'busy' ? 'Rendering…' : card === 'saved' ? 'Card saved' : 'Save a chart card'}</span>
                  <span class="orb">{card === 'saved' ? '✓' : '↓'}</span>
                </button>
              </div>
              {share === 'manual' && (
                <input
                  class="field__input calc__share-url" type="text" readOnly value={shareUrl()}
                  aria-label="Link to this chart"
                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                />
              )}
              <p class="calc__share-note">
                The link carries the birth details you entered — nothing is sent
                to us, so only people you hand it to can open it. The card is a
                1080×1350 image drawn on your device.
              </p>
              {(share === 'copied' || card === 'saved') && (
                <p class="sr-only" role="status">
                  {share === 'copied' ? 'Chart link copied to your clipboard.' : 'Chart card saved.'}
                </p>
              )}
              {card === 'error' && (
                <p class="calc__error" role="alert">
                  Couldn’t draw the card in this browser — the wheel above will screenshot just as well.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
