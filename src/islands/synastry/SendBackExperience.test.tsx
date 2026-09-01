import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import type { PairSummary } from '../../lib/engine/synastry';
import type { PositionsShareInput } from '../../lib/share-positions';
import { SendBackCard } from './SendBackExperience';

const BODY_NAMES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node',
] as const;

function positions(withAngles: boolean): PositionsShareInput {
  return {
    bodies: BODY_NAMES.map((body, index) => ({ body, lon: index * 27.5 })),
    angles: withAngles ? { asc: 48, mc: 312 } : null,
    houseSystem: 'whole',
    engineVersion: 'phase4-test',
  };
}

function person(label: string, withAngles: boolean) {
  const chart = positions(withAngles);
  return {
    label,
    bodies: chart.bodies.map((body) => ({ ...body })),
    asc: chart.angles?.asc ?? null,
    positions: chart,
  };
}

describe('Phase 4 send-back share surfaces', () => {
  it("offers B's Big Three card at an invitation completion without birth input", () => {
    const markup = render(h(SendBackCard, {
      a: person('Frida', true),
      b: person('Me', true),
      summary: {} as PairSummary,
      inviterLabel: 'Frida',
    }));

    expect(markup).toContain('Send the result back.');
    expect(markup).toContain('data-share-card-action="big-three"');
    expect(markup).toContain('Share the big three');
    expect(markup).not.toMatch(/birth date|birth time|birth place|latitude|longitude/i);
  });

  it('offers the same picture and positions-only link on a plain result, phrased as sending', () => {
    const markup = render(h(SendBackCard, {
      a: person('Me', true),
      b: person('Sam', true),
      summary: {} as PairSummary,
      inviterLabel: 'Sam',
      variant: 'share',
    }));

    expect(markup).toContain('Send this to Sam.');
    expect(markup).not.toContain('Send the result back.');
    expect(markup).toContain('Copy the private link');
    expect(markup).toContain('data-share-card-action="big-three"');
    expect(markup).not.toMatch(/birth date|birth time|birth place|latitude|longitude/i);
  });

  it('keeps the Big Three action absent for a no-time chart', () => {
    const markup = render(h(SendBackCard, {
      a: person('Frida', true),
      b: person('Me', false),
      summary: {} as PairSummary,
      inviterLabel: 'Frida',
    }));

    expect(markup).not.toContain('data-share-card-action="big-three"');
    expect(markup).not.toContain('Share the big three');
  });
});
