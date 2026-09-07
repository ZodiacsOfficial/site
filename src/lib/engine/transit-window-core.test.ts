import { describe, expect, it } from 'vitest';
import { createTransitWindowScanner, cropTransitWindows } from './transit-window-core';

const DAY = 86_400_000, START = Date.parse('2020-01-01T00:00:00Z');
const date = (days: number) => new Date(START + days * DAY);
const chart = { bodies: [{ body: 'Sun', lon: 0 }] };
const options = { timeKnown: true, transitBodies: ['Jupiter'] as const, aspects: ['conjunction'] as const };
function scan(fn: (days: number) => number, from = 0, to = 10) {
  return createTransitWindowScanner({ bodyLongitude: (_body, when) => fn((when.getTime() - START) / DAY) }).scanTransitWindows(chart, date(from), date(to), options);
}
const nearTime = (actual: string, days: number) => expect(Math.abs(Date.parse(actual) - date(days).getTime())).toBeLessThanOrEqual(100);

describe('bounded transit windows', () => {
  it('finds entry, exact and exit through the 360-degree wrap', () => {
    const [window] = scan((d) => d - 5);
    nearTime(window.startUtc, 2); nearTime(window.exactPassesUtc[0], 5); nearTime(window.endUtc, 8);
    expect(window.startClipped).toBe(false); expect(window.endClipped).toBe(false);
    expect(window.peak.kind).toBe('exact');
  });
  it('retains all three direct/retrograde passes in one actual component', () => {
    const windows = scan((d) => 0.15 * (d - 2) * (d - 5) * (d - 8));
    expect(windows).toHaveLength(1); expect(windows[0].exactPassesUtc).toHaveLength(3);
    [2, 5, 8].forEach((d, i) => nearTime(windows[0].exactPassesUtc[i], d));
  });
  it('keeps real retrograde gaps instead of combining an aspect season', () => {
    const windows = scan((d) => 0.5 * (d - 2) * (d - 5) * (d - 8));
    expect(windows).toHaveLength(3);
    expect(windows.every((x) => x.exactPassesUtc.length === 1)).toBe(true);
    expect(windows[0].endUtc < windows[1].startUtc && windows[1].endUtc < windows[2].startUtc).toBe(true);
  });
  it('preserves a positive closest approach with no exact crossing', () => {
    const [window] = scan((d) => 1.5 + 0.3 * (d - 5) ** 2);
    expect(window.exactPassesUtc).toEqual([]); expect(window.peak.kind).toBe('closest-approach');
    expect(window.peak.orbDegrees).toBeCloseTo(1.5, 8); nearTime(window.peak.atUtc!, 5);
  });
  it('qualifies a near-threshold turn outside both windows without closing their real gap', () => {
    const trajectory = (d: number) => 3.05 - 0.05 * (d - 5) ** 2;
    const windows = scan(trajectory);
    expect(windows).toHaveLength(2);
    nearTime(windows[0].endUtc, 4); nearTime(windows[1].startUtc, 6);
    expect(windows[0].endUtc < windows[1].startUtc).toBe(true);
    expect(windows.every((x) => x.membershipStatus === 'uncertain')).toBe(true);
    // This allowed .10-degree shift closes the gap; the unshifted geometry stays intact.
    const shifted = scan((d) => trajectory(d) - 0.10);
    expect(shifted).toHaveLength(1);
    nearTime(shifted[0].startUtc, 0); nearTime(shifted[0].endUtc, 10);
    expect(cropTransitWindows(windows, date(1), date(9)).every((x) => x.membershipStatus === 'uncertain')).toBe(true);
  });
  it.each([-0.044, 0, 0.006])('keeps near-tangent exact topology uncertain with offset %s', (offset) => {
    const [window] = scan((d) => offset + 0.01 * (d - 5) ** 2);
    expect(window.membershipStatus).toBe('resolved');
    expect(window.exactTopologyStatus).toBe('uncertain'); expect(window.peak.kind).toBe('uncertain');
    expect(window.peak.atUtc).toBeUndefined();
  });
  it('returns a threshold singleton without fabricated duration', () => {
    const windows = scan((d) => 3 + 0.03 * (d - 5) ** 2);
    expect(windows).toHaveLength(1); expect(windows[0].boundaryTouch).toBe(true);
    expect(windows[0].startUtc).toBe(windows[0].endUtc); expect(windows[0].peak.kind).toBe('none');
  });
  it('joins through an inclusive threshold touch when both adjacent cells are inside', () => {
    const [window] = scan((d) => 3 - 0.01 * (d - 5) ** 2);
    expect(window.startClipped && window.endClipped).toBe(true); nearTime(window.startUtc, 0); nearTime(window.endUtc, 10);
    expect(window.boundaryTouch).toBeUndefined();
  });
  it('does not erase a 20-millisecond real out-of-orb gap', () => {
    const end = START + 2000;
    const scanner = createTransitWindowScanner({ bodyLongitude: (_b, d) => 3.0001 - ((d.getTime() - START - 1000) / 1000) ** 2 });
    const windows = scanner.scanTransitWindows(chart, new Date(START), new Date(end), options);
    expect(windows).toHaveLength(2);
    expect(Date.parse(windows[1].startUtc) - Date.parse(windows[0].endUtc)).toBeGreaterThan(0);
  });
  it.each([0, 1.5, 3, -3])('represents a full-query plateau at %s degrees without invented passes', (orb) => {
    const [window] = scan(() => orb);
    expect(window.peak.kind).toBe('plateau'); expect(window.exactPassesUtc).toEqual([]);
    expect(window.startClipped && window.endClipped).toBe(true); expect(window.boundaryTouch).toBeUndefined();
  });
  it('does not promote a clipped edge to a closest approach', () => {
    const [window] = scan((d) => 2.5 - 0.1 * d);
    expect(window.peak.kind).toBe('none'); expect(window.startClipped && window.endClipped).toBe(true);
  });
  it.each([(d: number) => -2.95 + 0.1 * d, (d: number) => 1.95 + 0.1 * d])('qualifies a clipped query endpoint near the membership threshold', (fn) => {
    const [window] = scan(fn);
    expect(window.membershipStatus).toBe('uncertain');
    expect(window.exactTopologyStatus).toBe('resolved');
  });
  it.each([(d: number) => 0.05 + 0.1 * d, (d: number) => -1.05 + 0.1 * d])('qualifies a clipped exact-count boundary without an interior turning point', (fn) => {
    const [window] = scan(fn);
    expect(window.membershipStatus).toBe('resolved');
    expect(window.exactTopologyStatus).toBe('uncertain');
    expect(window.peak.kind).toBe('uncertain'); expect(window.peak.atUtc).toBeUndefined();
  });
  it('qualifies new crop edges from angular evidence, and retains certainty at separated edges', () => {
    const full = scan((d) => d - 5);
    const [nearThreshold] = cropTransitWindows(full, date(2.05), date(7));
    expect(nearThreshold.membershipStatus).toBe('uncertain'); expect(nearThreshold.exactTopologyStatus).toBe('resolved');
    const [nearExact] = cropTransitWindows(full, date(4.95), date(7));
    expect(nearExact.membershipStatus).toBe('resolved'); expect(nearExact.exactTopologyStatus).toBe('uncertain');
    expect(nearExact.peak.kind).toBe('uncertain'); expect(nearExact.peak.atUtc).toBeUndefined();
    const [separated] = cropTransitWindows(full, date(3), date(7));
    expect(separated.membershipStatus).toBe('resolved'); expect(separated.exactTopologyStatus).toBe('resolved');
    expect(separated.peak.kind).toBe('exact');
    const [fresh] = scan((d) => d - 5, 4.95, 7);
    expect([nearExact.membershipStatus, nearExact.exactTopologyStatus]).toEqual([fresh.membershipStatus, fresh.exactTopologyStatus]);
  });
  it('preserves uncertainty through repeated crops and qualifies cuts lacking angular evidence', () => {
    const full = scan((d) => d - 5);
    const first = cropTransitWindows(full, date(2.05), date(7));
    const [again] = cropTransitWindows(first, date(3), date(6));
    expect(again.membershipStatus).toBe('uncertain');
    const [legacy] = cropTransitWindows(full.map(({ certainty: _omit, ...window }) => window), date(3), date(7));
    expect(legacy.membershipStatus).toBe('uncertain'); expect(legacy.exactTopologyStatus).toBe('uncertain');
  });
  it('retains equal positive minima as separate candidates instead of choosing the first', () => {
    const full = scan((d) => 1 + 0.01 * (d - 3) ** 2 * (d - 7) ** 2);
    expect(full).toHaveLength(1);
    const window = full[0];
    expect(window.peak.kind).toBe('non-unique'); expect(window.peak.atUtc).toBeUndefined();
    expect(window.peak.candidatesUtc).toHaveLength(2);
    nearTime(window.peak.candidatesUtc![0], 3); nearTime(window.peak.candidatesUtc![1], 7);
    expect(window.localMinima).toHaveLength(2);
    const [one] = cropTransitWindows(full, date(2.5), date(4));
    expect(one.peak.kind).toBe('closest-approach'); nearTime(one.peak.atUtc!, 3);
    expect(one.fullQueryPeak?.kind).toBe('non-unique');
    const [both] = cropTransitWindows(full, date(2), date(8));
    expect(both.peak.kind).toBe('non-unique'); expect(both.peak.candidatesUtc).toHaveLength(2);
  });
  it.each([['Sun', .10], ['Moon', .20], ['ASC', .15], ['MC', .15]] as const)('uses the combined natal/moving budget for %s', (point, expected) => {
    const scanner = createTransitWindowScanner({ bodyLongitude: () => 1 });
    const windows = scanner.scanTransitWindows({ bodies: [{ body: point, lon: 0 }], angles: { asc: 0, mc: 0 } }, date(0), date(10), { ...options, natalPoints: [point] });
    expect(windows[0].certainty?.angularBudgetDegrees).toBe(expected);
  });
  it('keeps physical identity and shared endpoint contacts through closed crops', () => {
    const windows = scan((d) => d - 5);
    const left = cropTransitWindows(windows, date(0), date(5));
    const right = cropTransitWindows(windows, date(5), date(10));
    expect(left[0].id).toBe(right[0].id); expect(left[0].exactPassesUtc).toEqual(right[0].exactPassesUtc);
    expect(left[0].endClipped).toBe(true); expect(right[0].startClipped).toBe(true);
  });
  it('retains full-query closest-approach provenance without inventing a cropped peak', () => {
    const [crop] = cropTransitWindows(scan((d) => 1.5 + 0.3 * (d - 5) ** 2), date(3), date(4));
    expect(crop.peak.kind).toBe('none'); expect(crop.fullQueryPeak?.kind).toBe('closest-approach');
  });
  it('excludes unverified Moon/ASC/MC even when explicitly passed and requested', () => {
    let calls = 0;
    const scanner = createTransitWindowScanner({ bodyLongitude: () => { calls += 1; return 0; } });
    const result = scanner.scanTransitWindows({ bodies: [{ body: 'Moon', lon: 0 }], angles: { asc: 0, mc: 0 } }, date(0), date(10), { ...options, timeKnown: false, natalPoints: ['Moon', 'ASC', 'MC'] });
    expect(result).toEqual([]); expect(calls).toBe(0);
  });
  it('shares every trajectory longitude evaluation across natal points and aspects', () => {
    const calls = new Set<string>();
    const scanner = createTransitWindowScanner({ bodyLongitude: (body, when) => {
      const key = `${body}:${when.getTime()}`; expect(calls.has(key)).toBe(false); calls.add(key);
      return (when.getTime() - START) / DAY;
    } });
    scanner.scanTransitWindows({ bodies: [{ body: 'Sun', lon: 5 }, { body: 'Venus', lon: 5 }] }, date(0), date(10), { ...options, aspects: ['conjunction', 'sextile'] });
    expect(calls.size).toBeLessThan(200);
  });
  it.each([['1800-01-01T00:00:00.000Z', '1800-01-11T00:00:00.000Z'], ['2199-12-21T23:59:59.999Z', '2199-12-31T23:59:59.999Z']])('bounds every underlying probe at supported-epoch edge %s', (a, b) => {
    const from = Date.parse(a), to = Date.parse(b);
    const scanner = createTransitWindowScanner({ bodyLongitude: (_body, when) => {
      expect(when.getTime()).toBeGreaterThanOrEqual(from); expect(when.getTime()).toBeLessThanOrEqual(to);
      return -5 + 10 * (when.getTime() - from) / (to - from);
    } });
    expect(scanner.scanTransitWindows(chart, new Date(from), new Date(to), options)).toHaveLength(1);
  });
  it('rejects zero-length, overlong, unsupported and invalid queries before evaluation', () => {
    const scanner = createTransitWindowScanner({ bodyLongitude: () => { throw new Error('must not evaluate'); } });
    expect(() => scanner.scanTransitWindows(chart, date(1), date(1), options)).toThrow(RangeError);
    expect(() => scanner.scanTransitWindows(chart, date(0), date(731), options)).toThrow(RangeError);
    expect(() => scanner.scanTransitWindows(chart, new Date('1799-12-31'), new Date('1800-01-02'), options)).toThrow(RangeError);
    expect(() => scanner.scanTransitWindows(chart, new Date('2199-12-30'), new Date('2200-01-01'), options)).toThrow(RangeError);
    expect(() => scanner.scanTransitWindows(chart, new Date(NaN), date(1), options)).toThrow(RangeError);
  });
});
