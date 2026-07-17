/**
 * Chapter-derivation and chapter-lighting gates. Everything here is pure
 * and deterministic — acceptance §11.11 #7 (prev → prev restores exact
 * emphasis) holds because equal inputs must produce deep-equal sets.
 */
import { describe, expect, it } from 'vitest';
import { computeChart } from '../engine/full';
import { buildSceneModel } from './build';
import { emphasisOpacity } from './emphasis';
import {
  deriveChapters, deriveFirstReading, emphasisForChapter, flattenStops, interpolateCusps,
  lerpAngle, previewHouses, stepId, strongestPersonalAspect,
} from './chapters';
import type { ChartSceneModel } from './types';

const kahlo = () => buildSceneModel(computeChart({
  utc: new Date('1907-07-06T15:06:36.000Z'),
  latitude: 19.35,
  longitude: -99.16,
  houseSystem: 'whole',
  timeKnown: true,
  flags: ['lmt'],
}));

const kahloNoTime = () => buildSceneModel(computeChart({
  utc: new Date('1907-07-06T18:00:00.000Z'),
  houseSystem: 'whole',
  timeKnown: false,
  flags: ['no-time'],
}));

describe('deriveChapters', () => {
  it('full chart: 8 chapters, big three has 3 subs, 10 stops', () => {
    const chapters = deriveChapters(kahlo());
    expect(chapters.map((c) => c.id)).toEqual(
      ['sky', 'zodiac', 'horizon', 'big-three', 'planets', 'houses', 'aspects', 'whole'],
    );
    const bigThree = chapters.find((c) => c.id === 'big-three')!;
    expect(bigThree.subs.map((s) => s.id)).toEqual(['sun', 'moon', 'asc']);
    expect(flattenStops(chapters)).toHaveLength(10);
    expect(chapters.find((c) => c.id === 'zodiac')!.feature).toBe('anchor-rotate');
    expect(chapters.find((c) => c.id === 'houses')!.feature).toBe('house-morph');
    expect(chapters.find((c) => c.id === 'houses')!.needs).toEqual({ houses: true });
    expect(chapters.find((c) => c.id === 'aspects')!.needs).toEqual({ allAspects: true });
  });

  it('no-time chart: 7 chapters, no-houses replaces horizon+houses, subs Sun/Moon', () => {
    const chapters = deriveChapters(kahloNoTime());
    expect(chapters.map((c) => c.id)).toEqual(
      ['sky', 'zodiac', 'no-houses', 'big-three', 'planets', 'aspects', 'whole'],
    );
    const bigThree = chapters.find((c) => c.id === 'big-three')!;
    expect(bigThree.subs.map((s) => s.id)).toEqual(['sun', 'moon']);
    expect(flattenStops(chapters)).toHaveLength(8);
    // No stop may reference a house or angle entity on a no-time chart.
    for (const c of chapters) {
      for (const sub of c.subs) {
        expect(sub.entity.kind === 'house' || sub.entity.kind === 'angle').toBe(false);
      }
    }
    expect(chapters.find((c) => c.id === 'zodiac')!.feature).toBeNull();
  });

  it('drops the aspects chapter when the chart has none', () => {
    const scene = kahlo();
    const bare: ChartSceneModel = {
      ...scene,
      aspects: [],
      bodies: scene.bodies.map((b) => ({ ...b, aspects: [] })),
    };
    expect(deriveChapters(bare).some((c) => c.id === 'aspects')).toBe(false);
  });

  it('hides the house morph under the polar fallback', () => {
    const scene = kahlo();
    const polar: ChartSceneModel = { ...scene, flags: ['polar-fallback'] };
    expect(deriveChapters(polar).find((c) => c.id === 'houses')!.feature).toBeNull();
  });

  it('stepId values are stable and ≤32 chars', () => {
    const chapters = deriveChapters(kahlo());
    const ids = flattenStops(chapters).map((s) => stepId(chapters, s));
    expect(ids).toContain('big-three/moon');
    expect(ids).toContain('houses');
    for (const id of ids) expect(id.length).toBeLessThanOrEqual(32);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('deriveFirstReading', () => {
  it('always produces the four decision-free beginner stops', () => {
    const chapters = deriveFirstReading(kahlo());
    expect(chapters.map((chapter) => chapter.id)).toEqual([
      'first-big-three', 'first-sun', 'first-aspect', 'first-next',
    ]);
    expect(flattenStops(chapters)).toHaveLength(4);
    expect(chapters[1].subs[0].entity).toEqual({ kind: 'body', body: 'Sun' });
    expect(chapters[2].subs[0].entity.kind).toBe('aspect');
  });

  it('keeps the four-step shape for no-time and no-personal-aspect charts', () => {
    const scene = kahloNoTime();
    const withoutPersonalAspects: ChartSceneModel = {
      ...scene,
      aspects: scene.aspects.filter((aspect) => (
        !['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].includes(aspect.a)
        && !['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].includes(aspect.b)
      )),
    };
    const chapters = deriveFirstReading(withoutPersonalAspects);
    expect(chapters).toHaveLength(4);
    expect(chapters[2].subs).toEqual([]);
    expect(strongestPersonalAspect(withoutPersonalAspects)).toBeNull();
  });

  it('selects a major aspect involving at least one personal planet', () => {
    const aspect = strongestPersonalAspect(kahlo());
    expect(aspect).not.toBeNull();
    expect(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']).toContain(
      ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].includes(aspect!.a) ? aspect!.a : aspect!.b,
    );
  });
});

describe('emphasisForChapter', () => {
  const scene = kahlo();
  const chapters = deriveChapters(scene);
  const byId = (id: string) => chapters.find((c) => c.id === id)!;

  it('sky and whole light nothing (no dimming anywhere)', () => {
    for (const id of ['sky', 'whole'] as const) {
      const em = emphasisForChapter(scene, byId(id));
      expect(em.highlight.size).toBe(0);
      expect(emphasisOpacity(em, 'body:Saturn')).toBe(1);
    }
  });

  it('zodiac lights the twelve signs plus the Sun', () => {
    const em = emphasisForChapter(scene, byId('zodiac'));
    expect(em.highlight.size).toBe(13);
    expect(em.highlight.has('sign:leo')).toBe(true);
    expect(em.highlight.has('body:Sun')).toBe(true);
    expect(emphasisOpacity(em, 'body:Saturn')).toBe(0.35);
  });

  it('horizon lights the four angles and softens the rising sign + angular houses', () => {
    const em = emphasisForChapter(scene, byId('horizon'));
    for (const a of ['asc', 'dsc', 'mc', 'ic']) expect(em.highlight.has(`angle:${a}`)).toBe(true);
    expect(em.soft.has('sign:leo')).toBe(true); // Kahlo rises in Leo
    expect(em.soft.has('house:1')).toBe(true);
    expect(em.soft.has('house:10')).toBe(true);
  });

  it('big-three subs delegate to the free-mode lighting rule', () => {
    const em = emphasisForChapter(scene, byId('big-three'), 1); // Moon
    expect(em.highlight.has('body:Moon')).toBe(true);
    expect(em.soft.has('sign:taurus')).toBe(true); // Kahlo's Moon in Taurus
  });

  it('houses chapter: 12 houses lit, bodies readable', () => {
    const em = emphasisForChapter(scene, byId('houses'));
    expect([...em.highlight].filter((id) => id.startsWith('house:'))).toHaveLength(12);
    expect(em.soft.has('body:Sun')).toBe(true);
  });

  it('aspect focus narrows to one type', () => {
    const all = emphasisForChapter(scene, byId('aspects'));
    const squares = emphasisForChapter(scene, byId('aspects'), 0, { aspectFocus: 'square' });
    const squareIds = [...squares.highlight];
    expect(squareIds.length).toBeGreaterThan(0);
    expect(squareIds.every((id) => id.includes('-square-'))).toBe(true);
    expect(all.highlight.size).toBeGreaterThanOrEqual(squares.highlight.size);
  });

  it('is deterministic (equal args ⇒ deep-equal sets)', () => {
    const a = emphasisForChapter(scene, byId('planets'));
    const b = emphasisForChapter(scene, byId('planets'));
    expect([...a.highlight].sort()).toEqual([...b.highlight].sort());
    expect([...a.soft].sort()).toEqual([...b.soft].sort());
  });

  it('lights the exact subjects used by each first-reading stop', () => {
    const first = deriveFirstReading(scene);
    const bigThree = emphasisForChapter(scene, first[0]);
    expect(bigThree.highlight.has('body:Sun')).toBe(true);
    expect(bigThree.highlight.has('body:Moon')).toBe(true);
    expect(bigThree.highlight.has('angle:asc')).toBe(true);

    const sun = emphasisForChapter(scene, first[1]);
    expect(sun.highlight.has('body:Sun')).toBe(true);

    const aspect = first[2].subs[0].entity;
    const aspectEmphasis = emphasisForChapter(scene, first[2]);
    expect(aspect.kind).toBe('aspect');
    if (aspect.kind === 'aspect') {
      expect(aspectEmphasis.highlight.has(`aspect:${aspect.a}-${aspect.type}-${aspect.b}`)).toBe(true);
    }
  });

  it('does not invent a rising sign in the no-time first reading', () => {
    const sceneNoTime = kahloNoTime();
    const bigThree = emphasisForChapter(sceneNoTime, deriveFirstReading(sceneNoTime)[0]);
    expect(bigThree.highlight.has('angle:asc')).toBe(false);
  });
});

describe('tween math', () => {
  it('lerpAngle takes the shortest arc across 0°', () => {
    expect(lerpAngle(359, 1, 0.5)).toBe(0);
    expect(lerpAngle(10, 350, 0.5)).toBe(0);
    expect(lerpAngle(120, 30, 0)).toBe(120);
    expect(lerpAngle(120, 30, 1)).toBe(30);
  });

  it('interpolateCusps works element-wise', () => {
    const from = [0, 30, 60];
    const to = [10, 40, 50];
    expect(interpolateCusps(from, to, 0.5)).toEqual([5, 35, 55]);
  });

  it('previewHouses matches the scene builder span/midpoint math', () => {
    const scene = kahlo();
    const preview = previewHouses(scene.houses!.map((h) => h.cuspLon));
    scene.houses!.forEach((h, i) => {
      expect(preview[i].cuspLon).toBe(h.cuspLon);
      expect(preview[i].spanDeg).toBeCloseTo(h.spanDeg, 9);
      expect(preview[i].midLon).toBeCloseTo(h.midLon, 9);
    });
  });
});
