/** Declared product geometry, not an astronomical confidence interval. */
export const CONTEXT_CONVENTION = 'zodiacs-chart-context-v1';
export const SHAPE_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;
export type ShapeKind = 'bundle' | 'bowl' | 'locomotive' | 'bucket' | 'seesaw' | 'splash';
export interface ShapePoint { body: string; lon: number }
export interface ShapeCandidate {
  id: string;
  kind: ShapeKind;
  groups: string[][];
  handle?: string;
  spans: number[];
  separatingGaps: number[];
  oppositionOffset?: number;
}
export interface ShapeMeasurement {
  status: 'clear' | 'no-clear' | 'unavailable' | 'reference-only';
  reason?: 'invalid-positions' | 'outside-conventions' | 'near-threshold' | 'ambiguous-membership' | 'unknown-time';
  kind: ShapeKind | null;
  convention: typeof CONTEXT_CONVENTION;
  grid: 0.001;
  band: 2;
  points: { body: string; originalLongitude: number; longitude: number }[];
  gaps: number[];
  largestGap: number | null;
  occupiedSpan: number | null;
  candidates: ShapeCandidate[];
}
const TURN = 360_000;
const rank = (body: string) => SHAPE_BODIES.indexOf(body as typeof SHAPE_BODIES[number]);
const norm = (x: number) => ((x % 360) + 360) % 360;
/** Same integer millidegree wrap as the positions codec; originals stay separate. */
export const shapeGrid = (lon: number) => Math.round(norm(lon) * 1000) % TURN;
const clockwise = (a: number, b: number) => (b - a + TURN) % TURN;
const oppositionOffset = (a: number, b: number) => Math.abs(clockwise(a, b) - TURN / 2);
type Measured = { body: string; value: number; originalLongitude: number };
const gapsOf = (p: Measured[]) => p.map((point, i) => i === p.length - 1 ? p[0].value + TURN - point.value : p[i + 1].value - point.value);
const canonicalMembers = (p: Measured[]) => p.map(x => x.body).sort((a, b) => rank(a) - rank(b));

export function measureChartShape(input: readonly ShapePoint[], timeKnown: boolean): ShapeMeasurement {
  const result: ShapeMeasurement = { status: 'unavailable', reason: 'invalid-positions', kind: null,
    convention: CONTEXT_CONVENTION, grid: 0.001, band: 2, points: [], gaps: [], largestGap: null, occupiedSpan: null, candidates: [] };
  const eligible = input.filter(p => rank(p.body) >= 0);
  if (eligible.length !== 10 || new Set(eligible.map(p => p.body)).size !== 10 || eligible.some(p => !Number.isFinite(p.lon))) return result;
  const p: Measured[] = eligible.map(x => ({ body: x.body, value: shapeGrid(x.lon), originalLongitude: x.lon }))
    .sort((a, b) => a.value - b.value || rank(a.body) - rank(b.body));
  const gaps = gapsOf(p), largest = Math.max(...gaps), span = TURN - largest;
  result.points = p.map(x => ({ body: x.body, originalLongitude: x.originalLongitude, longitude: x.value / 1000 }));
  result.gaps = gaps.map(x => x / 1000); result.largestGap = largest / 1000; result.occupiedSpan = span / 1000;
  function candidates(margin: number): ShapeCandidate[] {
    const found = new Map<string, ShapeCandidate>();
    const max = (x: number, limit: number) => x <= limit - margin;
    const min = (x: number, limit: number) => x >= limit + margin;
    const between = (x: number, low: number, high: number) => min(x, low) && max(x, high);
    function add(kind: ShapeKind, groups: Measured[][], spans: number[], separatingGaps: number[], handle?: string, offset?: number) {
      const orderedGroups = groups.map((group, i) => ({ members: canonicalMembers(group), span: spans[i] }))
        .sort((a, b) => a.members.join(',').localeCompare(b.members.join(',')));
      const members = orderedGroups.map(g => g.members);
      const id = `${kind}:${handle ?? members.map(g => g.join(',')).join('|')}`;
      found.set(id, { id, kind, groups: members, spans: orderedGroups.map(x => x.span / 1000), separatingGaps: separatingGaps.map(x => x / 1000),
        ...(handle ? { handle } : {}), ...(offset !== undefined ? { oppositionOffset: offset / 1000 } : {}) });
    }
    if (max(span, 120_000)) add('bundle', [p], [span], [largest]);
    if (gaps.every(g => max(g, 60_000))) add('splash', [p], [span], []);
    for (let cut = 0; cut < 10; cut++) {
      const inner = gaps.filter((_, i) => i !== cut), occupied = TURN - gaps[cut];
      if (!inner.every(g => max(g, 60_000))) continue;
      if (between(occupied, 150_000, 180_000)) add('bowl', [p], [occupied], [gaps[cut]]);
      if (between(occupied, 225_000, 255_000)) add('locomotive', [p], [occupied], [gaps[cut]]);
    }
    for (let h = 0; h < 10; h++) {
      const cluster = [...p.slice(h + 1), ...p.slice(0, h)];
      const first = cluster[0], last = cluster[8];
      const arc = clockwise(first.value, last.value);
      const inner = cluster.slice(0, -1).map((x, i) => clockwise(x.value, cluster[i + 1].value));
      const separators = [gaps[(h + 9) % 10], gaps[h]];
      const offset = oppositionOffset((first.value + arc / 2) % TURN, p[h].value);
      if (between(arc, 120_000, 180_000) && inner.every(g => max(g, 60_000)) && separators.every(g => min(g, 60_000)) && max(offset, 30_000))
        add('bucket', [cluster], [arc], separators, p[h].body, offset);
    }
    for (let a = 0; a < 10; a++) for (let length = 3; length <= 7; length++) {
      const ordered = [...p.slice(a), ...p.slice(0, a)];
      const left = ordered.slice(0, length), right = ordered.slice(length);
      const leftSpan = clockwise(left[0].value, left.at(-1)!.value), rightSpan = clockwise(right[0].value, right.at(-1)!.value);
      const separators = [gaps[(a + 9) % 10], gaps[(a + length - 1) % 10]];
      const inner = [left, right].flatMap(c => c.slice(0, -1).map((x, i) => clockwise(x.value, c[i + 1].value)));
      const offset = oppositionOffset((left[0].value + leftSpan / 2) % TURN, (right[0].value + rightSpan / 2) % TURN);
      if (max(leftSpan, 90_000) && max(rightSpan, 90_000) && separators.every(g => min(g, 60_000)) && inner.every(g => max(g, 60_000)) && max(offset, 30_000))
        add('seesaw', [left, right], [leftSpan, rightSpan], separators, undefined, offset);
    }
    return [...found.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
  const strict = candidates(2000), relaxed = candidates(-2000);
  result.candidates = relaxed;
  if (!timeKnown) return { ...result, status: 'reference-only', reason: 'unknown-time' };
  if (strict.length === 1 && relaxed.length === 1 && strict[0].id === relaxed[0].id)
    return { ...result, status: 'clear', reason: undefined, kind: strict[0].kind, candidates: strict };
  const ambiguous = relaxed.some((x, i) => relaxed.some((y, j) => j !== i && y.kind === x.kind && y.id !== x.id));
  return { ...result, status: 'no-clear', reason: relaxed.length === 0 ? 'outside-conventions' : ambiguous || strict.length > 1 ? 'ambiguous-membership' : 'near-threshold' };
}
