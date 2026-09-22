/**
 * Tier B. The declared families of `DEFLECTION-EVALUATION.md` section 5
 * that need a real pack and the deflected reference.
 *
 *   PRECISION_PACK=/path/to/pack.zeph npm run test:data
 *
 * A missing pack FAILS rather than skipping, like the rest of this tier.
 *
 * Most of section 5 is covered synthetically in
 * `test/tier-a/deflected-search.nodetest.mjs`. Two parts cannot be: the
 * STATIONARY POINT of T9, which needs a real retrograde loop, and T12,
 * which needs the released reducer on real geometry. The holdout harness
 * runs T12 over every case; this is the version that fails a build.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { openPackFile } from '../../src/node.mjs';
import { Reducer } from '../../src/core/reduce.mjs';
import { aberrate } from '../../src/core/aberration.mjs';
import { searchDeflectedLongitude, searchOfDateLongitude } from '../../src/core/retarded-search.mjs';
import { makeDeflectedReference } from './_deflected-reference.mjs';

const PACK = process.env.PRECISION_PACK;
if (!PACK) throw new Error('PRECISION_PACK is required: point it at a real pack (.zeph)');
if (!existsSync(PACK)) throw new Error(`PRECISION_PACK does not exist: ${PACK}`);

const DAY = 86400;
const AS = (180 * 3600) / Math.PI;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeDeflectedReference(eph);

const angleArcsec = (a, b) => {
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const s = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
  return Math.atan2(s, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * AS;
};

test('T9 (stationary): a longitude extremum, with both roots bracketed or declared', () => {
  // Mars stations twice in a synodic period. The extremum is located by
  // the INDEPENDENT reference, not by the solver, and the target is set a
  // hair inside it so the window holds two roots a few hours apart.
  //
  // What is required is not that the solver separate them. It is that it
  // never reports one of a close pair while claiming an exact total --
  // which is the failure a tangency exists to provoke.
  const from = tdb('1988-06-01T00:00:00Z');
  const to = from + 300 * DAY;
  const body = 'Mars';

  let best = -Infinity;
  let tExt = null;
  let minElongation = Infinity;
  for (let i = 0; i <= 6000; i += 1) {
    const t = from + ((to - from) * i) / 6000;
    const v = ref.lonDeg(body, t);
    if (v === null) continue;
    const el = ref.elongationDeg(body, t);
    if (el !== null) minElongation = Math.min(minElongation, el);
    if (v > best) { best = v; tExt = t; }
  }
  assert.ok(tExt !== null && tExt > from && tExt < to,
    'the extremum must be interior for this to be a tangency, not an endpoint');
  // Refine, still from the reference.
  let lo = tExt - DAY; let hi = tExt + DAY;
  for (let k = 0; k < 60; k += 1) {
    const a = lo + (hi - lo) / 3; const b = hi - (hi - lo) / 3;
    if (ref.lonDeg(body, a) < ref.lonDeg(body, b)) lo = a; else hi = b;
  }
  const peak = ref.lonDeg(body, (lo + hi) / 2);
  const targetDeg = peak - 1e-6;             // a hair inside: two close roots

  const r = searchDeflectedLongitude(eph, { body, targetDeg, fromTdbSec: from, toTdbSec: to });
  assert.equal(r.execution.status, 'finished', `the tangency case must finish; it was ${r.execution.status}`);

  // The reference's own crossings, at its declared step.
  const scan = ref.crossings(body, targetDeg, from, to, 1800);
  assert.ok(scan.roots.length >= 2,
    `a tangency case needs the close pair; the reference found ${scan.roots.length}`);

  const decided = r.interval.decidedTdbSec ?? [];
  const inDecided = (t) => decided.some(([a, b]) => t >= a && t <= b);
  for (const w of scan.roots) {
    if (!inDecided(w)) continue;             // excluded or unresolved: not this case's business
    const held = r.events.some((e) => e.bracketTdbSec[0] <= w && w <= e.bracketTdbSec[1])
      || r.accounting.unresolved.some((u) => u.fromTdbSec <= w && w <= u.toTdbSec);
    assert.ok(held, `reference root ${w} is in no bracket and no unresolved interval`);
  }
  // The invariant a tangency is for: never an exact total with a region open.
  if (r.eventCount.isExactTotal) {
    assert.equal(r.accounting.unresolved.length, 0);
    assert.equal(r.accounting.excluded.length, 0);
  }
  // And the of-date rung agrees about how many crossings there are, or the
  // difference is the domain rather than the tangency.
  const base = searchOfDateLongitude(eph, { body, targetDeg, fromTdbSec: from, toTdbSec: to });
  assert.ok(base.events.length >= r.events.length,
    `the deflected rung reported more crossings (${r.events.length}) than the unrestricted one (${base.events.length})`);
  assert.ok(minElongation < 90, 'the window should be a real Mars apparition, not a contrived one');
});

test('T12: the reference and the released reducer agree, measured like for like', () => {
  // The released `reduce.mjs` implements the same finite-distance model
  // with the same epoch split, written earlier and for production. If the
  // reference agreed with the solver but not with it, the reference would
  // be a private reading of the model.
  //
  // Both sides must be measured AFTER aberration. `apparent()` aberrates,
  // so its on-minus-off separation is post-aberration; the reference's own
  // `deflectionArcsec` is pre-aberration, and comparing those two compares
  // different quantities. The first run of the holdout did exactly that
  // and reported an 8.15e-7 arcsec disagreement that was entirely the
  // mismatch: like for like it is 7.2e-11.
  const reducer = new Reducer({
    state: (b, e, o) => eph.state(b, e, o),
    covers: (e) => eph.covers(e),
  });
  let worst = 0;
  let worstAt = null;
  let samples = 0;
  for (const body of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Neptune', 'Moon']) {
    for (let k = 0; k < 12; k += 1) {
      const t = tdb('1975-01-01T00:00:00Z') + k * 700 * DAY;
      const el = ref.elongationDeg(body, t);
      if (el === null || el < 5) continue;   // outside the supported domain
      const d = ref.direction(body, t);
      if (!d.deflection || d.deflection.p1 === null) continue;
      const plain = ref.undeflectedNatural(body, t);
      const refDeflection = angleArcsec(
        aberrate(plain, d.observerOverC), aberrate(d.deflection.p1, d.observerOverC),
      );
      const on = reducer.apparent(body, t / DAY, { deflection: 'sun', timescale: 'tt' });
      const off = reducer.apparent(body, t / DAY, { deflection: 'none', timescale: 'tt' });
      const d2r = Math.PI / 180;
      const u = (p) => [
        Math.cos(p.lat * d2r) * Math.cos(p.lon * d2r),
        Math.cos(p.lat * d2r) * Math.sin(p.lon * d2r),
        Math.sin(p.lat * d2r),
      ];
      const reducerDeflection = angleArcsec(u(on), u(off));
      const gap = Math.abs(reducerDeflection - refDeflection);
      samples += 1;
      if (gap > worst) { worst = gap; worstAt = { body, t, reducerDeflection, refDeflection }; }
    }
  }
  assert.ok(samples >= 40, `only ${samples} geometries were inside the supported domain`);
  assert.ok(worst < 1e-9,
    `the reference and the released reducer differ by ${worst} arcsec at ${JSON.stringify(worstAt)}`);
});
