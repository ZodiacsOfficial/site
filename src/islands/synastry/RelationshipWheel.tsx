/**
 * The Relationship Wheel — two people's charts on one bi-wheel. One person
 * is the inner natal wheel, the other rides the outer ring (solid marks — a
 * fixed chart, not the moving sky), and the cross-chart aspects draw as
 * chords between the rings. Tap a chord or a row to read that connection;
 * swap who sits inside with one button.
 *
 * Lazy-loaded by SynastryCalculator on the first compare, the same pattern
 * as the Transit Ring: /compatibility/ pays for the wheel only when there
 * are two charts to draw. All the hard-won ring lessons apply: focus is
 * validated against the live chord list, chord endpoints land on
 * collision-fanned markers, and the aspect list stays the accessible,
 * text-first structure.
 */
import { useMemo, useState } from 'preact/hooks';
import Wheel from '../../lib/wheel/Wheel';
import PlanetGlyph from '../../components/PlanetGlyph';
import AspectGlyph from '../../components/AspectGlyph';
import type { InterAspect, PairSummary } from '../../lib/engine/synastry';
import { buildTransitOverlay } from '../../lib/scene/overlay';
import { collisionNudge } from '../../lib/scene/layout';
import { overlayBodyId } from '../../lib/scene/types';
import { renderTransitOverlay } from '../transit/renderTransitOverlay';
import { synastryLine } from '../../lib/compat';
import { elementLabel, formatLongitude } from '../../lib/signs';
import { aspectLabel, planetLabel } from '../../lib/i18n/astrology';
import { t, type Locale } from '../../lib/i18n';

export interface WheelPerson {
  label: string;
  /** Bodies with retrograde where known — the ring draws from these. */
  bodies: { body: string; lon: number; retrograde?: boolean }[];
  asc: number | null;
  mc: number | null;
  cusps: number[] | null;
  timeKnown: boolean;
}

export interface RelationshipWheelProps {
  locale: Locale;
  a: WheelPerson;
  b: WheelPerson;
  summary: PairSummary;
}

// Module-local copy (the SHARE_COPY/TOUR_COPY precedent) — the lazy chunk
// keeps these strings out of /compatibility/'s static closure.
const COPY = {
  en: {
    caption: 'Inner wheel: {a}. Outer ring: {b}. The lines between are where their charts touch.',
    swap: 'Put {name} inside',
    tapHint: 'Tap a connecting line — or a row below — to read that contact. Tap a planet on the outer ring for its position.',
    ringLabel: "{name}'s chart, on the outer ring",
    tally: 'cross-chart aspects',
    easeful: 'easeful',
    charged: 'charged',
    loudest: 'The loudest contacts:',
  },
  es: {
    caption: 'Rueda interior: {a}. Anillo exterior: {b}. Las líneas entre ambos son donde sus cartas se tocan.',
    swap: 'Poner a {name} dentro',
    tapHint: 'Toca una línea de conexión — o una fila abajo — para leer ese contacto. Toca un planeta del anillo exterior para ver su posición.',
    ringLabel: 'La carta de {name}, en el anillo exterior',
    tally: 'aspectos entre cartas',
    easeful: 'fáciles',
    charged: 'tensos',
    loudest: 'Los contactos más fuertes:',
  },
} as const;

const fmt = (s: string, values: Record<string, string>) =>
  s.replace(/\{(\w+)\}/g, (m, k) => values[k] ?? m);

/** South Node stays off drawn wheels — the sitewide convention. */
const drawable = (p: WheelPerson) => p.bodies.filter((x) => x.body !== 'South Node');

export default function RelationshipWheel({ locale, a, b, summary }: RelationshipWheelProps) {
  const c = COPY[locale] ?? COPY.en;
  // Who sits inside. Canonical focus ids are always A-first
  // (`${aBody}-${type}-${bBody}`) so they survive a swap.
  const [flipped, setFlipped] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  const inner = flipped ? b : a;
  const outer = flipped ? a : b;

  const canonicalId = (asp: InterAspect) => `${asp.a}-${asp.type}-${asp.b}`;

  // The overlay wants aspects oriented outer-first; summary aspects are
  // A-first. Reorient (and remember each chord's canonical id).
  const { overlayBase, chordToCanonical } = useMemo(() => {
    const map = new Map<string, string>();
    const oriented: InterAspect[] = summary.aspects.map((asp) => {
      const o: InterAspect = flipped
        ? asp
        : { a: asp.b, aLon: asp.bLon, b: asp.a, bLon: asp.aLon, type: asp.type, orb: asp.orb };
      map.set(`${o.a}-${o.type}-${o.b}`, canonicalId(asp));
      return o;
    });
    const overlay = buildTransitOverlay(
      fmt(c.ringLabel, { name: outer.label }),
      drawable(outer),
      oriented,
      null,
    );
    return { overlayBase: overlay, chordToCanonical: map };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, flipped, outer.label]);

  // Focus only survives while its chord exists in the current orientation.
  const overlayFocusId = sel
    ? [...chordToCanonical.entries()].find(([, canon]) => canon === sel)?.[0] ?? null
    : null;
  const overlay = overlayFocusId ? { ...overlayBase, focus: overlayFocusId } : overlayBase;

  const innerBodies = useMemo(() => drawable(inner), [inner]);
  const innerDraw = useMemo(() => collisionNudge(innerBodies), [innerBodies]);

  const selectedAspect = sel ? summary.aspects.find((asp) => canonicalId(asp) === sel) ?? null : null;
  const selectedBody = sel && !chordToCanonical.has(sel) && sel.startsWith('transit:')
    ? overlay.bodies.find((x) => overlayBodyId(x.body) === sel) ?? null
    : null;

  function onRingSelect(id: string | null) {
    if (id === null) { setSel(null); return; }
    // Chord taps arrive overlay-oriented; body taps arrive as transit:{body}.
    setSel((prev) => {
      const canonical = chordToCanonical.get(id) ?? id;
      return prev === canonical ? null : canonical;
    });
  }

  return (
    <div class="rwheel">
      <p class="tring__caption mono">{fmt(c.caption, { a: inner.label, b: outer.label })}</p>

      <div class="tring__wheelbox">
        <Wheel
          bodies={innerBodies}
          asc={inner.asc}
          mc={inner.mc}
          cusps={inner.cusps}
          aspects={[]}
          renderOverlay={(geo) => renderTransitOverlay(
            overlay,
            (name) => innerDraw.get(name) ?? null,
            onRingSelect,
            geo,
            { dashedMarkers: false },
          )}
        />
      </div>

      <div class="rwheel__controls">
        <button class="btn btn--glass tring__step" type="button" onClick={() => { setFlipped((f) => !f); setSel(null); }} data-swap>
          <span>{fmt(c.swap, { name: outer.label })}</span>
          <span class="orb">⇄</span>
        </button>
      </div>
      <p class="field__help rwheel__hint">{c.tapHint}</p>

      {/* The focused contact, foregrounded. */}
      {(selectedAspect || selectedBody) && (
        <div class="tring__focus" role="status">
          {selectedAspect && (
            <>
              <span class="tring__focus-receipt mono">
                <PlanetGlyph body={selectedAspect.a} size={13} class="pg-inline" /> {a.label}: {planetLabel(locale, selectedAspect.a)}
                {' '}<AspectGlyph type={selectedAspect.type} size={13} class="pg-inline" /> {aspectLabel(locale, selectedAspect.type)}
                {' '}<PlanetGlyph body={selectedAspect.b} size={13} class="pg-inline" /> {b.label}: {planetLabel(locale, selectedAspect.b)}
                {' · '}{t(locale, 'orb')} {selectedAspect.orb.toFixed(1)}°
              </span>
              {/* The reading sentence exists in English only (compat.ts has no
                  ES tables — master-plan P10). The receipt is fully localized. */}
              {locale === 'en' && (
                <p class="tring__focus-read">
                  {synastryLine(a.label, selectedAspect.a, b.label, selectedAspect.b, selectedAspect.type)}
                </p>
              )}
            </>
          )}
          {!selectedAspect && selectedBody && (
            <span class="tring__focus-receipt mono">
              {outer.label}: <PlanetGlyph body={selectedBody.body} size={13} class="pg-inline" /> {planetLabel(locale, selectedBody.body)}
              {' · '}{formatLongitude(selectedBody.lon, locale)}{selectedBody.retrograde ? ' ℞' : ''}
            </span>
          )}
        </div>
      )}

      <p class="syn__tally mono">
        {summary.aspects.length} {c.tally} ·
        {' '}{summary.easeful} {c.easeful} ({aspectLabel(locale, 'trine')}/{aspectLabel(locale, 'sextile')}) ·
        {' '}{summary.charged} {c.charged} ({aspectLabel(locale, 'square')}/{aspectLabel(locale, 'opposition')})
      </p>

      {/* The loudest contacts — rows double as chord-focus controls. */}
      <span class="mono--label">{c.loudest}</span>
      <div class="syn__aspects">
        {summary.top.map((asp) => {
          const id = canonicalId(asp);
          return (
            <button
              class={`syn__aspect tring__row${sel === id ? ' is-focus' : ''}`}
              type="button"
              key={id}
              onClick={() => setSel((prev) => (prev === id ? null : id))}
            >
              <span class="syn__aspect-receipt mono">
                <PlanetGlyph body={asp.a} size={13} class="pg-inline" /> {a.label}: {planetLabel(locale, asp.a)} <AspectGlyph type={asp.type} size={13} class="pg-inline" /> {aspectLabel(locale, asp.type)} <PlanetGlyph body={asp.b} size={13} class="pg-inline" /> {b.label}: {planetLabel(locale, asp.b)} · {t(locale, 'orb')} {asp.orb.toFixed(1)}°
              </span>
              {/* The sentence is EN-only (compat.ts, master-plan P10); the
                  receipt above is fully localized. */}
              {locale === 'en' && (
                <span class="syn__aspect-read">
                  {synastryLine(a.label, asp.a, b.label, asp.b, asp.type)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div class="syn__balances">
        {[{ p: a, bal: summary.elements.a }, { p: b, bal: summary.elements.b }].map(({ p, bal }) => (
          <div class="syn__balance" key={p.label}>
            <span class="syn__balance-name">{p.label}</span>
            {(['fire', 'earth', 'air', 'water'] as const).map((el) => (
              <div class="syn__bar" key={el}>
                <span class="syn__bar-label mono--label">{elementLabel(el, locale)}</span>
                <span class="syn__bar-track"><span class="syn__bar-fill" style={`width:${bal[el] * 10}%`} /></span>
                <span class="syn__bar-n mono">{bal[el]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
