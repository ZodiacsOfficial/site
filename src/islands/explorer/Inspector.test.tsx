import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import type { BodyName } from '../../lib/engine/types';
import type { ChartSceneModel, SceneBody, SignSlug } from '../../lib/scene/types';
import Inspector from './Inspector';

function body(
  name: BodyName,
  sign: SignSlug,
  house: number | null,
  extra: Partial<SceneBody> = {},
): SceneBody {
  return {
    body: name,
    lon: 300,
    drawLon: 300,
    sign,
    signDegree: 0,
    house,
    speed: 1,
    retrograde: false,
    dignity: null,
    aspects: [],
    ...extra,
  };
}

function scene(timeKnown = true): ChartSceneModel {
  const bodies = [
    body('Sun', 'aquarius', timeKnown ? 12 : null, { aspects: ['aspect:Sun-sextile-Moon'] }),
    body('Moon', 'aries', timeKnown ? 2 : null, { lon: 2, drawLon: 2 }),
    body('Mercury', 'capricorn', timeKnown ? 11 : null, { lon: 280, drawLon: 280 }),
    body('Mars', 'taurus', timeKnown ? 3 : null, { lon: 45, drawLon: 45 }),
    body('North Node', 'aquarius', timeKnown ? 12 : null, {
      lon: 317,
      drawLon: 317,
      speed: -0.01,
      retrograde: true,
      // The inspector must ignore node aspects even if a malformed scene
      // supplies one; the engine intentionally does not calculate them.
      aspects: ['aspect:North Node-square-Mars'],
    }),
  ];
  return {
    engineVersion: 'test',
    anchor: { lon: 0, mode: timeKnown ? 'asc' : 'aries' },
    bodies,
    houses: timeKnown
      ? Array.from({ length: 12 }, (_, index) => ({
          index: index + 1,
          cuspLon: index * 30,
          spanDeg: 30,
          midLon: index * 30 + 15,
          occupants: bodies.filter((candidate) => candidate.house === index + 1).map((candidate) => candidate.body),
        }))
      : null,
    angles: timeKnown ? { asc: 330, mc: 240, dsc: 150, ic: 60 } : null,
    aspects: [
      { a: 'Sun', b: 'Moon', type: 'sextile', orb: 1.2, applying: true, weight: 2 },
      { a: 'North Node', b: 'Mars', type: 'square', orb: 0.4, applying: false, weight: 2 },
    ],
    signs: [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ].map((slug, index) => ({ slug: slug as SignSlug, fromLon: index * 30 })),
    flags: timeKnown ? [] : ['no-time'],
    houseSystem: 'whole',
  };
}

function inspectorMarkup(selection: Parameters<typeof Inspector>[0]['selection'], model = scene()) {
  return render(h(Inspector, {
    scene: model,
    selection,
    onSelect: () => {},
    locale: 'en',
  }));
}

describe('Inspector beginner hierarchy', () => {
  it('puts meaning before an exact-data disclosure for a body', () => {
    const markup = inspectorMarkup({ kind: 'body', body: 'Sun' });
    expect(markup).toContain('What it represents');
    expect(markup).toContain('How the sign shapes it');
    expect(markup).toContain('Where it shows up');
    expect(markup).toContain('Why it matters here');
    expect(markup.indexOf('What it represents')).toBeLessThan(markup.indexOf('Exact chart data'));
    expect(markup).toContain('<details class="insp__exact">');
    expect(markup).toContain('Explore next');
  });

  it('gives the North Node responsible context without fake links or aspects', () => {
    const markup = inspectorMarkup({ kind: 'body', body: 'North Node' });
    expect(markup).toContain('calculated point');
    expect(markup).toContain('not a fixed destiny');
    expect(markup).toContain('do not read this like a retrograde planet');
    expect(markup).toContain('/learn/glossary/#north-node');
    expect(markup).not.toContain('/placements/north-node');
    expect(markup).not.toContain('square · Mars');
  });

  it('explains why the house is unavailable in a no-time chart', () => {
    const markup = inspectorMarkup({ kind: 'body', body: 'Moon' }, scene(false));
    expect(markup).toContain('A birth time is needed');
    expect(markup).toContain('cannot say which area of life');
    expect(markup).not.toContain('>HOUSE<');

    const signMarkup = inspectorMarkup({ kind: 'sign', sign: 'aquarius' }, scene(false));
    expect(signMarkup).toContain('A birth time is needed to show which area of life');
  });

  it('uses the same four-part hierarchy for signs, houses, aspects, and angles', () => {
    const selections = [
      { kind: 'sign', sign: 'aquarius' },
      { kind: 'house', house: 12 },
      { kind: 'aspect', a: 'Sun', b: 'Moon', type: 'sextile' },
      { kind: 'angle', angle: 'asc' },
    ] as const;
    for (const selection of selections) {
      const markup = inspectorMarkup(selection);
      expect(markup).toContain('What it represents');
      expect(markup).toContain('Where it shows up');
      expect(markup).toContain('Why it matters');
      expect(markup).toContain('Exact chart data');
    }
    expect(inspectorMarkup(selections[2])).toMatch(/sextile/i);
  });
});
