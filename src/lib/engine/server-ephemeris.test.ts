import { describe, expect, it } from 'vitest';
import {
  bodyLongitude as browserBodyLongitude,
  longitudeSpeed as browserLongitudeSpeed,
} from './full';
import {
  bodyLongitude as serverBodyLongitude,
  longitudeSpeed as serverLongitudeSpeed,
} from './server-ephemeris';
import { scanTransitContacts as browserScan } from './transit-scan';
import { scanTransitContacts as serverScan } from './transit-scan-server';
import type { BodyName } from './types';

const BODIES: BodyName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node',
];

describe('serverless ephemeris boundary', () => {
  it('matches the browser SDK for every supported body across pinned instants', () => {
    for (const date of [
      new Date('1990-02-01T12:00:00Z'),
      new Date('2026-07-15T11:15:00Z'),
      new Date('2040-12-31T23:59:59Z'),
    ]) {
      for (const body of BODIES) {
        expect(serverBodyLongitude(body, date)).toBeCloseTo(browserBodyLongitude(body, date), 12);
        expect(serverLongitudeSpeed(body, date)).toBeCloseTo(browserLongitudeSpeed(body, date), 12);
      }
    }
  });

  it('produces the same transit contacts through the server-only graph', () => {
    const natal = {
      bodies: [
        { body: 'Sun' as const, lon: 116.5 },
        { body: 'Moon' as const, lon: 221.25 },
        { body: 'Saturn' as const, lon: 285.75 },
      ],
      angles: { asc: 12.5, mc: 102.5 },
    };
    const from = new Date('2026-07-01T00:00:00Z');
    const to = new Date('2026-07-18T00:00:00Z');
    const options = { transitBodies: ['Mercury', 'Mars'] as const };

    expect(serverScan(natal, from, to, options)).toEqual(browserScan(natal, from, to, options));
  });
});
