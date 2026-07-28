/**
 * Sect turns on one computed fact — was the Sun up? — and then on a table
 * that has not changed in two thousand years. These pin both, and pin the
 * one part that is neither: which half Mercury rises in.
 */
import { describe, expect, it } from 'vitest';
import {
  DIURNAL_PLANETS,
  NOCTURNAL_PLANETS,
  orientality,
  sectOf,
} from './sect';

describe('orientality', () => {
  it('calls a body earlier in zodiacal order a morning star', () => {
    // Lower longitude reaches the ascendant first, so it rises ahead of
    // the Sun — oriental, in the tradition's word.
    expect(orientality(100, 120)).toBe('oriental');
    expect(orientality(140, 120)).toBe('occidental');
  });

  it('measures the short way round the circle', () => {
    expect(orientality(350, 10)).toBe('oriental');
    expect(orientality(10, 350)).toBe('occidental');
  });

  it('counts a body exactly on the Sun as occidental', () => {
    expect(orientality(120, 120)).toBe('occidental');
  });
});

describe('sect', () => {
  it('reads the Sun above the horizon as a day chart', () => {
    const reading = sectOf({ sunAltitude: 64.2, sunLon: 103.59 });
    expect(reading.sect).toBe('day');
    expect(reading.light).toBe('Sun');
    expect(reading.inSect).toEqual(expect.arrayContaining([...DIURNAL_PLANETS]));
    expect(reading.outOfSect).toEqual(expect.arrayContaining([...NOCTURNAL_PLANETS]));
  });

  it('reads the Sun below the horizon as a night chart', () => {
    const reading = sectOf({ sunAltitude: -21.7, sunLon: 300 });
    expect(reading.sect).toBe('night');
    expect(reading.light).toBe('Moon');
    expect(reading.inSect).toEqual(expect.arrayContaining([...NOCTURNAL_PLANETS]));
    expect(reading.outOfSect).toEqual(expect.arrayContaining([...DIURNAL_PLANETS]));
  });

  it('gives the Sun on the horizon itself to the day', () => {
    expect(sectOf({ sunAltitude: 0, sunLon: 0 }).sect).toBe('day');
  });

  it('puts a morning Mercury with the day and an evening one with the night', () => {
    const morning = sectOf({ sunAltitude: 30, sunLon: 125.44, mercuryLon: 107.33 });
    expect(morning.mercury).toBe('oriental');
    expect(morning.inSect).toContain('Mercury');
    expect(morning.outOfSect).not.toContain('Mercury');

    const evening = sectOf({ sunAltitude: 30, sunLon: 103.59, mercuryLon: 126.42 });
    expect(evening.mercury).toBe('occidental');
    expect(evening.outOfSect).toContain('Mercury');
    expect(evening.inSect).not.toContain('Mercury');
  });

  it('flips Mercury’s side with the chart’s, not with its own', () => {
    // A morning Mercury belongs to the day; in a night chart that same
    // Mercury is out of sect.
    const night = sectOf({ sunAltitude: -12, sunLon: 125.44, mercuryLon: 107.33 });
    expect(night.mercury).toBe('oriental');
    expect(night.outOfSect).toContain('Mercury');
  });

  it('leaves Mercury off both lists when its longitude is unknown', () => {
    const reading = sectOf({ sunAltitude: 10, sunLon: 0 });
    expect(reading.mercury).toBeNull();
    expect([...reading.inSect, ...reading.outOfSect]).not.toContain('Mercury');
  });

  it('claims nothing about the modern planets', () => {
    const reading = sectOf({ sunAltitude: 10, sunLon: 0, mercuryLon: 5 });
    const listed = [...reading.inSect, ...reading.outOfSect];
    for (const body of ['Uranus', 'Neptune', 'Pluto']) {
      expect(listed, body).not.toContain(body);
    }
    expect(listed).toHaveLength(7);
    expect(new Set(listed).size).toBe(7);
  });

  it('carries the altitude it was handed, so the readout can quote it', () => {
    expect(sectOf({ sunAltitude: 64.23, sunLon: 0 }).sunAltitude).toBeCloseTo(64.23, 5);
  });
});
