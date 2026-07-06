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
import { formatLongitude, signForLongitude, signName } from '../lib/signs';
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
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';

type Mode = 'full' | 'moon' | 'rising';

interface Props { mode: Mode; locale?: Locale }

const GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋',
};

let enginePromise: Promise<typeof import('../lib/engine/full')> | null = null;
const loadEngine = () => (enginePromise ??= import('../lib/engine/full'));

export default function ChartCalculator({ mode, locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
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
      setError(t(locale, 'chartError'));
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
    const defaultName = `${signName(signForLongitude(sun.lon), locale)} ${t(locale, 'sun')} · ${date}`;
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
    `${window.location.origin}${localizePath(locale, '/birth-chart/')}#c=${encodeChartLink(shareInput!)}`;

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
      label: formatLongitude(b.lon, locale),
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
        ? [{ kind: 'moon', title: t(locale, 'yourMoonSign'), lon: moon.lon }]
        : mode === 'rising'
          ? [{ kind: 'rising', title: t(locale, 'yourRisingSign'), lon: asc }]
          : [
            { kind: 'sun', title: t(locale, 'sun'), lon: sun.lon },
            { kind: 'moon', title: t(locale, 'moon'), lon: moon.lon },
            { kind: 'rising', title: t(locale, 'rising'), lon: asc },
          ];
    return cards;
  }, [chart, mode, sun, moon, asc, locale]);

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={compute}>
        <div class="core calc__core">
          <div class="calc__fields">
            <div class="field">
              <label class="field__label" for="birth-date">{t(locale, 'birthDate')}</label>
              <input
                id="birth-date" class="field__input" type="date" required
                min="1800-01-01" max="2199-12-31" value={date}
                onInput={(e) => setDate((e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="field">
              <div class="field__labelrow">
                <label class="field__label" for="birth-time">{t(locale, 'birthTime')}</label>
                {mode !== 'rising' && (
                  <label class="field__toggle">
                    <input
                      type="checkbox"
                      checked={!timeKnown}
                      onChange={(e) => setTimeKnown(!(e.target as HTMLInputElement).checked)}
                    />
                    {t(locale, 'noBirthTime')}
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
                  ? t(locale, 'risingTimeHelp')
                  : t(locale, 'chartTimeHelp')}
              </p>
            </div>

            <div class="field">
              <label class="field__label" for="place">{t(locale, 'birthplace')}</label>
              <PlaceSearch selected={city} onSelect={setCity} locale={locale} />
              <p class="field__help">{t(locale, 'searchGeo')}</p>
            </div>

            {mode === 'full' && (
              <div class="field">
                <label class="field__label" for="house-system">{t(locale, 'houseSystem')}</label>
                <select
                  id="house-system" class="field__input"
                  value={houseSystem}
                  onChange={(e) => setHouseSystem((e.target as HTMLSelectElement).value as HouseSystem)}
                >
                  <option value="whole">{t(locale, 'wholeSignDefault')}</option>
                  <option value="placidus">{t(locale, 'placidus')}</option>
                </select>
              </div>
            )}
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!canCompute || busy}>
            <span>
              {busy ? t(locale, 'computing')
                : mode === 'moon' ? t(locale, 'findMoonSign')
                : mode === 'rising' ? t(locale, 'findRisingSign')
                : t(locale, 'getBirthChart')}
            </span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">{t(locale, 'privacyDevice')}</p>
          {error && <p class="calc__error" role="alert">{error}</p>}
        </div>
      </form>

      {chart && sun && moon && (
        <div class="calc__result" ref={resultRef}>
          {/* Notices */}
          {chart.flags.includes('dst-gap') && (
            <p class="notice" role="status">{t(locale, 'dstGapNotice')}</p>
          )}
          {chart.flags.includes('dst-fold') && (
            <p class="notice" role="status">{t(locale, 'dstFoldNotice')}</p>
          )}
          {chart.flags.includes('lmt') && (
            <p class="notice" role="status">{t(locale, 'lmtNotice')} ({city?.tz}). <a href={localizePath(locale, '/methodology/')}>{t(locale, 'howWeCompute')}</a>.</p>
          )}
          {chart.flags.includes('polar-fallback') && (
            <p class="notice" role="status">{t(locale, 'polarNotice')}</p>
          )}
          {chart.flags.includes('no-time') && (
            <p class="notice" role="status">
              {t(locale, 'noTimeNotice')}
              {moonAmbiguous && ` ${t(locale, 'moonAmbiguousNotice')}`}
            </p>
          )}
          {fromLink && (
            <p class="notice" role="status">
              {t(locale, 'fromLinkNotice')}
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
                      <p class="three-card__missing">{t(locale, 'needsBirthTime')}</p>
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
                      {signName(s, locale)}
                    </span>
                    <span class="mono three-card__deg">{formatLongitude(lon, locale)}</span>
                    <p class="three-card__read">{bigThree(kind, s.slug)}</p>
                    <a class="three-card__more" href={localizePath(locale, `/${s.slug}/`)}>{t(locale, 'read')} {signName(s, locale)} →</a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Moon-mode extra: phase at birth */}
          {mode === 'moon' && (
            <p class="calc__phase mono">{t(locale, 'moonPhaseAtBirth')}: {moonPhaseName(chart.input.utc)}</p>
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
                {t(locale, 'chartRuler')}: {rulerName} {GLYPHS[rulerName]} in {signName(signForLongitude(ruler.lon), locale)} - {t(locale, 'planetSteering')}
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
                    {chart.houses ? ` · ${chart.houses.system === 'whole' ? t(locale, 'wholeSignHouses') : t(locale, 'placidusHouses')}` : ''}
                    {' · '}{t(locale, 'engine')}{chart.engineVersion}
                  </p>
                </div>
              </div>

              <div class="calc__table-wrap">
                <table class="calc__table">
                  <thead>
                    <tr><th>{t(locale, 'body')}</th><th>{t(locale, 'position')}</th><th>{t(locale, 'sign')}</th>{chart.houses && <th>{t(locale, 'house')}</th>}<th></th></tr>
                  </thead>
                  <tbody>
                    {placements.map((p) => (
                      <tr key={p.body}>
                        <td><span class="calc__glyph">{GLYPHS[p.body]}</span> {p.body}</td>
                        <td class="mono">{p.label.split(' ')[0]}</td>
                        <td><SignChip lon={p.lon} locale={locale} /></td>
                        {chart.houses && <td class="mono">{p.house}</td>}
                        <td class="mono calc__retro">{p.retrograde ? 'Rx' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {chart.aspects.length > 0 && (
                <details class="calc__aspects">
                  <summary>{t(locale, 'aspectsFound')} - {chart.aspects.length} {t(locale, 'found')}</summary>
                  <ul>
                    {chart.aspects.map((a) => (
                      <li key={`${a.a}${a.b}${a.type}`} class="mono">
                        {GLYPHS[a.a]} {a.a} {a.type} {GLYPHS[a.b]} {a.b} · orb {a.orb.toFixed(1)}° {a.applying ? `· ${t(locale, 'applying')}` : ''}
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
              <span>{saved === 'saved' ? t(locale, 'chartSavedDevice') : t(locale, 'saveThisChart')}</span>
              <span class="orb">{saved === 'saved' ? '✓' : '+'}</span>
            </button>
            {mode !== 'full' && (
              <a class="btn btn--ghost" href={localizePath(locale, '/birth-chart/')}><span>{t(locale, 'getBirthChart')}</span><span class="orb">↗</span></a>
            )}
            {mode === 'full' && (
              <a class="btn btn--ghost" href={localizePath(locale, '/profile/')}><span>{t(locale, 'savedCharts')}</span><span class="orb">→</span></a>
            )}
          </div>
          {saved === 'saved' && <p class="sr-only" role="status">{t(locale, 'chartSavedStatus')}</p>}
          {saved === 'full' && <p class="calc__error" role="alert">{t(locale, 'chartSaveFull')}</p>}
          {saved === 'error' && <p class="calc__error" role="alert">{t(locale, 'chartSaveError')}</p>}
          {saved === 'saved' && <p class="calc__saved">{locale === 'es' ? 'Guardada en tus cartas. Inicia sesión ' : 'Saved to your charts. Sign in '}<a href={localizePath(locale, '/profile/')}>{locale === 'es' ? 'aquí' : 'here'}</a>{locale === 'es' ? ' cuando quieras tenerlas en todos tus dispositivos.' : ' when you want them on every device.'}</p>}

          {/* Share: the link carries the data; no server involved */}
          {mode === 'full' && shareInput && (
            <div class="calc__share">
              <div class="calc__actions">
                <button class="btn btn--ghost" type="button" onClick={onCopyLink} data-share-link>
                  <span>{share === 'copied' ? t(locale, 'linkCopied') : t(locale, 'copyChartLink')}</span>
                  <span class="orb">{share === 'copied' ? '✓' : '⧉'}</span>
                </button>
                <button class="btn btn--ghost" type="button" onClick={onCard} disabled={card === 'busy'} data-share-card>
                  <span>{card === 'busy' ? t(locale, 'rendering') : card === 'saved' ? t(locale, 'cardSaved') : t(locale, 'saveChartCard')}</span>
                  <span class="orb">{card === 'saved' ? '✓' : '↓'}</span>
                </button>
              </div>
              {share === 'manual' && (
                <input
                  class="field__input calc__share-url" type="text" readOnly value={shareUrl()}
                  aria-label={t(locale, 'linkToChart')}
                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                />
              )}
              <p class="calc__share-note">
                {t(locale, 'shareNote')}
              </p>
              {(share === 'copied' || card === 'saved') && (
                <p class="sr-only" role="status">
                  {share === 'copied' ? t(locale, 'chartLinkCopied') : t(locale, 'chartCardSaved')}
                </p>
              )}
              {card === 'error' && (
                <p class="calc__error" role="alert">
                  {t(locale, 'cardError')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
