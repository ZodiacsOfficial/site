import { describe, expect, it } from 'vitest';
import {
  CHART_SHEET_LAYOUT,
  SHARE_CARD_SCALE,
  SHARE_CARD_WORDMARK,
  approachCardContent,
  authoredSignatureForLocale,
  bigThreePlacements,
  chartCardFilename,
  chartCardReceipt,
  chartPreviewPlacement,
  chartSheetSettings,
  communicationCardContent,
  dominantProfile,
  firstSentence,
  primaryShareCardVariant,
  shareCardTimeNotes,
  signatureCardContent,
} from './share-card';
import type { Chart } from './engine/types';

const CHART = { engineVersion: '1.0.0' } as Chart;

describe('chartCardReceipt', () => {
  it('uses only the engine version by default', () => {
    const receipt = chartCardReceipt(CHART);

    expect(receipt).toBe('Engine 1.0.0');
    expect(receipt).not.toContain('1990');
    expect(receipt).not.toContain('08:30');
    expect(receipt).not.toContain('New York');
    expect(receipt).not.toContain('Alex');
  });

  it('uses the chart engine version rather than a hard-coded version', () => {
    expect(chartCardReceipt({ engineVersion: '2.4.1' })).toBe('Engine 2.4.1');
    expect(chartCardReceipt({ engineVersion: '2.4.1' }, 'es')).toBe('Motor 2.4.1');
  });
});

describe('chartCardFilename', () => {
  it('uses a generic full-chart filename with no input fields', () => {
    expect(chartCardFilename()).toBe('zodiacs-chart.png');
  });

  it('uses a private filename for the big-three card', () => {
    expect(chartCardFilename({ variant: 'big-three' })).toBe('zodiacs-big-three.png');
  });

  it('uses a generic filename for the communication card', () => {
    expect(chartCardFilename({ variant: 'communication' })).toBe('zodiacs-communication.png');
  });

  it('uses privacy-safe filenames for signature and approach cards', () => {
    expect(chartCardFilename({ variant: 'signature' })).toBe('zodiacs-chart-signature.png');
    expect(chartCardFilename({ variant: 'approach' })).toBe('zodiacs-how-to-approach-me.png');
  });

  it('uses the generic Reddit sheet filename', () => {
    expect(chartCardFilename({ variant: 'sheet' })).toBe('zodiacs-chart-sheet.png');
  });
});

describe('chart sheet formatting', () => {
  it('keeps the aspect header clear of the rotated planet labels', () => {
    expect(CHART_SHEET_LAYOUT.aspectGridY - CHART_SHEET_LAYOUT.sectionTitleY)
      .toBeGreaterThanOrEqual(200);
  });

  it('uses a readable site signature beside the profile image', () => {
    expect(CHART_SHEET_LAYOUT.brandFontSize).toBeGreaterThan(31);
    expect(CHART_SHEET_LAYOUT.brandIconSize).toBeGreaterThanOrEqual(80);
  });

  it('carries rounded arcminutes into the next sign and wraps the zodiac', () => {
    expect(chartPreviewPlacement(29.999)).toMatchObject({ signSlug: 'taurus', degree: 0, minute: 0 });
    expect(chartPreviewPlacement(359.999)).toMatchObject({ signSlug: 'aries', degree: 0, minute: 0 });
  });

  it('stamps the configured house setting honestly', () => {
    expect(chartSheetSettings({ houses: { system: 'whole', cusps: [] } })).toBe('Whole sign · Tropical');
    expect(chartSheetSettings({ houses: { system: 'placidus', cusps: [] } })).toBe('Placidus · Tropical');
    expect(chartSheetSettings({ houses: null })).toBe('No houses · Tropical');
    expect(chartSheetSettings({ houses: null, input: { timeKnown: false } }))
      .toBe('12:00 reference · No houses · Tropical');
  });

  it('states the noon reference and Moon uncertainty without implying an angle', () => {
    expect(shareCardTimeNotes('en', { referenceTime: true, moonAmbiguous: true })).toEqual([
      '12:00 reference · Birth time unknown',
      'My Moon may change signs without an exact birth time.',
    ]);
  });
});

describe('share-card content', () => {
  const chart = {
    bodies: [
      { body: 'Sun', lon: 12.5 },
      { body: 'Moon', lon: 48.25 },
      { body: 'Mercury', lon: 18 },
      { body: 'Venus', lon: 128 },
      { body: 'Mars', lon: 132 },
      { body: 'Jupiter', lon: 137 },
      { body: 'Saturn', lon: 14 },
      { body: 'Uranus', lon: 19 },
      { body: 'Neptune', lon: 22 },
      { body: 'Pluto', lon: 25 },
    ],
    angles: { asc: 185, mc: 95 },
  } as Chart;

  it('exports at a two-times retina scale', () => {
    expect(SHARE_CARD_SCALE).toBe(2);
  });

  it('pins the silver wordmark to the bottom-right register', () => {
    expect(SHARE_CARD_WORDMARK).toEqual({ x: 1016, y: 1304, align: 'right' });
  });

  it('derives only placements selected for the big-three surface', () => {
    expect(bigThreePlacements(chart).map(({ kind, sign, degree }) => ({ kind, sign, degree })))
      .toEqual([
        { kind: 'sun', sign: 'Aries', degree: 12.5 },
        { kind: 'moon', sign: 'Taurus', degree: 18.25 },
        { kind: 'rising', sign: 'Libra', degree: 5 },
      ]);
  });

  it('computes dominant element and modality without personal input fields', () => {
    expect(dominantProfile(chart)).toEqual({ element: 'fire', modality: 'cardinal' });
  });

  it('builds a concise communication card from positions only', () => {
    const content = communicationCardContent({
      ...chart,
      engineVersion: '9.9.9',
      aspects: [
        { a: 'Mercury', b: 'Mars', type: 'square', orb: 0.5, applying: true },
      ],
    } as Chart);

    expect(content.title).toBe('How I communicate');
    expect(content.rows.map(({ body, sign, role }) => ({ body, sign, role }))).toEqual([
      { body: 'Mercury', sign: 'Aries', role: 'How you phrase things' },
      { body: 'Moon', sign: 'Taurus', role: 'What helps you feel heard' },
      { body: 'Mars', sign: 'Leo', role: 'How you handle friction' },
    ]);
    expect(content.rows.every(({ reading }) => firstSentence(reading) === reading)).toBe(true);
    expect(content.aspect).toMatch(/^Mercury square Mars/);
    expect(content.receipt).toBe('Engine 9.9.9');
    expect(JSON.stringify(content)).not.toMatch(/1990|08:30|New York|latitude|longitude/i);
  });

  it('builds a positive evidence-backed signature card from positions only', () => {
    const signatureChart = {
      ...chart,
      input: { utc: new Date('1990-06-15T08:30:00Z'), houseSystem: 'whole', timeKnown: true },
      aspects: [],
      engineVersion: '9.9.9',
    } as Chart;
    const content = signatureCardContent(signatureChart);

    expect(content.title).toBe('My chart signature');
    expect(content.signature).toMatchObject({
      kind: 'dignity',
      title: 'Sun in Aries',
      signSlugs: ['aries'],
    });
    expect(content.bigThree.map(({ kind }) => kind)).toEqual(['sun', 'moon', 'rising']);
    expect(content.notes).toEqual([]);
    expect(content.receipt).toBe('Engine 9.9.9');
    expect(JSON.stringify(content)).not.toMatch(/1990|08:30|New York|latitude|longitude|destiny|will happen/i);
  });

  it('keeps authored chart signatures English-only and selects localized structural primaries', () => {
    const signatureChart = {
      ...chart,
      input: { utc: new Date('1990-06-15T08:30:00Z'), houseSystem: 'whole', timeKnown: true },
      aspects: [],
      engineVersion: '9.9.9',
    } as Chart;

    expect(primaryShareCardVariant('en', true)).toBe('signature');
    expect(primaryShareCardVariant('en', false)).toBe('signature');
    expect(authoredSignatureForLocale(signatureChart, 'en')).toMatchObject({
      kind: 'dignity',
      title: 'Sun in Aries',
    });

    for (const locale of ['es', 'pt', 'fr', 'it'] as const) {
      expect(primaryShareCardVariant(locale, true)).toBe('big-three');
      expect(primaryShareCardVariant(locale, false)).toBe('full');
      expect(authoredSignatureForLocale(signatureChart, locale)).toBeNull();

      const content = signatureCardContent(signatureChart, locale);
      expect(content.signature).toBeNull();
      expect(JSON.stringify(content)).not.toContain('Sun in Aries');
      expect(JSON.stringify(content)).not.toContain('Your confidence grows when you take the lead');
    }
  });

  it('carries the reference-time and Moon-boundary receipts into a no-time signature', () => {
    const content = signatureCardContent({
      ...chart,
      angles: null,
      input: { utc: new Date('1990-01-01T12:00:00Z'), houseSystem: 'whole', timeKnown: false },
      aspects: [],
      engineVersion: '9.9.9',
    } as Chart, 'en', true);

    expect(content.bigThree.map(({ kind }) => kind)).toEqual(['sun', 'moon']);
    expect(content.notes).toEqual([
      '12:00 reference · Birth time unknown',
      'My Moon may change signs without an exact birth time.',
    ]);
  });

  it('builds audience-facing approach content and carries Moon ambiguity', () => {
    const content = approachCardContent({
      ...chart,
      input: { utc: new Date('1990-06-15T08:30:00Z'), houseSystem: 'whole', timeKnown: true },
      aspects: [],
      engineVersion: '9.9.9',
    } as Chart, { moonAmbiguous: true });

    expect(content.title).toBe('How to approach me');
    expect(content.rows.map(({ body, role, sign }) => ({ body, role, sign }))).toEqual([
      { body: 'Rising', role: 'How to open', sign: 'Libra' },
      { body: 'Mercury', role: 'How to say it', sign: 'Aries' },
      { body: 'Moon', role: 'What builds trust', sign: 'Taurus' },
    ]);
    expect(content.avoid).toMatchObject({
      body: 'Mars',
      role: 'What to avoid under pressure',
      sign: 'Leo',
    });
    expect(content.notes).toEqual(['My Moon may change signs without an exact birth time.']);
    expect(content.rows.every(({ reading }) => firstSentence(reading) === reading)).toBe(true);
    expect(JSON.stringify(content)).not.toMatch(/1990|08:30|New York|latitude|longitude/i);
  });

  it('makes a no-time approach card explicit instead of inventing a Rising sign', () => {
    const content = approachCardContent({
      ...chart,
      angles: null,
      input: { utc: new Date('1990-06-15T12:00:00Z'), houseSystem: 'whole', timeKnown: false },
      aspects: [],
      engineVersion: '9.9.9',
    } as Chart);

    expect(content.rows.map(({ body }) => body)).toEqual(['Mercury', 'Moon']);
    expect(content.notes).toEqual(['Birth time would add my Rising sign.']);
  });
});
