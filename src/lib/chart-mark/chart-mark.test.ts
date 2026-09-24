import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { computeChart } from '../engine/full';
import { SIGNS } from '../signs';
import {
  MARK_SIGN_HUES,
  MARK_SIGN_SLUGS,
  MARK_UNSETTLED,
  markPoint,
  settledSignIndex,
  settledSunSlug,
  type ChartMarkSource,
} from './common';
import { MARK_BODIES, constellationGeometry } from './constellation';

function source(utc: string, timeKnown = true): ChartMarkSource {
  const chart = computeChart({
    utc: new Date(utc),
    latitude: 40.7128,
    longitude: -74.006,
    houseSystem: 'whole',
    timeKnown,
  });
  return {
    bodies: chart.bodies.map(({ body, lon }) => ({ body, lon })),
    asc: timeKnown ? chart.angles?.asc ?? null : null,
    timeKnown,
  };
}

describe('chart mark palette', () => {
  it('mirrors the canonical sign table without importing it', () => {
    expect(MARK_SIGN_SLUGS).toEqual(SIGNS.map((sign) => sign.slug));
    expect(MARK_SIGN_HUES).toEqual(SIGNS.map((sign) => sign.hue));
  });

  it('keeps the navigation copy of the settle rule and photo rule in step', async () => {
    const nav = await readFile(new URL('../../components/SiteNav.astro', import.meta.url), 'utf8');
    const avatar = await readFile(new URL('../profile/avatar.ts', import.meta.url), 'utf8');
    expect(nav).toContain("'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',");
    expect(nav).toContain('within < 1.02 || 30 - within < 1.02');
    expect(nav).toContain('me.photo.length <= 180000');
    expect(avatar).toContain('MAX_PHOTO_DATA_URL_LENGTH = 180_000');
    const photoRule = /\/\^data:image\\\/\(\?:webp\|jpeg\|png\);base64,\[A-Za-z0-9\+\/\]\+=\{0,2\}\$\//u;
    expect(nav).toMatch(photoRule);
    expect(avatar).toMatch(photoRule);
  });
});

describe('settled signs', () => {
  it('settles every body when the birth time is known', () => {
    expect(settledSignIndex('Moon', 0.2, true)).toBe(0);
    expect(settledSignIndex('Sun', 359.99, true)).toBe(11);
  });

  it('never settles the Moon without a birth time', () => {
    expect(settledSignIndex('Moon', 15, false)).toBeNull();
  });

  it('settles a reference-time Sun only when a full day keeps it in one sign', () => {
    expect(settledSignIndex('Sun', 45, false)).toBe(1);
    expect(settledSignIndex('Sun', 30.5, false)).toBeNull();
    expect(settledSignIndex('Sun', 59.5, false)).toBeNull();
    expect(settledSignIndex('Pluto', 30.5, false)).toBe(1);
  });

  it('names the Sun sign only when it is settled', () => {
    expect(settledSunSlug({ bodies: [{ body: 'Sun', lon: 130 }], asc: null, timeKnown: false })).toBe('leo');
    expect(settledSunSlug({ bodies: [{ body: 'Sun', lon: 120.3 }], asc: null, timeKnown: false })).toBeNull();
    expect(settledSunSlug({ bodies: [{ body: 'Sun', lon: 120.3 }], asc: 10, timeKnown: true })).toBe('leo');
    expect(settledSunSlug(null)).toBeNull();
  });
});

describe('constellation geometry', () => {
  it('places the anchor at nine o’clock and runs counter-clockwise, like the wheel', () => {
    expect(markPoint(100, 100, 30)).toEqual({ x: 20, y: 50 });
    expect(markPoint(190, 100, 30)).toEqual({ x: 50, y: 80 });
  });

  it('draws the same mark for the same chart, every time', () => {
    const chart = source('1990-08-14T13:30:00Z');
    expect(constellationGeometry(chart)).toEqual(constellationGeometry(chart));
  });

  it('draws ten planets, tinted by sign, without overlapping dots on the outer lanes', () => {
    const chart = source('1990-08-14T13:30:00Z');
    const mark = constellationGeometry(chart)!;
    expect(mark.dots.map((dot) => dot.body)).toEqual([...MARK_BODIES]);
    for (const dot of mark.dots) {
      const lon = chart.bodies.find((row) => row.body === dot.body)!.lon;
      expect(dot.fill).toBe(MARK_SIGN_HUES[Math.floor(lon / 30)]);
      expect(Math.hypot(dot.x - 50, dot.y - 50) + dot.r).toBeLessThan(40);
    }
    for (let i = 0; i < mark.dots.length; i += 1) {
      for (let j = i + 1; j < mark.dots.length; j += 1) {
        const a = mark.dots[i];
        const b = mark.dots[j];
        // The innermost lane is the last resort for a crowded stellium.
        if (a.lane === 2 || b.lane === 2) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r);
      }
    }
    expect(mark.ticks).toHaveLength(12);
    expect(mark.asc).not.toBeNull();
    expect(mark.asc!.y1).toBeCloseTo(50, 5);
  });

  it('draws the major aspects as lines and leaves conjunctions to the lanes', () => {
    const mark = constellationGeometry({
      bodies: [
        { body: 'Sun', lon: 10 }, { body: 'Moon', lon: 130 }, { body: 'Mars', lon: 100 },
        { body: 'Venus', lon: 12 },
      ],
      asc: null,
      timeKnown: true,
    })!;
    const pairs = mark.lines.map((line) => `${line.a}-${line.b}:${line.tense ? 'tense' : 'flow'}`);
    expect(pairs).toContain('Sun-Moon:flow');
    expect(pairs).toContain('Sun-Mars:tense');
    expect(pairs.some((pair) => pair.startsWith('Sun-Venus'))).toBe(false);
  });

  it('keeps an unknown-time Moon unsettled and out of the aspect lines', () => {
    const mark = constellationGeometry(source('1990-08-14T12:00:00Z', false))!;
    expect(mark.asc).toBeNull();
    expect(mark.dots.find((dot) => dot.body === 'Moon')!.fill).toBe(MARK_UNSETTLED);
    expect(mark.lines.some((line) => line.a === 'Moon' || line.b === 'Moon')).toBe(false);
  });

  it('has nothing to draw without a Sun', () => {
    expect(constellationGeometry({ bodies: [{ body: 'Moon', lon: 3 }], asc: null, timeKnown: true })).toBeNull();
  });
});
