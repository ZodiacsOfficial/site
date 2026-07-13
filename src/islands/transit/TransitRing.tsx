/**
 * The Transit Ring — the animated bi-wheel. The natal chart is the fixed
 * inner wheel (the Wheel's pinned static path); the transiting sky is an
 * outer ring that moves as you scrub time. Lazy-loaded by TransitTracker
 * after the first compute, so /transits/ pays for the wheel + engine only
 * when a chart exists to draw.
 *
 * One compute path: the scrubber sets a day-offset from now; a memo turns
 * that instant into the outer ring via the (already-loaded) engine. Dragging
 * moves the planets continuously; the steppers and "Now" glide by tweening
 * the offset (instant under reduced motion). The active-transit list under
 * the wheel is the accessible, reduced-motion-safe structure and updates
 * with the scrub; a live region announces the date.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import Wheel from '../../lib/wheel/Wheel';
import PlanetGlyph from '../../components/PlanetGlyph';
import AspectGlyph from '../../components/AspectGlyph';
import { findInterAspects } from '../../lib/engine/synastry';
import type { MinimalBody } from '../../lib/engine/synastry';
import type { TransitContact } from '../../lib/engine/transit-scan';
import type { BodyName } from '../../lib/engine/types';
import { buildTransitOverlay } from '../../lib/scene/overlay';
import { collisionNudge } from '../../lib/scene/layout';
import { overlayAspectId, overlayBodyId } from '../../lib/scene/types';
import { renderTransitOverlay } from './renderTransitOverlay';
import { transitLine, TRANSIT_ORB } from '../../lib/transits';
import { formatLongitude } from '../../lib/signs';
import { formatDate, formatDateTime } from '../../lib/i18n/dates';
import { aspectLabel, planetLabel } from '../../lib/i18n/astrology';
import { t, type Locale } from '../../lib/i18n';
import CalendarSubscribe, { type CalendarPositionsSource } from '../CalendarSubscribe';

export interface TransitSky {
  body: string;
  lon: number;
  retrograde: boolean;
}

export interface TransitRingProps {
  locale: Locale;
  natal: {
    bodies: { body: string; lon: number; retrograde?: boolean }[];
    asc: number | null;
    mc: number | null;
    cusps: number[] | null;
    minimal: MinimalBody[];
    timeKnown: boolean;
    calendarPositions: CalendarPositionsSource | null;
  };
  /** Positions of the transiting bodies at a UTC instant (engine-bound). */
  computeSky: (when: Date) => TransitSky[];
  /** Baseline "now" in epoch ms (captured once at compute). */
  nowMs: number;
}

const DAY = 86_400_000;
const WINDOW_DAYS = 365; // scrub one year either side — enough for the slow transits
const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - ((-2 * k + 2) ** 3) / 2);

// Ring-specific copy, module-local (EN + ES) — the lazy chunk keeps it out of
// the /transits/ static closure. General labels reuse the shared dictionary.
const COPY = {
  en: {
    skyRingLabel: 'the transiting sky',
    scrubLabel: 'Move the date',
    scrubHint: 'Drag to move the sky forward or back; the outer ring is where the planets are then.',
    now: 'Now',
    back1m: '−1 month',
    fwd1m: '+1 month',
    outerRing: 'Outer ring: the sky then. Inner wheel: your birth chart.',
    tapHint: 'Tap a moving planet or a connecting line to read it.',
    noContacts: 'No planet-to-planet transits within',
    ofExact: 'of exact',
    moonOmitted: 'the Moon moves too fast to list, but you can watch it circle',
    announce: 'Sky for',
    scanning: 'Computing the exact dates of the slow transits…',
    marksLabel: 'Exact slow-transit dates in this window',
    nextUp: 'Next to go exact:',
    noSlowExact: 'No slow transits go exact in this window.',
  },
  es: {
    skyRingLabel: 'el cielo en tránsito',
    scrubLabel: 'Mueve la fecha',
    scrubHint: 'Arrastra para mover el cielo hacia adelante o atrás; el anillo exterior muestra dónde están los planetas en ese momento.',
    now: 'Ahora',
    back1m: '−1 mes',
    fwd1m: '+1 mes',
    outerRing: 'Anillo exterior: el cielo de entonces. Rueda interior: tu carta natal.',
    tapHint: 'Toca un planeta en movimiento o una línea de conexión para leer ese tránsito.',
    noContacts: 'Sin tránsitos planeta a planeta a menos de',
    ofExact: 'de exactitud',
    moonOmitted: 'la Luna se mueve demasiado rápido para aparecer en la lista, pero puedes verla girar',
    announce: 'Cielo del',
    scanning: 'Calculando las fechas exactas de los tránsitos lentos…',
    marksLabel: 'Fechas exactas de tránsitos lentos en esta ventana',
    nextUp: 'Próximos en llegar a exacto:',
    noSlowExact: 'Ningún tránsito lento llega a exacto en esta ventana.',
  },
} as const;

export default function TransitRing({ locale, natal, computeSky, nowMs }: TransitRingProps) {
  const c = COPY[locale] ?? COPY.en;
  const [offset, setOffset] = useState(0);          // days from now (may be fractional mid-tween)
  const [sel, setSel] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const when = useMemo(() => new Date(nowMs + offset * DAY), [nowMs, offset]);

  // The outer ring: compute the sky at `when`, aspect it to the natal chart.
  // Focus is applied OUTSIDE the memo — a focus tap must not re-run the
  // ephemeris, and a focused contact that has drifted out of orb at the
  // scrubbed date must dissolve instead of dimming the whole ring against
  // a highlight that no longer exists.
  const overlayBase = useMemo(() => {
    const sky = computeSky(when);
    const transiting = sky.filter((b) => b.body !== 'Moon').map(({ body, lon }) => ({ body, lon }));
    const hits = findInterAspects(transiting, natal.minimal).filter((h) => h.orb <= TRANSIT_ORB);
    return buildTransitOverlay(c.skyRingLabel, sky, hits, null);
  }, [when, natal.minimal, computeSky, c.skyRingLabel]);
  const focus = sel && sel.includes('-') // aspect ids carry dashes; body ids don't
    && overlayBase.aspects.some((a) => overlayAspectId(a) === sel) ? sel : null;
  const overlay = focus ? { ...overlayBase, focus } : overlayBase;

  // The natal wheel fans crowded bodies outward; contact chords must end on
  // the fanned marker, not the true longitude, or a stellium's chord points
  // at the neighbouring planet. Same algorithm and input as the Wheel's own
  // layout, so the endpoints land exactly on the drawn marks.
  const natalDraw = useMemo(() => collisionNudge(natal.bodies), [natal.bodies]);

  // ── Exact dates: the slow transits (Jupiter–Pluto) across the window. ──
  // The scanner is engine-bound and ~100 ms per body, so it loads lazily and
  // runs one body at a time with a breath between each — the ring stays
  // responsive while the timeline fills in. Null = still computing.
  const [events, setEvents] = useState<TransitContact[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const scan = await import('../../lib/engine/transit-scan');
        const from = new Date(nowMs - WINDOW_DAYS * DAY);
        const to = new Date(nowMs + WINDOW_DAYS * DAY);
        const chart = {
          // MinimalBody carries `string`; these came from the engine, so the
          // narrowing to BodyName is sound.
          bodies: natal.minimal.map((b) => ({ body: b.body as BodyName, lon: b.lon })),
          angles: natal.asc != null && natal.mc != null ? { asc: natal.asc, mc: natal.mc } : null,
        };
        const found: TransitContact[] = [];
        for (const body of scan.SLOW_TRANSIT_BODIES) {
          if (cancelled) return;
          found.push(...scan.scanTransitContacts(chart, from, to, { transitBodies: [body] }));
          await new Promise((r) => setTimeout(r, 0));
        }
        if (!cancelled) setEvents(found.sort((a, b) => a.exactUtc.localeCompare(b.exactUtc)));
      } catch {
        if (!cancelled) setEvents([]); // scan unavailable — the ring works without it
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Days from now to a contact's exact instant (fractional). */
  const eventOffset = (e: TransitContact) => (Date.parse(e.exactUtc) - nowMs) / DAY;
  const eventLabel = (e: TransitContact) => {
    const point = e.natalPoint === 'ASC' || e.natalPoint === 'MC'
      ? e.natalPoint : planetLabel(locale, e.natalPoint);
    return `${planetLabel(locale, e.transitBody)} ${aspectLabel(locale, e.aspect)} ${t(locale, 'natal')} ${point}`;
  };
  const nextUp = events?.filter((e) => Date.parse(e.exactUtc) > when.getTime()).slice(0, 3) ?? [];

  /** Jump the sky to a contact's exact date and, when it has a ring
   * counterpart (a planet contact), focus its chord on arrival. */
  function goToEvent(e: TransitContact) {
    glideTo(eventOffset(e));
    if (e.natalPoint !== 'ASC' && e.natalPoint !== 'MC') {
      setSel(`${e.transitBody}-${e.aspect}-${e.natalPoint}`);
    }
  }

  const whenLabel = formatDateTime(locale, when, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', hour12: false,
  }) + ' UTC';

  const cancelTween = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };
  useEffect(() => cancelTween, []);

  /** Glide the offset from its current value to a target (instant if reduced).
   * Targets clamp to the scrub window and land on whole days, so stepping
   * can neither escape ±{WINDOW_DAYS} nor strand "Now" on a fraction. */
  function glideTo(rawTarget: number) {
    const target = Math.max(-WINDOW_DAYS, Math.min(WINDOW_DAYS, Math.round(rawTarget)));
    cancelTween();
    if (reducedMotion()) { setOffset(target); return; }
    const from = offset;
    const start = performance.now();
    const dur = Math.min(700, 200 + Math.abs(target - from) * 4);
    const step = (nowT: number) => {
      const k = Math.min(1, (nowT - start) / dur);
      setOffset(from + (target - from) * easeInOutCubic(k));
      if (k < 1) rafRef.current = requestAnimationFrame(step);
      else { rafRef.current = null; setOffset(target); }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  // Announce the scrubbed instant only once it settles — updating the live
  // region on every frame of a drag or glide chatters in screen readers.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(`${c.announce} ${whenLabel}`), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whenLabel]);

  // The selected transit's sentence (a chord, or a body's tightest contact).
  const selectedAspect = sel
    ? overlay.aspects.find((a) => overlayAspectId(a) === sel)
      ?? overlay.aspects.find((a) => overlayBodyId(a.outer) === sel)
    : null;

  const selectedBody = sel && !sel.includes('-')
    ? overlay.bodies.find((b) => overlayBodyId(b.body) === sel) ?? null
    : null;

  return (
    <div class="tring">
      <p class="tring__caption mono">{c.outerRing}</p>

      <div class="tring__wheelbox">
        <Wheel
          bodies={natal.bodies}
          asc={natal.asc}
          mc={natal.mc}
          cusps={natal.cusps}
          aspects={[]}
          renderOverlay={(geo) => renderTransitOverlay(
            overlay,
            (name) => natalDraw.get(name) ?? null,
            (id) => setSel((prev) => (prev === id ? null : id)),
            geo,
          )}
        />
      </div>

      {/* The scrubber. */}
      <div class="tring__scrub">
        <div class="tring__scrub-head">
          <label class="field__label" for="tring-date">{c.scrubLabel}</label>
          <output class="tring__date mono" for="tring-date">{whenLabel}</output>
        </div>
        <input
          id="tring-date"
          class="tring__range"
          type="range"
          min={-WINDOW_DAYS}
          max={WINDOW_DAYS}
          step={1}
          value={Math.round(offset)}
          onInput={(e) => { cancelTween(); setOffset(Number((e.target as HTMLInputElement).value)); }}
          aria-valuetext={whenLabel}
        />
        {/* Exact slow-transit dates as jump markers along the same timeline. */}
        {events === null && <p class="tring__scan mono">{c.scanning}</p>}
        {events !== null && events.length > 0 && (
          <div class="tring__marks" role="group" aria-label={c.marksLabel}>
            {events.map((e) => {
              const d = eventOffset(e);
              const dateLabel = formatDate(locale, new Date(Date.parse(e.exactUtc)), {
                year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
              });
              return (
                <button
                  key={`${e.exactUtc}-${e.transitBody}-${e.aspect}-${e.natalPoint}`}
                  class="tring__mark"
                  type="button"
                  style={`left:${(((d + WINDOW_DAYS) / (WINDOW_DAYS * 2)) * 100).toFixed(2)}%`}
                  aria-label={`${eventLabel(e)} — ${dateLabel}`}
                  title={`${eventLabel(e)} — ${dateLabel}`}
                  onClick={() => goToEvent(e)}
                  data-transit-mark
                />
              );
            })}
          </div>
        )}
        {events !== null && events.length === 0 && (
          <p class="tring__scan mono">{c.noSlowExact}</p>
        )}
        {nextUp.length > 0 && (
          <p class="tring__next mono">
            <span class="mono--label">{c.nextUp}</span>{' '}
            {nextUp.map((e, i) => (
              <button class="tring__next-link" type="button" key={e.exactUtc + e.transitBody} onClick={() => goToEvent(e)}>
                {eventLabel(e)} · {formatDate(locale, new Date(Date.parse(e.exactUtc)), { month: 'short', day: 'numeric', timeZone: 'UTC' })}{i < nextUp.length - 1 ? ',' : ''}
              </button>
            ))}
          </p>
        )}
        <div class="tring__steps">
          <button class="btn btn--glass tring__step" type="button" onClick={() => glideTo(offset - 30)}>
            <span>{c.back1m}</span>
          </button>
          <button class="btn btn--glass tring__step" type="button" onClick={() => glideTo(0)} disabled={Math.round(offset) === 0}>
            <span>{c.now}</span>
          </button>
          <button class="btn btn--glass tring__step" type="button" onClick={() => glideTo(offset + 30)}>
            <span>{c.fwd1m}</span>
          </button>
        </div>
        <p class="field__help">{c.scrubHint} {c.tapHint}</p>
      </div>

      {/* Every transiting body's position at the scrubbed instant — the
          accessible, text-first readout (the ring's marks are pointer
          extras). Includes the Moon. */}
      <div class="trans__sky">
        {overlay.bodies.map((b) => (
          <span class="trans__pos mono" key={b.body}>
            <PlanetGlyph body={b.body} size={13} class="pg-inline" /> {formatLongitude(b.lon, locale)}{b.retrograde ? ' ℞' : ''}
          </span>
        ))}
      </div>

      {/* Live announcement of the scrubbed instant, once it settles. */}
      <p class="sr-only" role="status">{announced}</p>

      {natal.calendarPositions && (
        <CalendarSubscribe locale={locale} positions={natal.calendarPositions} />
      )}

      {/* The selected transit, foregrounded. */}
      {(selectedAspect || selectedBody) && (
        <div class="tring__focus" role="status">
          {selectedAspect && (
            <>
              <span class="tring__focus-receipt mono">
                <PlanetGlyph body={selectedAspect.outer} size={13} class="pg-inline" /> {planetLabel(locale, selectedAspect.outer)}
                {' '}<AspectGlyph type={selectedAspect.type} size={13} class="pg-inline" /> {aspectLabel(locale, selectedAspect.type)}
                {' '}{t(locale, 'natal')} <PlanetGlyph body={selectedAspect.inner} size={13} class="pg-inline" /> {planetLabel(locale, selectedAspect.inner)}
                {' · '}{t(locale, 'orb')} {selectedAspect.orb.toFixed(1)}°
              </span>
              <p class="tring__focus-read">{transitLine(selectedAspect.outer, selectedAspect.type, selectedAspect.inner)}</p>
            </>
          )}
          {!selectedAspect && selectedBody && (
            <span class="tring__focus-receipt mono">
              <PlanetGlyph body={selectedBody.body} size={13} class="pg-inline" /> {planetLabel(locale, selectedBody.body)}
              {' · '}{formatLongitude(selectedBody.lon, locale)}{selectedBody.retrograde ? ' ℞' : ''}
            </span>
          )}
        </div>
      )}

      {/* The active transits at `when` — the accessible, reduced-motion view. */}
      <p class="syn__tally mono">
        {overlay.aspects.length === 0
          ? `${c.noContacts} ${TRANSIT_ORB}° ${c.ofExact}`
          : `${overlay.aspects.length} ${overlay.aspects.length === 1 ? t(locale, 'activeTransitWithin') : t(locale, 'activeTransitsWithin')} ${TRANSIT_ORB}° ${c.ofExact}`}
        {' · '}{c.moonOmitted}
      </p>

      <div class="syn__aspects">
        {overlay.aspects.map((a) => {
          const id = overlayAspectId(a);
          return (
            <button
              class={`syn__aspect tring__row${sel === id ? ' is-focus' : ''}`}
              type="button"
              key={id}
              onClick={() => setSel((prev) => (prev === id ? null : id))}
            >
              <span class="syn__aspect-receipt mono">
                <PlanetGlyph body={a.outer} size={13} class="pg-inline" /> {planetLabel(locale, a.outer)} <AspectGlyph type={a.type} size={13} class="pg-inline" /> {aspectLabel(locale, a.type)} {t(locale, 'natal')} <PlanetGlyph body={a.inner} size={13} class="pg-inline" /> {planetLabel(locale, a.inner)} · {t(locale, 'orb')} {a.orb.toFixed(1)}°
              </span>
              <span class="syn__aspect-read">{transitLine(a.outer, a.type, a.inner)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
