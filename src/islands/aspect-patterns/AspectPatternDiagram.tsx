import type { AspectPattern, PatternBody } from '../../lib/engine/aspect-patterns';
import { technicalCollisionFan } from '../../lib/wheel/technical-layout';
import { signForLongitude } from '../../lib/signs';

export const PATTERN_EDGE_COLORS: Record<string, string> = {
  trine: '#B6D4E4', sextile: '#A9D4C4', square: '#DE8E79', opposition: '#E0A9B4',
};
const position = (lon: number, radius: number) => ({ x: 200 - radius * Math.cos(lon * Math.PI / 180), y: 200 + radius * Math.sin(lon * Math.PI / 180) });

/** Chords always meet true coordinates. Only the outer labels can fan. */
export function patternDiagramGeometry(points: readonly { body: PatternBody; lon: number }[]) {
  const draw = technicalCollisionFan([...points], 22);
  return points.map((point) => {
    const label = position(draw.get(point.body) ?? point.lon, 164);
    return { ...point, ...position(point.lon, 140), labelX: label.x, labelY: label.y };
  });
}

export function AspectPatternDiagram({ pattern, points, selectedEdge = null }: {
  pattern: AspectPattern; points: readonly { body: PatternBody; lon: number }[]; selectedEdge?: string | null;
}) {
  const marks = patternDiagramGeometry(points.filter((p) => pattern.members.includes(p.body)));
  return <svg viewBox="0 0 400 400" class="apat__diagram" aria-hidden="true" focusable="false" data-pattern-diagram>
    <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" stroke-opacity="0.25" />
    {Array.from({ length: 12 }, (_, index) => {
      const a = position(index * 30, 135), b = position(index * 30, 140);
      return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" stroke-opacity="0.45" />;
    })}
    {pattern.edges.map((edge) => {
      const a = marks.find((p) => p.body === edge.a)!, b = marks.find((p) => p.body === edge.b)!;
      return <line key={edge.key} data-pattern-chord={edge.key} data-orb={edge.orb} data-selected={selectedEdge === edge.key ? 'true' : undefined}
        x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={PATTERN_EDGE_COLORS[edge.type]}
        stroke-width={selectedEdge === edge.key ? 3 : 1.5} stroke-opacity={!selectedEdge || selectedEdge === edge.key ? 0.9 : 0.3} />;
    })}
    {marks.map((point) => <g key={point.body} data-pattern-mark={point.body} data-longitude={point.lon}>
      <line x1={point.x} y1={point.y} x2={point.labelX} y2={point.labelY} stroke={signForLongitude(point.lon).hue} stroke-opacity="0.55" />
      <circle cx={point.x} cy={point.y} r="4" fill={signForLongitude(point.lon).hue} />
      <text x={point.labelX} y={point.labelY} dy="0.35em" text-anchor="middle" fill="currentColor" font-size="12"
        stroke="var(--surface, #0F121A)" stroke-width="5" paint-order="stroke" stroke-linejoin="round">{point.body}</text>
    </g>)}
  </svg>;
}
