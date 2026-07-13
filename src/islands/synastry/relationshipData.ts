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
}

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
): CompositeTabData {
  const points = compositeMidpoints(a.filter(isBodyPoint), b.filter(isBodyPoint));
  return {
    points,
    aspects: compositeAspects(points),
  };
}
