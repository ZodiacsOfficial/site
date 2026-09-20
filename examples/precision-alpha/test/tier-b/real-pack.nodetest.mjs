/**
 * Tier B. Real data, explicit paths, loud failure when they are absent.
 *
 *   PRECISION_PACK=/path/to/pack.zeph \
 *   PRECISION_KERNEL=/path/to/de440s.bsp \
 *   npm run test:data
 *
 * A missing input FAILS. It does not skip, and it does not fall back to a
 * path from an earlier session: a research gate that goes green because the
 * data was not there is the failure mode this tier exists to prevent.
 */

/**
 * Named `.nodetest.mjs`, not `.test.mjs`, on purpose: vitest's default glob
 * collects `*.test.mjs` across the whole repository and these are
 * `node:test` suites, not vitest ones. The repository already uses this
 * convention for its research suites. Run them with the package's own
 * `npm test`, or `node --test "test/tier-a/*.nodetest.mjs"`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { openPackFile, openPackFileStream, CORRECTED, PROTOTYPE } from '../../src/node.mjs';
import { Reducer } from '../../src/core/reduce.mjs';

const PACK = process.env.PRECISION_PACK;
const KERNEL = process.env.PRECISION_KERNEL;

test('the pack path is supplied and exists', () => {
  assert.ok(PACK, 'PRECISION_PACK is not set. This tier needs a real pack; it will not guess where one is, and it will not pass without one.');
  assert.ok(existsSync(PACK), `PRECISION_PACK points at nothing: set it to a real pack.`);
});

if (!PACK || !existsSync(PACK)) {
  // Everything below needs the pack. Node's runner would otherwise report
  // "0 failures" for a file that tested nothing.
  test('the rest of this tier cannot run', () => {
    assert.fail('no pack, so nothing below was tested. This is a failure, not a skip.');
  });
} else {
  const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const INSTANTS = [-18262.0, -5000.25, 0.5, 1234.75, 8765.5, 12345.875];

  test('the real pack opens, verifies, and reports its integrity honestly', async () => {
    const rt = await openPackFile(PACK);
    assert.equal(rt.integrity.selfConsistent, true);
    assert.equal(rt.integrity.matchesExpected, null);
    assert.match(rt.integrity.authenticity, /not established/);
    assert.ok(rt.coverage.stopEtSecTdb > rt.coverage.startEtSecTdb);
    rt.dispose();
  });

  test('an out-of-band digest that matches opens, and one that does not is refused', async () => {
    const rt = await openPackFile(PACK);
    const digest = rt.integrity.computedDigest;
    rt.dispose();
    const ok = await openPackFile(PACK, { expectDigest: digest });
    assert.equal(ok.integrity.matchesExpected, true);
    ok.dispose();
    await assert.rejects(openPackFile(PACK, { expectDigest: '0'.repeat(64) }), (e) => e.code === 'mutated');
  });

  test('the resident and file-backed loaders agree on the real pack, bit for bit', async () => {
    const a = await openPackFile(PACK);
    const b = await openPackFileStream(PACK);
    assert.equal(a.integrity.computedDigest, b.integrity.computedDigest);
    for (const tt of INSTANTS) {
      for (const body of BODIES) {
        const x = a.apparent(body, tt, CORRECTED);
        const y = b.apparent(body, tt, CORRECTED);
        for (const k of ['lon', 'lat', 'distKm', 'lightTimeSec']) assert.equal(x[k], y[k], `${body} ${k} at ${tt}`);
      }
    }
    a.dispose();
    b.dispose();
  });

  test('the answers are astronomically sane, not merely self-consistent', async () => {
    const rt = await openPackFile(PACK);
    // 8844.630248 TT days past J2000 is 2024-03-20T03:07:33Z, the March 2024
    // equinox to within a minute. (J2000 is at NOON, which is where an
    // earlier version of this constant went half a day wrong.)
    const EQUINOX_TT_DAYS = 8844.630248;
    const sun = rt.apparent('Sun', EQUINOX_TT_DAYS, CORRECTED);
    assert.ok(Math.abs(sun.lon) < 0.001 || Math.abs(sun.lon - 360) < 0.001, `Sun at the equinox should be near 0 degrees, got ${sun.lon}`);
    assert.ok(Math.abs(sun.lat) < 0.01);
    assert.ok(sun.distKm > 1.4e8 && sun.distKm < 1.6e8, `Sun distance ${sun.distKm}`);
    const moon = rt.apparent('Moon', EQUINOX_TT_DAYS, CORRECTED);
    assert.ok(moon.distKm > 3.5e5 && moon.distKm < 4.1e5, `Moon distance ${moon.distKm}`);
    assert.ok(Math.abs(moon.lat) < 6, `Moon latitude ${moon.lat}`);
    for (const body of BODIES) {
      const r = rt.apparent(body, 8765.5, CORRECTED);
      assert.ok(Number.isFinite(r.lon) && r.lon >= 0 && r.lon < 360, `${body} longitude ${r.lon}`);
      assert.ok(r.lightTimeConverged, `${body} light time did not converge`);
    }
    rt.dispose();
  });

  test('the search finds the March 2024 equinox and all thirteen 2024 new moons', async () => {
    const rt = await openPackFile(PACK);
    const eq = rt.search({ kind: 'longitude', body: 'Sun', targetDeg: 0, fromTtDays: 8800, toTtDays: 8860, epsilonDeg: 1 / 3600, options: CORRECTED });
    assert.equal(eq.accounting.allIntervalsAccountedFor, true);
    assert.equal(eq.eventCount.conditionalTotal, 1);
    // 2024-03-20T03:06 UTC, to within the bracket.
    const jdUtc = eq.events[0].ttDays - 69.184 / 86400;
    const iso = new Date((jdUtc + 10957.5) * 86400000).toISOString();
    assert.match(iso, /^2024-03-20T03:0/, `equinox came out at ${iso}`);

    const moons = rt.search({ kind: 'aspect', body: 'Moon', other: 'Sun', targetDeg: 0, fromTtDays: 8766, toTtDays: 9131, epsilonDeg: 1 / 3600, options: CORRECTED, maxEvaluations: 200000 });
    assert.equal(moons.accounting.allIntervalsAccountedFor, true);
    assert.equal(moons.eventCount.conditionalTotal, 13, '2024 had thirteen new moons');
    assert.ok(moons.diagnostics.branches.antipodeGaps.length >= 12);
    assert.ok(moons.diagnostics.branches.antipodeGaps.every((g) => g.excluded));
    assert.equal(moons.accounting.unresolved.length, 0);
    rt.dispose();
  });

  test('the prototype and corrected reductions differ by the amount the measurement says', async () => {
    const rt = await openPackFile(PACK);
    let worst = 0;
    for (const tt of INSTANTS) {
      for (const body of BODIES) {
        const a = rt.apparent(body, tt, PROTOTYPE).lon;
        const b = rt.apparent(body, tt, CORRECTED).lon;
        let d = a - b;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        worst = Math.max(worst, Math.abs(d) * 3600);
      }
    }
    // The four-configuration measurement puts reduction-alone at 0.134 arcsec
    // on the pinned corpus and 3.23 arcsec over the whole sweep.
    assert.ok(worst > 0.01, `the two reductions should differ measurably, worst was ${worst} arcsec`);
    assert.ok(worst < 10, `a difference of ${worst} arcsec is far larger than the measurement found`);
    rt.dispose();
  });

  test('the validated geometric mode establishes completeness on the real pack', async () => {
    const rt = await openPackFile(PACK);
    // The Moon crossing 100 degrees through 2019: the case the alpha's
    // recorded harness answered "2" for. Here it is proven, and it is 13.
    const moon = rt.searchGeometric({ body: 'Moon', targetDeg: 100, fromTtDays: 6939, toTtDays: 7304 });
    assert.equal(moon.execution.status, 'finished');
    assert.equal(moon.completeness.established, true);
    assert.equal(moon.completeness.support, 'proven');
    assert.equal(moon.eventCount.isExactTotal, true);
    assert.equal(moon.eventCount.found, 13);
    assert.equal(moon.accounting.unresolved.length, 0);
    assert.deepEqual(moon.assumptions, []);
    // The geocentric Moon collapses to one stored series, because the
    // Earth-Moon barycentre term cancels exactly through EMRAT.
    assert.deepEqual(moon.diagnostics.contributingSeries.map((c) => c.name), ['moon']);
    rt.dispose();
  });

  test('the validated and empirical modes are different quantities, and say so', async () => {
    const rt = await openPackFile(PACK);
    const g = rt.searchGeometric({ body: 'Sun', targetDeg: 0, fromTtDays: 8766, toTtDays: 9131 });
    const a = rt.search({ kind: 'longitude', body: 'Sun', targetDeg: 0, fromTtDays: 8766, toTtDays: 9131, epsilonDeg: 1 / 3600, options: CORRECTED });
    assert.equal(g.eventCount.found, 1);
    assert.equal(a.eventCount.found, 1);
    assert.equal(g.completeness.established, true);
    assert.equal(a.completeness.established, false);
    // J2000 geometric against apparent of date: precession over 24 years is
    // about a third of a degree, and the Sun covers that in about eight
    // hours. If these ever agreed to the second, one of them would be wrong.
    const hours = (g.events[0].ttDays - a.events[0].ttDays) * 24;
    assert.ok(hours > 6 && hours < 10, `expected roughly eight hours between the two quantities, got ${hours}`);
    rt.dispose();
  });

  test('the validated mode proves an empty interval empty', async () => {
    const rt = await openPackFile(PACK);
    // Jupiter takes about twelve years to come round; a two-month window
    // well away from a crossing has none, and that is provable.
    const r = rt.searchGeometric({ body: 'Jupiter', targetDeg: 120, fromTtDays: 8766, toTtDays: 8826 });
    assert.equal(r.completeness.established, true);
    assert.equal(r.eventCount.found, 0);
    assert.equal(r.eventCount.isExactTotal, true);
    rt.dispose();
  });

  if (KERNEL && existsSync(KERNEL)) {
    test('the pack agrees with the uncompressed kernel to the compression budget', async () => {
      const { SpkBackend } = await import('../../tools/spk-backend.mjs');
      const rt = await openPackFile(PACK);
      const kernel = new Reducer(new SpkBackend(KERNEL));
      let worst = 0;
      for (const tt of INSTANTS) {
        for (const body of BODIES) {
          const a = rt.apparent(body, tt, CORRECTED).lon;
          const b = kernel.apparent(body, tt, CORRECTED).lon;
          let d = a - b;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          worst = Math.max(worst, Math.abs(d) * 3600);
        }
      }
      // 0.05 arcsec is the declared incremental-compression target; the
      // measurement over the whole coverage reached 0.0049.
      assert.ok(worst < 0.05, `compression cost ${worst} arcsec, past the declared 0.05`);
      rt.dispose();
    });
  } else {
    test('the kernel comparison was not run, and says so', () => {
      assert.fail(`PRECISION_KERNEL is ${KERNEL ? 'set to a path that does not exist' : 'not set'}, so the pack was never compared against the uncompressed kernel. That comparison is part of this tier; this is a failure, not a skip.`);
    });
  }
}
