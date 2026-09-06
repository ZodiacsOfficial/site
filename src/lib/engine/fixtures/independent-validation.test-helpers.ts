import { expect } from 'vitest';
import type { BodyPosition, Chart } from '../types';
import policy from './swiss-eight-cases-policy.json';

export const angularDifference = (a: number, b: number) =>
  Math.abs(((a - b + 540) % 360) - 180);

type Positions = Record<string, { longitudeDegrees: number; speedDegreesPerDay?: number }>;

export function expectIndependentPositions(actual: BodyPosition[], expected: Positions) {
  for (const [name, reference] of Object.entries(expected)) {
    const body = actual.find((candidate) => candidate.body === name)!;
    expect(body, name).toBeDefined();
    expect(Number.isFinite(body.lon), name).toBe(true);
    expect(Number.isFinite(body.speed), name).toBe(true);
    expect(body.retrograde, name).toBe(body.speed < 0);
    const gate = name === 'Moon' ? policy.gates.moonLongitudeCircularDegreesMaximum
      : name === 'North Node' ? policy.gates.nodeLongitudeCircularDegreesMaximum
        : policy.gates.planetLongitudeCircularDegreesMaximum;
    expect(angularDifference(body.lon, reference.longitudeDegrees), name).toBeLessThanOrEqual(gate);
    if (name === 'North Node') {
      expect(Number.isFinite(reference.speedDegreesPerDay)).toBe(true);
      const speed = reference.speedDegreesPerDay!;
      expect(Math.abs(body.speed - speed)).toBeLessThanOrEqual(policy.gates.nodeSpeedAbsoluteDegreesPerDayMaximum);
      if (Math.abs(body.speed) > policy.gates.directionDeadbandDegreesPerDay
        && Math.abs(speed) > policy.gates.directionDeadbandDegreesPerDay) {
        expect(body.retrograde).toBe(speed < 0);
      }
    }
  }
}

export function expectIndependentChart(actual: Chart, expected: {
  positions: Positions; ascmc: number[]; cuspsDegrees: number[];
}) {
  expectIndependentPositions(actual.bodies, expected.positions);
  expect(actual.angles).not.toBeNull();
  expect(actual.houses?.system).toBe('placidus');
  expect(angularDifference(actual.angles!.asc, expected.ascmc[0]))
    .toBeLessThanOrEqual(policy.gates.ascendantCircularDegreesMaximum);
  expect(angularDifference(actual.angles!.mc, expected.ascmc[1]))
    .toBeLessThanOrEqual(policy.gates.midheavenCircularDegreesMaximum);
  expect(actual.houses!.cusps).toHaveLength(12);
  actual.houses!.cusps.forEach((cusp, index) => {
    expect(angularDifference(cusp, expected.cuspsDegrees[index]))
      .toBeLessThanOrEqual(policy.gates.houseCuspCircularDegreesMaximum);
  });
}

export function expectIndependentTime(actual: Date, expected: {
  expectedMilliseconds: number; allowedMilliseconds: number[]; timeScale: string;
}) {
  const milliseconds = actual.getTime();
  const diagnostic = `${expected.timeScale}: signed residual ${(milliseconds - expected.expectedMilliseconds) / 1000}s`;
  expect(Number.isFinite(milliseconds), diagnostic).toBe(true);
  expect(milliseconds, diagnostic).toBeGreaterThanOrEqual(expected.allowedMilliseconds[0]);
  expect(milliseconds, diagnostic).toBeLessThanOrEqual(expected.allowedMilliseconds[1]);
}
