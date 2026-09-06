import { describe, expect, it } from 'vitest';
import { eventTransitHref, eventTransitQuery, parseEventTransitInstant } from './transit-link';

describe('event transit handoff', () => {
  it('round-trips a committed millisecond instant without birth information', () => {
    const instant = '2026-09-16T08:31:12.865Z';
    const link = new URL(eventTransitHref(instant)!, 'https://zodiacs.org');
    expect(link.pathname).toBe('/transits/');
    expect([...link.searchParams.keys()]).toEqual(['at']);
    expect(link.hash).toBe('');
    expect(eventTransitQuery(link.search)).toEqual({ at: Date.parse(instant), invalid: false });
  });

  it('accepts real leap days and both supported year endpoints', () => {
    for (const value of ['1800-01-01T00:00:00Z', '2000-02-29T23:59:59.999Z', '2199-12-31T23:59:59Z']) {
      expect(parseEventTransitInstant(value)).toBe(Date.parse(value));
    }
  });

  it('rejects calendar normalization, local times, offsets and unsupported years', () => {
    for (const value of [null, '', '2026-02-29T12:00:00Z', '1900-02-29T12:00:00Z',
      '2026-04-31T12:00:00Z', '2026-01-01T24:00:00Z', '2026-01-01T00:00:60Z',
      '2026-01-01', '2026-01-01T12:00:00', '2026-01-01T12:00:00+00:00',
      '1799-12-31T23:59:59Z', '2200-01-01T00:00:00Z', ' 2026-01-01T00:00:00Z']) {
      expect(parseEventTransitInstant(value), String(value)).toBeNull();
    }
  });

  it('distinguishes a normal visit from an invalid or ambiguous event link', () => {
    expect(eventTransitQuery('?unrelated=1')).toEqual({ at: null, invalid: false });
    for (const search of ['?at=', '?at=bad', '?at=2026-01-01T00%3A00%3A00Z&at=2026-01-01T00%3A00%3A00Z']) {
      expect(eventTransitQuery(search)).toEqual({ at: null, invalid: true });
    }
  });
});
