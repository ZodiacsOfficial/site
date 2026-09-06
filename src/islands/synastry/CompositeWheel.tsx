import type { ComponentChildren } from 'preact';
import Wheel, { type WheelGeometry } from '../../lib/wheel/Wheel';
import { technicalCollisionFan } from '../../lib/wheel/technical-layout';
import { bodyLeaderPath } from '../../lib/wheel/body-leader';
import { PLANET_GLYPH } from '../../lib/glyphs/paths';
import { signForLongitude } from '../../lib/signs';
import { compositeAspectId, compositeBodyId, type CompositeTabData } from './relationshipData';

const COLORS: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.62)', sextile: 'rgba(169,212,196,0.72)',
  trine: 'rgba(182,212,228,0.78)', square: 'rgba(222,142,121,0.78)', opposition: 'rgba(224,169,180,0.78)',
};

/** Only draw locations move. Midpoint longitudes and aspect endpoints stay exact. */
export function compositeWheelLayout(data: CompositeTabData): Map<string, number> {
  return technicalCollisionFan(data.points.filter((point) => point.body !== 'South Node')
    .sort((a, b) => a.body.localeCompare(b.body, 'en')), 14);
}

interface Props {
  data: CompositeTabData;
  label: string;
  selection?: string | null;
  onSelect?: (id: string) => void;
  size?: number;
  /** Export embeds artwork before assigning active SVG image URLs. */
  deferIcons?: boolean;
}

export function CompositeWheel({ data, label, selection = null, onSelect, size = 420, deferIcons = false }: Props) {
  const draw = compositeWheelLayout(data);
  const marks = (geo: WheelGeometry): ComponentChildren => (
    <g data-composite-marks>
      {/* Midpoints have no speeds: every chord is solid, without a natal scene. */}
      {data.aspects.map((aspect) => {
        const a = data.points.find((point) => point.body === aspect.a);
        const b = data.points.find((point) => point.body === aspect.b);
        if (!a || !b) return null;
        const p = geo.pt(a.lon, geo.rAspects);
        const q = geo.pt(b.lon, geo.rAspects);
        const id = compositeAspectId(aspect);
        const selected = selection === id;
        return (
          <g key={id} data-composite-hit={id} data-selected={selected ? 'true' : undefined}
            onClick={onSelect ? () => onSelect(id) : undefined}>
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={COLORS[aspect.type]}
              stroke-width={selected ? 3 : 1} stroke-linecap="round" pointer-events="none" />
            {selected && <>
              <circle cx={p.x} cy={p.y} r={size * 0.012} fill={COLORS[aspect.type]} pointer-events="none" />
              <circle cx={q.x} cy={q.y} r={size * 0.012} fill={COLORS[aspect.type]} pointer-events="none" />
            </>}
            {onSelect && <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="transparent"
              stroke-width={size * 0.028} stroke-linecap="round" class="wheel__hit" />}
          </g>
        );
      })}
      {data.points.filter((point) => point.body !== 'South Node').map((point) => {
        const id = compositeBodyId(point.body);
        const drawLon = draw.get(point.body) ?? point.lon;
        const p = geo.pt(drawLon, geo.rBodies);
        const tick = geo.pt(point.lon, geo.rSignsIn);
        const end = geo.pt(point.lon, geo.rSignsIn - size * 0.014);
        const hue = signForLongitude(point.lon).hue;
        const leader = bodyLeaderPath(point.lon, drawLon, geo.rSignsIn - size * 0.014,
          geo.rBodies + size * 0.033, geo.pt);
        const selected = selection === id;
        const glyphSize = size * 0.05;
        return (
          <g class="wheel__body" key={id} data-composite-hit={id} data-selected={selected ? 'true' : undefined}
            data-composite-true-longitude={point.lon} data-composite-draw-longitude={drawLon}
            onClick={onSelect ? () => onSelect(id) : undefined}>
            <line x1={tick.x} y1={tick.y} x2={end.x} y2={end.y} stroke={hue} stroke-width="1.4" pointer-events="none" />
            {leader && <path d={leader} fill="none" stroke={hue} stroke-opacity="0.6" stroke-width="1" pointer-events="none" />}
            {selected && <circle cx={p.x} cy={p.y} r={size * 0.044} fill="none" stroke={hue} stroke-width="1.8" pointer-events="none" />}
            <circle data-composite-marker={point.body} cx={p.x} cy={p.y} r={size * 0.033}
              fill="rgba(15,18,26,0.92)" stroke={hue} stroke-opacity="0.55" stroke-width="1" />
            <g transform={`translate(${p.x} ${p.y}) scale(${glyphSize / 24}) translate(-12 -12)`}
              fill="none" stroke="#EEF1F7" stroke-width={1.4 * 24 / glyphSize} stroke-linecap="round" stroke-linejoin="round"
              style="color:#EEF1F7" pointer-events="none" dangerouslySetInnerHTML={{ __html: PLANET_GLYPH[point.body] ?? '' }} />
          </g>
        );
      })}
    </g>
  );
  // Use only the shared zodiac frame/geometry. Supplying a fabricated natal
  // scene would invent houses, speeds and applying/separating information.
  return <Wheel bodies={[]} aspects={[]} asc={null} mc={null} cusps={null}
    size={size} ariaLabel={label} renderOverlay={marks} deferIcons={deferIcons} />;
}
