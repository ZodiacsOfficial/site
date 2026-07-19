/**
 * Scene-model gates:
 *  1. Numerical parity — every SceneBody.lon equals the engine longitude
 *     exactly; drawLon reproduces the Wheel's historical collision fan.
 *  2. A committed snapshot of the full Kahlo SceneModel — the fixture the
 *     interactive wheel, inspector, and (later) spatial chapter all render
 *     from. A diff here means the presentation model changed for every
 *     renderer at once; read it before updating.
 *  3. entityId/parseEntityId round-trips (the ?sel= deep-link codec).
 *  4. emphasisFor's one lighting rule.
 */
import { describe, expect, it } from 'vitest';
import { computeChart } from '../engine/full';
import { buildSceneModel, collisionNudge } from './build';
import { emphasisFor, emphasisOpacity } from './emphasis';
import { entityId, parseEntityId, type EntityRef } from './types';

// Frida Kahlo — the repo's canonical demo chart (1907-07-06 15:06:36Z,
// Coyoacán). Same instant the engine test suite and homepage fixture use.
const kahlo = () => computeChart({
  utc: new Date('1907-07-06T15:06:36.000Z'),
  latitude: 19.35,
  longitude: -99.16,
  houseSystem: 'whole',
  timeKnown: true,
  flags: ['lmt'],
});

/**
 * Astronomy Engine can differ by a few last-place bits between libc/CPU
 * combinations. Exact engine-to-scene parity is asserted above; the broad
 * presentation snapshot should remain portable while still detecting a
 * change larger than one ten-millionth of a degree.
 */
const stableSnapshot = <T>(value: T): T => JSON.parse(JSON.stringify(
  value,
  (_key, item) => typeof item === 'number' ? Number(item.toFixed(7)) : item,
)) as T;

describe('buildSceneModel parity', () => {
  it('preserves every engine longitude exactly', () => {
    const chart = kahlo();
    const scene = buildSceneModel(chart);
    for (const sb of scene.bodies) {
      const engineBody = chart.bodies.find((b) => b.body === sb.body)!;
      expect(sb.lon).toBe(engineBody.lon);
      expect(sb.speed).toBe(engineBody.speed);
      expect(sb.retrograde).toBe(engineBody.retrograde);
    }
  });

  it('applies the wheel conventions: no South Node, aspects under 6° orb', () => {
    const chart = kahlo();
    const scene = buildSceneModel(chart);
    expect(scene.bodies.some((b) => b.body === 'South Node')).toBe(false);
    expect(scene.aspects.every((a) => a.orb < 6)).toBe(true);
    const full = buildSceneModel(chart, { wheelConventions: false });
    expect(full.bodies.some((b) => b.body === 'South Node')).toBe(true);
  });

  it('drawLon matches the historical collision fan and keeps ticks true', () => {
    const chart = kahlo();
    const scene = buildSceneModel(chart);
    const expected = collisionNudge(
      chart.bodies.filter((b) => b.body !== 'South Node'),
    );
    for (const sb of scene.bodies) {
      expect(sb.drawLon).toBe(expected.get(sb.body));
    }
    // Venus (84.34°) and Pluto (83.75°) sit 0.6° apart — the fan must
    // separate their markers without moving their true longitudes.
    const venus = scene.bodies.find((b) => b.body === 'Venus')!;
    const pluto = scene.bodies.find((b) => b.body === 'Pluto')!;
    expect(Math.abs(venus.drawLon - pluto.drawLon)).toBeGreaterThanOrEqual(6.9);
    expect(Math.abs(venus.lon - pluto.lon)).toBeLessThan(1);
  });

  it('houses carry span, midpoint, and occupants', () => {
    const scene = buildSceneModel(kahlo());
    expect(scene.houses).toHaveLength(12);
    for (const house of scene.houses!) {
      expect(house.spanDeg).toBeCloseTo(30, 9); // whole sign
      expect(house.midLon).toBeCloseTo(((house.cuspLon + 15) % 360), 9);
    }
    const sun = scene.bodies.find((b) => b.body === 'Sun')!;
    expect(scene.houses![sun.house! - 1].occupants).toContain('Sun');
  });

  it('anchors to the ASC by default and 0° Aries in teaching mode', () => {
    const chart = kahlo();
    expect(buildSceneModel(chart).anchor).toEqual({ lon: chart.angles!.asc, mode: 'asc' });
    expect(buildSceneModel(chart, { anchorMode: 'aries' }).anchor).toEqual({ lon: 0, mode: 'aries' });
  });

  it('matches the committed Kahlo scene snapshot', () => {
    expect(stableSnapshot(buildSceneModel(kahlo()))).toMatchSnapshot();
  });
});

describe('entity ids', () => {
  const cases: EntityRef[] = [
    { kind: 'body', body: 'North Node' },
    { kind: 'sign', sign: 'leo' },
    { kind: 'house', house: 7 },
    { kind: 'aspect', a: 'Moon', b: 'Mars', type: 'square' },
    { kind: 'angle', angle: 'asc' },
  ];
  it('round-trips through entityId/parseEntityId', () => {
    for (const ref of cases) {
      expect(parseEntityId(entityId(ref))).toEqual(ref);
    }
  });
  it('rejects malformed ids instead of throwing', () => {
    for (const bad of ['', 'body', 'house:13', 'house:x', 'sign:foobar', 'sign:ophiuchus', 'aspect:Sun-vibes-Moon', 'angle:up', 'nope:1']) {
      expect(parseEntityId(bad)).toBeNull();
    }
  });
});

describe('emphasisFor', () => {
  it('lights nothing when nothing is selected', () => {
    const em = emphasisFor(buildSceneModel(kahlo()), null);
    expect(em.highlight.size).toBe(0);
    expect(emphasisOpacity(em, 'body:Sun')).toBe(1);
  });

  it('a body lights itself and softens its sign, house, aspects, and partners', () => {
    const scene = buildSceneModel(kahlo());
    const sun = scene.bodies.find((b) => b.body === 'Sun')!;
    const em = emphasisFor(scene, { kind: 'body', body: 'Sun' });
    expect(em.highlight.has('body:Sun')).toBe(true);
    expect(em.soft.has(`sign:${sun.sign}`)).toBe(true);
    expect(em.soft.has(`house:${sun.house}`)).toBe(true);
    for (const aspectId of sun.aspects) expect(em.soft.has(aspectId)).toBe(true);
    expect(emphasisOpacity(em, 'body:Sun')).toBe(1);
    expect(emphasisOpacity(em, 'body:Saturn')).toBeLessThan(1);
  });

  it('an aspect lights the chord and both bodies', () => {
    const scene = buildSceneModel(kahlo());
    const a = scene.aspects[0];
    const em = emphasisFor(scene, { kind: 'aspect', a: a.a, b: a.b, type: a.type });
    expect(em.soft.has(`body:${a.a}`)).toBe(true);
    expect(em.soft.has(`body:${a.b}`)).toBe(true);
  });

  it('an angle travels with its axis twin', () => {
    const em = emphasisFor(buildSceneModel(kahlo()), { kind: 'angle', angle: 'asc' });
    expect(em.highlight.has('angle:asc')).toBe(true);
    expect(em.soft.has('angle:dsc')).toBe(true);
  });
});
