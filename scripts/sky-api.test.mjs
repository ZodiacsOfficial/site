import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildEclipseYear,
  buildIndex,
  buildIngressYear,
  buildMoonPhaseYear,
  buildRetrogradeYear,
  buildSkyApi,
  buildToday,
  completeTransitYears,
  loadSources,
} from './build-sky-api.mjs';

const GENERATED_AT = '2026-08-31T00:00:00.000Z';
const sources = await loadSources();
const { daily, sky, eclipses, months } = sources;
const years = completeTransitYears(months.map((month) => month.month));

function overlaps(window, year) {
  return Date.parse(window.from) < Date.UTC(year + 1, 0, 1)
    && Date.parse(window.to) > Date.UTC(year, 0, 1);
}

describe('sky data API payloads', () => {
  it('emits only calendar years with all twelve monthly snapshots committed', () => {
    expect(completeTransitYears(['2025-11', '2025-12', '2026-01'])).toEqual([]);
    const full = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
    expect(completeTransitYears([...full, '2027-01'])).toEqual([2026]);
    expect(years.length).toBeGreaterThanOrEqual(5);
    expect(years[0]).toBe(2026);
  });

  it('carries the license and attribution contract on every payload', () => {
    const payloads = [
      buildToday({ daily, sky, months, generatedAt: GENERATED_AT }),
      buildRetrogradeYear(sky, years[0], GENERATED_AT),
      buildIngressYear(months, years[0], GENERATED_AT),
      buildMoonPhaseYear(sky, months, years[0], GENERATED_AT),
      buildEclipseYear(eclipses, years[0], GENERATED_AT),
      buildIndex({ years, eclipseYears: years, generatedAt: GENERATED_AT }),
    ];
    for (const payload of payloads) {
      expect(payload.schema).toMatch(/^zodiacs\.sky-api\.[a-z-]+\.v1$/);
      expect(payload.license).toBe('CC BY 4.0');
      expect(payload.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
      expect(payload.attribution).toContain('https://zodiacs.org');
      expect(payload.docs).toBe('https://zodiacs.org/developers/');
      expect(payload.generatedAt).toBe(GENERATED_AT);
    }
  });

  it('republishes the daily facts snapshot without recomputation', () => {
    const today = buildToday({ daily, sky, months, generatedAt: GENERATED_AT });
    expect(today.date).toBe(daily.date);
    expect(today.snapshotAt).toBe(daily.snapshotAt);
    expect(today.bodies).toEqual(daily.bodies);
    expect(today.events).toEqual(daily.events);
    expect(today.eventsCoverage).toBe(daily.eventsCoverage);
  });

  it("agrees with the daily snapshot about which planets are retrograde", () => {
    const today = buildToday({ daily, sky, months, generatedAt: GENERATED_AT });
    const fromWindows = new Set(today.retrogrades.map((window) => window.planet));
    const fromBodies = new Set(
      daily.bodies.filter((body) => body.retrograde && body.body !== 'Moon').map((body) => body.body),
    );
    expect(fromWindows).toEqual(fromBodies);
    for (const window of today.retrogrades) {
      expect(Date.parse(window.from)).toBeLessThanOrEqual(Date.parse(daily.snapshotAt));
      expect(Date.parse(window.to)).toBeGreaterThan(Date.parse(daily.snapshotAt));
    }
  });

  it('points at upcoming lunations with sign and degree attached', () => {
    const { moon } = buildToday({ daily, sky, months, generatedAt: GENERATED_AT });
    for (const next of [moon.nextFullMoon, moon.nextNewMoon]) {
      expect(next).not.toBeNull();
      expect(Date.parse(next.at)).toBeGreaterThan(Date.parse(daily.snapshotAt));
      expect(next.sign).toMatch(/^[a-z]+$/);
      expect(next.degree).toBeGreaterThanOrEqual(0);
      expect(next.degree).toBeLessThan(30);
    }
    expect(moon.phase).toBe(daily.moon.phase);
    expect(moon.illumination).toBe(daily.moon.illumination);
  });

  it('slices retrograde windows by intersection, repeating boundary-crossers', () => {
    for (const year of years) {
      const payload = buildRetrogradeYear(sky, year, GENERATED_AT);
      for (const window of payload.retrogrades) {
        expect(overlaps(window, year)).toBe(true);
      }
    }
    const crossers = sky.retrogrades.filter((window) => years.some((year) => (
      overlaps(window, year) && overlaps(window, year + 1) && years.includes(year + 1)
    )));
    expect(crossers.length).toBeGreaterThan(0);
    for (const window of crossers) {
      const matches = years.filter((year) => buildRetrogradeYear(sky, year, GENERATED_AT)
        .retrogrades.some((entry) => entry.planet === window.planet && entry.from === window.from));
      expect(matches.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps ingresses inside their year, sorted, with the committed fields', () => {
    for (const year of years) {
      const { ingresses } = buildIngressYear(months, year, GENERATED_AT);
      expect(ingresses.length).toBeGreaterThan(0);
      let previous = 0;
      for (const ingress of ingresses) {
        expect(ingress.at.startsWith(String(year))).toBe(true);
        expect(ingress.planet).toBeTruthy();
        expect(ingress.sign).toMatch(/^[a-z]+$/);
        expect(typeof ingress.retrograde).toBe('boolean');
        const at = Date.parse(ingress.at);
        expect(at).toBeGreaterThanOrEqual(previous);
        previous = at;
      }
    }
  });

  it('publishes the canonical sky.json lunation instants, each with a sign', () => {
    const canonical = new Set(sky.moons.map((moon) => moon.at));
    for (const year of years) {
      const { lunations } = buildMoonPhaseYear(sky, months, year, GENERATED_AT);
      expect(lunations.length).toBeGreaterThanOrEqual(24);
      for (const lunation of lunations) {
        expect(canonical.has(lunation.at)).toBe(true);
        expect(['full', 'new']).toContain(lunation.type);
        expect(lunation.sign).toMatch(/^[a-z]+$/);
        expect(lunation.degree).toBeGreaterThanOrEqual(0);
        expect(lunation.degree).toBeLessThan(30);
      }
    }
  });

  it('splits eclipses by peak year without losing any within coverage', () => {
    const emitted = years.flatMap((year) => buildEclipseYear(eclipses, year, GENERATED_AT).eclipses);
    const inCoveredYears = eclipses.eclipses.filter((eclipse) => (
      years.includes(new Date(eclipse.peak).getUTCFullYear())
    ));
    expect(emitted).toEqual(inCoveredYears);
  });

  it('writes exactly the files the index advertises', async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), 'sky-api-'));
    const { index } = await buildSkyApi({ outputRoot, generatedAt: GENERATED_AT });
    const apiRoot = resolve(outputRoot, 'api/v1');
    const walk = async (dir) => {
      const entries = await readdir(dir, { withFileTypes: true });
      const nested = await Promise.all(entries.map((entry) => (entry.isDirectory()
        ? walk(resolve(dir, entry.name))
        : [`/api/v1/${relative(apiRoot, resolve(dir, entry.name))}`])));
      return nested.flat();
    };
    const written = (await walk(apiRoot)).sort();
    const advertised = [...index.endpoints.map((endpoint) => endpoint.path), '/api/v1/index.json'].sort();
    expect(written).toEqual(advertised);
    expect(new Set(advertised).size).toBe(advertised.length);

    const reread = JSON.parse(await readFile(resolve(apiRoot, 'sky/today.json'), 'utf8'));
    expect(reread).toEqual(buildToday({ daily, sky, months, generatedAt: GENERATED_AT }));
  });

  it('is deterministic for a fixed generation time', () => {
    const first = JSON.stringify(buildToday({ daily, sky, months, generatedAt: GENERATED_AT }));
    const second = JSON.stringify(buildToday({ daily, sky, months, generatedAt: GENERATED_AT }));
    expect(first).toBe(second);
    expect(JSON.stringify(buildRetrogradeYear(sky, years[0], GENERATED_AT)))
      .toBe(JSON.stringify(buildRetrogradeYear(sky, years[0], GENERATED_AT)));
  });
});
