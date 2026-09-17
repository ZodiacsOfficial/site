import { describe, expect, it } from 'vitest';
import {
  EPOCH_MAX_UTC, EPOCH_MIN_UTC, HOUSE_SYSTEMS, LIMITS,
  parseCoordinates, parseInstant, recordTooLarge, resultTooLarge,
} from './bounds';

describe('the instant a model is allowed to supply', () => {
  it.each([
    '1990-06-15T13:30:00Z',
    '1990-06-15T13:30:00.000Z',
    '1990-06-15T13:30Z',
    '1990-06-15T19:00:00+05:30',
    '1990-06-15T08:00:00-05:00',
    EPOCH_MIN_UTC,
    EPOCH_MAX_UTC,
  ])('accepts %s', (value) => {
    expect(parseInstant(value).ok).toBe(true);
  });

  it('keeps the spelling the caller used rather than normalising it', () => {
    const parsed = parseInstant('1990-06-15T19:00:00+05:30');
    expect(parsed.ok && parsed.supplied).toBe('1990-06-15T19:00:00+05:30');
    // …while resolving to the same instant as the Z spelling.
    expect(parsed.ok && parsed.instant.toISOString()).toBe('1990-06-15T13:30:00.000Z');
  });

  it.each([
    ['a wall time with no zone', '1990-06-15T13:30:00'],
    ['a bare date', '1990-06-15'],
    ['a day that does not exist', '2001-02-29T00:00:00Z'],
    ['a month that does not exist', '1990-13-01T00:00:00Z'],
    ['day zero', '1990-06-00T00:00:00Z'],
    ['an hour past the day', '1990-06-15T24:00:00Z'],
    ['a leap second', '1990-06-15T23:59:60Z'],
    ['a zone offset past the dateline', '1990-06-15T13:30:00+15:00'],
    ['a zone offset with 60 minutes', '1990-06-15T13:30:00+05:60'],
    ['before the supported epoch', '1799-12-31T23:59:59Z'],
    ['after the supported epoch', '2200-01-01T00:00:00Z'],
    ['a unix timestamp', '644067000'],
    ['an expression', 'new Date()'],
    ['a path', '/etc/passwd'],
    ['a module name', 'node:fs'],
    ['a URL', 'https://example.com/chart.json'],
    ['nothing', ''],
  ])('refuses %s', (_label, value) => {
    expect(parseInstant(value).ok).toBe(false);
  });

  it('refuses an oversized string by length before looking at its shape', () => {
    const parsed = parseInstant(`${'1990-06-15T13:30:00Z'.repeat(100)}`);
    expect(parsed.ok).toBe(false);
    expect(parsed.ok === false && parsed.reason).toMatch(/too long/);
  });

  it('29 February exists in a leap year and not in a century that is not one', () => {
    expect(parseInstant('2000-02-29T00:00:00Z').ok).toBe(true);
    expect(parseInstant('1996-02-29T00:00:00Z').ok).toBe(true);
    expect(parseInstant('1900-02-29T00:00:00Z').ok).toBe(false);
    expect(parseInstant('2100-02-29T00:00:00Z').ok).toBe(false);
  });
});

describe('coordinates', () => {
  it('accepts a pair, or neither', () => {
    expect(parseCoordinates(51.5074, -0.1278)).toEqual({ ok: true, coordinates: { latitude: 51.5074, longitude: -0.1278 } });
    expect(parseCoordinates(undefined, undefined)).toEqual({ ok: true, coordinates: null });
  });

  it('refuses one without the other rather than defaulting the missing one', () => {
    expect(parseCoordinates(51.5, undefined).ok).toBe(false);
    expect(parseCoordinates(undefined, -0.12).ok).toBe(false);
  });

  it.each([
    [91, 0], [-91, 0], [0, 181], [0, -181],
    [Number.NaN, 0], [Number.POSITIVE_INFINITY, 0], [0, Number.NaN],
  ])('refuses latitude %s longitude %s', (latitude, longitude) => {
    expect(parseCoordinates(latitude, longitude).ok).toBe(false);
  });

  it('accepts the poles and the dateline exactly', () => {
    for (const pair of [[90, 180], [-90, -180], [0, 0]] as const) {
      expect(parseCoordinates(pair[0], pair[1]).ok).toBe(true);
    }
  });
});

describe('the size gates', () => {
  it('measures a record in bytes, not characters', () => {
    // 40000 three-byte characters: under any character cap at the envelope
    // limit, and well over the byte limit. A length check in characters would
    // hand this to the parser.
    const multibyte = '€'.repeat(40_000);
    expect(multibyte.length).toBeLessThan(LIMITS.recordBytes);
    expect(recordTooLarge(multibyte)).toBe(120_000);
    expect(recordTooLarge('{}')).toBeNull();
  });

  it('reports an oversized result with its size rather than trimming it', () => {
    expect(resultTooLarge({ a: 1 })).toBeNull();
    const huge = { rows: Array.from({ length: 40_000 }, (_, index) => ({ id: `row-${index}` })) };
    expect(resultTooLarge(huge)).toBeGreaterThan(LIMITS.resultBytes);
  });

  it('bounds the transport well below the SDK default and above any valid request', () => {
    // Two records at the byte limit, escaped into JSON strings at the worst
    // case of six characters per byte, still fit.
    expect(LIMITS.requestBytes).toBeGreaterThan(2 * LIMITS.recordBytes);
    expect(LIMITS.requestBytes).toBeLessThan(10 * 1024 * 1024);
  });
});

it('offers exactly the house systems the engine computes', () => {
  expect([...HOUSE_SYSTEMS]).toEqual(['placidus', 'whole']);
});
