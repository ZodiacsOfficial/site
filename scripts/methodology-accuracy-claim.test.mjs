/**
 * The accuracy figures on /methodology/ against the measurement they come from.
 *
 * The page used to say the engine was "accurate to about one arcminute". That
 * figure is Astronomy Engine's own design target against NOVAS, published in
 * its README; nobody here had measured it, and it was written as though it
 * described a chart on this site. Two of the 180 measurements taken on
 * 2026-09-20 fall outside it.
 *
 * The first version of this file was a bad test. An adversarial review wrote
 * five wrong pages that all passed it: the end year changed to 2199 (captured
 * by the regex and never asserted), the 95th percentile and maximum relabelled
 * from arcseconds to arcminutes (only the median had its unit pinned), the
 * width of a sign changed from 108,000 to 10,800 arcseconds (never checked),
 * the two far-future epochs swapped and the delta-T gap inflated tenfold (the
 * values were searched for as bare strings anywhere on the page), and — worst
 * — "Charts here are accurate to one arcminute" inserted as a fresh sentence,
 * which slipped past a negative lookahead by putting the words "own target"
 * later in the same text node.
 *
 * So the cases below work on the page's prose rather than on substrings of its
 * source, bind every number to its unit and to the clause it belongs in, and
 * hold the set of sentences that may mention an arcminute at all. All five
 * mutations, and the ones that suggested themselves while fixing them, fail
 * here.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DeltaT_EspenakMeeus } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const report = JSON.parse(read('docs/platform/evidence/swiss-benchmark/report-measure.json'));
const corpus = read('docs/platform/evidence/swiss-benchmark/tools/corpus.mjs');

/**
 * What a reader sees, near enough: the source with its stylesheet, its markup
 * and its Astro expressions removed. Working on this rather than on the source
 * is what stops a claim hiding inside a tag or a unit hiding outside one.
 */
const proseOf = (path) => read(path)
  .replace(/^---[\s\S]*?^---/mu, ' ')
  .replace(/<style>[\s\S]*?<\/style>/gu, ' ')
  .replace(/\{' '\}/gu, ' ')
  .replace(/\{[^{}]*\}/gu, ' ')
  .replace(/<[^>]+>/gu, ' ')
  .replace(/&mdash;/gu, '—')
  .replace(/\s+/gu, ' ')
  .trim();

const prose = proseOf('src/pages/methodology/index.astro');
/**
 * The engine page repeats a subset of the same figures. It had none of this
 * coverage at first, so a re-run of the benchmark would have failed CI on
 * /methodology/ while the developer front door went on stating stale numbers.
 */
const enginePage = proseOf('src/pages/developers/engine/index.astro');

/** Sentence-ish fragments. Only the ones mentioning arcminutes are inspected. */
const fragments = prose.split(/(?<=[.;])\s+/u).map((s) => s.trim()).filter(Boolean);

/** The comparator's convention, copied so a drift there shows up here. */
const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

const withinRecord = report.rows.filter((r) => r.stratum !== 'future');
const farFuture = report.rows.filter((r) => r.stratum === 'future');
const abs = withinRecord.map((r) => Math.abs(r.dLonArcsec)).sort((a, b) => a - b);
const overArcminute = farFuture
  .filter((r) => Math.abs(r.dLonArcsec) > 60)
  .sort((a, b) => Math.abs(a.dLonArcsec) - Math.abs(b.dLonArcsec));

const tenth = (x) => Number(x.toFixed(1)).toFixed(1);

/** The span the rows actually cover, read from the corpus they came from. */
function spanOf(rows) {
  const ids = new Set(rows.map((r) => r.id));
  const years = [...corpus.matchAll(/c\('([\w-]+)',\s*'([\w-]+)',\s*'(\d{4})-/gu)]
    .filter(([, id]) => ids.has(id))
    .map(([, , , year]) => Number(year));
  return `from ${Math.min(...years)} to ${Math.max(...years)}`;
}

/**
 * Every sentence on the page that may mention an arcminute, in full. A new one
 * fails until it is added here deliberately, which is the only guard that
 * survives an author who adds a claim instead of editing one.
 */
const ARCMINUTE_SENTENCES = [
  'It is designed to stay within one arcminute of NOVAS — that is the library\'s own target,'
  + ' not a measurement of this site, and what we measured is in the next section.',
  'The other 20 measurements are the far-future cases, and two of them exceed one arcminute —'
  + ' both the Moon: 64.8 arcseconds at 2100 and 159.4 arcseconds at 2190.',
];

describe('the accuracy claim on /methodology/', () => {
  it('mentions an arcminute only in the sentences that attribute it', () => {
    const mentions = fragments.filter((f) => /arcminute/u.test(f));
    // Not `toContain` per sentence: the set has to match, so an inserted
    // claim fails even when every expected sentence is still present.
    expect(mentions).toEqual(ARCMINUTE_SENTENCES);
  });

  it('never states a bare accuracy figure for this site', () => {
    expect(prose).not.toMatch(/accurate to (?:about |roughly |within )?one arcminute/u);
    expect(prose).not.toMatch(/charts here are accurate/iu);
    // "high-accuracy", which measured nothing, is gone from the lunar model.
    expect(prose).not.toMatch(/high-accuracy/u);
  });

  it('quotes the measured distribution, with its denominator and its span', () => {
    expect(withinRecord).toHaveLength(160);
    const dates = report.rows.map((r) => r.utc ?? null).filter(Boolean);
    // The report rows carry no date, so the span is taken from the corpus the
    // report was produced from rather than assumed.
    const ids = new Set(withinRecord.map((r) => r.id));
    const years = [...corpus.matchAll(/c\('([\w-]+)',\s*'([\w-]+)',\s*'(\d{4})-/gu)]
      .filter(([, id]) => ids.has(id))
      .map(([, , , year]) => Number(year));
    expect(years.length).toBeGreaterThan(0);
    const span = `from ${Math.min(...years)} to ${Math.max(...years)}`;
    expect(prose, `the page must say "${span}"`)
      .toContain(`Across the ${withinRecord.length} measurements ${span}`);
    expect(dates).toHaveLength(0); // guards the assumption above, not the page
  });

  it('gives every figure its unit and its place in the sentence', () => {
    const p50 = tenth(quantile(abs, 0.5));
    const p95 = tenth(quantile(abs, 0.95));
    const max = tenth(abs[abs.length - 1]);
    expect(prose).toContain(`the median disagreement in longitude is ${p50} arcseconds`);
    expect(prose).toContain(`the 95th percentile is ${p95} arcseconds`);
    const worst = withinRecord.reduce((a, b) => (Math.abs(b.dLonArcsec) > Math.abs(a.dLonArcsec) ? b : a));
    const worstYear = /c\('historic-03',[^)]*'(\d{4})-/u.exec(corpus);
    expect(worst.id).toBe('historic-03');
    expect(prose).toContain(`the largest is ${max} arcseconds — ${worst.body} in ${worstYear[1]}`);
  });

  it('states the width of a sign correctly', () => {
    const stated = /A zodiac sign is (\d+) degrees, which is ([\d,]+) arcseconds/u.exec(prose);
    expect(stated, 'the page must state the width it is comparing against').toBeTruthy();
    expect(Number(stated[2].replaceAll(',', ''))).toBe(Number(stated[1]) * 3600);
    expect(Number(stated[1])).toBe(30);
  });

  it('binds each far-future outlier to its own epoch', () => {
    expect(overArcminute).toHaveLength(2);
    expect(farFuture).toHaveLength(report.rows.length - withinRecord.length);
    expect(prose).toContain(`The other ${farFuture.length} measurements are the far-future cases`);
    for (const row of overArcminute) {
      expect(row.body, 'the page attributes both to the Moon').toBe('Moon');
      const year = new RegExp(`c\\('${row.id}',[^)]*'(\\d{4})-`, 'u').exec(corpus)[1];
      // Value and epoch together: swapping them has to fail.
      expect(prose, `${row.id} must be reported as its own value at its own year`)
        .toContain(`${tenth(Math.abs(row.dLonArcsec))} arcseconds at ${year}`);
    }
    expect(prose).toContain('both the Moon');
  });

  it('shows the delta-T arithmetic it relies on, and gets it right', () => {
    const stated = /Swiss reads ΔT at (\d{4}) as ([\d.]+) seconds where this engine reads ([\d.]+), a gap of ([\d.]+) seconds/u
      .exec(prose);
    expect(stated, 'the page must name both values, not only the gap').toBeTruthy();
    const [, epoch, swiss, engine, gap] = stated;
    expect(Number(engine) - Number(swiss)).toBeCloseTo(Number(gap), 1);
    expect(epoch).toBe('2100');
    // The share of the 2100 residual the gap accounts for, at the Moon's rate.
    const rate = 0.549;
    const accounted = Number(gap) * rate;
    const observed = Math.abs(overArcminute.find((r) => r.id === 'future-01').dLonArcsec);
    const claimed = /accounts for about (\d+) of those ([\d.]+) arcseconds/u.exec(prose);
    expect(claimed, 'the page must say how much of the residual the clock explains').toBeTruthy();
    expect(Number(claimed[1])).toBeCloseTo(accounted, -1);
    expect(Number(claimed[2])).toBeCloseTo(observed, 1);
    expect(Number(claimed[1])).toBeLessThan(observed);
  });

  it('states today\'s ΔT error from the IERS value, not as a convention', () => {
    const deltaT = JSON.parse(read('docs/platform/evidence/deltat-2026-09-23/values.json'));
    const today = deltaT.values.find((row) => row.date === '2026-09-22');
    expect(prose).not.toContain('Neither extrapolation is wrong');
    const stated = /on 22 September 2026 it reads ([\d.]+) seconds where the IERS value is ([\d.]+), which on its own moves the Moon about ([\d.]+) arcseconds/u
      .exec(prose);
    expect(stated, 'the page must give both values and the Moon displacement').toBeTruthy();
    expect(stated[1]).toBe(tenth(today.formulaSeconds));
    expect(stated[2]).toBe(tenth(today.observedSeconds));
    expect(stated[3]).toBe(tenth(today.moonArcseconds));
    // The formula value is the installed library's, at that instant.
    const installed = JSON.parse(read('node_modules/astronomy-engine/package.json')).version;
    expect(deltaT.formula).toEqual({ function: 'DeltaT_EspenakMeeus', package: 'astronomy-engine', version: installed });
    const days = (Date.parse('2026-09-22T00:00:00Z') - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
    expect(DeltaT_EspenakMeeus(days)).toBeCloseTo(today.formulaSeconds, 3);
    expect(today.moonArcseconds).toBeCloseTo(today.differenceSeconds * deltaT.moonArcsecondsPerSecond, 2);
  });

  it('says what agreement with another implementation does not establish', () => {
    expect(prose).toContain('descend from JPL development ephemerides');
    expect(prose).toContain('two implementations agreeing, not a check against observation');
    expect(prose).toContain('disagreement about the clock rather than the ephemeris');
  });

  it('names the reference configuration that produced the figures', () => {
    expect(report.isFullSwissConfiguration).toBe(true);
    expect(report.swissBackendsObserved).toEqual(['SWIEPH']);
    const version = /reports library ([\d.]+)/u.exec(read('docs/platform/evidence/swiss-benchmark/CONFIGURATION.md'));
    expect(version, 'CONFIGURATION.md must pin the Swiss library version').toBeTruthy();
    expect(prose).toContain(`Swiss Ephemeris ${version[1]}`);
    expect(prose).toContain(`${report.rows.length / 10} charts × 10 bodies`);
  });

  it('describes the reduction the engine actually performs', () => {
    // The Moon does not go through the light-time and aberration pass the
    // planets do: @zodiacs/engine calls EclipticGeoMoon, astronomy-engine's
    // own lunar path, which applies nutation and nothing else of the three.
    const engineSource = read('node_modules/@zodiacs/engine/dist/chunk-GBH7JIYF.js');
    expect(engineSource).toMatch(/EclipticGeoMoon\(/u);
    expect(engineSource).toMatch(/GeoVector\(body, time, true\)/u);
    expect(prose).toMatch(/The Moon is the exception/u);
    expect(prose).toMatch(/neither light-time nor aberration/u);
    // …and the page must not go back to claiming all three for everything.
    expect(prose).not.toMatch(/including light-time, aberration, and nutation/u);
  });
});

describe('the same figures on /developers/engine/', () => {
  // The front door repeats the headline; a re-run that moved the distribution
  // has to fail here too, not only on the page that states it at length.
  it('quotes the median and the maximum with their unit and denominator', () => {
    const span = spanOf(withinRecord);
    expect(enginePage).toContain(`across the ${withinRecord.length} measurements ${span}`);
    expect(enginePage).toContain(`the median disagreement in ecliptic longitude is ${tenth(quantile(abs, 0.5))} arcseconds`);
    expect(enginePage).toContain(`the largest is ${tenth(abs[abs.length - 1])} arcseconds`);
  });

  it('binds each far-future outlier to its own epoch', () => {
    for (const row of overArcminute) {
      const year = new RegExp(`c\\('${row.id}',[^)]*'(\\d{4})-`, 'u').exec(corpus)[1];
      expect(enginePage).toContain(`${tenth(Math.abs(row.dLonArcsec))} arcseconds at ${year}`);
    }
  });

  it('says the package does not bound its input date, because it does not', () => {
    // The page used to say the engine accepts 1800-2199. That is this site's
    // own form validation (src/lib/share.ts); the package rejects nothing.
    expect(enginePage).toMatch(/does not bound its input date/u);
    expect(enginePage).not.toMatch(/the engine accepts dates from 1800 to 2199/u);
    const packaged = read('node_modules/@zodiacs/engine/dist/index.js')
      + read('node_modules/@zodiacs/engine/dist/index.d.ts');
    expect(packaged, 'if the package ever gains a range, this claim must change').not.toMatch(/2199/u);
    expect(read('src/lib/share.ts'), 'the site is where the bound lives').toMatch(/year > 2199/u);
  });

  it('says what agreement with another implementation does not establish', () => {
    expect(enginePage).toContain('descend from JPL development ephemerides');
    expect(enginePage).toContain('two implementations agreeing rather than a check against observation');
  });

  it('discloses that the geo entry point ships a network client', () => {
    // The page headline is that the core makes no network request. That is
    // true of the core and not of everything behind /geo.
    // The calls are `fetcher(url)` against `options.fetch ?? globalThis.fetch`,
    // not a literal `fetch(` — which is exactly why this asserts the client's
    // presence rather than grepping for a spelling.
    const geo = read('node_modules/@zodiacs/engine/dist/geo.js');
    expect(geo, 'this case exists because /geo ships a network client').toMatch(/createGeoNamesClient/u);
    expect(geo).toMatch(/globalThis\.fetch/u);
    const core = read('node_modules/@zodiacs/engine/dist/index.js');
    expect(core, 'the core must stay offline').not.toMatch(/globalThis\.fetch|createGeoNamesClient/u);
    expect(enginePage).toMatch(/GeoNames place-lookup client/u);
    expect(enginePage).toMatch(/makes\s+HTTP requests/u);
  });
});
