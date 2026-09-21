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

test('the surface says it is experimental, and names both modes', () => {
  assert.deepEqual([...EXPERIMENTAL.modes], ['validated-retarded-geometric', 'validated-retarded-aberrated']);
  assert.match(EXPERIMENTAL.stability, /experimental/);
  assert.match(EXPERIMENTAL.timeScale, /TDB seconds/);
  assert.equal(EXPERIMENTAL.resultContract, 'zodiacs-precision-search/2');
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
