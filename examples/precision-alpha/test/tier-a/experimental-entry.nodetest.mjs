/**
 * The experimental consumer surface: what an installed archive resolves.
 *
 * `tools/consumer/clean-consumer.mjs` packs, installs and runs the real
 * thing; it is the authority and it is slow. This is the fast guard that
 * fails on the same defect: every test in this suite imports by relative
 * path from inside the repository, which resolves nothing the way a
 * consumer does, so a subpath that ships in `files` but is missing from
 * `exports` looks perfectly fine here. That is exactly what happened --
 * the fixture the experimental mode needs in order to run at all without a
 * coefficient pack was unimportable from the installed archive.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { experimental, EXPERIMENTAL, ABERRATED_CONTRACT, RETARDED_CONTRACT } from '../../src/experimental.mjs';
import { openPackFromBytes } from '../../src/index.mjs';
import { buildSyntheticPack, SYNTHETIC } from '../../examples/synthetic-pack.mjs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('every import the experimental path needs has an exports entry', () => {
  for (const subpath of ['.', './experimental', './examples/synthetic-pack.mjs']) {
    assert.ok(subpath in pkg.exports, `${subpath} is not in the exports map, so a consumer cannot import it`);
  }
  assert.equal(pkg.exports['./experimental'].types, './types/experimental.d.ts');
});

test('and the files it points at are shipped', () => {
  const shipped = (p) => pkg.files.some((f) => (f.endsWith('/') ? p.startsWith(f) : p === f));
  for (const p of ['src/experimental.mjs', 'types/experimental.d.ts', 'examples/synthetic-pack.mjs']) {
    assert.ok(shipped(p), `${p} is not covered by the files list, so it is not in the archive`);
  }
});

test('the handle refuses after its own dispose, and after the runtime\'s', async () => {
  const bytes = await buildSyntheticPack();
  const spec = {
    body: 'Mars', targetDeg: SYNTHETIC.targetDeg,
    fromTdbSec: SYNTHETIC.windowTdbSec[0], toTdbSec: SYNTHETIC.windowTdbSec[1],
  };

  const rt1 = await openPackFromBytes(bytes);
  const x1 = experimental(rt1);
  assert.equal(x1.disposed, false);
  x1.dispose();
  assert.equal(x1.disposed, true);
  assert.throws(() => x1.searchRetardedAberrated(spec), (e) => e.code === 'disposed');
  x1.dispose();                                     // idempotent
  assert.equal(rt1.disposed, false, 'detaching the handle must not dispose the caller\'s runtime');
  rt1.dispose();

  // The ordinary case: the caller still holds the runtime and disposes
  // that. The handle has to notice, rather than reading nulled buffers.
  const rt2 = await openPackFromBytes(bytes);
  const x2 = experimental(rt2);
  assert.equal(x2.searchRetardedAberrated(spec).completeness.established, true);
  rt2.dispose();
  assert.equal(x2.disposed, true);
  assert.throws(() => x2.searchRetardedAberrated(spec), (e) => e.code === 'disposed');
  assert.throws(() => x2.searchRetarded(spec), (e) => e.code === 'disposed');
});

test('experimental() refuses anything that is not an open runtime', () => {
  for (const bad of [null, undefined, {}, 42, 'runtime']) {
    assert.throws(() => experimental(bad), (e) => e.code === 'unsupported-option', `accepted ${String(bad)}`);
  }
});

test('the surface says it is experimental, and names every mode', () => {
  assert.deepEqual([...EXPERIMENTAL.modes], [
    'validated-retarded-geometric',
    'validated-retarded-aberrated',
    'validated-retarded-aberrated-of-date',
    'validated-retarded-aberrated-deflected-of-date',
  ]);
  assert.match(EXPERIMENTAL.stability, /experimental/);
  assert.match(EXPERIMENTAL.timeScale, /TDB seconds/);
  assert.equal(EXPERIMENTAL.resultContract, 'zodiacs-precision-search/2');
});

/**
 * The list above is a hand-written literal, and the of-date rung shipped
 * with it already one mode behind -- the declaration is easy to forget
 * and nothing failed when it was. This is the guard that would have: run
 * every search method the handle exposes and require the set of modes
 * they RETURN to be exactly the set the surface DECLARES.
 */
test('the declared modes are exactly the modes the handle actually returns', async () => {
  const rt = await openPackFromBytes(await buildSyntheticPack());
  const x = experimental(rt);
  // A window with no solar conjunction in it, so the deflected rung
  // answers rather than declining -- this test is about the mode name.
  const spec = {
    body: 'Mars', targetDeg: SYNTHETIC.targetDeg,
    fromTdbSec: SYNTHETIC.windowTdbSec[0], toTdbSec: SYNTHETIC.windowTdbSec[1],
  };
  const methods = Object.keys(x).filter((k) => k.startsWith('search') && typeof x[k] === 'function');
  assert.equal(methods.length, EXPERIMENTAL.modes.length,
    `the handle exposes ${methods.length} search methods and the surface declares ${EXPERIMENTAL.modes.length} modes`);
  const returned = methods.map((m) => x[m](spec).mode).sort();
  assert.deepEqual(returned, [...EXPERIMENTAL.modes].sort(),
    'a mode the handle returns is missing from EXPERIMENTAL.modes, or the other way round');
  x.dispose();
  rt.dispose();
});

/**
 * The deflected rung is the first that can decline part of a request, and
 * a consumer that does not know that reads a lower bound as a total. The
 * declaration is therefore part of the surface, not only of the prose.
 */
test('the surface declares which modes can decline, and names the right one', () => {
  const rd = EXPERIMENTAL.restrictedDomain;
  assert.deepEqual([...rd.modes], ['validated-retarded-aberrated-deflected-of-date']);
  for (const mode of rd.modes) {
    assert.ok(EXPERIMENTAL.modes.includes(mode), `${mode} can decline but is not a declared mode`);
  }
  assert.match(rd.floor, /5 degrees/);
  // The three fields a caller must read when one does decline.
  for (const re of [/accounting\.excluded/, /completeness\.established/, /interval\.decidedTdbSec/]) {
    assert.match(rd.behaviour, re);
  }
});

test('the deflection floor is reachable from the handle, before asking', async () => {
  const rt = await openPackFromBytes(await buildSyntheticPack());
  const x = experimental(rt);
  assert.equal(x.deflectionMinElongationRad, (5 * Math.PI) / 180);
  assert.ok(x.contracts.deflected, 'the deflected contract is not reachable through the handle');
  assert.match(String(x.contracts.deflected.supportedDomain), /5 degrees/);
  x.dispose();
  rt.dispose();
});

test('the aberrated contract names what it adds and keeps naming what it omits', () => {
  assert.equal(ABERRATED_CONTRACT.applied.length, 2);
  assert.match(ABERRATED_CONTRACT.applied[1], /stellar \(annual\) aberration/);
  // Everything the light-time mode omits, minus the one now applied, plus
  // the two the aberration itself introduces.
  for (const re of [/deflection/, /Klioner|potential/, /Shapiro/, /precession and nutation/, /frame bias/, /topocentric/]) {
    assert.ok(ABERRATED_CONTRACT.notApplied.some((s) => re.test(s)), `nothing in notApplied matches ${re}`);
  }
  assert.ok(!ABERRATED_CONTRACT.notApplied.some((s) => /^stellar \(annual\) aberration: the observer/.test(s)),
    'the aberrated contract must not still list aberration as omitted');
  assert.ok(RETARDED_CONTRACT.notApplied.some((s) => /^stellar \(annual\) aberration/.test(s)),
    'the light-time contract must still list aberration as omitted');
  assert.equal(ABERRATED_CONTRACT.frame, RETARDED_CONTRACT.frame, 'the aberration must not move the frame');
});

test('the synthetic fixture is the geometry it says it is', async () => {
  // A fixture nobody checks is a fixture that drifts. These are the
  // constants the example prints and the browser evidence quotes.
  assert.ok(Math.abs(SYNTHETIC.observerSpeedKmS - 29.7853) < 1e-3,
    `the fixture observer runs at ${SYNTHETIC.observerSpeedKmS} km/s`);
  const [from, to] = SYNTHETIC.windowTdbSec;
  const [covLo, covHi] = SYNTHETIC.coverageTdbSec;
  assert.ok(from > covLo && to < covHi, 'the example window must sit inside coverage');
  const rt = await openPackFromBytes(await buildSyntheticPack());
  assert.equal(rt.integrity.selfConsistent, true);
  assert.equal(rt.header.synthetic, true, 'the fixture must declare itself synthetic in its own header');
  const r = experimental(rt).searchRetardedAberrated({ body: 'Mars', targetDeg: SYNTHETIC.targetDeg, fromTdbSec: from, toTdbSec: to });
  assert.equal(r.eventCount.found, 1, 'the declared targetDeg must be crossed exactly once in the declared window');
  rt.dispose();
});

// ============================== the of-date mode on the consumer path
test('the of-date mode is reachable through the handle and says what frame it is in', async () => {
  const rt = await openPackFromBytes(await buildSyntheticPack());
  const x = experimental(rt);
  try {
    assert.equal(x.contracts.ofDate.frame, 'ecliptic-of-date-true-equinox-of-date');
    assert.notEqual(x.contracts.ofDate.frame, x.contracts.aberrated.frame,
      'the of-date mode must not claim the fixed frame the other two use');

    const spec = {
      body: 'Mars',
      targetDeg: 90,
      fromTdbSec: SYNTHETIC.windowTdbSec[0],
      toTdbSec: SYNTHETIC.windowTdbSec[1],
    };
    const r = x.searchRetardedAberratedOfDate(spec);
    assert.equal(r.mode, 'validated-retarded-aberrated-of-date');
    assert.equal(r.request.frame, 'ecliptic-of-date-true-equinox-of-date');
    // Every mode keeps naming what it omits, and this one is still not an
    // apparent place.
    for (const re of [/deflection/, /Shapiro/, /topocentric/]) {
      assert.ok(r.diagnostics.notApplied.some((s) => re.test(s)), `nothing in notApplied matches ${re}`);
    }
    assert.ok(!r.diagnostics.notApplied.some((s) => /^precession and nutation/.test(s)),
      'the of-date mode must not still list precession and nutation as omitted');
    // The time-scale breakdown only exists on this mode.
    assert.ok(r.uncertainty.timeScale);
    assert.equal(x.searchRetardedAberrated(spec).uncertainty.timeScale, undefined);
  } finally {
    x.dispose();
    rt.dispose();
  }
});

test('the of-date mode is disposed with the handle and with the runtime', async () => {
  const rt = await openPackFromBytes(await buildSyntheticPack());
  const spec = {
    body: 'Mars', targetDeg: 90,
    fromTdbSec: SYNTHETIC.windowTdbSec[0], toTdbSec: SYNTHETIC.windowTdbSec[1],
  };
  const a = experimental(rt);
  a.dispose();
  assert.throws(() => a.searchRetardedAberratedOfDate(spec), (e) => e.code === 'disposed');

  const b = experimental(rt);
  rt.dispose();
  assert.throws(() => b.searchRetardedAberratedOfDate(spec), (e) => e.code === 'disposed');
});
