import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eventsCatalog } from '../src/lib/events/catalog.ts';
import { bodyLongitude } from '../src/lib/engine/full.ts';
import { solarReturnInstant } from '../src/lib/engine/solar-return.ts';
import { resolveLocalToUtc } from '../src/lib/time/localToUtc.ts';

/*
 * Sentences that state a measured accuracy, held to the measurement behind
 * them. Each binding checks both halves: the sentence is on the page, and
 * the figure it states still covers what was measured.
 */
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const evidence = JSON.parse(read('docs/platform/evidence/events-vs-swiss-2026-09-23/deltas.json'));
const MINUTE = 60;
const HOUR = 3600;

describe('event times against Swiss Ephemeris', () => {
  it('were measured on the catalog the site publishes now', () => {
    const published = eventsCatalog().events
      .map(({ facts }) => facts)
      .filter((facts) => facts.family !== 'retrograde' && facts.at)
      .map((facts) => `${facts.id} ${facts.at}`)
      .sort();
    const measured = evidence.deltas.map((row) => `${row.id} ${row.published}`).sort();
    // A regenerated catalog needs docs/platform/evidence/events-vs-swiss-*/tools run again.
    expect(published).toEqual(measured);
  });

  it('keep moons and eclipses within a minute, as the events hub and full-moon calendar say', () => {
    expect(evidence.summary.lunation.maxAbsSeconds).toBeLessThan(MINUTE);
    expect(evidence.summary.eclipse.maxAbsSeconds).toBeLessThan(MINUTE);
    expect(read('src/pages/full-moon-calendar/index.astro')).toContain('to within a minute, in universal time');
    expect(read('src/pages/full-moon-calendar/index.astro')).toContain('timed to within a minute through the end of 2027');
    expect(read('src/pages/events/index.astro')).toContain('and eclipses are timed to within a minute');
  });

  it('keep stations within about 40 minutes, and a few minutes on the retrograde pages', () => {
    expect(evidence.summary.station.maxAbsSeconds).toBeLessThan(45 * MINUTE);
    const byPlanet = evidence.summary.stationMaxAbsSecondsByPlanet;
    for (const planet of ['Mercury', 'Venus', 'Mars']) expect(byPlanet[planet]).toBeLessThan(10 * MINUTE);
    expect(read('src/pages/events/index.astro')).toContain('a station can be off by up to about 40 minutes');
    expect(read('src/components/events/EventFactsBand.astro'))
      .toContain('so these station times can be off by a few minutes.');
    expect(read('src/pages/mercury-retrograde/index.astro')).toContain('compute to within a few minutes');
  });

  it('keep slow sign changes and alignments within half an hour, or several hours with Uranus, Neptune or Pluto', () => {
    const slow = evidence.summary.slowEventMaxAbsSeconds;
    expect(slow['ingress of Jupiter and Saturn only']).toBeLessThan(35 * MINUTE);
    expect(slow['aspect of Jupiter and Saturn only']).toBeLessThan(35 * MINUTE);
    expect(slow['ingress with Uranus, Neptune or Pluto']).toBeLessThan(8 * HOUR);
    expect(slow['aspect with Uranus, Neptune or Pluto']).toBeLessThan(8 * HOUR);
    const band = read('src/components/events/EventFactsBand.astro');
    expect(band).toContain('this time can be off by up to about half an hour.');
    expect(band).toContain('so slowly that this time can be off by several hours.');
    expect(read('src/pages/events/index.astro')).toContain('Uranus, Neptune or Pluto by several hours');
  });
});

describe('the solar return with an unknown birth time', () => {
  it('can move by up to about 12 hours, as the page and the result notice say', () => {
    // The widest case of a 1930-2010 sweep of five zones: a birth at the start of the day.
    const date = '1958-10-15';
    const noon = resolveLocalToUtc(date, '12:00', 'Pacific/Pago_Pago').utc;
    const midnight = resolveLocalToUtc(date, '00:00', 'Pacific/Pago_Pago').utc;
    const near = new Date(Date.UTC(2026, 9, 15, 12));
    const shift = Math.abs(solarReturnInstant(bodyLongitude('Sun', midnight), near).getTime()
      - solarReturnInstant(bodyLongitude('Sun', noon), near).getTime()) / 3_600_000;
    expect(shift).toBeGreaterThan(11.5);
    expect(shift).toBeLessThan(12.5);
    expect(read('src/pages/solar-return/index.astro')).toContain('shift the return by up to about 12 hours');
    expect(read('src/islands/solar-return/copy.ts')).toContain('can shift by up to about 12 hours');
  });
});
