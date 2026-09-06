import { compositeAspects, compositeMidpoints } from '../../lib/composite';
import type { CompositeAspect, CompositePoint } from '../../lib/composite';
import { matchAspect } from '../../lib/engine/aspects';
import type { AspectType, BodyName } from '../../lib/engine/types';

export const RELATIONSHIP_BODY_ORDER: readonly BodyName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

const BODY_NAMES = new Set<BodyName>([
  ...RELATIONSHIP_BODY_ORDER, 'North Node', 'South Node',
]);

export type RelationshipPointName = BodyName | 'ASC' | 'MC';

export interface RelationshipPoint {
  name: RelationshipPointName;
  lon: number;
}

export interface RelationshipChartData {
  bodies: readonly { body: string; lon: number }[];
  asc: number | null;
  mc: number | null;
}

export interface RelationshipContact {
  a: RelationshipPointName;
  aLon: number;
  b: RelationshipPointName;
  bLon: number;
  type: AspectType;
  orb: number;
}

export interface RelationshipGridData {
  rows: RelationshipPoint[];
  columns: RelationshipPoint[];
  cells: (RelationshipContact | null)[][];
  contacts: RelationshipContact[];
}

export interface CompositeTabData {
  points: CompositePoint[];
  aspects: CompositeAspect[];
  /** Existing reference positions; no invented daily endpoints or bounds. */
  moonProvisional: boolean;
}

export const compositeBodyId = (body: BodyName): string => `composite:body:${body}`;
export const compositeAspectId = (aspect: Pick<CompositeAspect, 'a' | 'b' | 'type'>): string =>
  `composite:aspect:${aspect.a}:${aspect.type}:${aspect.b}`;

export type CompositeSelection =
  | { kind: 'body'; id: string; point: CompositePoint; provisional: boolean }
  | { kind: 'aspect'; id: string; aspect: CompositeAspect; provisional: boolean };

export function compositeSelection(data: CompositeTabData, id: string | null): CompositeSelection | null {
  if (!id) return null;
  const point = data.points.find((point) => compositeBodyId(point.body) === id);
  if (point) return { kind: 'body', id, point, provisional: data.moonProvisional && point.body === 'Moon' };
  const aspect = data.aspects.find((aspect) => compositeAspectId(aspect) === id);
  return aspect ? { kind: 'aspect', id, aspect,
    provisional: data.moonProvisional && (aspect.a === 'Moon' || aspect.b === 'Moon') } : null;
}

/** Selection and prepared images belong to these exact midpoint inputs. */
export const compositeDataKey = (data: CompositeTabData): string => JSON.stringify(data);

function isBodyPoint(point: { body: string; lon: number }): point is { body: BodyName; lon: number } {
  return BODY_NAMES.has(point.body as BodyName);
}

export function relationshipPoints(chart: RelationshipChartData): RelationshipPoint[] {
  const byName = new Map(chart.bodies.map((point) => [point.body, point.lon]));
  const points: RelationshipPoint[] = RELATIONSHIP_BODY_ORDER.flatMap((name) => {
    const lon = byName.get(name);
    return lon === undefined ? [] : [{ name, lon }];
  });
  if (chart.asc !== null) points.push({ name: 'ASC', lon: chart.asc });
  if (chart.mc !== null) points.push({ name: 'MC', lon: chart.mc });
  return points;
}

export function relationshipContactId(contact: Pick<RelationshipContact, 'a' | 'b' | 'type'>): string {
  return `${contact.a}-${contact.type}-${contact.b}`;
}

export function buildRelationshipGrid(
  a: RelationshipChartData,
  b: RelationshipChartData,
): RelationshipGridData {
  const rows = relationshipPoints(a);
  const columns = relationshipPoints(b);
  const contacts: RelationshipContact[] = [];
  const cells = rows.map((row) => columns.map((column) => {
    const match = matchAspect(row.name, row.lon, column.name, column.lon);
    if (!match) return null;
    const contact: RelationshipContact = {
      a: row.name,
      aLon: row.lon,
      b: column.name,
      bLon: column.lon,
      type: match.def.type,
      orb: match.orb,
    };
    contacts.push(contact);
    return contact;
  }));
  return { rows, columns, cells, contacts };
}

export function buildCompositeTabData(
  a: readonly { body: string; lon: number }[],
  b: readonly { body: string; lon: number }[],
  certainty?: { aTimeKnown: boolean; bTimeKnown: boolean },
): CompositeTabData {
  const points = compositeMidpoints(a.filter(isBodyPoint), b.filter(isBodyPoint));
  return {
    points,
    aspects: compositeAspects(points),
    moonProvisional: points.some((point) => point.body === 'Moon')
      && !(certainty?.aTimeKnown && certainty?.bTimeKnown),
  };
}
