import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import * as ephemeris from './full';
import { findLongitudeCrossings } from './returns';
import { resolveLocalToUtc } from '../time/localToUtc';
import type { Chart, ChartInput } from './types';
import policy from './fixtures/swiss-lunar-return-policy.json';
import references from './fixtures/swiss-lunar-returns.fixture.json';
import returnedCharts from './fixtures/swiss-lunar-returned-charts.fixture.json';
import applicability from './fixtures/swiss-lunar-fixed-target-applicability.json';
import {
  lunarReturnChart, lunarReturnInstant, LUNAR_RETURN_HORIZON_DAYS,
  LUNAR_RETURN_MAX_AFTER_UTC, LUNAR_RETURN_MAX_UTC, LUNAR_RETURN_MIN_UTC,
  LUNAR_RETURN_STEP_DAYS,
} from './lunar-return';

const DAY_MS = 86_400_000;
const delta = (value: number, target: number) => ((value - target + 540) % 360) - 180;
const reportRows: Record<string, Record<string, unknown>> = {};
const digest = (path: URL) => createHash('sha256').update(readFileSync(path)).digest('hex');
const natalInput = (utc: string): ChartInput => ({
  utc: new Date(utc), latitude: 0, longitude: 0, houseSystem: 'placidus', timeKnown: true,
});
const locationFor = (location: { latitudeDegrees: number; longitudeDegreesEastPositive: number }) => ({
  latitude: location.latitudeDegrees, longitude: location.longitudeDegreesEastPositive,
});

afterEach(() => vi.restoreAllMocks());

// Opt-in review receipt records actual outputs only. Raw provider expectations
// remain separate, hash-pinned inputs; a companion test log supplies the result.
afterAll(() => {
  const path = process.env.LUNAR_RETURN_COMPARISON_REPORT;
  if (!path) return;
  const sourceFiles = [
    './lunar-return.ts', './lunar-return.test.ts', './full.ts', './houses.ts',
    './types.ts', './longitude-crossings.ts', './returns.ts',
    './fixtures/swiss-lunar-return-policy.json', './fixtures/swiss-lunar-returns.fixture.json',
    './fixtures/swiss-lunar-returned-charts.fixture.json',
    './fixtures/swiss-lunar-fixed-target-applicability.json',
  ];
  writeFileSync(path, JSON.stringify({
    scope: 'Application calculations from the reviewed lunar unit comparison. Provider outputs and assertions are retained separately.',
    recordedAtUTC: new Date().toISOString(), node: process.version,
    sourceSHA256: Object.fromEntries(sourceFiles.map((name) => [name, digest(new URL(name, import.meta.url))])),
    cases: reportRows,
    fixedExternalTargetIdentityChecks: 'Explicitly omitted under the pre-output root-approved applicability amendment; not recorded as passing.',
  }, null, 2) + '\n', { flag: 'wx' });
});

function record(id: string, part: string, value: unknown) {
  (reportRows[id] ??= {})[part] = value;
}

function expectTime(actual: Date, expected: { expectedMilliseconds: number; timeScale: string }, interval: number[]) {
  const milliseconds = actual.getTime();
  const residual = (milliseconds - expected.expectedMilliseconds) / 1000;
  const diagnostic = `${expected.timeScale}: signed residual ${residual}s`;
  expect(Number.isFinite(milliseconds), diagnostic).toBe(true);
  expect(milliseconds, diagnostic).toBeGreaterThanOrEqual(interval[0]);
  expect(milliseconds, diagnostic).toBeLessThanOrEqual(interval[1]);
}

function expectIndependentChart(actual: Chart, expected: typeof references.cases[number]['chartAtIndependentInstant']) {
  for (const [name, position] of Object.entries(expected.positions)) {
    const body = actual.bodies.find((row) => row.body === name)!;
    expect(body, name).toBeDefined();
    expect(Number.isFinite(body.lon), name).toBe(true);
    expect(Number.isFinite(body.speed), name).toBe(true);
    expect(body.retrograde, name).toBe(body.speed < 0);
    const gate = name === 'Moon' ? policy.gates.returnedChartMoonCircularDegreesMaximum
      : name === 'North Node' ? policy.gates.nodeCircularDegreesMaximum
        : policy.gates.otherPlanetCircularDegreesMaximum;
    expect(Math.abs(delta(body.lon, position.longitudeDegrees)), name).toBeLessThanOrEqual(gate);
    if (name === 'North Node') {
      expect(Math.abs(body.speed - position.speedDegreesPerDay))
        .toBeLessThanOrEqual(policy.gates.nodeSpeedAbsoluteDegreesPerDayMaximum);
      if (Math.abs(body.speed) > policy.gates.directionDeadbandDegreesPerDay
        && Math.abs(position.speedDegreesPerDay) > policy.gates.directionDeadbandDegreesPerDay) {
        expect(body.retrograde).toBe(position.speedDegreesPerDay < 0);
      }
    }
  }
  expect(actual.angles).not.toBeNull();
  expect(actual.houses?.system).toBe(expected.expectedProductHouseSystem);
  expect(actual.flags.includes('polar-fallback')).toBe(expected.expectedProductHouseSystem === 'whole');
  expect(Math.abs(delta(actual.angles!.asc, expected.ascmc[0])))
    .toBeLessThanOrEqual(policy.gates.ascendantCircularDegreesMaximum);
  expect(Math.abs(delta(actual.angles!.mc, expected.ascmc[1])))
    .toBeLessThanOrEqual(policy.gates.midheavenCircularDegreesMaximum);
  expect(actual.houses!.cusps).toHaveLength(12);
  actual.houses!.cusps.forEach((cusp, index) => {
    expect(Math.abs(delta(cusp, expected.cuspsDegrees[index])))
      .toBeLessThanOrEqual(policy.gates.houseCuspCircularDegreesMaximum);
  });
}

describe('independent lunar return references', () => {
  it('preserves the approved inputs, gates and applicability amendment', () => {
    expect(digest(new URL('./fixtures/swiss-lunar-return-policy.json', import.meta.url)))
      .toBe('16c807cfb7374c340200064ba6f4332b98923f77b05f6f24f62ea5541d5aa146');
    expect(digest(new URL('./fixtures/swiss-lunar-returns.fixture.json', import.meta.url)))
      .toBe('22e4a55652e12541d01cbd46c7efad018a06e60169fb399e2d02a6ab2ab6d5d5');
    expect(digest(new URL('./fixtures/swiss-lunar-fixed-target-applicability.json', import.meta.url)))
      .toBe('2f9056c0f93b22e3270bf1f496d804759a9057ac6b3e5a142604248ba1dddb1a');
    expect(digest(new URL('./fixtures/swiss-lunar-returned-charts.fixture.json', import.meta.url)))
      .toBe('daa41662758d7c1f4dfa234e2dfbd33a884d11b343d94af605b28a537c18b410');
    expect(LUNAR_RETURN_STEP_DAYS).toBe(policy.productScanContract.stepDays);
    expect(LUNAR_RETURN_HORIZON_DAYS).toBe(policy.productScanContract.horizonUniformDays);
    expect(LUNAR_RETURN_MIN_UTC).toBe(policy.supportedTransportInterval.minimumInclusive);
    expect(LUNAR_RETURN_MAX_UTC).toBe(policy.supportedTransportInterval.maximumInclusive);
    expect(LUNAR_RETURN_MAX_AFTER_UTC).toBe(policy.supportedTransportInterval.afterMaximumInclusive);
  });

  it.each(references.cases)('$id: complete natal-derived first return and full chronology', (reference) => {
    const input = policy.cases.find((row) => row.id === reference.id)!;
    const natal = natalInput(input.birthTransport);
    const after = new Date(input.afterTransport);
    const target = ephemeris.bodyLongitude('Moon', natal.utc);
    const chart = lunarReturnChart(natal, after, locationFor(input.returnLocation));
    const all = findLongitudeCrossings(
      'Moon', target, after, new Date(after.getTime() + 40 * DAY_MS), 0.25,
    );
    record(reference.id, 'completeNatalDerived', { targetLongitude: target, chart, allCrossings: all });
    expect(Math.abs(delta(target, reference.natalLongitudeDegrees)))
      .toBeLessThanOrEqual(policy.gates.natalMoonCircularDegreesMaximum);
    expect(all).toHaveLength(reference.crossings.length);
    all.forEach((event, index) => {
      const expected = reference.crossings[index];
      expectTime(event.at, expected, expected.natalDerivedAllowedMilliseconds);
      expect(event.retrograde).toBe(expected.retrograde);
      if (index > 0) expect(event.at.getTime()).toBeGreaterThan(all[index - 1].at.getTime());
    });
    expect(chart.input.utc).toEqual(all[0].at);
    expect(chart.input.utc.getTime()).toBeGreaterThan(after.getTime());
    const moon = chart.bodies.find((body) => body.body === 'Moon')!;
    expect(Number.isFinite(moon.speed)).toBe(true);
    expect(moon.retrograde).toBe(false);
    expect(Math.abs(delta(moon.lon, target))).toBeLessThanOrEqual(policy.gates.productOwnTargetResidualDegreesMaximum);
    // Returned-chart parity uses the separate same-time Swiss supplement;
    // independent event timing and fixed-clock components remain separate.
  });

  it.each(references.cases.filter((row) => applicability.fixedExternalTargetCases.includes(row.id)))
    ('$id: conditioned fixed external-target crossing', (reference) => {
      const input = policy.cases.find((row) => row.id === reference.id)!;
      const after = new Date(input.afterTransport);
      const instant = lunarReturnInstant(reference.natalLongitudeDegrees, after);
      record(reference.id, 'fixedExternalTarget', { instant });
      expectTime(instant, reference.crossings[0], reference.crossings[0].fixedExternalTargetAllowedMilliseconds);
    });

  it.each(references.cases)('$id: chart at the separately preserved independent instant', (reference) => {
    const input = policy.cases.find((row) => row.id === reference.id)!;
    const chart = ephemeris.computeChart({
      utc: new Date(reference.independentChartUTC), ...locationFor(input.returnLocation),
      houseSystem: 'placidus', timeKnown: true,
    });
    record(reference.id, 'fixedIndependentChart', { chart });
    expectIndependentChart(chart, reference.chartAtIndependentInstant);
    const moon = chart.bodies.find((body) => body.body === 'Moon')!;
    expect(Math.abs(delta(moon.lon, reference.chartAtIndependentInstant.positions.Moon.longitudeDegrees)))
      .toBeLessThanOrEqual(policy.gates.transitMoonAtIndependentInstantCircularDegreesMaximum);
  });

  it.each(returnedCharts.charts)('$id: returned chart at the same independent reference clock', (reference) => {
    const input = policy.cases.find((row) => row.id === reference.caseId)!;
    const location = reference.id.endsWith(':relocation') ? input.relocationAtSameInstant! : input.returnLocation;
    const chart = lunarReturnChart(natalInput(input.birthTransport), new Date(input.afterTransport), locationFor(location));
    record(reference.caseId, reference.id.endsWith(':relocation') ? 'sameTimeRelocatedChart' : 'sameTimeReturnedChart', { chart });
    // This equality is fixture applicability, not a tighter accuracy claim.
    // A changed solver timestamp needs a new retained Swiss supplement, while
    // the original independent event-time bands must remain unchanged.
    expect(chart.input.utc.toISOString(), 'Same-time Swiss fixture does not apply; acquire a new independent supplement at the new product timestamp')
      .toBe(reference.utc);
    expectIndependentChart(chart, reference.reference);
  });

  it('retains geocentric event identity under relocation and the independent relocated component', () => {
    const input = policy.cases[0];
    const reference = references.cases[0];
    const relocation = input.relocationAtSameInstant!;
    const natal = natalInput(input.birthTransport);
    const after = new Date(input.afterTransport);
    const first = lunarReturnChart(natal, after, locationFor(input.returnLocation));
    const second = lunarReturnChart(natal, after, locationFor(relocation));
    expect(second.input.utc).toEqual(first.input.utc);
    expect(second.bodies).toEqual(first.bodies);
    expect(second.angles).not.toEqual(first.angles);
    const fixed = ephemeris.computeChart({
      utc: new Date(reference.independentChartUTC), ...locationFor(relocation), houseSystem: 'placidus', timeKnown: true,
    });
    record(input.id, 'relocation', { productChart: second, fixedIndependentChart: fixed });
    expectIndependentChart(fixed, reference.relocatedChartAtIndependentInstant!);
  });
});

describe('lunar input and strict-next contracts', () => {
  const after = new Date('2026-03-01T00:00:00Z');
  const known = () => natalInput('1990-02-01T12:00:00Z');

  it.each([NaN, Infinity, -Infinity])('rejects a non-finite target %s', (target) => {
    expect(() => lunarReturnInstant(target, after)).toThrow(RangeError);
  });

  it.each([new Date(NaN), new Date(Date.parse(LUNAR_RETURN_MIN_UTC) - 1), new Date(Date.parse(LUNAR_RETURN_MAX_AFTER_UTC) + 1)])
    ('rejects an invalid or out-of-range reference %s', (reference) => {
      expect(() => lunarReturnInstant(0, reference)).toThrow(RangeError);
      expect(() => lunarReturnChart(known(), reference)).toThrow(RangeError);
    });

  it.each([new Date(NaN), new Date(Date.parse(LUNAR_RETURN_MIN_UTC) - 1), new Date('2026-03-02T00:00:00Z')])
    ('rejects an invalid, unsupported or subsequent birth %s', (utc) => {
      expect(() => lunarReturnChart({ ...known(), utc }, after)).toThrow(RangeError);
    });

  it.each<Partial<ChartInput>>([
    { timeKnown: false }, { flags: ['no-time'] }, { flags: ['dst-gap'] }, { flags: ['dst-fold'] },
    { latitude: undefined }, { longitude: undefined }, { latitude: NaN }, { longitude: Infinity },
    { latitude: 91 }, { longitude: -181 },
  ])('rejects incomplete or uncertain natal input %j', (invalid) => {
    expect(() => lunarReturnChart({ ...known(), ...invalid }, after)).toThrow(RangeError);
  });

  it.each([['2025-03-09', '02:30', 'dst-gap'], ['2025-11-02', '01:30', 'dst-fold']])
    ('rejects an actual IANA ambiguity %s %s', (date, time, expectedFlag) => {
      const resolved = resolveLocalToUtc(date, time, 'America/New_York');
      expect(resolved.flags).toContain(expectedFlag);
      expect(() => lunarReturnChart({ ...known(), utc: resolved.utc, flags: resolved.flags }, after))
        .toThrow('unambiguous birth time');
    });

  it('rejects an invalid return location', () => {
    expect(() => lunarReturnChart(known(), after, { latitude: 0, longitude: NaN })).toThrow(RangeError);
  });

  it('rejects a failed Moon evaluation and bounded no-crossing result', () => {
    const position = vi.spyOn(ephemeris, 'bodyLongitude').mockReturnValue(NaN);
    expect(() => lunarReturnInstant(0, after)).toThrow('Moon position');
    position.mockReturnValue(42);
    expect(() => lunarReturnInstant(0, after)).toThrow('40-day scan');
    expect(position.mock.calls.every(([, date]) => date.getTime() <= after.getTime() + 40 * DAY_MS)).toBe(true);
  });

  it('excludes an exact lower identity and includes an exact upper crossing', () => {
    const start = new Date('2000-01-01T00:00:00Z');
    const position = vi.spyOn(ephemeris, 'bodyLongitude').mockImplementation((_body, date) =>
      (((date.getTime() - start.getTime()) / DAY_MS) * 12) % 360);
    expect(lunarReturnInstant(360, start)).toEqual(new Date('2000-01-31T00:00:00Z'));
    position.mockImplementation((_body, date) => (((date.getTime() - start.getTime()) / DAY_MS) * 9) % 360);
    expect(lunarReturnInstant(0, start)).toEqual(new Date('2000-02-10T00:00:00Z'));
  });

  it('does not retain mutable natal/reference Date objects in the return chart', () => {
    const natal = known();
    const reference = new Date(after);
    const result = lunarReturnChart(natal, reference);
    const instant = result.input.utc.toISOString();
    natal.utc.setUTCFullYear(2001);
    reference.setUTCFullYear(2030);
    expect(result.input.utc.toISOString()).toBe(instant);
  });
});
