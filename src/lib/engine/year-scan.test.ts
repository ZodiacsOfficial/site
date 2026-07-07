import { describe, expect, it } from 'vitest';
import { bodyLongitude } from './full';
import { yearScan } from './year-scan';

describe('yearScan (engine)', () => {
  const birth = new Date('1990-02-01T12:00:00Z');
  const sunLon = bodyLongitude('Sun', birth);
  const moonLon = bodyLongitude('Moon', birth);
  const from = new Date('2026-07-07T00:00:00Z');
  const to = new Date('2027-07-07T00:00:00Z');
  const scan = yearScan({ sunLon, moonLon, ascLon: 200, birthUtc: birth }, from, to);

  it('finds exactly one solar return, near the birthday', () => {
    expect(scan.solarReturns).toHaveLength(1);
    const sr = new Date(scan.solarReturns[0]);
    expect(sr.getUTCFullYear()).toBe(2027);
    const dayOfYear = (sr.getTime() - Date.UTC(2027, 0, 1)) / 86400_000;
    expect(dayOfYear).toBeGreaterThan(27); // ~Jan 29 – Feb 3 drift band
    expect(dayOfYear).toBeLessThan(35);
    // The Sun really is back on its natal degree at that instant.
    const there = bodyLongitude('Sun', sr);
    const d = Math.abs(((there - sunLon + 540) % 360) - 180);
    expect(d).toBeLessThan(0.01);
  });

  it('aspect events are well-formed, in-window, and sorted', () => {
    expect(scan.aspects.length).toBeGreaterThan(0);
    let prev = '';
    for (const a of scan.aspects) {
      expect(['Jupiter', 'Saturn']).toContain(a.body);
      expect(['conjunction', 'square', 'opposition']).toContain(a.aspect);
      expect(['Sun', 'Moon', 'ASC']).toContain(a.natal);
      expect(a.passes).toBeGreaterThanOrEqual(1);
      expect(new Date(a.from).getTime()).toBeGreaterThanOrEqual(from.getTime());
      expect(new Date(a.to).getTime()).toBeLessThanOrEqual(to.getTime() + 86400_000);
      expect(a.from <= a.to).toBe(true);
      expect(a.from >= prev).toBe(true);
      prev = a.from;
    }
  });

  it('carries the chart\'s Saturn-return seasons (1990 birth → first return 2018–2020)', () => {
    const first = scan.saturnSeasons.find((s) => s.index === 1);
    expect(first).toBeDefined();
    expect(new Date(first!.from).getUTCFullYear()).toBeGreaterThanOrEqual(2018);
    expect(new Date(first!.to).getUTCFullYear()).toBeLessThanOrEqual(2020);
  });
});
