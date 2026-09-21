/**
 * Tier B. The preregistered astronomical holdout for
 * validated-retarded-aberrated-of-date, as assertions.
 *
 *   PRECISION_PACK=/path/to/pack.zeph npm run test:data
 *
 * A missing pack FAILS rather than skipping, like the rest of this tier.
 *
 * The cases, the tolerances and the pass rule are transcribed from
 * OF-DATE-PREREGISTRATION.md sections 7, 9a and 10, committed before the
 * harness that generated them existed. Expected values come from
 * `_of-date-reference.mjs` — the released reducer's frame on plain
 * doubles — and never from the solver under test.
 *
 * `tools/measure/of-date-holdout.mjs` is the same run with the full record
 * written out; this is the version that fails a build.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { openPackFile } from '../../src/node.mjs';
import { searchAberratedLongitude, searchOfDateLongitude, searchRetardedLongitude } from '../../src/core/retarded-search.mjs';
import { makeOfDateReference } from './_of-date-reference.mjs';
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
/** Section 7, inherited from the two earlier documents and not re-chosen. */
const ROOT_TOLERANCE_SEC = 1e-3;
const MATCH_WINDOW_SEC = 1;

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeOfDateReference(eph);
const refFixed = makeAberratedReference(eph);

/** Section 9a, and nothing chosen here. */
const CASES = BODIES.flatMap((body, i) => {
  const from = plus('1975-01-01T00:00:00Z', 900 * i);
  const to = plus(from, 300);
  const targetDeg = Number(ref.lonDeg(body, (tdb(from) + tdb(to)) / 2).toFixed(6));
  return [
    { id: `F${i + 1}`, series: 'main', body, from, to, targetDeg },
    { id: `B${i + 1}`, series: 'antipode', body, from, to, targetDeg: Number(((targetDeg + 180) % 360).toFixed(6)) },
  ];
});

const established = [];
/** Cases where the frame moved a crossing across a window edge. Pinned below. */
const separated = [];

for (const c of CASES) {
  test(`${c.id}: ${c.body} at ${c.targetDeg} deg of date, ${c.from.slice(0, 10)} .. ${c.to.slice(0, 10)}`, () => {
    const a = tdb(c.from);
    const b = tdb(c.to);
    const spec = { body: c.body, targetDeg: c.targetDeg, fromTdbSec: a, toTdbSec: b };
    const r = searchOfDateLongitude(eph, spec);
    const truth = ref.crossings(c.body, c.targetDeg, a, b, STEP[c.body]).roots;

    // Section 10, first clause: establish completeness or refuse with a reason.
    if (!r.completeness.established) {
      assert.ok(r.accounting.unresolved.length > 0 || r.execution.status !== 'finished',
        `${c.id}: neither established completeness nor gave a reason`);
      assert.equal(r.eventCount.isExactTotal, false);
      return;
    }
    established.push(c.id);
    assert.equal(r.eventCount.isExactTotal, true);
    assert.equal(r.accounting.unresolved.length, 0, `${c.id}: an exact total alongside unresolved intervals`);

    // Section 8: the window is inside the declared model range, and the
    // result says so rather than leaving a reader to assume it.
    assert.equal(r.diagnostics.frameOfDate.requestWithinModelRange, true);

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

    /**
     * Section 4: rung 4 minus rung 3 is the FRAME, and nothing else.
     *
     * Not inside an `if` that skips the interesting case. When the two
     * rungs disagree about how many crossings there are, that is not a
     * defect and not an improvement — they look for the same numeric
     * longitude measured from different origins, so a crossing can sit
     * inside one window and outside the other. It still has to be
     * ATTRIBUTED: the two independent references must show the same count
     * difference their solvers do, or the difference is not the frame.
     */
    const ab = searchAberratedLongitude(eph, spec);
    const truthFixed = refFixed.crossings(c.body, c.targetDeg, a, b, STEP[c.body], true).roots;
    assert.equal(ab.completeness.established, true, `${c.id}: the aberrated rung did not establish completeness`);

    if (ab.events.length !== r.events.length) {
      separated.push(c.id);
      assert.equal(truthFixed.length, ab.events.length,
        `${c.id}: the rungs disagree and the fixed-frame reference does not corroborate the aberrated count`);
      assert.equal(truth.length, r.events.length,
        `${c.id}: the rungs disagree and the of-date reference does not corroborate the of-date count`);
      // And rungs 1 to 3, which DO share a frame, must still agree with
      // each other. Without this the branch would let a light-time defect
      // ride along behind a legitimate frame separation: it is entered on
      // the of-date count alone, and everything else in the case stops
      // being checked.
      const lt = searchRetardedLongitude(eph, spec);
      assert.equal(lt.completeness.established, true, `${c.id}: the light-time rung did not establish completeness`);
      assert.equal(lt.events.length, ab.events.length,
        `${c.id}: the light-time and aberrated rungs disagree (${lt.events.length} against ${ab.events.length});`
        + ' they share a frame, so that is a defect, not a separation');
      return;
    }

    assert.equal(truthFixed.length, truth.length,
      `${c.id}: the two references disagree about how many crossings there are`);
    r.events.forEach((e, i) => {
      const measured = e.tdbSec - ab.events[i].tdbSec;
      const predicted = truth[i] - truthFixed[i];
      assert.ok(Math.abs(measured - predicted) <= 2 * ROOT_TOLERANCE_SEC,
        `${c.id}: the frame moved crossing ${i} by ${measured} s, the reference predicts ${predicted} s`);
    });
  });
}

/**
 * The antipode table in OF-DATE-RESULTS.md section 3, pinned.
 *
 * An inequality alone would still pass if every count in that table
 * changed, and the table is the whole argument that eight cases reporting
 * zero events did work rather than skipping it.
 */
const ANTIPODE_TABLE = {
  B1: { signChanges: 1, kept: 0 },
  B2: { signChanges: 22, kept: 11 },
  B3: { signChanges: 1, kept: 0 },
  B4: { signChanges: 3, kept: 2 },
  B5: { signChanges: 1, kept: 0 },
  B6: { signChanges: 2, kept: 0 },
  B7: { signChanges: 2, kept: 0 },
  B8: { signChanges: 2, kept: 0 },
  B9: { signChanges: 2, kept: 0 },
  B10: { signChanges: 2, kept: 0 },
};

test('the antipode series really does have roots for the half-plane to reject', () => {
  let rejected = 0;
  for (const c of CASES.filter((x) => x.series === 'antipode')) {
    const a = tdb(c.from);
    const b = tdb(c.to);
    const step = STEP[c.body];
    let signChanges = 0;
    let prev = ref.f(c.body, a, c.targetDeg);
    const n = Math.ceil((b - a) / step);
    for (let k = 1; k <= n; k += 1) {
      const t = k === n ? b : a + k * step;
      const cur = ref.f(c.body, t, c.targetDeg);
      if (prev !== 0 && cur !== 0 && Math.sign(cur) !== Math.sign(prev)) signChanges += 1;
      prev = cur;
    }
    const kept = ref.crossings(c.body, c.targetDeg, a, b, step).roots.length;
    assert.ok(signChanges > kept,
      `${c.id}: every f-root survives the half-plane, so this case does not exercise the rejection`);
    assert.deepEqual({ signChanges, kept }, ANTIPODE_TABLE[c.id],
      `${c.id}: the published antipode table no longer matches the reference`);
    rejected += signChanges - kept;
  }
  assert.equal(rejected, 25, 'the published total of rejected roots no longer matches the reference');
});

test('the frame-separated cases are the two the results document names', () => {
  // If this set ever grows or shrinks, the attribution in section 4 of the
  // results document is about a different set of cases and should be
  // re-read rather than assumed.
  assert.deepEqual(separated.sort(), ['F10', 'F9']);
});

test('section 10 usefulness gate: at least half the holdout establishes completeness', () => {
  assert.ok(established.length * 2 >= CASES.length,
    `${established.length} of ${CASES.length} established completeness, so the frame layer is not practical at this cost`);
});

test.after(() => rt.dispose());
