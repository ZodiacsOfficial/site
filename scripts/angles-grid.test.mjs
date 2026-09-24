/**
 * Brief v1 rules 1b and 1h (engine brief steps 1.3 and 1.9), as the shipped
 * engine stands before them.
 *
 * @zodiacs/engine 0.1.1-rc.6 builds the angles from apparent sidereal time
 * and the MEAN obliquity, and refuses Placidus above 66° absolute latitude.
 * This test pins what that gives on the preregistered corpus
 * (docs/platform/evidence/engine-beyond-swiss/corpora/angle-grid-inputs.json)
 * against an ERFA arbiter rather than Swiss, whose output is not committed:
 * angle-grid-erfa.json beside it, made by tools/angle-arbiter.py on the
 * engine's own clock.
 *
 * It is meant to fail when rc.7 moves the angles to the true obliquity and
 * the Placidus limit to 90° − ε. It is then rewritten as the rules: the
 * ascendant within 8″ of the arbiter everywhere and 0.5″ for |latitude| ≤ 45°,
 * and Placidus computed exactly where the arbiter's limit allows it.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { e_tilt, MakeTime, SiderealTime } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { computeChart } from '../src/lib/engine/full';

const corpora = resolve(import.meta.dirname, '../docs/platform/evidence/engine-beyond-swiss/corpora');
const corpusBytes = readFileSync(resolve(corpora, 'angle-grid-inputs.json'));
const corpus = JSON.parse(corpusBytes.toString('utf8'));
const erfa = JSON.parse(readFileSync(resolve(corpora, 'angle-grid-erfa.json'), 'utf8'));

const CORPUS_SHA256 = '82a5466caefb919df66060dd46861ac4f68a678ef9ce3c16bfc423a94042cd9d';
const RAD = Math.PI / 180;

/** Signed difference a − b in arcseconds, across the 0/360 seam. */
const arcsec = (a, b) => ((((a - b) % 360) + 540) % 360 - 180) * 3600;
const quantile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};
const chart = ([utc, latitude, longitude]) => computeChart({
  utc: new Date(utc), latitude, longitude, houseSystem: 'placidus', timeKnown: true,
});
/** The ascendant for a sidereal time (hours) and obliquity (degrees), the arbiter's formula. */
const ascendant = (gastHours, obliquity, latitude, longitude) => {
  const ramc = (gastHours * 15 + longitude) * RAD;
  const eps = obliquity * RAD;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(latitude * RAD) * Math.sin(eps)));
  return ((asc / RAD) % 360 + 360) % 360;
};

describe('the angles against the ERFA arbiter, as rc.6 computes them', () => {
  const rows = corpus.A.map((row, i) => {
    const { angles } = chart(row);
    return {
      id: `${row[0]} ${row[1]}°`,
      latitude: row[1],
      asc: Math.abs(arcsec(angles.asc, erfa.A[i][0])),
      mc: Math.abs(arcsec(angles.mc, erfa.A[i][1])),
    };
  });
  const asc = rows.map((row) => row.asc);
  const midLatitudes = rows.filter((row) => Math.abs(row.latitude) <= 45).map((row) => row.asc);

  it('runs on the preregistered corpus, and the arbiter on the same one', () => {
    expect(createHash('sha256').update(corpusBytes).digest('hex')).toBe(CORPUS_SHA256);
    expect(erfa.corpus.sha256).toBe(CORPUS_SHA256);
    expect([corpus.A.length, erfa.A.length, corpus.L.length, erfa.L.limitDegrees.length]).toEqual([3128, 3128, 336, 336]);
  });

  it('puts the ascendant up to 507″ from the arbiter near 66°', () => {
    const worst = rows.reduce((a, b) => (b.asc > a.asc ? b : a));
    expect(worst.id).toBe('1950-03-21T18:00:00Z -66°');
    expect(worst.asc).toBeCloseTo(506.81, 1);
    expect(quantile(asc, 0.95)).toBeCloseTo(23.16, 1);
    expect(quantile(asc, 0.5)).toBeCloseTo(2.12, 1);
    // Rule 1b's own gates, which rc.6 fails: 8″ everywhere, 0.5″ to 45°.
    expect(Math.max(...midLatitudes)).toBeCloseTo(14.63, 1);
    expect(Math.max(...asc)).toBeGreaterThan(8);
    expect(Math.max(...midLatitudes)).toBeGreaterThan(0.5);
  });

  it('keeps the midheaven within 2.3″, where the obliquity moves it far less than the ascendant', () => {
    expect(Math.max(...rows.map((row) => row.mc))).toBeCloseTo(2.25, 1);
  });

  it('meets rule 1b once the engine\'s own sidereal time is paired with its true obliquity', () => {
    // The control for the fix in step 1.3: the same sidereal time the engine
    // uses, with astronomy-engine's true obliquity in place of the mean one.
    const fixed = corpus.A.map(([utc, latitude, longitude], i) => {
      const time = MakeTime(new Date(utc));
      return {
        latitude,
        asc: Math.abs(arcsec(ascendant(SiderealTime(time), e_tilt(time).tobl, latitude, longitude), erfa.A[i][0])),
      };
    });
    expect(Math.max(...fixed.map((row) => row.asc))).toBeLessThan(8);
    expect(Math.max(...fixed.filter((row) => Math.abs(row.latitude) <= 45).map((row) => row.asc))).toBeLessThan(0.5);
  });
});

describe('Placidus near the polar circle, as rc.6 computes it', () => {
  it('refuses all 336 ladder cases, where the arbiter\'s limit of 90° − ε allows 320', () => {
    const refused = corpus.L.filter((row) => chart(row).flags.includes('polar-fallback')).length;
    const allowed = corpus.L.filter((row, i) => Math.abs(row[1]) < erfa.L.limitDegrees[i]).length;
    expect(refused).toBe(336);
    expect(allowed).toBe(320);
    expect([erfa.L.computable, erfa.L.refused]).toEqual([320, 16]);
  });
});
