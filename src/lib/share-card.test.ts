import { describe, expect, it } from 'vitest';
import {
  SHARE_CARD_SCALE,
  SHARE_CARD_WORDMARK,
  bigThreePlacements,
  chartCardFilename,
  chartCardReceipt,
  communicationCardContent,
  dominantProfile,
  firstSentence,
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
});
