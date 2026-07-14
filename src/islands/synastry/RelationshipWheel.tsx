/**
 * The Relationship Wheel's lazy result module. It owns all three comparison
 * views so the /compatibility/ form stays light: the original bi-wheel, a
 * chart-A-by-chart-B aspect grid, and a house-free composite wheel.
 */
import { useMemo, useRef, useState } from 'preact/hooks';
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
import { AspectGrid } from './AspectGrid';
import { CompositePanel } from './CompositePanel';
import {
  buildCompositeTabData,
  buildRelationshipGrid,
  relationshipContactId,
  type RelationshipContact,
  type RelationshipPointName,
} from './relationshipData';
import { renderRelationshipAngleContact } from './renderRelationshipAngleContact';
import { synastryCorpusLine } from './synastryLines';
import './relationship.css';

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
    views: 'Relationship chart views',
    wheel: 'Wheel',
    grid: 'Grid',
    composite: 'Composite',
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
    views: 'Vistas de la relación',
    wheel: 'Rueda',
    grid: 'Cuadrícula',
    composite: 'Compuesta',
  },
} as const;

const TAB_ORDER = ['wheel', 'grid', 'composite'] as const;
type RelationshipTab = typeof TAB_ORDER[number];

const fmt = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

/** South Node stays off drawn wheels — the sitewide convention. */
const drawable = (person: WheelPerson) => person.bodies.filter((point) => point.body !== 'South Node');
const isAngle = (name: RelationshipPointName): name is 'ASC' | 'MC' => name === 'ASC' || name === 'MC';

function track(name: 'grid_select' | 'composite_view'): void {
  const analytics = (globalThis as typeof globalThis & {
    zodiacsAnalytics?: { track?: (event: string, props: Record<string, never>) => void };
  }).zodiacsAnalytics;
  analytics?.track?.(name, {});
}

function ContactPoint({ locale, name }: { locale: Locale; name: RelationshipPointName }) {
  return isAngle(name) ? <>{name}</> : (
    <><PlanetGlyph body={name} size={13} class="pg-inline" /> {planetLabel(locale, name)}</>
  );
}

function contactReading(
  aLabel: string,
  bLabel: string,
  contact: Pick<InterAspect, 'a' | 'b' | 'type'>,
): { text: string; curated: boolean } {
  const curated = synastryCorpusLine(contact.a, contact.b, contact.type);
  return {
    text: curated ?? synastryLine(aLabel, contact.a, bLabel, contact.b, contact.type),
    curated: curated !== null,
  };
}

export default function RelationshipWheel({ locale, a, b, summary }: RelationshipWheelProps) {
  const c = COPY[locale] ?? COPY.en;
  const [tab, setTab] = useState<RelationshipTab>('wheel');
  const [flipped, setFlipped] = useState(false);
  // Canonical focus ids are always chart-A-first and live above every tab.
  const [sel, setSel] = useState<string | null>(null);
  const compositeTracked = useRef(false);

  const inner = flipped ? b : a;
  const outer = flipped ? a : b;
  const canonicalId = (aspect: InterAspect) => `${aspect.a}-${aspect.type}-${aspect.b}`;
  const grid = useMemo(() => buildRelationshipGrid(a, b), [a, b]);
  const composite = useMemo(() => buildCompositeTabData(a.bodies, b.bodies), [a.bodies, b.bodies]);

  // The overlay wants aspects oriented outer-first; summary aspects are
  // chart-A-first. Reorient while remembering each chord's canonical id.
  const { overlayBase, chordToCanonical } = useMemo(() => {
    const map = new Map<string, string>();
    const oriented: InterAspect[] = summary.aspects.map((aspect) => {
      const reoriented: InterAspect = flipped
        ? aspect
        : {
          a: aspect.b,
          aLon: aspect.bLon,
          b: aspect.a,
          bLon: aspect.aLon,
          type: aspect.type,
          orb: aspect.orb,
        };
      map.set(`${reoriented.a}-${reoriented.type}-${reoriented.b}`, canonicalId(aspect));
      return reoriented;
    });
    return {
      overlayBase: buildTransitOverlay(
        fmt(c.ringLabel, { name: outer.label }),
        drawable(outer),
        oriented,
        null,
      ),
      chordToCanonical: map,
    };
    // A compare remounts the module; labels and orientation are the only
    // live values this ring calculation needs after that boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, flipped, outer.label]);

  const overlayFocusId = sel
    ? [...chordToCanonical.entries()].find(([, canonical]) => canonical === sel)?.[0] ?? null
    : null;
  const overlay = overlayFocusId ? { ...overlayBase, focus: overlayFocusId } : overlayBase;
  const innerBodies = useMemo(() => drawable(inner), [inner]);
  const innerDraw = useMemo(() => collisionNudge(innerBodies), [innerBodies]);
  const selectedContact = sel
    ? grid.contacts.find((contact) => relationshipContactId(contact) === sel) ?? null
    : null;
  const selectedBody = sel?.startsWith('transit:')
    ? overlay.bodies.find((point) => overlayBodyId(point.body) === sel) ?? null
    : null;

  function onRingSelect(id: string | null) {
    if (id === null) {
      setSel(null);
      return;
    }
    setSel((previous) => {
      const canonical = chordToCanonical.get(id) ?? id;
      return previous === canonical ? null : canonical;
    });
  }

  function activateTab(next: RelationshipTab) {
    setTab(next);
    if (next === 'composite' && !compositeTracked.current) {
      compositeTracked.current = true;
      track('composite_view');
    }
  }

  function onTabKeyDown(event: KeyboardEvent) {
    const current = TAB_ORDER.indexOf(tab);
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % TAB_ORDER.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TAB_ORDER.length - 1;
    else return;
    event.preventDefault();
    const nextTab = TAB_ORDER[next];
    activateTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`relationship-tab-${nextTab}`)?.focus());
  }

  function onGridSelect(contact: RelationshipContact) {
    setSel(relationshipContactId(contact));
    track('grid_select');
  }

  const focusedReading = selectedContact
    ? contactReading(a.label, b.label, selectedContact)
    : null;

  return (
    <div class="rwheel">
      <div class="rwheel__tabs" role="tablist" aria-label={c.views} onKeyDown={onTabKeyDown}>
        {TAB_ORDER.map((name) => (
          <button
            key={name}
            id={`relationship-tab-${name}`}
            type="button"
            role="tab"
            class="rwheel__tab"
            aria-selected={tab === name}
            aria-controls={`relationship-panel-${name}`}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => activateTab(name)}
            data-relationship-tab={name}
          >
            {c[name]}
          </button>
        ))}
      </div>

      {tab === 'wheel' && (
        <section
          id="relationship-panel-wheel"
          role="tabpanel"
          aria-labelledby="relationship-tab-wheel"
          class="rwheel__panel"
          data-relationship-panel="wheel"
        >
          <p class="tring__caption mono">{fmt(c.caption, { a: inner.label, b: outer.label })}</p>

          <div class="tring__wheelbox">
            <Wheel
              bodies={innerBodies}
              asc={inner.asc}
              mc={inner.mc}
              cusps={inner.cusps}
              aspects={[]}
              renderOverlay={(geometry) => (
                <>
                  {renderTransitOverlay(
                    overlay,
                    (name) => innerDraw.get(name) ?? null,
                    onRingSelect,
                    geometry,
                    { dashedMarkers: false },
                  )}
                  {renderRelationshipAngleContact(
                    selectedContact,
                    flipped,
                    (name) => innerDraw.get(name) ?? null,
                    (name) => overlayBase.bodies.find((point) => point.body === name)?.drawLon ?? null,
                    geometry,
                  )}
                </>
              )}
            />
          </div>

          <div class="rwheel__controls">
            <button
              class="btn btn--glass tring__step"
              type="button"
              onClick={() => { setFlipped((value) => !value); setSel(null); }}
              data-swap
            >
              <span>{fmt(c.swap, { name: outer.label })}</span>
              <span class="orb">⇄</span>
            </button>
          </div>
          <p class="field__help rwheel__hint">{c.tapHint}</p>

          {(selectedContact || selectedBody) && (
            <div class="tring__focus" role="status">
              {selectedContact && focusedReading && (
                <>
                  <span class="tring__focus-receipt mono">
                    {a.label}: <ContactPoint locale={locale} name={selectedContact.a} />
                    {' '}<AspectGlyph type={selectedContact.type} size={13} class="pg-inline" /> {aspectLabel(locale, selectedContact.type)}
                    {' '}{b.label}: <ContactPoint locale={locale} name={selectedContact.b} />
                    {' · '}{t(locale, 'orb')} {selectedContact.orb.toFixed(1)}°
                  </span>
                  {locale === 'en' && (
                    <p
                      class="tring__focus-read"
                      data-curated-line={focusedReading.curated ? '' : undefined}
                      data-fallback-line={focusedReading.curated ? undefined : ''}
                    >
                      {focusedReading.text}
                    </p>
                  )}
                </>
              )}
              {!selectedContact && selectedBody && (
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

          <span class="mono--label">{c.loudest}</span>
          <div class="syn__aspects">
            {summary.top.map((aspect) => {
              const id = canonicalId(aspect);
              const reading = contactReading(a.label, b.label, aspect);
              return (
                <button
                  class={`syn__aspect tring__row${sel === id ? ' is-focus' : ''}`}
                  type="button"
                  key={id}
                  onClick={() => setSel((previous) => (previous === id ? null : id))}
                >
                  <span class="syn__aspect-receipt mono">
                    <PlanetGlyph body={aspect.a} size={13} class="pg-inline" /> {a.label}: {planetLabel(locale, aspect.a)} <AspectGlyph type={aspect.type} size={13} class="pg-inline" /> {aspectLabel(locale, aspect.type)} <PlanetGlyph body={aspect.b} size={13} class="pg-inline" /> {b.label}: {planetLabel(locale, aspect.b)} · {t(locale, 'orb')} {aspect.orb.toFixed(1)}°
                  </span>
                  {locale === 'en' && (
                    <span
                      class="syn__aspect-read"
                      data-curated-line={reading.curated ? '' : undefined}
                      data-fallback-line={reading.curated ? undefined : ''}
                    >
                      {reading.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div class="syn__balances">
            {[{ person: a, balance: summary.elements.a }, { person: b, balance: summary.elements.b }].map(({ person, balance }) => (
              <div class="syn__balance" key={person.label}>
                <span class="syn__balance-name">{person.label}</span>
                {(['fire', 'earth', 'air', 'water'] as const).map((element) => (
                  <div class="syn__bar" key={element}>
                    <span class="syn__bar-label mono--label">{elementLabel(element, locale)}</span>
                    <span class="syn__bar-track"><span class="syn__bar-fill" style={`width:${balance[element] * 10}%`} /></span>
                    <span class="syn__bar-n mono">{balance[element]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'grid' && (
        <section
          id="relationship-panel-grid"
          role="tabpanel"
          aria-labelledby="relationship-tab-grid"
          class="rwheel__panel"
          data-relationship-panel="grid"
        >
          <AspectGrid
            locale={locale}
            aLabel={a.label}
            bLabel={b.label}
            grid={grid}
            selectedId={sel}
            onSelect={onGridSelect}
          />
        </section>
      )}

      {tab === 'composite' && (
        <section
          id="relationship-panel-composite"
          role="tabpanel"
          aria-labelledby="relationship-tab-composite"
          class="rwheel__panel"
          data-relationship-panel="composite"
        >
          <CompositePanel locale={locale} data={composite} />
        </section>
      )}
    </div>
  );
}
