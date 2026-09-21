#!/usr/bin/env node
/**
 * Turns the corpus's geometry SPECS into concrete instants.
 *
 * The specs say "Mars at conjunction with the Sun, searching from 2019" rather
 * than naming an instant, so that a regeneration cannot silently drift onto a
 * different event. This resolves them.
 *
 * The search uses astronomy-engine. That is deliberate and it is not circular:
 * the resolved instant decides only WHERE to sample. Every reference value at
 * that instant still comes from Swiss, and every candidate is still measured
 * against Swiss there. Using the library under test to choose a sample point
 * would only matter if the point had to be exact — it does not, it has to be
 * near the geometry that stresses the code.
 *
 *   node resolve-geometry.mjs   # rewrites corpus-expanded.json in place
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as A from 'astronomy-engine';

const path = new URL('../corpus-expanded.json', import.meta.url);
const corpus = JSON.parse(readFileSync(path, 'utf8'));

const BODY = {
  Sun: A.Body.Sun, Moon: A.Body.Moon, Mercury: A.Body.Mercury, Venus: A.Body.Venus,
  Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn,
  Uranus: A.Body.Uranus, Neptune: A.Body.Neptune, Pluto: A.Body.Pluto,
};

/** Apparent geocentric ecliptic longitude of date, degrees. */
function lon(body, date) {
  const v = A.GeoVector(BODY[body], date, true);
  const e = A.RotateVector(A.Rotation_EQJ_ECT(A.MakeTime(date)), v);
  let d = (Math.atan2(e.y, e.x) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
}

const wrap = (d) => { let x = d % 360; if (x > 180) x -= 360; if (x < -180) x += 360; return x; };

/** Bisect a sign change in f over [a, b] milliseconds, to one second. */
function bisect(f, a, b) {
  let fa = f(a);
  for (let i = 0; i < 64 && b - a > 1000; i += 1) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (Number.isNaN(fm)) return null;
    if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else { b = m; }
  }
  return (a + b) / 2;
}

/**
 * Scan forward in `step` ms for the first sign change of f, then bisect.
 *
 * `maxJump` is not optional decoration. Every f here is an angle difference,
 * and an angle difference wraps: as an elongation passes through zero, the
 * opposition function jumps from -180 to +180, which is a sign change and is
 * NOT a root. The first draft of this file had no such guard and duly
 * "resolved" every Mercury opposition to a conjunction instant, which the
 * verification step caught. A sign change is only accepted when f is
 * continuous across the bracket.
 */
function firstRoot(f, from, horizonMs, step, maxJump = 180, accept = () => true) {
  let prev = f(from);
  for (let t = from + step; t <= from + horizonMs; t += step) {
    const cur = f(t);
    const continuous = Math.abs(cur - prev) < maxJump;
    if (Number.isFinite(prev) && Number.isFinite(cur) && continuous && (prev < 0) !== (cur < 0)) {
      const hit = bisect(f, t - step, t);
      // `accept` exists because a derivative has roots at minima as well as
      // maxima. Searching for greatest elongation without it returns the
      // conjunction, where elongation is least — which is what the first
      // draft did, and what the verification gate then refused.
      if (hit !== null && accept(hit)) return hit;
    }
    prev = cur;
  }
  return null;
}

const YEAR = 365.25 * 86400000;

/**
 * Does the resolved instant actually show the geometry the spec asked for?
 * Checked here rather than trusted, because the first draft happily labelled a
 * conjunction as an opposition and nothing noticed until the numbers were read.
 */
function verifyAchieved(c) {
  const a = c.achieved;
  if (c.event === 'conjunction-with-sun') return Math.abs(a.elongationDeg) < 1;
  if (c.event === 'opposition-to-sun') return Math.abs(Math.abs(a.elongationDeg) - 180) < 1;
  if (c.event === 'greatest-elongation') return Math.abs(a.elongationDeg) > 15;
  if (c.event === 'station') return Math.abs(a.lonVelDegPerDay) < 1e-3;
  if (c.event === 'zero-longitude-crossing') return Math.min(a.longitudeDeg, 360 - a.longitudeDeg) < 0.01;
  return false;
}
let resolved = 0;
let failed = 0;

for (const set of Object.values(corpus.sets)) {
  for (const c of set) {
    if (c.kind !== 'geometry-spec') continue;
    const from = Date.parse(c.searchFromUtc);
    let t = null;
    if (c.event === 'conjunction-with-sun') {
      const f = (ms) => wrap(lon(c.body, new Date(ms)) - lon('Sun', new Date(ms)));
      t = firstRoot(f, from, 40 * YEAR, 2 * 86400000);
    } else if (c.event === 'opposition-to-sun') {
      // Measured as elongation minus 180 in a frame that is continuous AT
      // opposition: shift first, then wrap, so the discontinuity sits at
      // conjunction where there is no root to find.
      const f = (ms) => wrap(lon(c.body, new Date(ms)) - lon('Sun', new Date(ms)) + 180);
      t = firstRoot(f, from, 40 * YEAR, 2 * 86400000);
    } else if (c.event === 'greatest-elongation') {
      // Inferior planets never reach opposition. Their stressing geometry is
      // maximum elongation: the derivative of elongation through zero.
      const h = 6 * 3600000;
      const el = (ms) => Math.abs(wrap(lon(c.body, new Date(ms)) - lon('Sun', new Date(ms))));
      const f = (ms) => el(ms + h) - el(ms - h);
      t = firstRoot(f, from, 40 * YEAR, 43200000, 10, (ms) => el(ms) > 15);
    } else if (c.event === 'station') {
      // Longitude velocity through zero, by central difference over one hour.
      const h = 3600000;
      const f = (ms) => wrap(lon(c.body, new Date(ms + h)) - lon(c.body, new Date(ms - h)));
      t = firstRoot(f, from, 40 * YEAR, 86400000);
    } else if (c.event === 'zero-longitude-crossing') {
      // wrap() puts its discontinuity at 180, which is exactly where this
      // function has no root, so the seam at 0/360 is the one being tested.
      const f = (ms) => wrap(lon(c.body, new Date(ms)));
      t = firstRoot(f, from, 300 * YEAR, c.body === 'Moon' ? 43200000 : 5 * 86400000);
    }
    if (t === null) {
      c.resolved = false;
      c.resolutionNote = 'no event found in the search horizon; this case is reported as unresolved, not dropped';
      failed += 1;
      continue;
    }
    c.utc = new Date(Math.round(t / 1000) * 1000).toISOString().replace('.000', '');
    c.resolved = true;
    c.resolvedBy = 'astronomy-engine search; the instant selects a sample point, not a reference value';
    // Record the geometry actually achieved, so a reader can see it really is
    // the event claimed rather than trusting the label.
    const d = new Date(c.utc);
    c.achieved = c.event === 'station'
      ? { elongationDeg: null, lonVelDegPerDay: Number((wrap(lon(c.body, new Date(d.getTime() + 43200000)) - lon(c.body, new Date(d.getTime() - 43200000)))).toFixed(6)) }
      : { elongationDeg: Number(wrap(lon(c.body, d) - lon('Sun', d)).toFixed(4)), longitudeDeg: Number(lon(c.body, d).toFixed(4)) };
    c.geometryVerified = verifyAchieved(c);
    resolved += 1;
  }
}

const specs = Object.values(corpus.sets).flat().filter((c) => c.kind === 'geometry-spec');
const unverified = specs.filter((c) => c.resolved && !c.geometryVerified);
corpus.geometryResolution = {
  resolved, unresolved: failed, resolver: 'resolve-geometry.mjs',
  verifiedAgainstTheGeometryAsked: specs.filter((c) => c.geometryVerified).length,
  failedVerification: unverified.map((c) => `${c.id} ${c.event} ${c.body}`),
};
if (unverified.length) {
  console.error(`REFUSING: ${unverified.length} instants do not show the geometry their spec asked for:`);
  for (const c of unverified) console.error(`  ${c.id} ${c.event} ${c.body} -> ${JSON.stringify(c.achieved)}`);
  process.exit(1);
}
const body = `${JSON.stringify(corpus, null, 1)}\n`;
writeFileSync(path, body);
console.log(`resolved ${resolved} geometry specs, ${failed} unresolved`);
console.log(`corpus-expanded.json  sha256 ${createHash('sha256').update(body).digest('hex')}`);
