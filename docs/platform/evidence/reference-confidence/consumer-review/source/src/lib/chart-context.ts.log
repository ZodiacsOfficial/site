import { dignitiesFor, type Dignity } from './dignities';
import { SIGNS, signForLongitude } from './signs';
import { houseOf } from './engine/houses';
import { CONTEXT_CONVENTION, measureChartShape, type ShapePoint } from './chart-shape';

export const CLASSICAL_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;
export type ClassicalBody = typeof CLASSICAL_BODIES[number];
export interface ChartContextInput {
  bodies: readonly ShapePoint[];
  timeKnown: boolean;
  moonSignCandidates?: readonly string[];
  angles: { asc: number } | null;
  houses: { system: string; cusps: readonly number[] } | null;
}
export interface ContextPlacement {
  body: string;
  status: 'established' | 'reference' | 'unresolved' | 'invalid';
  longitude: number | null;
  sign: string | null;
  house: number | null;
  covered: boolean;
  dignities: readonly Dignity[];
  conditionalSigns: string[];
}
export interface RulerReceipt {
  house?: number;
  cusp: number;
  sign: string;
  ruler: ClassicalBody;
  placement: ContextPlacement;
}
export interface DispositorChain {
  body: ClassicalBody;
  members: ClassicalBody[];
  status: 'terminal' | 'cycle' | 'incomplete';
  endpoint: string | null;
  missing: ClassicalBody | null;
}
export interface ChartContext {
  convention: typeof CONTEXT_CONVENTION;
  identity: string;
  timeKnown: boolean;
  shape: ReturnType<typeof measureChartShape>;
  placements: ContextPlacement[];
  rulers: { chart: RulerReceipt | null; houses: RulerReceipt[]; system: string | null };
  dispositors: {
    edges: { from: ClassicalBody; to: ClassicalBody }[];
    chains: DispositorChain[];
    terminals: { id: string; members: ClassicalBody[]; kind: 'self' | 'mutual' | 'cycle' }[];
    final: ClassicalBody | null;
    reference: boolean;
  };
}
const classical = (body: string): body is ClassicalBody => (CLASSICAL_BODIES as readonly string[]).includes(body);
const normal = (x: number) => ((x % 360) + 360) % 360;
export function classicalRuler(sign: string): ClassicalBody | null {
  const row = SIGNS.find(s => s.slug === sign);
  const ruler = row?.classicRuler ?? row?.ruler;
  return ruler && classical(ruler) ? ruler : null;
}
function usableCusps(input: ChartContextInput): number[] | null {
  if (!input.timeKnown || !input.houses || !['whole', 'placidus'].includes(input.houses.system)) return null;
  const cusps = input.houses.cusps;
  if (cusps.length !== 12 || cusps.some(x => !Number.isFinite(x))) return null;
  const normalized = cusps.map(normal);
  const gaps = normalized.map((x, i) => normal(normalized[(i + 1) % 12] - x));
  if (gaps.some(x => x <= 0) || Math.abs(gaps.reduce((a, b) => a + b, 0) - 360) > 1e-8) return null;
  return normalized;
}

/** Independent sections retain valid facts when another section is unavailable. */
export function buildChartContext(input: ChartContextInput): ChartContext {
  const cusps = usableCusps(input);
  const names = [...CLASSICAL_BODIES, ...[...new Set(input.bodies.map(p => p.body).filter(body => !classical(body)))].sort()];
  const placements: ContextPlacement[] = names.map(body => {
    const matches = input.bodies.filter(p => p.body === body);
    const good = matches.length === 1 && Number.isFinite(matches[0].lon);
    const row: ContextPlacement = { body, status: good ? input.timeKnown ? 'established' : 'reference' : 'invalid',
      longitude: good ? normal(matches[0].lon) : null, sign: good ? signForLongitude(matches[0].lon).slug : null,
      house: good && cusps ? houseOf(matches[0].lon, cusps) : null,
      covered: classical(body), dignities: [], conditionalSigns: [] };
    if (body === 'Moon' && good) {
      const candidates = input.moonSignCandidates;
      const valid = Array.isArray(candidates) && candidates.length >= 1 && candidates.length <= 2
        && new Set(candidates).size === candidates.length && candidates.every(s => SIGNS.some(sign => sign.slug === s))
        && candidates.includes(row.sign!);
      const singleton = valid && candidates!.length === 1;
      if ((input.timeKnown && candidates !== undefined && !singleton) || (!input.timeKnown && !singleton)) {
        row.status = 'unresolved'; row.conditionalSigns = valid ? [...candidates!] : [];
        row.sign = null; row.house = null;
      } else if (!input.timeKnown) {
        // Only the sign is established; the reference longitude remains a receipt.
        row.status = 'established';
      }
    }
    if (row.sign !== null) row.dignities = dignitiesFor(body, row.sign);
    return row;
  });
  const byBody = new Map(placements.map(p => [p.body, p]));
  function ruler(cusp: number, house?: number): RulerReceipt {
    const sign = signForLongitude(cusp).slug, body = classicalRuler(sign)!;
    return { cusp: normal(cusp), sign, ruler: body, placement: byBody.get(body)!, ...(house !== undefined ? { house } : {}) };
  }
  const chartRuler = input.timeKnown && input.angles && Number.isFinite(input.angles.asc) ? ruler(input.angles.asc) : null;
  const edges = CLASSICAL_BODIES.flatMap(from => {
    const point = byBody.get(from)!;
    const to = point.sign ? classicalRuler(point.sign) : null;
    return to ? [{ from, to }] : [];
  });
  const graph = new Map(edges.map(e => [e.from, e.to]));
  const terminals = new Map<string, ChartContext['dispositors']['terminals'][number]>();
  const chains: DispositorChain[] = CLASSICAL_BODIES.map(body => {
    const members: ClassicalBody[] = [];
    let current = body;
    while (members.length <= 7) {
      const seen = members.indexOf(current);
      if (seen !== -1) {
        const cycle = members.slice(seen);
        const first = cycle.reduce((a, b) => CLASSICAL_BODIES.indexOf(a) < CLASSICAL_BODIES.indexOf(b) ? a : b);
        const cut = cycle.indexOf(first), canonical = [...cycle.slice(cut), ...cycle.slice(0, cut)];
        const id = canonical.join('>');
        terminals.set(id, { id, members: canonical, kind: canonical.length === 1 ? 'self' : canonical.length === 2 ? 'mutual' : 'cycle' });
        return { body, members: [...members, current], status: cycle.length === 1 ? 'terminal' : 'cycle', endpoint: id, missing: null };
      }
      members.push(current);
      const next = graph.get(current);
      if (!next) return { body, members, status: 'incomplete', endpoint: null, missing: current };
      current = next;
    }
    return { body, members, status: 'incomplete', endpoint: null, missing: current };
  });
  const components = [...terminals.values()].sort((a, b) => a.id.localeCompare(b.id));
  const final = input.timeKnown && edges.length === 7 && components.length === 1 && components[0].kind === 'self'
    && chains.every(c => c.status === 'terminal' && c.endpoint === components[0].id) ? components[0].members[0] : null;
  const identity = JSON.stringify([CONTEXT_CONVENTION, [...input.bodies].sort((a, b) => a.body.localeCompare(b.body)),
    input.timeKnown, input.moonSignCandidates ?? null, input.angles, input.houses]);
  const shape = measureChartShape(input.bodies, input.timeKnown);
  if (input.timeKnown && byBody.get('Moon')?.status === 'unresolved') {
    shape.status = 'unavailable'; shape.reason = 'invalid-positions'; shape.kind = null;
  }
  return { convention: CONTEXT_CONVENTION, identity, timeKnown: input.timeKnown,
    shape, placements,
    rulers: { chart: chartRuler, houses: cusps ? cusps.map((c, i) => ruler(c, i + 1)) : [], system: cusps ? input.houses!.system : null },
    dispositors: { edges, chains, terminals: components, final, reference: !input.timeKnown } };
}
