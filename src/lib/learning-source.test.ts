import { describe, expect, it } from 'vitest';
import { projectLearningSource } from './learning-source';

function saved() { return {
  id: 'c5c1e710-ae43-4f98-a27c-2976aaf4a5de', name: 'Synthetic example',
  birth: { date: '1999-08-11', time: '12:00', timeKnown: true,
    place: { name: 'Example', admin1: '', country: 'GB', lat: 51.5, lon: 0, tz: 'Europe/London' } },
  summary: { engineVersion: 'test', utcISO: '1999-08-11T11:00:00.000Z', houseSystem: 'whole',
    bodies: [{ body: 'Sun', lon: 138, retrograde: false }], angles: { asc: 1, mc: 90 }, flags: [] },
}; }
describe('private saved learning input projection', () => {
  it('validates the exact source without mutating it or including labels in identity', () => {
    const value = saved(); const original = structuredClone(value); const source = projectLearningSource(value)!;
    expect(source).not.toBeNull(); expect(value).toEqual(original);
    value.name = 'Renamed'; value.birth.place.name = 'A cosmetic label';
    expect(projectLearningSource(value)?.identity).toBe(source.identity);
    expect(source.identity).not.toContain('Synthetic'); expect(source.identity).not.toContain('Example');
  });
  it.each(['date', 'time', 'timeKnown', 'lat', 'lon', 'tz', 'houseSystem'])('invalidates meaningful %s edits', (field) => {
    const value = saved(); const before = projectLearningSource(value)!;
    if (field === 'date') value.birth.date = '1999-08-12';
    if (field === 'time') value.birth.time = '12:01';
    if (field === 'timeKnown') value.birth.timeKnown = false;
    if (field === 'lat') value.birth.place.lat = 50;
    if (field === 'lon') value.birth.place.lon = 1;
    if (field === 'tz') value.birth.place.tz = 'UTC';
    if (field === 'houseSystem') value.summary.houseSystem = 'placidus';
    expect(projectLearningSource(value)?.identity).not.toBe(before.identity);
  });
  it('uses effective noon for unknown time without changing the saved clock', () => {
    const value = saved(); value.birth.timeKnown = false; value.birth.time = 'unknown';
    const source = projectLearningSource(value)!;
    expect(source.input.time).toBe('12:00'); expect(source.input.timeKnown).toBe(false);
    value.birth.time = '07:14'; expect(projectLearningSource(value)?.identity).toBe(source.identity);
  });
  it.each([
    { id: 'not-a-uuid' }, { birth: null }, { summary: null },
    { birth: { ...saved().birth, date: '1900-02-29' } },
    { birth: { ...saved().birth, date: '1799-12-31' } },
    { birth: { ...saved().birth, date: '2200-01-01' } },
    { birth: { ...saved().birth, timeKnown: 'yes' } },
    { birth: { ...saved().birth, time: '24:00' } },
    { birth: { ...saved().birth, place: null } },
    { birth: { ...saved().birth, place: { ...saved().birth.place, lat: NaN } } },
    { birth: { ...saved().birth, place: { ...saved().birth.place, lat: 91 } } },
    { birth: { ...saved().birth, place: { ...saved().birth.place, lon: -181 } } },
    { birth: { ...saved().birth, place: { ...saved().birth.place, tz: 'Invalid/Zone' } } },
    { summary: { ...saved().summary, houseSystem: 'made-up' } },
    { summary: { ...saved().summary, bodies: [null] } },
    { summary: { ...saved().summary, angles: {} } },
  ])('fails closed for malformed or positions-only records %#', (patch) => {
    expect(projectLearningSource({ ...saved(), ...patch })).toBeNull();
  });
});
