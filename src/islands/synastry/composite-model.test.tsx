import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it, vi } from 'vitest';
import type { BodyName } from '../../lib/engine/types';
import { CompositeWheel, compositeWheelLayout } from './CompositeWheel';
import {
  COMPOSITE_ASPECT_PROMPTS, COMPOSITE_BODY_ROLES, COMPOSITE_PAIR_THEMES,
  compositePairKey, compositeReading,
} from './compositeReadings';
import {
  buildCompositeTabData, compositeAspectId, compositeBodyId, compositeDataKey,
  compositeSelection, RELATIONSHIP_BODY_ORDER, type CompositeTabData,
} from './relationshipData';

const TIMED = { aTimeKnown: true, bTimeKnown: true };
const ALL_BODIES: readonly BodyName[] = [...RELATIONSHIP_BODY_ORDER, 'North Node', 'South Node'];
const ANGLES = [
  ['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180],
] as const;

function atSamePositions(points: { body: BodyName; lon: number }[], timeKnown = true): CompositeTabData {
  return buildCompositeTabData(points, points, { aTimeKnown: timeKnown, bTimeKnown: true });
}

function attrs(tag: string): Record<string, string> {
  return Object.fromEntries(Array.from(tag.matchAll(/([\w:-]+)="([^"]*)"/g), (match) => [match[1], match[2]]));
}

function compositeGroups(markup: string): Array<{ attributes: Record<string, string>; firstLine: Record<string, string> }> {
  return Array.from(markup.matchAll(/<g\b([^>]*\bdata-composite-hit="[^"]+"[^>]*)>\s*<line\b([^>]*)\/?\s*>/g),
    (match) => ({ attributes: attrs(match[1]), firstLine: attrs(match[2]) }));
}

// Independent SVG oracle: 0° Aries is left and longitudes increase counterclockwise.
function expectedPoint(lon: number, radius: number, size = 420) {
  const angle = (180 + lon) * Math.PI / 180;
  return { x: size / 2 + radius * Math.cos(angle), y: size / 2 - radius * Math.sin(angle) };
}

describe('composite facts and selection ownership', () => {
  it('keeps shared bodies in source-A order and strips unrelated natal fields', () => {
    const a = Object.freeze([
      Object.freeze({ body: 'Moon', lon: 359, speed: 12, retrograde: false, lat: 2 }),
      Object.freeze({ body: 'Sun', lon: 0, speed: 1, retrograde: false, lat: 0 }),
      Object.freeze({ body: 'Mars', lon: 55, speed: -0.2, retrograde: true, lat: 1 }),
      Object.freeze({ body: 'North Node', lon: 40, speed: -0.05, retrograde: true, lat: 0 }),
      Object.freeze({ body: 'South Node', lon: 220, speed: -0.05, retrograde: true, lat: 0 }),
      Object.freeze({ body: 'ASC', lon: 10, speed: 0, retrograde: false, lat: 0 }),
    ]);
    const b = Object.freeze([
      Object.freeze({ body: 'Sun', lon: 180 }),
      Object.freeze({ body: 'South Node', lon: 240 }),
      Object.freeze({ body: 'Moon', lon: 1 }),
      Object.freeze({ body: 'North Node', lon: 60 }),
      Object.freeze({ body: 'Venus', lon: 70 }),
      Object.freeze({ body: 'ASC', lon: 50 }),
    ]);
    const before = JSON.stringify([a, b]);
    const data = buildCompositeTabData(a, b, TIMED);
    expect(data).toEqual({
      points: [
        { body: 'Moon', lon: 0 }, { body: 'Sun', lon: 90 },
        { body: 'North Node', lon: 50 }, { body: 'South Node', lon: 230 },
      ],
      aspects: [{ a: 'Moon', b: 'Sun', type: 'square', orb: 0 }],
      moonProvisional: false,
    });
    expect(JSON.stringify([a, b])).toBe(before);
  });

  it('preserves the eastward-from-A convention only at exact opposition', () => {
    const a = [{ body: 'Sun', lon: 0 }];
    const b = [{ body: 'Sun', lon: 180 }];
    expect(buildCompositeTabData(a, b, TIMED).points[0].lon).toBe(90);
    expect(buildCompositeTabData(b, a, TIMED).points[0].lon).toBe(270);
    expect(buildCompositeTabData(a, [{ body: 'Sun', lon: 180.002 }], TIMED).points[0].lon).toBeCloseTo(270.001, 9);
    expect(buildCompositeTabData(a, [{ body: 'Sun', lon: 179.998 }], TIMED).points[0].lon).toBeCloseTo(89.999, 9);
  });

  it.each([
    undefined, { aTimeKnown: false, bTimeKnown: true },
    { aTimeKnown: true, bTimeKnown: false }, { aTimeKnown: false, bTimeKnown: false },
  ])('retains reference Moon facts but marks them provisional for %j', (certainty) => {
    const points = [{ body: 'Moon', lon: 120 }, { body: 'Venus', lon: 60 }, { body: 'Sun', lon: 0 }];
    const data = buildCompositeTabData(points, points, certainty);
    const timed = buildCompositeTabData(points, points, TIMED);
    expect(data.points).toEqual(timed.points);
    expect(data.aspects).toEqual(timed.aspects);
    expect(data.moonProvisional).toBe(true);
    expect(compositeSelection(data, compositeBodyId('Moon'))).toEqual({
      kind: 'body', id: 'composite:body:Moon', point: { body: 'Moon', lon: 120 }, provisional: true,
    });
    for (const aspect of data.aspects) {
      const selected = compositeSelection(data, compositeAspectId(aspect));
      expect(selected?.provisional).toBe(aspect.a === 'Moon' || aspect.b === 'Moon');
      if (selected?.kind === 'aspect') expect(selected.aspect).toBe(aspect);
    }
    expect(compositeSelection(data, compositeBodyId('Venus'))?.provisional).toBe(false);
  });

  it('does not invent an absent Moon, a Moon uncertainty range, angles, or missing selections', () => {
    const data = buildCompositeTabData([{ body: 'Sun', lon: 0 }, { body: 'Moon', lon: 50 }], [{ body: 'Sun', lon: 40 }]);
    expect(data).toEqual({ points: [{ body: 'Sun', lon: 20 }], aspects: [], moonProvisional: false });
    for (const id of [null, '', 'composite:body:Moon', 'composite:body:ASC', 'composite:aspect:Sun:trine:Moon', 'body:Sun']) {
      expect(compositeSelection(data, id)).toBeNull();
      expect(compositeReading(data, id)).toBeNull();
    }
    expect(buildCompositeTabData([], [])).toEqual({ points: [], aspects: [], moonProvisional: false });
  });

  it('makes point, orb, ordering, and time certainty changes invalidate an existing data key', () => {
    const data = atSamePositions([{ body: 'Sun', lon: 0 }, { body: 'Moon', lon: 61 }]);
    const key = compositeDataKey(data);
    expect(compositeDataKey(structuredClone(data))).toBe(key);
    const moved = structuredClone(data);
    moved.points[1].lon += 0.001;
    const changedOrb = structuredClone(data);
    changedOrb.aspects[0].orb += 0.001;
    for (const replaced of [moved, changedOrb, { ...data, points: [...data.points].reverse() }, { ...data, moonProvisional: true }]) {
      expect(compositeDataKey(replaced)).not.toBe(key);
    }
  });
});

describe('composite reading coverage and uncertainty', () => {
  it('has a distinct authored role for all twelve bodies, including both nodes', () => {
    expect(Object.keys(COMPOSITE_BODY_ROLES).sort()).toEqual([...ALL_BODIES].sort());
    expect(new Set(Object.values(COMPOSITE_BODY_ROLES)).size).toBe(12);
    const data = atSamePositions(ALL_BODIES.map((body, index) => ({ body, lon: index * 30 })));
    for (const point of data.points) {
      const reading = compositeReading(data, compositeBodyId(point.body));
      expect(reading).toEqual({ role: COMPOSITE_BODY_ROLES[point.body] });
      expect(reading?.role?.length).toBeGreaterThan(80);
    }
  });

  it('covers exactly the 45 unordered major-body pairs and keeps the five angle prompts separate', () => {
    const keys = RELATIONSHIP_BODY_ORDER.flatMap((a, i) => RELATIONSHIP_BODY_ORDER.slice(i + 1).map((b) => `${a}|${b}`));
    expect(Object.keys(COMPOSITE_PAIR_THEMES).sort()).toEqual(keys.sort());
    expect(new Set(Object.values(COMPOSITE_PAIR_THEMES)).size).toBe(45);
    expect(Object.keys(COMPOSITE_ASPECT_PROMPTS).sort()).toEqual(ANGLES.map(([type]) => type).sort());
    expect(new Set(Object.values(COMPOSITE_ASPECT_PROMPTS)).size).toBe(5);
    for (const theme of Object.values(COMPOSITE_PAIR_THEMES)) {
      expect(theme.length).toBeGreaterThan(80);
      for (const prompt of Object.values(COMPOSITE_ASPECT_PROMPTS)) expect(theme).not.toContain(prompt);
    }
  });

  it.each(ANGLES)('resolves all 45 %s pairs in either source order without missing narrative fields', (type, angle) => {
    for (let i = 0; i < RELATIONSHIP_BODY_ORDER.length; i += 1) {
      for (const b of RELATIONSHIP_BODY_ORDER.slice(i + 1)) {
        const a = RELATIONSHIP_BODY_ORDER[i];
        const expectedKey = `${a}|${b}`;
        expect(compositePairKey(a, b)).toBe(expectedKey);
        expect(compositePairKey(b, a)).toBe(expectedKey);
        for (const points of [[{ body: a, lon: 0 }, { body: b, lon: angle }], [{ body: b, lon: angle }, { body: a, lon: 0 }]]) {
          const data = atSamePositions(points);
          expect(data.aspects).toHaveLength(1);
          expect(data.aspects[0].type).toBe(type);
          const id = compositeAspectId(data.aspects[0]);
          expect(compositeSelection(data, id)?.id).toBe(id);
          expect(compositeReading(data, id)).toEqual({ theme: COMPOSITE_PAIR_THEMES[expectedKey], prompt: COMPOSITE_ASPECT_PROMPTS[type] });
        }
      }
    }
  });

  it('withholds every Moon role and Moon contact action while keeping other readings available', () => {
    const data = atSamePositions(ALL_BODIES.map((body) => ({ body, lon: 0 })), false);
    for (const point of data.points) {
      const reading = compositeReading(data, compositeBodyId(point.body));
      if (point.body === 'Moon') expect(reading).toBeNull();
      else expect(reading?.role).toBe(COMPOSITE_BODY_ROLES[point.body]);
    }
    for (const aspect of data.aspects) {
      const id = compositeAspectId(aspect);
      const reading = compositeReading(data, id);
      if (aspect.a === 'Moon' || aspect.b === 'Moon') {
        expect(compositeSelection(data, id)).not.toBeNull();
        expect(reading).toBeNull();
      } else {
        expect(reading?.theme).toBeTruthy();
        expect(reading?.prompt).toBeTruthy();
      }
    }
  });
});

describe('composite wheel geometry and rendered facts', () => {
  it.each([0, 359.8])('fans coincident markers at %s° by at least 14° without changing facts or source order', (lon) => {
    const data = atSamePositions(ALL_BODIES.map((body) => ({ body, lon })));
    const before = JSON.stringify(data);
    const draw = compositeWheelLayout(data);
    expect(draw.size).toBe(11);
    expect(draw.has('South Node')).toBe(false);
    const angles = Array.from(draw.values(), (value) => ((value % 360) + 360) % 360).sort((a, b) => a - b);
    const gaps = angles.map((angle, index) => (angles[(index + 1) % angles.length] - angle + 360) % 360);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(14 - 1e-9);
    expect(Array.from(draw.values()).some((value) => value !== lon)).toBe(true);
    expect(compositeWheelLayout({ ...data, points: [...data.points].reverse() })).toEqual(draw);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('leaves isolated marker angles unchanged and supports empty or node-only frames', () => {
    expect(compositeWheelLayout(atSamePositions([])).size).toBe(0);
    expect(compositeWheelLayout(atSamePositions([{ body: 'South Node', lon: 55 }])).size).toBe(0);
    const points = [{ body: 'Sun' as const, lon: 0 }, { body: 'Moon' as const, lon: 120 }, { body: 'Mars' as const, lon: 240 }];
    const draw = compositeWheelLayout(atSamePositions(points));
    for (const point of points) expect(((draw.get(point.body)! % 360) + 360) % 360).toBe(point.lon);
  });

  it('draws every chord from true longitudes while displaced markers, hit IDs, and selected endpoints agree', () => {
    const data = atSamePositions([
      { body: 'Sun', lon: 359 }, { body: 'Moon', lon: 1 },
      { body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 60 }, { body: 'South Node', lon: 180 },
    ]);
    const chosen = data.aspects.find((aspect) => aspect.a === 'Sun' && aspect.b === 'Moon')!;
    const selection = compositeAspectId(chosen);
    const markup = render(h(CompositeWheel, { data, label: 'Composite relationship wheel', selection, onSelect: vi.fn() }));
    const groups = compositeGroups(markup);
    expect(groups).toHaveLength(data.aspects.length + data.points.length - 1);
    for (const aspect of data.aspects) {
      const id = compositeAspectId(aspect);
      const group = groups.find(({ attributes }) => attributes['data-composite-hit'] === id)!;
      expect(group).toBeDefined();
      const a = expectedPoint(data.points.find((point) => point.body === aspect.a)!.lon, 420 * 0.235);
      const b = expectedPoint(data.points.find((point) => point.body === aspect.b)!.lon, 420 * 0.235);
      for (const [attribute, coordinate] of Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })) {
        expect(Number(group.firstLine[attribute])).toBeCloseTo(coordinate, 10);
      }
      expect(group.firstLine['stroke-width']).toBe(id === selection ? '3' : '1');
      expect(group.attributes['data-selected']).toBe(id === selection ? 'true' : undefined);
      expect(compositeSelection(data, id)?.kind).toBe('aspect');
    }
    const selectedMarkup = markup.slice(markup.indexOf(`data-composite-hit="${selection}"`)).split('</g>')[0];
    const endpointMarks = Array.from(selectedMarkup.matchAll(/<circle\b([^>]*)\/?\s*>/g), (match) => attrs(match[1]));
    expect(endpointMarks).toHaveLength(2);
    for (const [index, body] of [chosen.a, chosen.b].entries()) {
      const expected = expectedPoint(data.points.find((point) => point.body === body)!.lon, 420 * 0.235);
      expect(Number(endpointMarks[index].cx)).toBeCloseTo(expected.x, 10);
      expect(Number(endpointMarks[index].cy)).toBeCloseTo(expected.y, 10);
    }
    const layout = compositeWheelLayout(data);
    const markers = Array.from(markup.matchAll(/<circle\b([^>]*\bdata-composite-marker="[^"]+"[^>]*)\/?\s*>/g), (match) => attrs(match[1]));
    expect(markers).toHaveLength(4);
    for (const marker of markers) {
      const body = marker['data-composite-marker'] as BodyName;
      const point = data.points.find((point) => point.body === body)!;
      const group = groups.find(({ attributes }) => attributes['data-composite-hit'] === compositeBodyId(body))!;
      expect(Number(group.attributes['data-composite-true-longitude'])).toBe(point.lon);
      expect(Number(group.attributes['data-composite-draw-longitude'])).toBe(layout.get(body));
      const expected = expectedPoint(layout.get(body)!, 420 * 0.31);
      expect(Number(marker.cx)).toBeCloseTo(expected.x, 10);
      expect(Number(marker.cy)).toBeCloseTo(expected.y, 10);
      expect(compositeSelection(data, group.attributes['data-composite-hit'])?.kind).toBe('body');
    }
    expect(markup.match(/data-selected="true"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Composite relationship wheel"');
    expect(markup).not.toMatch(/stroke-dasharray|data-entity=|data-body-retrograde|wheel__house|data-angle-label|>Rx<|>ASC<|>MC</);
  });

  it('uses the same selected body ID for the visible marker and factual selection model', () => {
    const data = atSamePositions([{ body: 'Sun', lon: 0 }, { body: 'Moon', lon: 0 }]);
    const id = compositeBodyId('Moon');
    const markup = render(h(CompositeWheel, { data, label: 'Composite', selection: id }));
    const selected = compositeGroups(markup).filter(({ attributes }) => attributes['data-selected'] === 'true');
    expect(selected.map(({ attributes }) => attributes['data-composite-hit'])).toEqual([id]);
    expect(compositeSelection(data, id)).toMatchObject({ kind: 'body', point: { body: 'Moon', lon: 0 } });
    expect(markup).not.toContain('class="wheel__hit"');
  });

  it('serializes an explicit light currentColor ancestor for the Sun and node filled marks', () => {
    // Detached image-card SVGs have no page styles from which to inherit color.
    const data = atSamePositions([{ body: 'Sun', lon: 0 }, { body: 'North Node', lon: 90 }]);
    const markup = render(h(CompositeWheel, { data, label: 'Composite', size: 780 }));
    for (const [body, filledMarks] of [['Sun', 1], ['North Node', 2]] as const) {
      const bodyMarkup = markup.slice(markup.indexOf(`data-composite-hit="${compositeBodyId(body)}"`)).split('</g>')[0];
      const glyph = bodyMarkup.match(/<g\b([^>]*\btransform="[^"]+"[^>]*)>([\s\S]*)$/);
      expect(glyph).not.toBeNull();
      const properties = attrs(glyph![1]);
      expect(properties.style).toMatch(/(?:^|;)\s*color:\s*#EEF1F7\s*(?:;|$)/i);
      expect(properties.stroke).toBe('#EEF1F7');
      expect(glyph![2].match(/fill="currentColor"/g)).toHaveLength(filledMarks);
    }
  });

  it('defers all twelve export icon URLs without changing default live artwork', () => {
    const data = atSamePositions([{ body: 'Sun', lon: 0 }]);
    const exported = render(h(CompositeWheel, { data, label: 'Composite', deferIcons: true }));
    const live = render(h(CompositeWheel, { data, label: 'Composite' }));
    expect(exported.match(/<image\b/g)).toHaveLength(12);
    expect(exported.match(/data-href="\/assets\/zodiac-icons\/128\//g)).toHaveLength(12);
    expect(exported).not.toMatch(/<image\b[^>]*\shref=/);
    expect(live.match(/<image\b[^>]*\shref="\/assets\/zodiac-icons\/128\//g)).toHaveLength(12);
    expect(live).not.toContain('data-href=');
  });
});
