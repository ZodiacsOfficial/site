import { ASPECT_BODIES, matchAspect } from './engine/aspects';
import { houseOf, wholeSignCusps } from './engine/houses';
import type { AspectType, BodyName } from './engine/types';
import type { PositionsShareChart } from './share-positions';

export interface SharedAspect {
  a: BodyName;
  b: BodyName;
  type: AspectType;
  orb: number;
}

export interface SharedPositionsReading {
  /** Houses reconstructed from the ASC. v2 never contains enough data for Placidus. */
  cusps: number[] | null;
  houses: ReadonlyMap<BodyName | 'ASC' | 'MC', number>;
  aspects: SharedAspect[];
  topAspects: SharedAspect[];
  reconstructedWholeSign: boolean;
}

const scoreAspect = (aspect: SharedAspect): number => (
  aspect.orb - (
    aspect.a === 'Sun' || aspect.a === 'Moon'
      || aspect.b === 'Sun' || aspect.b === 'Moon'
      ? 1.5
      : 0
  )
);

/**
 * Rebuild the readable parts a v2 positions link can honestly support.
 * Speeds, applying/separating state, coordinates and Placidus inputs are not
 * present in the token and are never inferred.
 */
export function positionsReading(chart: PositionsShareChart): SharedPositionsReading {
  const aspectBodies = chart.bodies.filter((body) => ASPECT_BODIES.has(body.body));
  const aspects: SharedAspect[] = [];
  for (let i = 0; i < aspectBodies.length; i += 1) {
    for (let j = i + 1; j < aspectBodies.length; j += 1) {
      const a = aspectBodies[i];
      const b = aspectBodies[j];
      const match = matchAspect(a.body, a.lon, b.body, b.lon);
      if (match) aspects.push({ a: a.body, b: b.body, type: match.def.type, orb: match.orb });
    }
  }

  const cusps = chart.angles ? wholeSignCusps(chart.angles.asc) : null;
  const houses = new Map<BodyName | 'ASC' | 'MC', number>();
  if (cusps) {
    for (const body of chart.bodies) houses.set(body.body, houseOf(body.lon, cusps));
    houses.set('ASC', houseOf(chart.angles!.asc, cusps));
    houses.set('MC', houseOf(chart.angles!.mc, cusps));
  }

  return {
    cusps,
    houses,
    aspects,
    topAspects: [...aspects].sort((a, b) => scoreAspect(a) - scoreAspect(b)).slice(0, 4),
    reconstructedWholeSign: chart.angles !== null,
  };
}
