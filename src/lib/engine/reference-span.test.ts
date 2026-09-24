import { describe, expect, it } from 'vitest';
import { bodyLongitude } from './full';
import { REFERENCE_SPAN_END_MS, REFERENCE_SPAN_START_MS, clipToReferenceSpan } from './reference-span';
import { saturnReturns } from './returns';
import { mostRecentSolarReturnInstant, solarReturnInstant } from './solar-return';
import { yearScan } from './year-scan';

const DAY = 86_400_000;

describe('the 1800–2199 span of the site\'s scans', () => {
  it('clips a window to the span and says whether it did', () => {
    const inside = clipToReferenceSpan(new Date('1990-01-01T00:00:00Z'), new Date('1991-01-01T00:00:00Z'))!;
    expect(inside.clipped).toBe(false);
    const late = clipToReferenceSpan(new Date('2199-06-01T00:00:00Z'), new Date('2201-01-01T00:00:00Z'))!;
    expect(late).toMatchObject({ clipped: true });
    expect(late.to.toISOString()).toBe('2199-12-31T23:59:59.999Z');
    expect(clipToReferenceSpan(new Date('2200-06-01T00:00:00Z'), new Date('2201-01-01T00:00:00Z'))).toBeNull();
    expect(clipToReferenceSpan(new Date('1790-01-01T00:00:00Z'), new Date('1800-06-01T00:00:00Z'))!.from.getTime())
      .toBe(REFERENCE_SPAN_START_MS);
  });

  it('stops a Saturn return scan at the end of 2199', () => {
    const late = saturnReturns(new Date('2190-06-01T00:00:00Z'));
    expect(late.seasons).toEqual([]);
    expect(late.rangeClipped).toBe(true);
    // Its whole window, from 2216, lies past the span.
    expect(late.searched).toBeNull();

    const clipped = saturnReturns(new Date('2150-01-01T00:00:00Z'));
    expect(clipped.rangeClipped).toBe(true);
    expect(clipped.searched!.to.getTime()).toBe(REFERENCE_SPAN_END_MS - 1);
    expect(clipped.seasons).toHaveLength(1);
    expect(Math.abs(clipped.seasons[0].first.getTime() - Date.parse('2179-05-27T00:00:00Z'))).toBeLessThan(2 * DAY);
    for (const season of clipped.seasons) expect(season.last.getTime()).toBeLessThan(REFERENCE_SPAN_END_MS);

    const ordinary = saturnReturns(new Date('1990-06-15T13:30:00Z'));
    expect(ordinary.rangeClipped).toBe(false);
    expect(ordinary.seasons).toHaveLength(3);
  });

  it('refuses a solar return whose nearest instant lies past 2199', () => {
    // The nearest return to 2199-12-20 for this Sun is in June 2200.
    const sun = bodyLongitude('Sun', new Date('2199-06-10T12:00:00Z'));
    expect(() => solarReturnInstant(sun, new Date('2199-12-20T00:00:00Z'))).toThrow(RangeError);
    // Well inside the span, the same Sun returns normally.
    expect(solarReturnInstant(sun, new Date('2150-06-01T00:00:00Z')).getUTCFullYear()).toBe(2150);
    expect(mostRecentSolarReturnInstant(sun, new Date('2199-12-20T00:00:00Z')).getUTCFullYear()).toBe(2199);
  });

  it('marks a year scan that reaches past 2199', () => {
    const natal = { sunLon: 100, moonLon: null, ascLon: null, birthUtc: new Date('2150-01-01T00:00:00Z') };
    expect(yearScan(natal, new Date('2199-06-01T00:00:00Z'), new Date('2200-06-01T00:00:00Z')).rangeClipped).toBe(true);
    const ordinary = { ...natal, birthUtc: new Date('1990-01-01T00:00:00Z') };
    expect(yearScan(ordinary, new Date('2026-01-01T00:00:00Z'), new Date('2027-01-01T00:00:00Z')).rangeClipped).toBe(false);
  }, 60_000);
});
