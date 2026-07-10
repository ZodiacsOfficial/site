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
import { BirthFields } from './BirthFields';
import { CopyLinkButton, type CopyLinkState } from './CopyLinkButton';
import SignChip from './SignChip';
import PlanetGlyph from '../components/PlanetGlyph';
import AspectGlyph from '../components/AspectGlyph';
import Wheel from '../lib/wheel/Wheel';
import Inspector from './explorer/Inspector';
import LayerChips from './explorer/LayerChips';
import { buildSceneModel } from '../lib/scene/build';
import { emphasisFor } from '../lib/scene/emphasis';
import {
  ALL_ASPECT_TYPES, entityId, parseEntityId,
  type ChartSceneModel, type EntityRef,
} from '../lib/scene/types';
import { formatLongitude, signBySlug, signForLongitude, signName } from '../lib/signs';
import { bigThree } from '../lib/interpretations';
import { chartWeather, natalAspectLine, planetInHouseLine, topAspects } from '../lib/natal';
import { dignityFor, type Dignity } from '../lib/dignities';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import { houseOf } from '../lib/engine/houses';
import { moonPhaseName } from '../lib/engine/lite';
import { saveChart } from '../lib/profile/store';
import { decodeChartLink, encodeChartLink } from '../lib/share';
import type { ShareChartInput } from '../lib/share';
import type { PositionsShareChart } from '../lib/share-positions';
import { ENGINE_VERSION } from '../lib/engine/types';
import type { Chart, HouseSystem } from '../lib/engine/types';
import type { City } from '../lib/geo/search';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';
import { aspectLabel, moonPhaseLabel, planetLabel } from '../lib/i18n/astrology';
import { useEngine } from '../lib/hooks/useEngine';
import type { AspectType } from '../lib/engine/types';

type Mode = 'full' | 'moon' | 'rising';

interface Props { mode: Mode; locale?: Locale }

type ShareSurfaceModule = typeof import('./PositionsShareSurface');

const DIGNITY_KEY = {
  domicile: 'dignityDomicile',
  exaltation: 'dignityExaltation',
  detriment: 'dignityDetriment',
  fall: 'dignityFall',
} as const satisfies Record<Dignity, string>;

/** Does the scene still contain the selected entity? (Recompute survival.) */
function sceneHas(scene: ChartSceneModel, ref: EntityRef): boolean {
  switch (ref.kind) {
    case 'body': return scene.bodies.some((b) => b.body === ref.body);
    case 'sign': return scene.signs.some((s) => s.slug === ref.sign);
    case 'house': return scene.houses != null && ref.house >= 1 && ref.house <= 12;
    case 'aspect': return scene.aspects.some((a) => a.a === ref.a && a.b === ref.b && a.type === ref.type);
    case 'angle': return scene.angles != null;
  }
}

export default function ChartCalculator({ mode, locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
  const loadEngine = useEngine();
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
  const [share, setShare] = useState<CopyLinkState>('idle');
  const [card, setCard] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');
  const [fromLink, setFromLink] = useState(false);
  const [positionsOnly, setPositionsOnly] = useState<PositionsShareChart | null>(null);
  const [shareSurface, setShareSurface] = useState<ShareSurfaceModule | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusAfterComputeRef = useRef(false);

  // ── Chart Explorer state (full mode) ──
  const [selection, setSelection] = useState<EntityRef | null>(null);
  const [aspectTypes, setAspectTypes] = useState<AspectType[]>(ALL_ASPECT_TYPES);
  const [showHouses, setShowHouses] = useState(true);
  const [announce, setAnnounce] = useState('');
  const selFromUrl = useRef(false);
  const wheelboxRef = useRef<HTMLDivElement>(null);

  const scene = useMemo(
    () => (chart && mode === 'full' ? buildSceneModel(chart) : null),
    [chart, mode],
  );
  const emphasis = useMemo(
    () => (scene ? emphasisFor(scene, selection) : { highlight: new Set<string>(), soft: new Set<string>() }),
    [scene, selection],
  );

  /** Spoken summary of a selection for the polite live region. */
  function describeSelection(ref: EntityRef): string {
    if (!scene) return '';
    switch (ref.kind) {
      case 'body': {
        const b = scene.bodies.find((x) => x.body === ref.body);
        if (!b) return '';
        return [
          planetLabel(locale, b.body),
          formatLongitude(b.lon, locale),
          b.house != null ? `${t(locale, 'house')} ${b.house}` : '',
          b.retrograde ? 'Rx' : '',
        ].filter(Boolean).join(', ');
      }
      case 'sign': return signName(signBySlug(ref.sign), locale);
      case 'house': return `${t(locale, 'house')} ${ref.house}`;
      case 'aspect': return `${planetLabel(locale, ref.a)} ${aspectLabel(locale, ref.type)} ${planetLabel(locale, ref.b)}`;
      case 'angle': return ref.angle.toUpperCase();
    }
  }

  /** The one selection entry point: state + URL + announcement + focus care. */
  function applySelect(ref: EntityRef | null) {
    // Selecting a house someone can't see makes no sense — re-light the layer.
    if (ref?.kind === 'house') setShowHouses(true);
    setSelection(ref);
    setAnnounce(ref ? describeSelection(ref) : t(locale, 'selectionCleared'));
    try {
      const url = new URL(window.location.href);
      if (ref) url.searchParams.set('sel', entityId(ref));
      else url.searchParams.delete('sel');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch { /* URL API unavailable — selection still works */ }
    if (!ref) {
      // Clearing may unmount the focused inspector (close button, Escape
      // inside the card) — focus falls to <body> without this hand-back.
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) wheelboxRef.current?.focus();
      });
    }
  }

  // A `?sel=` deep link applies once, after the first computed scene.
  useEffect(() => {
    if (!scene || selFromUrl.current) return;
    selFromUrl.current = true;
    const id = new URLSearchParams(window.location.search).get('sel');
    const ref = id ? parseEntityId(id) : null;
    if (ref && sceneHas(scene, ref)) setSelection(ref);
  }, [scene]);

  // Recompute: keep the selection when the entity survives, clear it when
  // it doesn't (e.g. houses gone on a no-time chart).
  useEffect(() => {
    if (!scene || !selection) return;
    if (!sceneHas(scene, selection)) applySelect(null);
  }, [scene]);

  // Hiding the house layer clears a house selection; filtering an aspect
  // type off clears a selected aspect of that type — never leave the wheel
  // dimmed around a mark that is no longer rendered.
  useEffect(() => {
    if (!showHouses && selection?.kind === 'house') applySelect(null);
  }, [showHouses]);
  useEffect(() => {
    if (selection?.kind === 'aspect' && !aspectTypes.includes(selection.type)) applySelect(null);
  }, [aspectTypes]);

  function onWheelKeyDown(e: KeyboardEvent) {
    if (!scene) return;
    // Only keys pressed on the wheelbox itself — buttons inside the stage
    // (layer chips) keep their native keyboard behavior.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      // Cycle order: bodies by longitude, then the marked angles — so the
      // ASC/MC inspector notes are reachable without a pointer.
      const cycle: EntityRef[] = [
        ...[...scene.bodies].sort((a, b) => a.lon - b.lon)
          .map((b): EntityRef => ({ kind: 'body', body: b.body })),
        ...(scene.angles
          ? [{ kind: 'angle', angle: 'asc' } as EntityRef, { kind: 'angle', angle: 'mc' } as EntityRef]
          : []),
      ];
      const at = selection ? cycle.findIndex((c) => entityId(c) === entityId(selection)) : -1;
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = at === -1
        ? (step === 1 ? cycle[0] : cycle[cycle.length - 1])
        : cycle[(at + step + cycle.length) % cycle.length];
      applySelect(next);
    } else if (e.key === 'Enter' && selection) {
      e.preventDefault();
      (document.querySelector('[data-inspector-heading]') as HTMLElement | null)?.focus();
    } else if (e.key === 'Escape' && selection) {
      applySelect(null);
    }
  }

  // Warm the ephemeris while the visitor types.
  useEffect(() => {
    const warm = () => { loadEngine(); };
    const idle = (window as any).requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 2500));
    idle(warm);
  }, [loadEngine]);

  // A shared chart arrives in the fragment. A v1 #c token carries birth
  // input and computes as before; a v2 #p token is loaded into a deliberately
  // reduced, read-only view. Never choose between two conflicting formats.
  useEffect(() => {
    if (mode !== 'full') return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const clearFragment = () => history.replaceState(null, '', window.location.pathname + window.location.search);

    if (params.has('c') && params.has('p')) {
      clearFragment();
      let active = true;
      import('./PositionsShareSurface')
        .then((surface) => {
          if (active) setError(surface.shareText(locale, 'shareLinkAmbiguous'));
        })
        .catch(() => {
          if (active) setError(t(locale, 'chartError'));
        });
      return () => { active = false; };
    }

    if (params.has('p')) {
      const token = params.get('p') ?? '';
      let active = true;
      import('./PositionsShareSurface')
        .then((surface) => {
          if (!active) return;
          const decoded = surface.decodePositionsToken(token);
          if (!decoded) {
            setError(surface.shareText(locale, 'positionsLinkInvalid'));
            return;
          }
          setChart(null);
          setShareInput(null);
          setPositionsOnly(decoded);
          setShareSurface(surface);
          clearFragment();
        })
        .catch(() => {
          if (active) setError(t(locale, 'chartError'));
        });
      return () => { active = false; };
    }

    const token = params.get('c');
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
    setPositionsOnly(null);
    clearFragment();
    runChart({
      date: decoded.date, time: decoded.time ?? '', timeKnown: decoded.timeKnown,
      city: linkCity, houseSystem: decoded.houseSystem,
    }, false);
  }, []);

  useEffect(() => {
    if (busy || !focusAfterComputeRef.current) return;
    if (error) {
      errorRef.current?.focus();
      focusAfterComputeRef.current = false;
      return;
    }
    if (chart) {
      resultHeadingRef.current?.focus();
      focusAfterComputeRef.current = false;
    }
  }, [busy, error, chart]);

  const canCompute = date !== '' && city !== null && (!timeKnown || time !== '')
    && !(mode === 'rising' && !timeKnown);

  interface RunInput {
    date: string; time: string; timeKnown: boolean; city: City; houseSystem: HouseSystem;
  }

  async function runChart(input: RunInput, focusAfterCompute: boolean) {
    focusAfterComputeRef.current = focusAfterCompute;
    setBusy(true);
    setError('');
    setSaved('idle');
    setShare('idle');
    setCard('idle');
    setPositionsOnly(null);
    setShareDialogOpen(false);
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
    runChart({ date, time, timeKnown, city, houseSystem }, true);
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

  async function openShareDialog() {
    if (!chart || !shareInput) return;
    setCard('idle');
    try {
      const surface = await import('./PositionsShareSurface');
      setShareSurface(surface);
      setShareDialogOpen(true);
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
  const sunSign = sun ? signForLongitude(sun.lon) : null;

  // The guided reading: planets only (nodes stay in the table), each with
  // sign + dignity resolved once; aspects ranked; whole-chart weather.
  const reading = useMemo(() => {
    if (!chart || mode !== 'full') return null;
    const seenHouses = new Set<number>();
    const ps = placements
      .filter((p) => !p.body.includes('Node'))
      .map((p) => {
        const sign = signForLongitude(p.lon);
        const firstInHouse = p.house != null && !seenHouses.has(p.house);
        if (p.house != null) seenHouses.add(p.house);
        return {
          ...p,
          signSlug: sign.slug,
          signLabel: signName(sign, locale),
          dignity: dignityFor(p.body, sign.slug),
          firstInHouse,
        };
      });
    return {
      ps,
      top: topAspects(chart.aspects, 4),
      weather: chartWeather(
        ps.map((p) => ({ body: p.body, lon: p.lon, retrograde: p.retrograde, sign: p.signSlug })),
        chart.houses ? (b) => ps.find((x) => x.body === b)?.house ?? null : undefined,
      ),
    };
  }, [chart, placements, mode, locale]);

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

  const PositionsOnlyView = shareSurface?.PositionsOnlyResult;
  const ShareDialog = shareSurface?.ChartShareDialog;

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={compute} aria-busy={busy}>
        <div class="core calc__core">
          <div class="calc__fields">
            <BirthFields
              locale={locale}
              dateId="birth-date"
              timeId="birth-time"
              placeId="place"
              date={date}
              time={time}
              timeKnown={timeKnown}
              city={city}
              onDateChange={setDate}
              onTimeChange={setTime}
              onTimeKnownChange={setTimeKnown}
              onCityChange={setCity}
              onWarm={loadEngine}
              showUnknownTime={mode !== 'rising'}
              requireKnownTime
              timeHelp={mode === 'rising' ? t(locale, 'risingTimeHelp') : t(locale, 'chartTimeHelp')}
              placeHelp={t(locale, 'searchGeo')}
            />

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
          {error && <p class="calc__error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        </div>
      </form>

      {positionsOnly && PositionsOnlyView && (
        <PositionsOnlyView chart={positionsOnly} locale={locale} />
      )}

      {chart && sun && moon && (
        <div class="calc__result" ref={resultRef}>
          <h2 class="sr-only" tabIndex={-1} ref={resultHeadingRef}>
            {mode === 'moon'
              ? t(locale, 'yourMoonSign')
              : mode === 'rising'
                ? t(locale, 'yourRisingSign')
                : t(locale, 'birthChart')}
          </h2>
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
            <p class="calc__phase mono">{t(locale, 'moonPhaseAtBirth')}: {moonPhaseLabel(locale, moonPhaseName(chart.input.utc))}</p>
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
                {t(locale, 'chartRuler')}: {planetLabel(locale, rulerName)} <PlanetGlyph body={rulerName} size={13} class="calc__pg" /> {t(locale, 'readIn')} {signName(signForLongitude(ruler.lon), locale)} - {t(locale, 'planetSteering')}
              </p>
            ) : null;
          })()}

          {/* Wheel + inspector + placements (full mode) — the Chart Explorer */}
          {mode === 'full' && scene && (
            <>
              <div class="calc__wheel shell">
                <div class="core calc__wheel-core">
                  <div class="xplr">
                    <div class="xplr__stage">
                      <div
                        class="xplr__wheelbox"
                        ref={wheelboxRef}
                        tabIndex={0}
                        role="group"
                        aria-label={t(locale, 'explorerLabel')}
                        onKeyDown={onWheelKeyDown}
                      >
                        <Wheel
                          bodies={chart.bodies.filter((b) => b.body !== 'South Node')}
                          asc={asc}
                          mc={chart.angles?.mc ?? null}
                          cusps={showHouses ? (chart.houses?.cusps ?? null) : null}
                          aspects={chart.aspects.filter((a) => a.orb < 6 && aspectTypes.includes(a.type))}
                          animate
                          interactive={{
                            scene,
                            selection,
                            emphasis,
                            onSelect: applySelect,
                            label: t(locale, 'explorerLabel'),
                          }}
                        />
                      </div>
                      <LayerChips
                        aspectTypes={aspectTypes}
                        onAspectTypes={setAspectTypes}
                        showHouses={showHouses}
                        onShowHouses={setShowHouses}
                        hasHouses={chart.houses != null}
                        locale={locale}
                      />
                    </div>
                    <Inspector
                      scene={scene}
                      selection={selection}
                      onSelect={applySelect}
                      locale={locale}
                    />
                  </div>
                  <p class="sr-only" role="status">{announce}</p>
                  <p class="calc__receipt mono">
                    {chart.input.utc.toISOString().replace('T', ' · ').slice(0, 21)} UTC
                    {city ? ` · ${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°` : ''}
                    {chart.houses ? ` · ${chart.houses.system === 'whole' ? t(locale, 'wholeSignHouses') : t(locale, 'placidusHouses')}` : ''}
                    {' · '}{t(locale, 'engine')}{chart.engineVersion}
                  </p>
                </div>
              </div>

              {shareInput && (
                <div class="calc__chart-share">
                  <button class="btn btn--glass" type="button" onClick={openShareDialog} disabled={card === 'busy'} data-share-card>
                    <span>{card === 'busy' ? t(locale, 'rendering') : card === 'saved' ? t(locale, 'cardSaved') : t(locale, 'shareChart')}</span>
                    <span class="orb">{card === 'saved' ? '✓' : '↗'}</span>
                  </button>
                </div>
              )}

              <div class="calc__table-wrap">
                <table class="calc__table">
                  <thead>
                    <tr><th>{t(locale, 'body')}</th><th>{t(locale, 'position')}</th><th>{t(locale, 'sign')}</th>{chart.houses && <th>{t(locale, 'house')}</th>}<th><span class="sr-only">{t(locale, 'motion')}</span></th></tr>
                  </thead>
                  <tbody>
                    {placements.map((p) => {
                      const inScene = scene.bodies.some((b) => b.body === p.body);
                      const isSel = selection?.kind === 'body' && selection.body === p.body;
                      const hue = signForLongitude(p.lon).hue;
                      return (
                        <tr key={p.body} data-selected={isSel ? 'true' : undefined} style={isSel ? `--sign:${hue}` : undefined}>
                          <td>
                            {inScene ? (
                              <button
                                class="calc__rowbtn"
                                type="button"
                                aria-pressed={isSel}
                                onClick={() => applySelect(isSel ? null : { kind: 'body', body: p.body })}
                              >
                                <span class="calc__glyph"><PlanetGlyph body={p.body} size={15} /></span> {planetLabel(locale, p.body)}
                              </button>
                            ) : (
                              <><span class="calc__glyph"><PlanetGlyph body={p.body} size={15} /></span> {planetLabel(locale, p.body)}</>
                            )}
                          </td>
                          <td class="mono">{p.label.split(' ')[0]}</td>
                          <td><SignChip lon={p.lon} locale={locale} /></td>
                          {chart.houses && <td class="mono">{p.house}</td>}
                          <td class="mono calc__retro">{p.retrograde ? 'Rx' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {chart.aspects.length > 0 && (
                <details class="calc__aspects">
                  <summary>{t(locale, 'aspectsFound')} - {chart.aspects.length} {t(locale, 'found')}</summary>
                  <ul>
                    {chart.aspects.map((a) => {
                      const ref: EntityRef = { kind: 'aspect', a: a.a, b: a.b, type: a.type };
                      const inScene = aspectTypes.includes(a.type)
                        && scene.aspects.some((x) => x.a === a.a && x.b === a.b && x.type === a.type);
                      const isSel = selection?.kind === 'aspect'
                        && selection.a === a.a && selection.b === a.b && selection.type === a.type;
                      const line = (
                        <>
                          <PlanetGlyph body={a.a} size={13} class="calc__pg" /> {planetLabel(locale, a.a)} <AspectGlyph type={a.type} size={13} class="calc__pg" /> {aspectLabel(locale, a.type)} <PlanetGlyph body={a.b} size={13} class="calc__pg" /> {planetLabel(locale, a.b)} · {t(locale, 'orb')} {a.orb.toFixed(1)}° {a.applying ? `· ${t(locale, 'applying')}` : ''}
                        </>
                      );
                      return (
                        <li key={`${a.a}${a.b}${a.type}`} class="mono" data-selected={isSel ? 'true' : undefined}>
                          {inScene ? (
                            <button class="calc__rowbtn" type="button" aria-pressed={isSel} onClick={() => applySelect(isSel ? null : ref)}>
                              {line}
                            </button>
                          ) : line}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              )}

              {/* Guided reading — the tables above are the data; this is the order. */}
              {reading && (
                <section class="calc__read" aria-labelledby="calc-read-title">
                  <h2 id="calc-read-title" class="calc__read-title">{t(locale, 'readInOrder')}</h2>
                  <p class="calc__read-intro">{t(locale, 'readIntro')}</p>
                  <ol class="calc__read-steps">
                    <li class="calc__read-step">
                      <h3>{t(locale, 'readBigThree')}</h3>
                      <p>{t(locale, 'readBigThreeBody')}</p>
                    </li>
                    <li class="calc__read-step">
                      <h3>{t(locale, 'readRooms')}</h3>
                      {!chart.houses && <p class="calc__read-note">{t(locale, 'readNoHouses')}</p>}
                      <ul class="calc__read-list">
                        {reading.ps.map((p) => (
                          <li
                            key={p.body}
                            data-selected={selection?.kind === 'body' && selection.body === p.body ? 'true' : undefined}
                            style={selection?.kind === 'body' && selection.body === p.body ? `--sign:${signBySlug(p.signSlug).hue}` : undefined}
                          >
                            <p>
                              <PlanetGlyph body={p.body} size={14} class="calc__pg" />{' '}
                              {chart.houses && p.house
                                ? planetInHouseLine(p.body, p.house, { withTheme: p.firstInHouse })
                                : `${planetLabel(locale, p.body)} — ${p.signLabel}.`}
                              {p.dignity && (
                                <span class="calc__read-dignity mono"> · {t(locale, DIGNITY_KEY[p.dignity])}</span>
                              )}
                            </p>
                            <a class="calc__read-more" href={`/learn/placements/${p.body.toLowerCase()}-in-${p.signSlug}/`}>
                              {planetLabel(locale, p.body)} {t(locale, 'readIn')} {p.signLabel} →
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                    {reading.top.length > 0 && (
                      <li class="calc__read-step">
                        <h3>{t(locale, 'readAspects')}</h3>
                        <ul class="calc__read-list">
                          {reading.top.map((a) => (
                            <li
                              key={`${a.a}${a.b}${a.type}`}
                              data-selected={selection?.kind === 'aspect' && selection.a === a.a && selection.b === a.b && selection.type === a.type ? 'true' : undefined}
                            >
                              <p>{natalAspectLine(a.a, a.type, a.b)}</p>
                              <a class="calc__read-more" href={`/learn/aspects/${a.type}/`}>
                                {aspectLabel(locale, a.type)} · {a.orb.toFixed(1)}° →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )}
                    <li class="calc__read-step">
                      <h3>{t(locale, 'readWeather')}</h3>
                      <ul class="calc__read-list">
                        {reading.weather.lines.map((l) => (
                          <li key={l}><p>{l}</p></li>
                        ))}
                      </ul>
                    </li>
                  </ol>
                </section>
              )}
            </>
          )}

          {/* Save + share + next steps */}
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
          {mode === 'full' && saved !== 'saved' && <p class="calc__saved">{t(locale, 'saveYearAheadNote')}</p>}
          {saved === 'saved' && <p class="sr-only" role="status">{t(locale, 'chartSavedStatus')}</p>}
          {saved === 'full' && <p class="calc__error" role="alert">{t(locale, 'chartSaveFull')}</p>}
          {saved === 'error' && <p class="calc__error" role="alert">{t(locale, 'chartSaveError')}</p>}
          {saved === 'saved' && <p class="calc__saved">{t(locale, 'chartSavedBeforeLink')} <a href={localizePath(locale, '/profile/')}>{t(locale, 'chartSavedLink')}</a> {t(locale, 'chartSavedAfterLink')}</p>}

          {/* Share: the link carries the data; no server involved */}
          {mode === 'full' && shareInput && (
            <div class="calc__share">
              <CopyLinkButton
                url={shareUrl()}
                state={share}
                onStateChange={setShare}
                idleLabel={t(locale, 'copyChartLink')}
                copiedLabel={t(locale, 'linkCopied')}
                ariaLabel={t(locale, 'linkToChart')}
                buttonClass="btn btn--glass"
                dataHook="share"
              >
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
              </CopyLinkButton>
            </div>
          )}

          {/* The one sanctioned records bridge on a tool page: the sun
              sign's canonical record, one quiet click into the collector's
              wing. Records register — no market language (mirrors CollectBand). */}
          {mode === 'full' && sunSign && (
            <aside class="calc__record">
              <span class="calc__record-label mono">{t(locale, 'recordLabel')}</span>
              <span class="calc__record-text">{signName(sunSign, locale)} {t(locale, 'recordOneOfTwelve')}</span>
              <a class="calc__record-link" href={`/registry/${sunSign.slug}/`}>{t(locale, 'recordViewLink')}</a>
            </aside>
          )}
        </div>
      )}

      {chart && shareInput && shareDialogOpen && ShareDialog && (
        <ShareDialog
          chart={chart}
          input={shareInput}
          locale={locale}
          fullUrl={shareUrl()}
          card={card}
          onCardStateChange={setCard}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </div>
  );
}
