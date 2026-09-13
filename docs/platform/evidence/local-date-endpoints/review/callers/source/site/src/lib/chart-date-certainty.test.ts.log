import { describe, expect, it } from 'vitest';
import type { BodyName, BodyPosition } from './engine/types';
import { computeBodies } from './engine/full';
import { signForLongitude } from './signs';
import { resolveLocalToUtc } from './time/localToUtc';
import {
  bodySignIsAmbiguous,
  localDateEndpointsUtc,
  stableBodySignSlug,
} from './chart-date-certainty';

function position(body: BodyName, lon: number): BodyPosition {
  return { body, lon, lat: 0, speed: 1, retrograde: false };
}

describe('localDateEndpointsUtc', () => {
  it('covers the entire local date across an ordinary offset', () => {
    const endpoints = localDateEndpointsUtc('2000-01-01', 'Asia/Tokyo');
    expect(endpoints.start.toISOString()).toBe('1999-12-31T15:00:00.000Z');
    expect(endpoints.end.toISOString()).toBe('2000-01-01T14:59:59.999Z');
  });

  it('does not assume a DST transition date lasts 24 hours', () => {
    const endpoints = localDateEndpointsUtc('2024-03-10', 'America/New_York');
    expect(endpoints.start.toISOString()).toBe('2024-03-10T05:00:00.000Z');
    expect(endpoints.end.toISOString()).toBe('2024-03-11T03:59:59.999Z');
  });
});

describe('bodySignIsAmbiguous', () => {
  it('keeps a stable Sun eligible even when the Moon changes signs', () => {
    const start = [position('Sun', 285), position('Moon', 29.9)];
    const end = [position('Sun', 286), position('Moon', 30.1)];
    expect(bodySignIsAmbiguous('Sun', start, end)).toBe(false);
    expect(stableBodySignSlug('Sun', start, end)).toBe('capricorn');
    expect(bodySignIsAmbiguous('Moon', start, end)).toBe(true);
  });

  it('detects a solar ingress across the local date', () => {
    const start = [position('Sun', 359.99)];
    const end = [position('Sun', 0.01)];
    expect(bodySignIsAmbiguous('Sun', start, end)).toBe(true);
    expect(stableBodySignSlug('Sun', start, end)).toBeNull();
  });

  it('fails closed when either endpoint is missing', () => {
    expect(bodySignIsAmbiguous('Sun', [], [position('Sun', 15)])).toBe(true);
    expect(bodySignIsAmbiguous('Sun', [position('Sun', 15)], [])).toBe(true);
  });
});

describe('real Sun certainty fixtures', () => {
  it('suppresses an unknown-time Bangkok date that spans the Pisces–Aries ingress', () => {
    const endpoints = localDateEndpointsUtc('2026-03-20', 'Asia/Bangkok');
    expect(stableBodySignSlug(
      'Sun',
      computeBodies(endpoints.start),
      computeBodies(endpoints.end),
    )).toBeNull();
  });

  it('keeps a stable unknown-time Bangkok date on its one Capricorn record', () => {
    const endpoints = localDateEndpointsUtc('1990-01-04', 'Asia/Bangkok');
    expect(stableBodySignSlug(
      'Sun',
      computeBodies(endpoints.start),
      computeBodies(endpoints.end),
    )).toBe('capricorn');
  });

  it('resolves exact times on opposite sides of the same local ingress date', () => {
    const signAt = (time: string) => {
      const utc = resolveLocalToUtc('2026-03-20', time, 'Asia/Bangkok').utc;
      const sun = computeBodies(utc).find((body) => body.body === 'Sun');
      return sun ? signForLongitude(sun.lon).slug : null;
    };
    expect(signAt('21:15')).toBe('pisces');
    expect(signAt('22:15')).toBe('aries');
  });
});
