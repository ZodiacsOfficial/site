import { describe, expect, it } from 'vitest';
import { buildTransitOverlay } from './overlay';
import type { InterAspect } from '../engine/synastry';

describe('buildTransitOverlay', () => {
  const transiting = [
    { body: 'Sun', lon: 289.4, retrograde: false },
    { body: 'Saturn', lon: 12.1, retrograde: true },
  ];
  const aspects: InterAspect[] = [
    { a: 'Saturn', aLon: 12.1, b: 'Sun', bLon: 132.0, type: 'trine', orb: 0.1 },
  ];

  it('maps transiting bodies to outer-ring marks with sign + retrograde', () => {
    const o = buildTransitOverlay('the sky', transiting, aspects, null);
    expect(o.label).toBe('the sky');
    const sun = o.bodies.find((b) => b.body === 'Sun')!;
    expect(sun.sign).toBe('capricorn'); // 289.4° → Capricorn
    expect(sun.retrograde).toBe(false);
    const saturn = o.bodies.find((b) => b.body === 'Saturn')!;
    expect(saturn.sign).toBe('aries'); // 12.1° → Aries
    expect(saturn.retrograde).toBe(true);
  });

  it('maps InterAspect (a=transiting, b=natal) to outer→inner contacts', () => {
    const o = buildTransitOverlay('x', transiting, aspects, null);
    expect(o.aspects).toHaveLength(1);
    expect(o.aspects[0]).toMatchObject({ outer: 'Saturn', inner: 'Sun', type: 'trine' });
    expect(o.aspects[0].orb).toBeCloseTo(0.1);
  });

  it('carries the focus id through untouched', () => {
    expect(buildTransitOverlay('x', transiting, aspects, 'Saturn-trine-Sun').focus)
      .toBe('Saturn-trine-Sun');
  });

  it('fans bodies closer than 7° apart (shared collision layout)', () => {
    const close = [
      { body: 'Mercury', lon: 100 },
      { body: 'Venus', lon: 103 },
    ];
    const o = buildTransitOverlay('x', close, [], null);
    const merc = o.bodies.find((b) => b.body === 'Mercury')!;
    const ven = o.bodies.find((b) => b.body === 'Venus')!;
    // True longitudes are untouched; draw longitudes fan apart to ≥7°.
    expect(merc.lon).toBe(100);
    expect(ven.lon).toBe(103);
    expect(Math.abs(ven.drawLon - merc.drawLon)).toBeGreaterThanOrEqual(6.9);
  });
});
