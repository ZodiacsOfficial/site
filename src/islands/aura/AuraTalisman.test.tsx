import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import type { AuraComposition } from '../../lib/aura/types';
import AuraTalisman from './AuraTalisman';

const composition: AuraComposition = {
  asOf: '2026-07-18T12:00:00.000Z',
  chart: { id: 'chart', name: 'Private chart', timeKnown: true },
  heldSigns: ['cancer', 'leo', 'scorpio', 'aquarius'],
  chartEvidence: [
    {
      id: 'Sun:cancer',
      sign: 'cancer',
      label: 'Sun in Cancer',
      source: 'chart',
      kind: 'natal-body',
      body: 'Sun',
      longitude: 115,
      precision: 'exact-time',
    },
  ],
  skyEvidence: [],
  signs: ['cancer', 'leo', 'scorpio', 'aquarius'].map((sign) => ({
    sign: sign as 'cancer' | 'leo' | 'scorpio' | 'aquarius',
    natalEcho: [],
    activeNow: [],
    nextActivation: null,
    uncertainties: [],
    reading: {
      lead: `${sign} reflection.`,
      detail: `${sign} detail.`,
      text: `${sign} reflection. ${sign} detail.`,
    },
  })),
  currentSky: {
    observedAt: '2026-07-18T12:00:00.000Z',
    sun: { sign: 'cancer', longitude: 116 },
    moon: { sign: 'virgo', longitude: 165 },
  },
  focal: { sign: 'cancer', evidenceIds: [], explanation: 'Fixture focus.' },
  auraSentence: 'Existing composition sentence.',
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

const holdings = [
  { sign: 'cancer', finish: 'pastel' },
  { sign: 'leo', finish: 'bronze' },
  { sign: 'scorpio', finish: 'silver' },
  { sign: 'aquarius', finish: 'gold', goldCount: '3' },
] as const;

describe('AuraTalisman', () => {
  it('renders an accessible deterministic seal with twelve nodes and dated sky marks', () => {
    const markup = render(h(AuraTalisman, { composition, holdings }));

    expect(markup).toContain('The collection’s dated seal.');
    expect(markup).toContain('A dated composition drawn from this collection and today’s Sun and Moon.');
    expect(markup).toContain('role="img"');
    expect(markup).toContain('4 of the Twelve represented: Cancer, Leo, Scorpio, Aquarius.');
    expect(markup.match(/data-aura-talisman-node=/g)).toHaveLength(12);
    expect(markup.match(/data-aura-talisman-represented="true"/g)).toHaveLength(4);
    expect(markup.match(/data-aura-talisman-sky=/g)).toHaveLength(2);
    expect(markup).toContain('data-aura-talisman-segment-count="4"');
    expect(markup).toContain('data-aura-talisman-finish="pastel"');
    expect(markup).toContain('data-aura-talisman-finish="bronze"');
    expect(markup).toContain('data-aura-talisman-finish="silver"');
    expect(markup).toContain('data-aura-talisman-finish="gold"');
    expect(markup.match(/data-aura-talisman-gold-tally=/g)).toHaveLength(2);
    expect(markup).toContain('data-aura-talisman-count="×3"');
    // The date is engraved at the seal's center; the score is not.
    expect(markup).toContain('data-aura-talisman-edition="Jul 18, 2026"');
    expect(markup).toContain('aura-talisman__center-date');
    expect(markup).not.toContain('/ 12<');
    expect(markup).not.toContain('data-aura-talisman-chart-echo=');
  });

  it('renders the optional private layer and selected sign without changing the public label', () => {
    const markup = render(h(AuraTalisman, {
      composition,
      holdings,
      includeChart: true,
      selectedSign: 'leo',
    }));

    expect(markup).toContain('data-aura-talisman-chart-echo="cancer"');
    // The seal carries facts, not a reading sentence.
    expect(markup).not.toContain('reflection.');
    expect(markup).toContain('1 inner mark shown');
    expect(markup).toContain('is-selected');
    expect(markup).toContain('data-aura-talisman-selected="true"');
  });

  it('uses short one-time GPU motion and honors reduced motion', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/islands/aura/AuraTalisman.css'),
      'utf8',
    );

    expect(css).toContain('220ms cubic-bezier(0.16, 1, 0.3, 1)');
    expect(css).toContain('180ms cubic-bezier(0.16, 1, 0.3, 1)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).not.toContain('transition: all');
    expect(css).not.toMatch(/animation-iteration-count:\s*infinite/);
    expect(css).not.toMatch(
      /(?:from|to)\s*\{[^}]*\b(?:width|height|margin|padding|top|left)\s*:/,
    );
  });
});
