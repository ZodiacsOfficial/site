/**
 * The Time-Lens rail's lazy body: one natal wheel, three other skies.
 * Loaded only after a lens is chosen; the host owns the rail buttons and
 * hands the Wheel this module's overlay renderer through an opaque closure
 * (spec-delta #14: nothing here may static-import a module the calculator
 * already ships — the engine, scans, and time modules arrive by dynamic
 * import inside this chunk).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { buildTransitOverlay } from '../../../lib/scene/overlay';
import { overlayAspectId, type WheelOverlay } from '../../../lib/scene/types';
import { collisionNudge } from '../../../lib/scene/layout';
import { findInterAspects, type InterAspect } from '../../../lib/engine/synastry';
import { renderTransitOverlay } from '../../transit/renderTransitOverlay';
import type { Locale } from '../../../lib/i18n';
import { intlLocale } from '../../../lib/i18n/dates';
import type { WheelGeometry } from '../../../lib/wheel/Wheel';
import type { Chart } from '../../../lib/engine/types';
import type { EngineLoader } from '../../../lib/hooks/useEngine';
import { degreeInSign, signForLongitude } from '../../../lib/signs';
import {
  LENS_CHROME, PROGRESSED_MOON, PROGRESSED_SUN_NOTE, SR_ASC, type LensId,
} from './copy';

const GLYPH_ASPECT: Record<string, string> = {
  conjunction: '☌', sextile: '⚹', square: '□', trine: '△', opposition: '☍',
};

/** Per-lens orb caps: transits read wide, progressions read tight. */
const ORB_CAP: Record<LensId, number> = { sky: 3, progressed: 1, return: 2 };

interface LensSky {
  bodies: { body: string; lon: number; retrograde: boolean }[];
  /** Solar-return instant (return lens only). */
  instant?: Date;
  /** SR ascendant longitude when the return chart is located. */
  srAsc?: number | null;
}

export interface ChartLensProps {
  lens: LensId;
  chart: Chart;
  locale: Locale;
  loadEngine: EngineLoader;
  track: (name: string, props: Record<string, string>) => void;
  /** Hands the host a bound Wheel-overlay renderer (or null to clear). */
  onRing: (renderer: ((geo: WheelGeometry) => ComponentChildren) | null) => void;
}

async function computeLensSky(lens: LensId, chart: Chart, loadEngine: EngineLoader): Promise<LensSky> {
  const now = new Date();
  if (lens === 'sky') {
    const engine = await loadEngine();
    return { bodies: engine.computeBodies(now) };
  }
  if (lens === 'progressed') {
    const { progressedBodies } = await import('../../../lib/engine/progressions');
    return { bodies: progressedBodies(chart.input.utc, now) };
  }
  const { solarReturnChart } = await import('../../../lib/engine/solar-return');
  const natalSun = chart.bodies.find((b) => b.body === 'Sun');
  if (!natalSun) throw new Error('No natal Sun in chart.');
  const location = chart.input.latitude != null && chart.input.longitude != null
    ? { latitude: chart.input.latitude, longitude: chart.input.longitude }
    : null;
  const sr = solarReturnChart(natalSun.lon, now, location, chart.houses?.system ?? 'whole');
  return { bodies: sr.bodies, instant: sr.input.utc, srAsc: sr.angles?.asc ?? null };
}

export default function ChartLens({ lens, chart, locale, loadEngine, track, onRing }: ChartLensProps) {
  const c = LENS_CHROME[locale] ?? LENS_CHROME.en;
  const [sky, setSky] = useState<LensSky | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSky(null);
    setFocus(null);
    computeLensSky(lens, chart, loadEngine)
      .then((computed) => { if (!cancelled) setSky(computed); })
      .catch(() => { if (!cancelled) setSky({ bodies: [] }); });
    if (lens === 'return') track('srchart_view', { via: 'lens' });
    return () => { cancelled = true; };
  }, [lens, chart, loadEngine]);

  // Contacts: outer sky against the natal chart, capped per lens. The sky
  // lens leaves the Moon on the ring but out of the list (it laps the chart
  // in a month); the progressed Moon IS the story, so it stays.
  const contacts = useMemo<InterAspect[]>(() => {
    if (!sky) return [];
    const outer = lens === 'sky' ? sky.bodies.filter((b) => b.body !== 'Moon') : sky.bodies;
    return findInterAspects(outer, chart.bodies)
      .filter((hit) => hit.orb <= ORB_CAP[lens])
      .sort((x, y) => x.orb - y.orb);
  }, [sky, chart.bodies, lens]);

  const overlay = useMemo<WheelOverlay | null>(() => {
    if (!sky || !sky.bodies.length) return null;
    const label = lens === 'sky' ? c.skyRingLabel : lens === 'progressed' ? c.progressedRingLabel : c.returnRingLabel;
    const base = buildTransitOverlay(label, sky.bodies, contacts, null);
    const valid = focus && base.aspects.some((a) => overlayAspectId(a) === focus) ? focus : null;
    return valid ? { ...base, focus: valid } : base;
  }, [sky, contacts, focus, lens, c]);

  // The natal wheel fans crowded bodies; chords must land on drawn marks.
  const natalDraw = useMemo(() => collisionNudge(chart.bodies), [chart.bodies]);

  useEffect(() => {
    if (!overlay) {
      onRing(null);
      return;
    }
    const dashed = lens === 'sky'; // dashed = the moving sky; solid = a fixed self
    onRing((geo: WheelGeometry) => renderTransitOverlay(
      overlay,
      (name) => natalDraw.get(name) ?? null,
      (id) => setFocus(id),
      geo,
      { dashedMarkers: dashed },
    ));
    return () => onRing(null);
  }, [overlay, natalDraw, lens, onRing]);

  const noTime = chart.input.timeKnown === false || chart.flags.includes('no-time');
  const noPlace = chart.input.latitude == null;

  const progressedMoon = lens === 'progressed' && sky
    ? sky.bodies.find((b) => b.body === 'Moon') ?? null : null;
  const progressedSun = lens === 'progressed' && sky
    ? sky.bodies.find((b) => b.body === 'Sun') ?? null : null;

  const intro = lens === 'sky' ? c.skyIntro : lens === 'progressed' ? c.progressedIntro : c.returnIntro;

  return (
    <div class="lens" data-lens={lens}>
      <p class="lens__intro">{intro}</p>

      {!sky && <p class="lens__loading mono" role="status">{c.loading}</p>}

      {sky && lens === 'return' && sky.instant && (
        <p class="lens__receipt mono" data-lens-receipt>
          {c.returnInstant}: {sky.instant.toISOString().replace('T', ' · ').slice(0, 21)} UTC
          {' · '}{c.localTime}: {sky.instant.toLocaleString(intlLocale(locale), {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}

      {sky && contacts.length > 0 && (
        <div class="lens__contacts">
          <span class="lens__contacts-label">{c.tightestNow}</span>
          <ul role="list">
            {contacts.slice(0, 3).map((hit) => {
              const id = `${hit.a}-${hit.type}-${hit.b}`;
              return (
                <li key={id}>
                  <button
                    type="button"
                    class={`lens__contact${focus === id ? ' is-active' : ''}`}
                    onClick={() => setFocus(focus === id ? null : id)}
                    data-lens-contact={id}
                  >
                    <span class="mono">{hit.a} {GLYPH_ASPECT[hit.type]} {hit.b}</span>
                    <span class="lens__orb mono">{hit.orb.toFixed(1)}°</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {sky && contacts.length === 0 && <p class="lens__none">{c.noContacts}</p>}

      {locale === 'en' && progressedMoon && (
        <p class="lens__line" data-lens-corpus="moon">
          {PROGRESSED_MOON[signForLongitude(progressedMoon.lon).slug] ?? ''}
        </p>
      )}
      {locale === 'en' && progressedSun && (
        <p class="lens__line lens__line--faint" data-lens-corpus="sun">
          {PROGRESSED_SUN_NOTE
            .replace('{degree}', `${Math.floor(degreeInSign(progressedSun.lon))}°`)
            .replace('{sign}', signForLongitude(progressedSun.lon).name)}
        </p>
      )}
      {locale === 'en' && lens === 'return' && sky?.srAsc != null && (
        <p class="lens__line" data-lens-corpus="sr-asc">
          {SR_ASC[signForLongitude(sky.srAsc).slug] ?? ''}
        </p>
      )}

      {lens === 'progressed' && <p class="lens__note">{c.progressedAngles}</p>}
      {lens !== 'return' && noTime && <p class="lens__note">{c.noTimeNote}</p>}
      {lens === 'return' && noPlace && <p class="lens__note">{c.noPlaceNote}</p>}
      {lens === 'sky' && (
        <p class="lens__note">
          {c.transitsLink.split('/transits/')[0]}
          <a href="/transits/">/transits/</a>
          {c.transitsLink.split('/transits/')[1]}
        </p>
      )}

      <p class="lens__trust mono">{c.trustLine}</p>
    </div>
  );
}
