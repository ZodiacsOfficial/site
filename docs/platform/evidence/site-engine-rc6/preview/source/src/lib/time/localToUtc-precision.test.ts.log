import { describe, expect, it } from 'vitest';
import { natalChart } from '@zodiacs/engine';
import { resolveLocalToUtc as packageResolveLocalToUtc } from '@zodiacs/engine/geo';
import { createNatalEnvelope, parseNatalEnvelope, serializeNatalEnvelope } from '@zodiacs/engine/receipt';
import { resolveLocalToUtc } from './localToUtc';

// Finite, independently reproduced host-IANA counterexamples to minute-only
// matching. These fixtures do not certify historical records or chart accuracy.
const historicalGaps = [
  ["America/Caracas", "1890-01-01", "1890-01-01T04:27:44.000Z", -267.6666666666667, 0.06666666666666667, ["dst-gap", "lmt"]],
  ["America/Dawson_Creek", "1884-01-01", "1884-01-01T08:00:56.000Z", -480, 0.9333333333333333, ["dst-gap"]],
  ["America/Goose_Bay", "1935-03-30", "1935-03-30T03:30:52.000Z", -210, 0.8666666666666667, ["dst-gap"]],
  ["America/Manaus", "1914-01-01", "1914-01-01T04:00:04.000Z", -240, 0.06666666666666667, ["dst-gap"]],
  ["America/Paramaribo", "1935-01-01", "1935-01-01T03:40:52.000Z", -220.6, 0.26666666666666666, ["dst-gap", "lmt"]],
  ["America/Port-au-Prince", "1890-01-01", "1890-01-01T04:49:20.000Z", -289, 0.3333333333333333, ["dst-gap"]],
  ["America/Punta_Arenas", "1890-01-01", "1890-01-01T04:43:40.000Z", -282.75, 0.9166666666666666, ["dst-gap", "lmt"]],
  ["America/St_Johns", "1935-03-30", "1935-03-30T03:30:52.000Z", -210, 0.8666666666666667, ["dst-gap"]],
  ["America/Whitehorse", "1900-08-20", "1900-08-20T09:00:12.000Z", -540, 0.2, ["dst-gap"]],
  ["Asia/Colombo", "1880-01-01", "1879-12-31T18:40:36.000Z", 319.53333333333336, 0.13333333333333333, ["dst-gap", "lmt"]],
  ["Asia/Tbilisi", "1924-05-02", "1924-05-01T21:00:49.000Z", 180, 0.8166666666666667, ["dst-gap"]],
  ["Brazil/West", "1914-01-01", "1914-01-01T04:00:04.000Z", -240, 0.06666666666666667, ["dst-gap"]],
  ["Canada/Newfoundland", "1935-03-30", "1935-03-30T03:30:52.000Z", -210, 0.8666666666666667, ["dst-gap"]],
  ["Canada/Yukon", "1900-08-20", "1900-08-20T09:00:12.000Z", -540, 0.2, ["dst-gap"]],
  ["Pacific/Norfolk", "1901-01-01", "1900-12-31T12:48:08.000Z", 672, 0.13333333333333333, ["dst-gap"]],
  ["Pacific/Tongatapu", "1945-09-10", "1945-09-09T11:40:48.000Z", 740, 0.8, ["dst-gap"]],
] as const;

const adjacentCases = [
  ['1913-12-31', '23:59', 'America/Manaus', '1914-01-01T03:59:04.000Z', ['lmt']],
  ['1914-01-01', '00:01', 'America/Manaus', '1914-01-01T04:01:00.000Z', []],
  ['1914-01-01', '12:00', 'America/Manaus', '1914-01-01T16:00:00.000Z', []],
  ['1884-01-01', '00:01', 'America/Dawson_Creek', '1884-01-01T08:01:00.000Z', []],
  ['1890-01-01', '00:01', 'America/Caracas', '1890-01-01T04:28:40.000Z', ['lmt']],
  ['1883-11-18', '11:59', 'America/Denver', '1883-11-18T18:58:56.000Z', ['lmt']],
  ['1883-11-18', '12:00', 'America/Denver', '1883-11-18T18:59:56.000Z', ['dst-fold', 'lmt']],
  ['1883-11-18', '12:01', 'America/Denver', '1883-11-18T19:01:00.000Z', []],
  ['1911-12-31', '23:59', 'Africa/Ndjamena', '1911-12-31T22:58:48.000Z', ['lmt']],
  ['1912-01-01', '00:00', 'Africa/Ndjamena', '1911-12-31T23:00:00.000Z', []],
] as const;

describe('second-precise site timezone adoption', () => {
  it.each(historicalGaps)('preserves the actual seconds-sized gap in %s on %s through the SDK receipt', (timeZone, date, instant, offsetMinutes, gapShiftMinutes, flags) => {
    const resolved = resolveLocalToUtc(date, '00:00', timeZone);
    expect(resolved).toEqual(packageResolveLocalToUtc(date, '00:00', timeZone));
    expect(resolved.utc.toISOString()).toBe(instant);
    expect(resolved.utc.getUTCMilliseconds()).toBe(0);
    expect(resolved.offsetMinutes).toBe(offsetMinutes);
    expect(resolved.flags).toEqual(flags);
    const envelope = createNatalEnvelope(natalChart({
      utc: resolved.utc, latitude: -3.1, longitude: -60.02,
      houseSystem: 'placidus', timeKnown: true, flags: resolved.flags,
    }), {
      reference: 'supplied-instant',
      localResolution: { date, time: '00:00', timeZone, offsetMinutes, gapShiftMinutes,
        policy: { fold: 'earlier', gap: 'shift-forward' } },
    });
    expect(parseNatalEnvelope(serializeNatalEnvelope(envelope))).toEqual({ ok: true, envelope });
    expect(envelope.receipt.localResolution?.gapShiftMinutes).toBe(gapShiftMinutes);
    expect(envelope.receipt.inputFlags).toEqual(flags);
  });

  it.each(adjacentCases)('keeps %s %s in %s precise without false folds', (date, time, zone, instant, flags) => {
    const resolved = resolveLocalToUtc(date, time, zone);
    expect(resolved).toEqual(packageResolveLocalToUtc(date, time, zone));
    expect(resolved.utc.toISOString()).toBe(instant);
    expect(resolved.utc.getUTCMilliseconds()).toBe(0);
    expect(resolved.flags).toEqual(flags);
  });

  it('preserves the existing unknown-time local-noon reference immediately after the gap', () => {
    const resolved = resolveLocalToUtc('1914-01-01', '12:00', 'America/Manaus');
    expect(resolved.utc.toISOString()).toBe('1914-01-01T16:00:00.000Z');
    expect(resolved.flags).toEqual([]);
    const envelope = createNatalEnvelope(natalChart({ utc: resolved.utc, latitude: -3.1,
      longitude: -60.02, houseSystem: 'placidus', timeKnown: false, flags: resolved.flags }), {
      reference: 'local-noon',
      localResolution: { date: '1914-01-01', time: '12:00', timeZone: 'America/Manaus',
        offsetMinutes: -240, gapShiftMinutes: 0, policy: { fold: 'earlier', gap: 'shift-forward' } },
    });
    expect(parseNatalEnvelope(serializeNatalEnvelope(envelope))).toEqual({ ok: true, envelope });
    expect(envelope.receipt.reference).toBe('local-noon');
    expect(envelope.receipt.houses.actual).toBeNull();
    expect(envelope.result.angles).toBeNull();
  });
});
