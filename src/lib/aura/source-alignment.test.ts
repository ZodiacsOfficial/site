import { describe, expect, it } from 'vitest';
import { AURA_SIGN_ORDER } from './types';
import {
  AURA_SIGN_KEYWORDS,
  auraSourceAlignment,
  type AuraSourceAlignmentInput,
} from './source-alignment';

const input = (
  overrides: Partial<AuraSourceAlignmentInput> = {},
): AuraSourceAlignmentInput => ({
  heldSigns: [],
  skyEvidence: [],
  ...overrides,
});

describe('Registry Aura source alignment', () => {
  it('always returns all twelve signs in canonical order with three keywords', () => {
    const rows = auraSourceAlignment(input());

    expect(rows.map((row) => row.sign)).toEqual(AURA_SIGN_ORDER);
    expect(rows).toHaveLength(12);
    for (const row of rows) {
      expect(row.name).not.toBe('');
      expect(row.keywords).toEqual(AURA_SIGN_KEYWORDS[row.sign]);
      expect(row.keywords).toHaveLength(3);
    }
  });

  it('maps zero through three independent sources to honest tiers', () => {
    const rows = auraSourceAlignment(input({
      heldSigns: ['aries', 'taurus', 'gemini'],
      chartEvidence: [
        { sign: 'aries', label: 'Sun in Aries' },
        { sign: 'taurus', label: 'Moon in Taurus' },
        { sign: 'cancer', label: 'Mars in Cancer' },
      ],
      skyEvidence: [
        { sign: 'aries', label: 'Current Moon in Aries' },
        { sign: 'gemini', label: 'Current Sun in Gemini' },
        { sign: 'cancer', label: 'Current Moon in Cancer' },
        { sign: 'leo', label: 'Current Sun in Leo' },
      ],
    }));

    expect(rows.find((row) => row.sign === 'aries')).toMatchObject({
      sourceCount: 3,
      tier: 'In focus',
      tierDescription: 'All three sources contain this sign.',
    });
    expect(rows.find((row) => row.sign === 'taurus')).toMatchObject({
      sourceCount: 2,
      tier: 'Connected',
      tierDescription: 'Two of the three sources contain this sign.',
    });
    expect(rows.find((row) => row.sign === 'leo')).toMatchObject({
      sourceCount: 1,
      tier: 'Present',
      tierDescription: 'One of the three sources contains this sign.',
    });
    expect(rows.find((row) => row.sign === 'pisces')).toMatchObject({
      sourceCount: 0,
      tier: 'Quiet',
      tierDescription: 'None of the three sources contains this sign.',
    });
  });

  it('exposes source booleans and deduplicated plain evidence', () => {
    const aries = auraSourceAlignment(input({
      heldSigns: [' ARIES ', 'aries'],
      chartEvidence: [
        { sign: 'ARIES', label: 'Sun in Aries' },
        { sign: 'aries', label: 'Sun in Aries' },
        { sign: 'aries', label: 'Mars in Aries.' },
      ],
      skyEvidence: [
        { sign: 'aries', label: 'Current Moon in Aries' },
        { sign: 'not-a-sign', label: 'Invalid evidence' },
      ],
    })).find((row) => row.sign === 'aries')!;

    expect(aries.sources).toEqual({
      registry: {
        present: true,
        evidence: ['Aries is in the checked public collection.'],
      },
      chart: {
        present: true,
        evidence: ['Mars in Aries.', 'Sun in Aries.'],
      },
      sky: {
        present: true,
        evidence: ['Current Moon in Aries.'],
      },
    });
  });

  it('treats a missing chart as absent rather than inferred', () => {
    const cancer = auraSourceAlignment(input({
      heldSigns: ['cancer'],
      chartEvidence: null,
      skyEvidence: [{ sign: 'cancer', label: 'Current Sun in Cancer' }],
    })).find((row) => row.sign === 'cancer')!;

    expect(cancer.sources.chart).toEqual({ present: false, evidence: [] });
    expect(cancer.sourceCount).toBe(2);
    expect(cancer.tier).toBe('Connected');
    expect(cancer.explanation).toContain('Saved chart: Not added.');
  });

  it('counts a source once when several facts share one sign', () => {
    const libra = auraSourceAlignment(input({
      chartEvidence: [
        { sign: 'libra', label: 'Sun in Libra' },
        { sign: 'libra', label: 'Moon in Libra' },
        { sign: 'libra', label: 'Ascendant in Libra' },
      ],
      skyEvidence: [],
    })).find((row) => row.sign === 'libra')!;

    expect(libra.sources.chart.evidence).toHaveLength(3);
    expect(libra.sourceCount).toBe(1);
    expect(libra.tier).toBe('Present');
  });

  it('provides a complete factual explanation without repeating gallery disclaimers', () => {
    const [aries, taurus] = auraSourceAlignment(input({
      heldSigns: ['aries'],
      chartEvidence: [{ sign: 'aries', label: 'Sun in Aries' }],
      skyEvidence: [{ sign: 'aries', label: 'Current Moon in Aries' }],
    }));

    expect(aries.explanation).toContain('Aries is in the checked public collection.');
    expect(aries.explanation).toContain('Saved chart: Sun in Aries.');
    expect(aries.explanation).toContain('Current sky: Current Moon in Aries.');
    expect(aries.explanation).toContain('The resulting tier is In focus.');
    expect(aries.explanation).not.toContain('importance or a prediction');
    expect(taurus.explanation).toBe(
      'Taurus does not appear in the public collection or current sky. Taurus does not appear in the saved chart. The resulting tier is Quiet.',
    );
  });

  it('uses readable fallback evidence when a source label is absent', () => {
    const pisces = auraSourceAlignment(input({
      chartEvidence: [{ sign: 'pisces' }],
      skyEvidence: [{ sign: 'pisces', label: '   ' }],
    })).find((row) => row.sign === 'pisces')!;

    expect(pisces.sources.chart.evidence).toEqual(['Pisces appears in the saved chart.']);
    expect(pisces.sources.sky.evidence).toEqual(['Pisces appears in the current sky.']);
  });
});
