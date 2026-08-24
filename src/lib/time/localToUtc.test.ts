import { describe, expect, it } from 'vitest';
import { offsetAt, resolveLocalToUtc } from './localToUtc';

describe('resolveLocalToUtc', () => {
  it('resolves a plain modern time', () => {
    const r = resolveLocalToUtc('2024-06-15', '14:30', 'America/New_York');
    expect(r.utc.toISOString()).toBe('2024-06-15T18:30:00.000Z');
    expect(r.flags).toEqual([]);
  });

  it('handles pre-standardization LMT with seconds (Mexico City 1907)', () => {
    // America/Mexico_City used LMT −6:36:36 until 1922.
    const r = resolveLocalToUtc('1907-07-06', '08:30', 'America/Mexico_City');
    expect(r.utc.toISOString()).toBe('1907-07-06T15:06:36.000Z');
    expect(r.flags).toContain('lmt');
  });

  it('shifts forward through a DST spring gap', () => {
    // 2024-03-10 02:30 never happened in New York.
    const r = resolveLocalToUtc('2024-03-10', '02:30', 'America/New_York');
    expect(r.utc.toISOString()).toBe('2024-03-10T07:30:00.000Z');
    expect(r.flags).toContain('dst-gap');
  });

  it('takes the earlier instant in a DST fall fold', () => {
    // 2024-11-03 01:30 happened twice in New York; earlier = EDT = 05:30Z.
    const r = resolveLocalToUtc('2024-11-03', '01:30', 'America/New_York');
    expect(r.utc.toISOString()).toBe('2024-11-03T05:30:00.000Z');
    expect(r.flags).toContain('dst-fold');
  });

  it('handles zones east of Greenwich and midnight', () => {
    const r = resolveLocalToUtc('2000-01-01', '00:00', 'Asia/Tokyo');
    expect(r.utc.toISOString()).toBe('1999-12-31T15:00:00.000Z');
  });

  it('handles half-hour zones', () => {
    const r = resolveLocalToUtc('1990-04-03', '12:00', 'Asia/Kolkata');
    expect(r.utc.toISOString()).toBe('1990-04-03T06:30:00.000Z');
    expect(r.offsetMinutes).toBe(330);
  });
});

describe('input shape', () => {
  it('rejects non-canonical date and time strings instead of mis-resolving them', () => {
    // Unpadded input would never match Intl's zero-padded wall strings and
    // used to fall silently into the dst-gap branch.
    expect(() => resolveLocalToUtc('1990-6-15', '08:30', 'Europe/Madrid')).toThrow(RangeError);
    expect(() => resolveLocalToUtc('1990-06-15', '8:30', 'Europe/Madrid')).toThrow(RangeError);
    expect(() => resolveLocalToUtc('1990-06-15T00:00', '08:30', 'Europe/Madrid')).toThrow(RangeError);
    const resolved = resolveLocalToUtc('1990-06-15', '08:30', 'Europe/Madrid');
    expect(resolved.flags).not.toContain('dst-gap');
  });
});

describe('offsetAt', () => {
  it('reads sub-minute LMT offsets', () => {
    const off = offsetAt('America/Mexico_City', Date.UTC(1907, 6, 6));
    expect(off).toBeCloseTo(-(6 * 60 + 36 + 36 / 60), 3);
  });
});
