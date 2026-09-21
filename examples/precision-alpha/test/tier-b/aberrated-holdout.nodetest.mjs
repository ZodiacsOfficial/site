/**
 * Tier B. The preregistered astronomical holdout for
 * validated-retarded-aberrated, as assertions.
 *
 *   PRECISION_PACK=/path/to/pack.zeph npm run test:data
 *
 * A missing pack FAILS rather than skipping, like the rest of this tier.
 *
 * The cases, the tolerances and the pass rule are transcribed from
 * ABERRATED-PREREGISTRATION.md section 8a, committed before the harness
 * that generated them existed. Expected values come from
 * `_aberrated-reference.mjs` and never from the solver under test.
 *
 * `tools/measure/aberrated-holdout.mjs` is the same run with the full
 * record written out; this is the version that fails a build.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { openPackFile } from '../../src/node.mjs';
import { searchRetardedLongitude, searchAberratedLongitude } from '../../src/core/retarded-search.mjs';
import { makeAberratedReference } from './_aberrated-reference.mjs';

const PACK = process.env.PRECISION_PACK;
if (!PACK) throw new Error('PRECISION_PACK is required: point it at a real pack (.zeph)');
if (!existsSync(PACK)) throw new Error(`PRECISION_PACK does not exist: ${PACK}`);

const DAY = 86400;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
/** The harness converts, never the operation. TDB = UTC - J2000 + 69.184 s. */
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;
const plus = (iso, days) => `${new Date(Date.parse(iso) + days * DAY * 1000).toISOString().slice(0, 10)}T00:00:00Z`;

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const STEP = { Moon: 300, Mercury: 900, Venus: 1800, Sun: 1800, Mars: 1800, Jupiter: 3600, Saturn: 3600, Uranus: 3600, Neptune: 3600, Pluto: 3600 };
/** Section 7. */
const ROOT_TOLERANCE_SEC = 1e-3;
const MATCH_WINDOW_SEC = 1;

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeAberratedReference(eph);

/** Section 8a, and nothing chosen here. */
const CASES = BODIES.flatMap((body, i) => {
  const from = plus('1975-01-01T00:00:00Z', 900 * i);
  const to = plus(from, 300);
  const targetDeg = Number(ref.lonDeg(body, (tdb(from) + tdb(to)) / 2, true).toFixed(6));
  return [
    { id: `H${i + 1}`, series: 'main', body, from, to, targetDeg },
    { id: `A${i + 1}`, series: 'antipode', body, from, to, targetDeg: Number(((targetDeg + 180) % 360).toFixed(6)) },
  ];
});

/**
 * Section 8 makes the holdout conditional on the development pair. Run
 * and assert them first, in the same file, so the order is not a matter
 * of anyone's memory.
 */
for (const [id, body, targetDeg, from, to] of [
  ['R1', 'Mars', 100, '2019-01-01T00:00:00Z', '2020-01-01T00:00:00Z'],
  ['R2', 'Moon', 100, '2019-01-01T00:00:00Z', '2019-02-01T00:00:00Z'],
]) {
  test(`${id}: the development case establishes completeness before the holdout counts`, () => {
    const r = searchAberratedLongitude(eph, { body, targetDeg, fromTdbSec: tdb(from), toTdbSec: tdb(to) });
    assert.equal(r.execution.status, 'finished');
    assert.equal(r.completeness.established, true);
    assert.equal(r.eventCount.found, 1);
  });
}

const established = [];
for (const c of CASES) {
  test(`${c.id}: ${c.body} at ${c.targetDeg} deg, ${c.from.slice(0, 10)} .. ${c.to.slice(0, 10)}`, () => {
    const a = tdb(c.from);
    const b = tdb(c.to);
    const r = searchAberratedLongitude(eph, { body: c.body, targetDeg: c.targetDeg, fromTdbSec: a, toTdbSec: b });
    const truth = ref.crossings(c.body, c.targetDeg, a, b, STEP[c.body], true).roots;

    // Section 9, first clause: establish completeness or refuse with a reason.
    if (!r.completeness.established) {
      assert.ok(r.accounting.unresolved.length > 0 || r.execution.status !== 'finished',
        `${c.id}: neither established completeness nor gave a reason`);
      assert.equal(r.eventCount.isExactTotal, false);
      return;
    }
    established.push(c.id);
    assert.equal(r.eventCount.isExactTotal, true);
    assert.equal(r.accounting.unresolved.length, 0, `${c.id}: an exact total alongside unresolved intervals`);

    assert.equal(r.events.length, truth.length,
      `${c.id}: found ${r.events.length} roots, the reference found ${truth.length}`);
    r.events.forEach((e, i) => {
      assert.ok(Math.abs(e.tdbSec - truth[i]) <= MATCH_WINDOW_SEC,
        `${c.id}: root ${i} at ${e.tdbSec} pairs with nothing near the reference's ${truth[i]}`);
      assert.ok(Math.abs(e.tdbSec - truth[i]) <= ROOT_TOLERANCE_SEC,
        `${c.id}: root ${i} is ${Math.abs(e.tdbSec - truth[i])} s from the reference, over ${ROOT_TOLERANCE_SEC} s`);
      const [lo, hi] = e.bracketTdbSec;
      assert.ok(lo <= truth[i] && truth[i] <= hi,
        `${c.id}: bracket ${i} [${lo}, ${hi}] does not contain the reference root ${truth[i]}`);
    });

    // Section 4: the aberration is the whole of what rung 3 added.
    const lt = searchRetardedLongitude(eph, { body: c.body, targetDeg: c.targetDeg, fromTdbSec: a, toTdbSec: b });
    const truthLt = ref.crossings(c.body, c.targetDeg, a, b, STEP[c.body], false).roots;
    if (lt.completeness.established && lt.events.length === r.events.length && truthLt.length === truth.length) {
      r.events.forEach((e, i) => {
        const measured = e.tdbSec - lt.events[i].tdbSec;
        const predicted = truth[i] - truthLt[i];
        assert.ok(Math.abs(measured - predicted) <= 2 * ROOT_TOLERANCE_SEC,
          `${c.id}: the shift between rungs is ${measured} s, the reference predicts ${predicted} s`);
      });
    }
  });
}

test('the antipode series really does have roots for the half-plane to reject', () => {
  // Otherwise "0 events, completeness established" would be a case that
  // tested nothing: f vanishes on the whole LINE through a longitude, and
  // the point of the series is that the search has to find those roots and
  // then reject each one as the wrong direction.
  let rejected = 0;
  for (const c of CASES.filter((x) => x.series === 'antipode')) {
    const a = tdb(c.from);
    const b = tdb(c.to);
    const step = STEP[c.body];
    let signChanges = 0;
    let prev = ref.f(c.body, a, c.targetDeg, true);
    const n = Math.ceil((b - a) / step);
    for (let k = 1; k <= n; k += 1) {
      const t = k === n ? b : a + k * step;
      const cur = ref.f(c.body, t, c.targetDeg, true);
      if (prev !== 0 && cur !== 0 && Math.sign(cur) !== Math.sign(prev)) signChanges += 1;
      prev = cur;
    }
    const kept = ref.crossings(c.body, c.targetDeg, a, b, step, true).roots.length;
    assert.ok(signChanges > kept,
      `${c.id}: every f-root survives the half-plane, so this case does not exercise the rejection`);
    rejected += signChanges - kept;
  }
  assert.ok(rejected >= 10, `only ${rejected} roots were rejected across the antipode series`);
});

test('section 9 usefulness gate: at least half the holdout establishes completeness', () => {
  assert.ok(established.length * 2 >= CASES.length,
    `${established.length} of ${CASES.length} established completeness, so the extension is not practical at this cost`);
});

test.after(() => rt.dispose());
