import { describe, expect, it } from 'vitest';
import { moonLongitude } from '../engine/lite';
import { signForLongitude } from '../signs';
import {
  AURA_EVENT_WINDOW_MS,
  buildAuraEventCatalog,
  COMMITTED_AURA_EVENTS,
  validateAuraEventCatalog,
  type AuraEventSources,
} from './events';

const GENERATED = '2026-07-10T00:00:00.000Z';

function sources(): AuraEventSources {
  const eclipseAt = '2026-08-12T17:45:00.000Z';
  const eclipseSign = signForLongitude(moonLongitude(new Date(eclipseAt))).slug;
  return {
    ingresses: {
      generatedAt: GENERATED,
      horizons: [{ planets: ['Mars', 'Mercury'], from: '2026-01-01', to: '2027-01-01' }],
      windows: [
        { planet: 'Mars', sign: 'aries', from: '2026-02-01T00:00:00.000Z', to: '2026-03-01T00:00:00.000Z' },
        { planet: 'Mars', sign: 'taurus', from: '2026-03-01T00:00:00.000Z', to: '2027-01-01T00:00:00.000Z' },
        { planet: 'Mercury', sign: 'aries', from: '2026-02-05T00:00:00.000Z', to: '2027-01-01T00:00:00.000Z' },
      ],
    },
    sky: {
      generatedAt: GENERATED,
      from: '2026-01-01T00:00:00.000Z',
      to: '2027-01-01T00:00:00.000Z',
      moons: [{ type: 'new', at: '2026-08-12T17:44:00.000Z' }],
      retrogrades: [{
        planet: 'Mercury',
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-20T00:00:00.000Z',
      }],
    },
    eclipses: {
      generatedAt: GENERATED,
      from: '2026-01-01T00:00:00.000Z',
      to: '2027-01-01T00:00:00.000Z',
      eclipses: [{
        type: 'solar',
        kind: 'total',
        peak: eclipseAt,
        sign: eclipseSign,
      }],
    },
    moonIngresses: {
      generatedAt: GENERATED,
      from: '2026-01-01T00:00:00.000Z',
      to: '2027-01-01T00:00:00.000Z',
      ingresses: [{ sign: 'aries', at: '2026-07-20T12:00:00.000Z' }],
    },
  };
}

describe('Registry Aura event catalogue', () => {
  it('derives every real window boundary without inventing a horizon-start event', () => {
    const result = buildAuraEventCatalog(sources());

    expect(result.events.some((event) => event.kind === 'ingress' && event.exactAt === '2026-01-01T00:00:00.000Z')).toBe(false);
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'ingress', sign: 'aries', exactAt: '2026-02-01T00:00:00.000Z' }),
      expect.objectContaining({ kind: 'ingress', sign: 'taurus', exactAt: '2026-03-01T00:00:00.000Z' }),
      expect.objectContaining({ kind: 'station', eventType: 'retrograde', exactAt: '2026-06-01T00:00:00.000Z' }),
      expect.objectContaining({ kind: 'station', eventType: 'direct', exactAt: '2026-06-20T00:00:00.000Z' }),
      expect.objectContaining({ kind: 'eclipse', exactAt: '2026-08-12T17:45:00.000Z' }),
    ]));
  });

  it('prefers an eclipse over its matching lunation duplicate', () => {
    const result = buildAuraEventCatalog(sources());
    const eclipse = result.events.find((event) => event.kind === 'eclipse');
    expect(eclipse).toBeDefined();
    expect(result.events.some((event) => (
      event.kind === 'lunation'
      && event.sign === eclipse?.sign
      && Math.abs(Date.parse(event.exactAt) - Date.parse(eclipse.exactAt)) <= 2 * 60 * 60 * 1_000
    ))).toBe(false);
  });

  it('validates freshness and full ±24-hour coverage independently', () => {
    const result = buildAuraEventCatalog(sources());
    const visit = new Date('2026-07-16T12:00:00.000Z');
    expect(validateAuraEventCatalog(result, visit).usable).toBe(true);

    const stale = validateAuraEventCatalog(result, visit, { maxAgeMs: 24 * 60 * 60 * 1_000 });
    expect(stale.usable).toBe(false);
    expect(stale.uncertainties.some((item) => item.code === 'event-data-stale')).toBe(true);

    const edgeVisit = new Date(Date.parse(result.coverage.to) - AURA_EVENT_WINDOW_MS + 1);
    const outOfRange = validateAuraEventCatalog(result, edgeVisit, { maxAgeMs: Number.MAX_SAFE_INTEGER });
    expect(outOfRange.usable).toBe(false);
    expect(outOfRange.uncertainties.some((item) => item.code === 'event-data-out-of-range')).toBe(true);
  });

  it('uses the existing committed sources for all four supported event kinds', () => {
    expect(new Set(COMMITTED_AURA_EVENTS.events.map((event) => event.kind))).toEqual(
      new Set(['ingress', 'lunation', 'station', 'eclipse']),
    );
    expect(COMMITTED_AURA_EVENTS.coverage.from).toBe('2026-01-01T00:00:00.000Z');
    expect(Date.parse(COMMITTED_AURA_EVENTS.coverage.to)).toBeGreaterThan(Date.parse('2027-12-31T00:00:00.000Z'));
    expect(COMMITTED_AURA_EVENTS.moonIngresses.length).toBeGreaterThan(400);
  });
});
