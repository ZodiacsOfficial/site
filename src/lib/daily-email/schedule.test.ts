import { describe, expect, it } from 'vitest';
import { isDailyEmailDue, localDeliveryTime } from './schedule';

describe('daily email local-hour cohort', () => {
  it('opens at 07:00 and remains eligible for a safely delayed edition', () => {
    expect(isDailyEmailDue('2026-07-20', new Date('2026-07-20T06:59:59Z'), 'UTC')).toBe(false);
    expect(isDailyEmailDue('2026-07-20', new Date('2026-07-20T07:00:00Z'), 'UTC')).toBe(true);
    expect(isDailyEmailDue('2026-07-20', new Date('2026-07-20T18:13:00Z'), 'UTC')).toBe(true);
    expect(isDailyEmailDue('2026-07-19', new Date('2026-07-20T07:13:00Z'), 'UTC')).toBe(false);
  });

  it('uses IANA timezone rules across both DST boundaries', () => {
    expect(localDeliveryTime(new Date('2026-03-08T11:13:00Z'), 'America/New_York'))
      .toMatchObject({ date: '2026-03-08', hour: 7, timezone: 'America/New_York' });
    expect(localDeliveryTime(new Date('2026-03-08T10:13:00Z'), 'America/New_York').hour).toBe(6);
    expect(localDeliveryTime(new Date('2026-11-01T12:13:00Z'), 'America/New_York'))
      .toMatchObject({ date: '2026-11-01', hour: 7, timezone: 'America/New_York' });
    expect(localDeliveryTime(new Date('2026-11-01T11:13:00Z'), 'America/New_York').hour).toBe(6);
  });

  it('falls back to UTC for missing or invalid legacy values', () => {
    expect(localDeliveryTime(new Date('2026-07-20T07:13:00Z'), null))
      .toEqual({ date: '2026-07-20', hour: 7, timezone: 'UTC', usedUtcFallback: true });
    expect(localDeliveryTime(new Date('2026-07-20T07:13:00Z'), 'Not/AZone'))
      .toEqual({ date: '2026-07-20', hour: 7, timezone: 'UTC', usedUtcFallback: true });
    expect(localDeliveryTime(new Date('2026-07-20T07:13:00Z'), 'UTC').usedUtcFallback).toBe(false);
  });
});
