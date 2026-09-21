/**
 * Tier B. The preregistered astronomical run for
 * validated-retarded-geometric, as assertions.
 *
 *   PRECISION_PACK=/path/to/pack.zeph npm run test:data
 *
 * A missing pack FAILS rather than skipping, like the rest of this tier.
 *
 * The cases, the tolerances and the pass rule are transcribed from
 * RETARDED-PREREGISTRATION.md, which was committed before any of them ran.
 * Expected values come from `_retarded-reference.mjs` — the public
 * `Ephemeris.state`, a bare fixed-point light-time, a uniform scan and
 * bisection — and never from the solver under test.
 *
 * The reference's own completeness is bounded by its scan step, so the
 * step is a declared per-body constant here rather than something the run
 * chooses for itself.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { openPackFile } from '../../src/node.mjs';
import { searchRetardedLongitude } from '../../src/core/retarded-search.mjs';
import { makeReference } from './_retarded-reference.mjs';

const PACK = process.env.PRECISION_PACK;
if (!PACK) throw new Error('PRECISION_PACK is required: point it at a real pack (.zeph)');
if (!existsSync(PACK)) throw new Error(`PRECISION_PACK does not exist: ${PACK}`);

const DAY = 86400;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
/** The harness converts, never the operation. TDB = UTC - J2000 + 69.184 s. */
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;
const plus = (iso, days) => `${new Date(Date.parse(iso) + days * DAY * 1000).toISOString().slice(0, 10)}T00:00:00Z`;

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
/** Well under the fastest crossing rate in each window; see RETARDED-RESULTS.md section 7. */
const STEP = { Moon: 300, Mercury: 900, Venus: 1800, Sun: 1800, Mars: 1800, Jupiter: 3600, Saturn: 3600, Uranus: 3600, Neptune: 3600, Pluto: 3600 };
/** Preregistration section 4. */
const ROOT_TOLERANCE_SEC = 1e-3;
const MATCH_WINDOW_SEC = 1;

const HOLDOUT = BODIES.map((body, i) => {
  const from = plus('1975-01-01T00:00:00Z', 900 * i);
  return { id: `K${i + 1}`, body, targetDeg: (53 * i + 29) % 360, from, to: plus(from, 300) };
});
HOLDOUT.push({ id: 'S1', body: 'Mars', targetDeg: 120, from: '2018-04-01T00:00:00Z', to: '2018-10-01T00:00:00Z' });
HOLDOUT.push({ id: 'S2', body: 'Mercury', targetDeg: 300, from: '2019-11-01T00:00:00Z', to: '2020-03-01T00:00:00Z' });

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeReference(eph);

/**
 * Supplementary, and not counted toward the preregistered pass rule.
 *
 * Seven holdout cases find nothing because the generation rule picks a
 * longitude the body never reaches, which leaves the ROOT path untested on
 * most of the contract. These read the target off the body's own position
 * at the window midpoint, so there is no free parameter to tune, and they
 * are labelled rather than folded into the holdout.
 */
const SUPPLEMENT = BODIES.map((body, i) => {
  const from = plus('1975-01-01T00:00:00Z', 900 * i);
  const to = plus(from, 300);
  return { id: `M${i + 1}`, body, from, to,
    targetDeg: Number(ref.lonDeg(body, (tdb(from) + tdb(to)) / 2).toFixed(6)) };
});
SUPPLEMENT.push({ id: 'T1', body: 'Mars', from: '2018-05-01T00:00:00Z', to: '2018-11-01T00:00:00Z',
  targetDeg: Number(ref.lonDeg('Mars', tdb('2018-07-27T00:00:00Z')).toFixed(6)), expectEvents: 3 });

function runCase(c) {
  const a = tdb(c.from);
  const b = tdb(c.to);
  const r = searchRetardedLongitude(eph, { body: c.body, targetDeg: c.targetDeg, fromTdbSec: a, toTdbSec: b });
  const reference = ref.crossings(c.body, c.targetDeg, a, b, STEP[c.body]);

  assert.equal(r.execution.status, 'finished', `${c.id}: ${r.execution.reason ?? 'did not finish'}`);
  assert.equal(r.completeness.established, true,
    `${c.id}: not proven — ${r.accounting.unresolved[0]?.why ?? 'no reason given'}`);
  assert.equal(r.eventCount.isExactTotal, true, `${c.id}: the total is not exact`);
  assert.equal(r.accounting.unresolved.length, 0, `${c.id}: ${r.accounting.unresolved.length} region(s) left open`);

  // An event matches when |dt| <= 1 s AND the reference root lies inside
  // the reported bracket widened by one bracket width.
  const used = new Set();
  let worst = 0;
  for (const e of r.events) {
    let best = -1;
    let bestDt = Infinity;
    for (let i = 0; i < reference.roots.length; i += 1) {
      if (used.has(i)) continue;
      const dt = Math.abs(reference.roots[i] - e.tdbSec);
      if (dt < bestDt) { bestDt = dt; best = i; }
    }
    assert.ok(best >= 0 && bestDt <= MATCH_WINDOW_SEC,
      `${c.id}: event at ${e.tdbSec} matches no reference root (nearest ${bestDt} s away)`);
    const w = e.bracketWidthSec;
    assert.ok(reference.roots[best] >= e.bracketTdbSec[0] - w && reference.roots[best] <= e.bracketTdbSec[1] + w,
      `${c.id}: the reference root is outside the reported bracket`);
    used.add(best);
    worst = Math.max(worst, bestDt);
  }
  assert.equal(reference.roots.length - used.size, 0,
    `${c.id}: ${reference.roots.length - used.size} reference root(s) missed`);
  assert.ok(worst <= ROOT_TOLERANCE_SEC, `${c.id}: worst root error ${worst} s exceeds ${ROOT_TOLERANCE_SEC} s`);

  // Light-time is a verified contraction, not an iteration that settled.
  assert.ok(r.uncertainty.numerical.worstContractionFactor < 1,
    `${c.id}: contraction factor ${r.uncertainty.numerical.worstContractionFactor} is not below 1`);
  return { r, reference, worst };
}

for (const c of HOLDOUT) {
  test(`${c.id}: ${c.body} at ${c.targetDeg}deg is proven, with no missed and no extra event`, () => {
    const { r, reference } = runCase(c);
    assert.equal(r.events.length, reference.roots.length);
  });
}

for (const c of SUPPLEMENT) {
  test(`supplementary ${c.id}: ${c.body} at its own midpoint longitude`, () => {
    const { r, reference } = runCase(c);
    assert.equal(r.events.length, reference.roots.length);
    // The supplement exists to exercise the root path, so a case that
    // finds nothing has failed at its one job.
    assert.ok(r.events.length >= 1, `${c.id}: found no crossing, so it tested nothing`);
    if (c.expectEvents) assert.equal(r.events.length, c.expectEvents, `${c.id}: a retrograde loop crosses three times`);
  });
}

test('the contract names what it does not apply, and does not claim to be apparent', () => {
  const a = tdb('1975-01-01T00:00:00Z');
  const r = searchRetardedLongitude(eph, { body: 'Sun', targetDeg: 29, fromTdbSec: a, toTdbSec: a + 300 * DAY });
  const not = r.request.notApplied.join(' ; ');
  for (const omitted of ['aberration', 'deflection', 'Shapiro', 'precession', 'topocentric']) {
    assert.match(not, new RegExp(omitted, 'i'), `the contract does not name ${omitted} as omitted`);
  }
  assert.match(r.request.comparableTo, /LT/);
  assert.doesNotMatch(r.request.operation, /apparent/i);
});
