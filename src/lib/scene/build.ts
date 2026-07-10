/**
 * buildSceneModel — pure derivation from the engine's Chart to the
 * renderer-neutral ChartSceneModel. This is also the single home of the
 * wheel's layout math that must be shared between the interactive wheel,
 * the share-card serialization path, and hit-testing: the collision nudge
 * lives HERE, not in the renderer, so every renderer fans crowded bodies
 * identically.
 *
 * Numerical invariant (tested): every SceneBody.lon equals the engine
 * BodyPosition.lon exactly. Only drawLon may differ.
 */
import type { Aspect, Chart } from '../engine/types';
import { houseOf } from '../engine/houses';
import { dignityFor } from '../dignities';
import { SIGNS, degreeInSign, signForLongitude } from '../signs';
import { collisionNudge } from './layout';
import {
  type ChartSceneModel, type SceneAspect, type SceneBody, type SceneHouse,
  type SignSlug, entityId,
} from './types';

const norm = (lon: number) => ((lon % 360) + 360) % 360;

export { collisionNudge } from './layout';

function aspectWeight(orb: number): 0 | 1 | 2 {
  if (orb <= 1.5) return 2;
  if (orb <= 3.5) return 1;
  return 0;
}

export interface BuildOptions {
  /** Rotation anchor; the chart convention `asc` is the default. */
  anchorMode?: 'asc' | 'aries';
  /**
   * Drop South Node and cap aspect orbs the way the calculator's wheel does
   * (South Node excluded, aspects at orb < 6). On by default — pass false to
   * model every body/aspect the engine produced.
   */
  wheelConventions?: boolean;
}

export function buildSceneModel(chart: Chart, opts: BuildOptions = {}): ChartSceneModel {
  const { anchorMode = 'asc', wheelConventions = true } = opts;

  const rawBodies = wheelConventions
    ? chart.bodies.filter((b) => b.body !== 'South Node')
    : chart.bodies;
  const rawAspects: Aspect[] = wheelConventions
    ? chart.aspects.filter((a) => a.orb < 6)
    : chart.aspects;

  const nudge = collisionNudge(rawBodies);
  const cusps = chart.houses?.cusps ?? null;

  const aspects: SceneAspect[] = rawAspects.map((a) => ({
    a: a.a, b: a.b, type: a.type, orb: a.orb, applying: a.applying,
    weight: aspectWeight(a.orb),
  }));
  const aspectIdsByBody = new Map<string, { id: string; orb: number }[]>();
  for (const a of aspects) {
    const id = entityId({ kind: 'aspect', a: a.a, b: a.b, type: a.type });
    for (const body of [a.a, a.b]) {
      const list = aspectIdsByBody.get(body) ?? [];
      list.push({ id, orb: a.orb });
      aspectIdsByBody.set(body, list);
    }
  }

  const bodies: SceneBody[] = rawBodies.map((b) => {
    const sign = signForLongitude(b.lon);
    return {
      body: b.body,
      lon: b.lon,
      drawLon: nudge.get(b.body) ?? b.lon,
      sign: sign.slug as SignSlug,
      signDegree: degreeInSign(b.lon),
      house: cusps ? houseOf(b.lon, cusps) : null,
      speed: b.speed,
      retrograde: b.retrograde,
      dignity: dignityFor(b.body, sign.slug),
      aspects: (aspectIdsByBody.get(b.body) ?? [])
        .sort((x, y) => x.orb - y.orb)
        .map((x) => x.id),
    };
  });

  let houses: SceneHouse[] | null = null;
  if (cusps) {
    houses = cusps.map((cuspLon, i) => {
      const next = cusps[(i + 1) % 12];
      const spanDeg = norm(next - cuspLon) || 360;
      return {
        index: i + 1,
        cuspLon,
        spanDeg,
        midLon: norm(cuspLon + spanDeg / 2),
        occupants: bodies
          .filter((b) => b.house === i + 1)
          // Zodiac order measured from the cusp, so a wedge crossing 0°
          // Aries (possible under Placidus) still lists occupants in the
          // order a reader walks the house.
          .sort((a, b) => norm(a.lon - cuspLon) - norm(b.lon - cuspLon))
          .map((b) => b.body),
      };
    });
  }

  return {
    engineVersion: chart.engineVersion,
    anchor: anchorMode === 'aries'
      ? { lon: 0, mode: 'aries' }
      : { lon: chart.angles?.asc ?? 0, mode: 'asc' },
    bodies,
    houses,
    angles: chart.angles,
    aspects,
    signs: SIGNS.map((s, i) => ({ slug: s.slug as SignSlug, fromLon: i * 30 })),
    flags: chart.flags,
    houseSystem: chart.houses?.system ?? chart.input.houseSystem,
  };
}
