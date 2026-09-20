/**
 * The accuracy figures on /methodology/ against the measurement they come from.
 *
 * The page used to say the engine was "accurate to about one arcminute". That
 * figure is Astronomy Engine's own design target against NOVAS, published in
 * its README; nobody here had measured it, and it was written as though it
 * described a chart on this site. Two of the 180 measurements taken on
 * 2026-09-20 are outside it.
 *
 * So the page now quotes a measurement, and a quoted measurement drifts. These
 * cases recompute every number on the page from the committed report rather
 * than from the prose in RESULTS.md, and fail if the two disagree — if the
 * benchmark is re-run and the distribution moves, the page has to move with it.
 * They also hold the two claims that make the number honest: which subset it
 * covers, and that agreeing with Swiss Ephemeris is not an observational check.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const page = read('src/pages/methodology/index.astro');
const report = JSON.parse(read('docs/platform/evidence/swiss-benchmark/report-measure.json'));

/** The comparator's own convention, copied so a drift there shows up here. */
const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

/**
 * The far-future stratum is reported separately on the page because its
 * residual is a Delta-T difference, not an ephemeris one. Splitting it out is
 * only honest if the split is stated, which the last case here checks.
 */
const withinRecord = report.rows.filter((r) => r.stratum !== 'future');
const abs = withinRecord.map((r) => Math.abs(r.dLonArcsec)).sort((a, b) => a - b);
const overArcminute = report.rows
  .filter((r) => Math.abs(r.dLonArcsec) > 60)
  .sort((a, b) => Math.abs(a.dLonArcsec) - Math.abs(b.dLonArcsec));

describe('the accuracy claim on /methodology/', () => {
  it('does not present a borrowed figure as this engine\'s measured accuracy', () => {
    // The exact regression: an upstream design target, stated bare, as ours.
    expect(page).not.toMatch(/library accurate to about one arcminute/u);
    expect(page).not.toMatch(/accurate to (?:about |roughly |within )?one arcminute(?![^<]*own target)/u);
    // Where the one-arcminute figure does still appear it is attributed.
    const arcminute = page.indexOf('one arcminute of NOVAS');
    expect(arcminute, 'the upstream target should be named and attributed').toBeGreaterThan(-1);
    expect(page.slice(arcminute, arcminute + 240)).toMatch(/library's own target, not a measurement of\s+this site/u);
    // And "high-accuracy", which measured nothing, is gone from the lunar model.
    expect(page).not.toMatch(/high-accuracy lunar model/u);
  });

  it('quotes the measured distribution the committed report actually holds', () => {
    expect(withinRecord).toHaveLength(160);
    const quoted = /Across the (\d+) measurements from (\d{4}) to (\d{4})/u.exec(page);
    expect(quoted, 'the page must say how many measurements and over what span').toBeTruthy();
    expect(Number(quoted[1])).toBe(withinRecord.length);

    const tenth = (x) => Number(x.toFixed(1));
    expect(page).toMatch(
      new RegExp(`median disagreement\\s+in longitude is <strong>${tenth(quantile(abs, 0.5))} arcseconds</strong>`, 'u'),
    );
    expect(page).toMatch(new RegExp(`95th percentile\\s+is ${tenth(quantile(abs, 0.95))}`, 'u'));
    expect(page).toMatch(new RegExp(`largest is ${tenth(abs[abs.length - 1])}`, 'u'));

    const worst = withinRecord.reduce((a, b) => (Math.abs(b.dLonArcsec) > Math.abs(a.dLonArcsec) ? b : a));
    expect(worst.body).toBe('Pluto');
    expect(page).toMatch(new RegExp(`${worst.body} in ${quoted[2]}`, 'u'));
  });

  it('reports every measurement that falls outside the upstream target', () => {
    // If a re-run produces a third, the page may not keep saying there are two.
    expect(page).toMatch(
      new RegExp(`(?:Two|${overArcminute.length})\\s+of the ${report.rows.length} measurements do exceed one arcminute`, 'u'),
    );
    expect(overArcminute).toHaveLength(2);
    for (const row of overArcminute) {
      expect(row.body, 'the page attributes both to the Moon').toBe('Moon');
      expect(page).toMatch(new RegExp(`${Math.abs(row.dLonArcsec).toFixed(1)}`, 'u'));
    }
  });

  it('names the reference configuration that produced the figures', () => {
    expect(report.isFullSwissConfiguration).toBe(true);
    expect(report.swissBackendsObserved).toEqual(['SWIEPH']);
    const version = /reports library ([\d.]+)/u.exec(read('docs/platform/evidence/swiss-benchmark/CONFIGURATION.md'));
    expect(version, 'CONFIGURATION.md must pin the Swiss library version').toBeTruthy();
    expect(page).toContain(`Swiss Ephemeris ${version[1]}`);
  });

  it('says what agreement with another implementation does not establish', () => {
    expect(page).toMatch(/descend from JPL development ephemerides/u);
    expect(page).toMatch(/two\s+implementations agreeing, not a check against observation/u);
    // The far-future rows are excluded from the headline, so the reason is stated.
    expect(page).toMatch(/disagreement about the clock rather than the ephemeris/u);
    expect(page).toMatch(/extrapolate the Earth's slowing\s+rotation differently/u);
  });
});
