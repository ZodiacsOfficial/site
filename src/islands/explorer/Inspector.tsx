/**
 * The Explorer inspector — the "place card" for whatever is selected on the
 * wheel. Desktop: a quiet panel docked beside the chart. Mobile (<960px):
 * a bottom sheet with two detents (half / full), dragged by its handle or
 * dismissed to clear the selection.
 *
 * Content is receipts-first (mono facts: position, house, speed, dignity,
 * orb) with one interpretation line and one deeper link into /learn/ —
 * the museum-label register, never a paragraph dump. Every related entity
 * shown is itself selectable, so the inspector is also navigation.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import PlanetGlyph from '../../components/PlanetGlyph';
import AspectGlyph from '../../components/AspectGlyph';
import {
  formatLongitude, signBySlug, signDates, signForLongitude, signName,
  elementLabel, modalityLabel,
} from '../../lib/signs';
import { natalAspectLine, planetInHouseLine } from '../../lib/natal';
import { aspectLabel, planetLabel } from '../../lib/i18n/astrology';
import { localizePath, t, type Locale } from '../../lib/i18n';
import type { ChartSceneModel, EntityRef } from '../../lib/scene/types';
import { parseEntityId } from '../../lib/scene/types';

const HOUSE_SLUG = [
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
  'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
];

const DIGNITY_KEY = {
  domicile: 'dignityDomicile',
  exaltation: 'dignityExaltation',
  detriment: 'dignityDetriment',
  fall: 'dignityFall',
} as const;

interface Props {
  scene: ChartSceneModel;
  selection: EntityRef | null;
  onSelect: (e: EntityRef | null) => void;
  locale: Locale;
}

/** Small pastel sign disc (the icon tiers rule: ≤24px → 48 tier). */
function SignDisc({ slug, size = 20 }: { slug: string; size?: number }) {
  return (
    <picture class="insp__disc">
      <source srcset={`/assets/zodiac-icons/48/${slug}.avif`} type="image/avif" />
      <img src={`/assets/zodiac-icons/48/${slug}.webp`} width={size} height={size} alt="" decoding="async" />
    </picture>
  );
}

function Receipt({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="insp__row">
      <span class="mono--label">{label}</span>
      <span class="mono insp__val">{children}</span>
    </div>
  );
}

export default function Inspector({ scene, selection, onSelect, locale }: Props) {
  const [detent, setDetent] = useState<'half' | 'full'>('half');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dragFrom = useRef<number | null>(null);

  // New selection: sheet reopens at half height.
  useEffect(() => { setDetent('half'); }, [selection && JSON.stringify(selection)]);

  if (!selection) {
    return (
      <div class="insp insp--hint" data-explorer-inspector>
        <p class="insp__hint">{t(locale, 'explorerHint')}</p>
      </div>
    );
  }

  const learn = (path: string, label: string) => (
    <a class="insp__more" href={path}>{label} →</a>
  );

  let title: ComponentChildren = null;
  let body: ComponentChildren = null;

  switch (selection.kind) {
    case 'body': {
      const sb = scene.bodies.find((b) => b.body === selection.body);
      if (!sb) return null;
      const sign = signBySlug(sb.sign);
      title = (
        <>
          <PlanetGlyph body={sb.body} size={17} class="insp__pg" /> {planetLabel(locale, sb.body)}
          {sb.retrograde && <span class="mono insp__rx"> Rx</span>}
        </>
      );
      body = (
        <>
          <Receipt label={t(locale, 'position')}>
            {formatLongitude(sb.lon, locale)}
          </Receipt>
          <Receipt label={t(locale, 'sign')}>
            <button class="insp__chip" type="button" style={`--sign:${sign.hue}`} onClick={() => onSelect({ kind: 'sign', sign: sb.sign })}>
              <SignDisc slug={sb.sign} size={16} /> {signName(sign, locale)}
            </button>
          </Receipt>
          {sb.house != null && (
            <Receipt label={t(locale, 'house')}>
              <button class="insp__chip" type="button" onClick={() => onSelect({ kind: 'house', house: sb.house! })}>{sb.house}</button>
            </Receipt>
          )}
          <Receipt label={t(locale, 'speed')}>
            {sb.speed >= 0 ? '+' : '−'}{Math.abs(sb.speed).toFixed(2)}°/{t(locale, 'day')}
          </Receipt>
          {sb.dignity && (
            <Receipt label={t(locale, 'dignity')}>{t(locale, DIGNITY_KEY[sb.dignity])}</Receipt>
          )}
          {sb.aspects.length > 0 && (
            <div class="insp__aspects">
              <span class="mono--label">{t(locale, 'aspectsFound')}</span>
              <ul>
                {sb.aspects.map((id) => {
                  const ref = parseEntityId(id);
                  if (!ref || ref.kind !== 'aspect') return null;
                  const partner = ref.a === sb.body ? ref.b : ref.a;
                  const sa = scene.aspects.find((x) => x.a === ref.a && x.b === ref.b && x.type === ref.type);
                  return (
                    <li key={id}>
                      <button class="insp__chip" type="button" onClick={() => onSelect(ref)}>
                        <AspectGlyph type={ref.type} size={12} class="insp__pg" /> {aspectLabel(locale, ref.type)} · {planetLabel(locale, partner)}
                        {sa && <span class="insp__orb"> · {sa.orb.toFixed(1)}°</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {sb.house != null && <p class="insp__read">{planetInHouseLine(sb.body, sb.house)}</p>}
          {learn(`/learn/placements/${sb.body.toLowerCase().replace(' ', '-')}-in-${sb.sign}/`, `${planetLabel(locale, sb.body)} ${t(locale, 'readIn')} ${signName(sign, locale)}`)}
        </>
      );
      break;
    }
    case 'sign': {
      const sign = signBySlug(selection.sign);
      const occupants = scene.bodies.filter((b) => b.sign === selection.sign);
      title = <><SignDisc slug={selection.sign} size={22} /> {signName(sign, locale)}</>;
      body = (
        <>
          <Receipt label={t(locale, 'dates')}>{signDates(sign, locale)}</Receipt>
          <Receipt label={t(locale, 'element')}>{elementLabel(sign.element, locale)} · {modalityLabel(sign.modality, locale)}</Receipt>
          <Receipt label={t(locale, 'ruler')}>{planetLabel(locale, sign.ruler)}</Receipt>
          {occupants.length > 0 && (
            <div class="insp__aspects">
              <span class="mono--label">{t(locale, 'inThisSign')}</span>
              <ul>
                {occupants.map((b) => (
                  <li key={b.body}>
                    <button class="insp__chip" type="button" onClick={() => onSelect({ kind: 'body', body: b.body })}>
                      <PlanetGlyph body={b.body} size={12} class="insp__pg" /> {planetLabel(locale, b.body)} · {formatLongitude(b.lon, locale).split(' ')[0]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {learn(localizePath(locale, `/${selection.sign}/`), `${t(locale, 'read')} ${signName(sign, locale)}`)}
        </>
      );
      break;
    }
    case 'house': {
      const house = scene.houses?.find((hs) => hs.index === selection.house);
      if (!house) return null;
      title = <>{t(locale, 'house')} {house.index}</>;
      body = (
        <>
          <Receipt label={t(locale, 'cusp')}>{formatLongitude(house.cuspLon, locale)}</Receipt>
          <Receipt label={t(locale, 'span')}>{house.spanDeg.toFixed(1)}°</Receipt>
          {house.occupants.length > 0 ? (
            <div class="insp__aspects">
              <span class="mono--label">{t(locale, 'inThisHouse')}</span>
              <ul>
                {house.occupants.map((name) => (
                  <li key={name}>
                    <button class="insp__chip" type="button" onClick={() => onSelect({ kind: 'body', body: name })}>
                      <PlanetGlyph body={name} size={12} class="insp__pg" /> {planetLabel(locale, name)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p class="insp__read">{t(locale, 'emptyHouseNote')}</p>
          )}
          {learn(`/learn/houses/${HOUSE_SLUG[house.index - 1]}-house/`, `${t(locale, 'house')} ${house.index}`)}
        </>
      );
      break;
    }
    case 'aspect': {
      const sa = scene.aspects.find((x) => x.a === selection.a && x.b === selection.b && x.type === selection.type);
      if (!sa) return null;
      title = (
        <>
          <PlanetGlyph body={sa.a} size={15} class="insp__pg" /> {planetLabel(locale, sa.a)}
          {' '}<AspectGlyph type={sa.type} size={14} class="insp__pg" />{' '}
          <PlanetGlyph body={sa.b} size={15} class="insp__pg" /> {planetLabel(locale, sa.b)}
        </>
      );
      body = (
        <>
          <Receipt label={t(locale, 'orb')}>
            {sa.orb.toFixed(1)}° · {sa.applying ? t(locale, 'applying') : t(locale, 'separating')}
          </Receipt>
          <p class="insp__read">{natalAspectLine(sa.a, sa.type, sa.b)}</p>
          {learn(`/learn/aspects/${sa.type}/`, aspectLabel(locale, sa.type))}
        </>
      );
      break;
    }
    case 'angle': {
      if (!scene.angles) return null;
      const lon = scene.angles[selection.angle];
      const sign = signForLongitude(lon);
      const KEY = { asc: 'angleAscNote', dsc: 'angleDscNote', mc: 'angleMcNote', ic: 'angleIcNote' } as const;
      title = <>{selection.angle.toUpperCase()}</>;
      body = (
        <>
          <Receipt label={t(locale, 'position')}>{formatLongitude(lon, locale)}</Receipt>
          <p class="insp__read">{t(locale, KEY[selection.angle])}</p>
          {selection.angle === 'asc' && learn(localizePath(locale, '/rising-sign/'), signName(sign, locale) + ' ' + t(locale, 'rising').toLowerCase())}
        </>
      );
      break;
    }
  }

  const onHandlePointerDown = (e: PointerEvent) => {
    dragFrom.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandlePointerUp = (e: PointerEvent) => {
    if (dragFrom.current == null) return;
    const dy = e.clientY - dragFrom.current;
    dragFrom.current = null;
    if (dy < -40) setDetent('full');
    else if (dy > 40) (detent === 'full' ? setDetent('half') : onSelect(null));
  };

  return (
    <div class={`insp insp--card insp--${detent}`} data-explorer-inspector>
      {/* Sheet chrome exists in the DOM always; CSS shows it under 960px only. */}
      <div
        class="insp__handle"
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
        aria-hidden="true"
      />
      <div class="insp__head">
        <h3 class="insp__title" tabIndex={-1} ref={headingRef} data-inspector-heading>{title}</h3>
        <button class="insp__close" type="button" onClick={() => onSelect(null)} aria-label={t(locale, 'inspectorClose')}>×</button>
      </div>
      <div class="insp__body">{body}</div>
    </div>
  );
}
