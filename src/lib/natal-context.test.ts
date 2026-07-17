import { describe, expect, it } from 'vitest';
import type { BodyName } from './engine/types';
import { NATAL_BODY_THEME, placementContext } from './natal-context';

const BODIES: BodyName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node',
];

describe('placementContext', () => {
  it('covers every chart body with the four beginner questions', () => {
    for (const body of BODIES) {
      const context = placementContext(body, 'aquarius', 12, 0.5);
      expect(NATAL_BODY_THEME[body]).toBeTruthy();
      expect(context.what.length).toBeGreaterThan(45);
      expect(context.how).toContain('Aquarius');
      expect(context.where).toContain('twelfth house');
      expect(context.synthesis).toContain('Aquarius');
    }
  });

  it('states clearly what a no-time chart cannot know', () => {
    const context = placementContext('Moon', 'libra', null);
    expect(context.where).toContain('birth time');
    expect(context.where).toContain('cannot say which area of life');
    expect(context.synthesis).toContain('life area remains open');
  });

  it('uses signed speed only when motion needs context', () => {
    expect(placementContext('Saturn', 'pisces', 3, -0.02).motionNote).toContain('retrograde');
    expect(placementContext('Saturn', 'pisces', 3, 0.02).motionNote).toBeUndefined();
    expect(placementContext('North Node', 'aries', 2, -0.01).motionNote).toContain('not read this like a retrograde planet');
    expect(placementContext('North Node', 'aries', 2, 0.01).motionNote).toContain('briefly move forward');
  });

  it('treats both nodes as calculated, non-deterministic points', () => {
    const north = placementContext('North Node', 'leo', 5, -0.01);
    const south = placementContext('South Node', 'aquarius', 11, -0.01);
    expect(north.what).toContain('calculated point');
    expect(north.what).toContain('not a fixed destiny');
    expect(north.synthesis).toContain('not a prediction');
    expect(south.what).toContain('calculated point');
    expect(south.what).toContain('not a fixed past or destiny');
  });
});
