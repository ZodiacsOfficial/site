import { describe, expect, it } from 'vitest';
import {
  auraTalismanSummary,
  buildAuraTalisman,
  talismanGoldCountLabel,
  talismanGeometry,
} from './talisman';
import {
  AURA_SIGN_ORDER,
  type AuraComposition,
  type AuraSign,
} from './types';

function composition(heldSigns: AuraSign[] = ['cancer', 'leo', 'aquarius']): AuraComposition {
  return {
    asOf: '2026-07-18T12:00:00.000Z',
    chart: { id: 'private-chart', name: 'Private chart', timeKnown: false },
    heldSigns,
    chartEvidence: [
      {
        id: 'Sun:taurus',
        sign: 'taurus',
        label: 'Sun in Taurus',
        source: 'chart',
        kind: 'natal-body',
        body: 'Sun',
        longitude: 42,
        precision: 'exact-time',
      },
      {
        id: 'Moon:cancer',
        sign: 'cancer',
        label: 'Moon in Cancer (noon estimate)',
        source: 'chart',
        kind: 'natal-body',
        body: 'Moon',
        precision: 'noon-estimate',
      },
    ],
    skyEvidence: [],
    signs: heldSigns.map((sign) => ({
      sign,
      natalEcho: [],
      activeNow: [],
      nextActivation: null,
      uncertainties: [],
      reading: {
        lead: `${sign} grounded reflection.`,
        detail: `${sign} factual detail.`,
        text: `${sign} grounded reflection. ${sign} factual detail.`,
      },
    })),
    currentSky: {
      observedAt: '2026-07-18T12:00:00.000Z',
      sun: { sign: 'cancer', longitude: 116 },
      moon: { sign: 'virgo', longitude: 165 },
    },
    focal: heldSigns[0]
      ? { sign: heldSigns[0], evidenceIds: [], explanation: 'Fixture focus.' }
      : null,
    auraSentence: heldSigns.length
      ? 'Existing factual composition sentence.'
      : 'No official Zodiac was found at this public wallet address, so no Aura is composed.',
    methodNote: 'Fixture method.',
    uncertainties: [],
    eventData: {
      usable: true,
      generatedAt: '2026-07-17T00:00:00.000Z',
      coverage: {
        from: '2026-01-01T00:00:00.000Z',
        to: '2027-01-01T00:00:00.000Z',
      },
      activeWindowHours: 24,
    },
  };
}

describe('Registry Aura talisman geometry', () => {
  it('always returns twelve normalized outer nodes in canonical order', () => {
    const geometry = talismanGeometry(['pisces', 'aries', 'pisces']);

    expect(geometry.outerNodes.map((node) => node.sign)).toEqual(AURA_SIGN_ORDER);
    expect(geometry.collectionPoints.map((node) => node.sign)).toEqual(['aries', 'pisces']);
    expect(geometry.outerNodes).toHaveLength(12);
    for (const node of geometry.outerNodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(1);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(1);
    }
  });

  it('uses a marked point, chord, or closed polygon for one, two, or three-plus signs', () => {
    const one = talismanGeometry(['leo']);
    const two = talismanGeometry(['leo', 'aquarius']);
    const three = talismanGeometry(['aries', 'cancer', 'libra']);

    expect(one).toMatchObject({
      collectionMode: 'point',
      closed: false,
      fullTwelve: false,
    });
    expect(one.collectionPoints).toHaveLength(1);
    expect(one.collectionSegments).toHaveLength(0);

    expect(two).toMatchObject({ collectionMode: 'chord', closed: false });
    expect(two.collectionSegments).toHaveLength(1);
    expect(two.collectionSegments[0]).toMatchObject({
      fromSign: 'leo',
      toSign: 'aquarius',
    });

    expect(three).toMatchObject({ collectionMode: 'polygon', closed: true });
    expect(three.collectionSegments).toHaveLength(3);
    expect(three.collectionSegments[2]).toMatchObject({
      fromSign: 'libra',
      toSign: 'aries',
    });
  });

  it('marks a complete Twelve with one closed twelve-segment polygon', () => {
    const geometry = talismanGeometry(AURA_SIGN_ORDER);

    expect(geometry.fullTwelve).toBe(true);
    expect(geometry.closed).toBe(true);
    expect(geometry.collectionPoints).toHaveLength(12);
    expect(geometry.collectionSegments).toHaveLength(12);
  });

  it('carries material editions and restrained Gold tally arcs without changing geometry', () => {
    const geometry = talismanGeometry(
      ['cancer', 'leo', 'scorpio', 'aquarius'],
      [
        { sign: 'cancer', finish: 'pastel' },
        { sign: 'leo', finish: 'bronze' },
        { sign: 'scorpio', finish: 'silver' },
        { sign: 'aquarius', finish: 'gold', goldCount: '3' },
      ],
    );

    expect(geometry.collectionSegments).toHaveLength(4);
    expect(geometry.collectionPoints.map((node) => ({
      sign: node.sign,
      finish: node.finish,
      count: node.goldCountLabel,
      arcs: node.goldTallyArcs,
    }))).toEqual([
      { sign: 'cancer', finish: 'pastel', count: null, arcs: 0 },
      { sign: 'leo', finish: 'bronze', count: null, arcs: 0 },
      { sign: 'scorpio', finish: 'silver', count: null, arcs: 0 },
      { sign: 'aquarius', finish: 'gold', count: '×3', arcs: 2 },
    ]);
    expect(talismanGoldCountLabel('9')).toBe('×9');
    expect(talismanGoldCountLabel('10')).toBe('×10');
    expect(talismanGoldCountLabel('99')).toBe('×99');
    expect(talismanGoldCountLabel('100')).toBe('×99+');
  });
});

describe('Registry Aura talisman composition', () => {
  it('adds exact sky marks without adding the private chart by default', () => {
    const model = buildAuraTalisman(composition());

    expect(model.skyMarks.map((mark) => [mark.body, mark.sign])).toEqual([
      ['Sun', 'cancer'],
      ['Moon', 'virgo'],
    ]);
    expect(model.chartEchoNodes).toEqual([]);
  });

  it('adds chart echoes only when requested and keeps collection geometry unchanged', () => {
    const source = composition();
    const publicModel = buildAuraTalisman(source);
    const personalModel = buildAuraTalisman(source, {
      includeChart: true,
      selectedSign: 'leo',
      holdings: [
        { sign: 'cancer', finish: 'pastel' },
        { sign: 'leo', finish: 'gold', goldCount: '2' },
        { sign: 'aquarius', finish: 'silver' },
      ],
    });

    expect(personalModel.collectionSegments).toEqual(publicModel.collectionSegments);
    expect(personalModel.chartEchoNodes).toHaveLength(2);
    expect(personalModel.chartEchoNodes[0]).toMatchObject({
      sign: 'taurus',
      estimated: false,
    });
    expect(personalModel.chartEchoNodes[1]).toMatchObject({
      sign: 'cancer',
      estimated: true,
    });
    expect(personalModel.editionDate).toBe('2026-07-18T12:00:00.000Z');
    expect(personalModel.collectionPoints.find((node) => node.sign === 'leo')).toMatchObject({
      finish: 'gold',
      goldCountLabel: '×2',
      goldTallyArcs: 1,
    });
    expect(auraTalismanSummary(personalModel)).toContain('2 private chart echoes are shown');
  });

  it('stays factual for an empty collection instead of inventing a reading', () => {
    const model = buildAuraTalisman(composition([]), { selectedSign: 'aries' });

    expect(model.collectionMode).toBe('empty');
    expect(auraTalismanSummary(model)).toContain(
      'No Registry-listed Zodiacs are represented.',
    );
  });
});
