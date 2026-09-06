import { describe, expect, it } from 'vitest';
import { computeLunarReturn, type LunarReturnComputeInput } from './compute';
import { lunarReturnChart } from '../../lib/engine/lunar-return';
import { resolveLocalToUtc } from '../../lib/time/localToUtc';

const place = { name: 'Synthetic UTC', lat: 0, lon: 0, tz: 'Etc/UTC' };
const after = new Date('2026-03-01T00:00:00Z');
const input = (): LunarReturnComputeInput => ({ birthDate: '1990-02-01', birthTime: '12:00', timeKnown: true,
  birthplace: { ...place }, houseSystem: 'placidus', castLocation: null });

describe('lunar return complete-input caller', () => {
  it('resolves original birth input and preserves the submitted reference', () => {
    const result = computeLunarReturn(input(), after);
    expect(result.chart).toEqual(lunarReturnChart({ utc: new Date('1990-02-01T12:00:00Z'), latitude: 0, longitude: 0, houseSystem: 'placidus', timeKnown: true, flags: [] }, after));
    expect(result.referenceUtc).toBe(after.toISOString());
  });
  it('ignores stale extra cached positions and recomputes the authoritative Moon', () => {
    const stale = { ...input(), savedMoonLon: 1, summary: { bodies: [{ body: 'Moon', lon: 1 }], engineVersion: 'old' } };
    expect(computeLunarReturn(stale, after)).toEqual(computeLunarReturn(input(), after));
  });
  it.each<Partial<LunarReturnComputeInput>>([
    { timeKnown: false }, { birthTime: null }, { birthTime: '' }, { birthplace: null },
    { birthplace: { ...place, tz: '' } }, { birthplace: { ...place, tz: 'Made/Up' } },
    { birthplace: { ...place, lat: NaN } }, { birthDate: '2026-02-30' },
    { birthTime: '24:00' }, { birthDate: '1799-12-31' }, { birthDate: '2026-03-02' },
  ])('rejects incomplete, impossible or out-of-range input %j', (invalid) => {
    expect(() => computeLunarReturn({ ...input(), ...invalid }, after)).toThrow(RangeError);
  });
  it.each([['2025-03-09', '02:30'], ['2025-11-02', '01:30']])('rejects actual IANA gap/fold %s %s', (birthDate, birthTime) => {
    expect(() => computeLunarReturn({ ...input(), birthDate, birthTime, birthplace: { ...place, tz: 'America/New_York' } }, after))
      .toThrow('skipped or repeated');
  });
  it('retains the IANA historical LMT convention without hand-written offsets', () => {
    const birthDate = '1907-07-06'; const birthTime = '08:30';
    const birthplace = { name: 'Mexico City', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' };
    const resolved = resolveLocalToUtc(birthDate, birthTime, birthplace.tz);
    const result = computeLunarReturn({ ...input(), birthDate, birthTime, birthplace }, after);
    expect(result.natalTimeFlags).toEqual(resolved.flags.filter((flag) => flag === 'lmt'));
    expect(result.chart).toEqual(lunarReturnChart({ utc: resolved.utc, latitude: birthplace.lat, longitude: birthplace.lon, houseSystem: 'placidus', timeKnown: true, flags: resolved.flags }, after));
  });
  it('keeps the event and planets under relocation while changing angles', () => {
    const first = computeLunarReturn(input(), after);
    const second = computeLunarReturn({ ...input(), castLocation: { name: 'Bangkok', lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok' } }, after);
    expect(second.chart.input.utc).toEqual(first.chart.input.utc);
    expect(second.chart.bodies).toEqual(first.chart.bodies);
    expect(second.chart.angles).not.toEqual(first.chart.angles);
  });
  it('does not retain the caller’s mutable reference date', () => {
    const reference = new Date(after); const result = computeLunarReturn(input(), reference);
    reference.setUTCFullYear(2100);
    expect(result.referenceUtc).toBe(after.toISOString());
  });
});
