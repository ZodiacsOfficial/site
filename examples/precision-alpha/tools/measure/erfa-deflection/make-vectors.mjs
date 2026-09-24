/**
 * Generate the eraLd comparison fixture, from the PINNED C compiled and run.
 *
 *   cd tools/measure/erfa-deflection
 *   gcc -O2 -o driver driver.c -lm
 *   node make-vectors.mjs > ../../../test/tier-a/_erfa-ld-vectors.json
 *
 * `ld_body.h` is the `eraLd` declaration and body extracted VERBATIM from
 * the pinned `ld.c`; `driver.c` supplies only the two helpers it calls
 * (`eraPdp`, `eraPxp`) and `ERFA_SRS`/`ERFA_GMAX`. Nothing is
 * re-implemented, so the fixture is ERFA's own arithmetic rather than a
 * transliteration of it.
 *
 * The fixture is committed because CI has no compiler step and should not
 * grow one for this. Re-running the two commands above must reproduce it
 * byte for byte; `_erfa-ld-vectors.json` carries the digests of both C
 * sources so a drifting reference is visible.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const HERE = new URL('.', import.meta.url).pathname;
const AU_KM = 1.495978707e8;
const DEG = Math.PI / 180;

const run = (bm, p, q, e, em, dlim) => execFileSync(`${HERE}driver`, [
  bm, ...p, ...q, ...e, em, dlim,
].map(String), { encoding: 'utf8' }).trim().split(/\s+/).map(Number);

/**
 * `Math.sqrt` of the sum of squares, NOT `Math.hypot`.
 *
 * The core bans `hypot` outright (see the note in `src/core/frames.mjs`):
 * ECMAScript requires nothing of its accuracy and engines genuinely differ
 * in the last bits. The fixture has to hand the C reference exactly the
 * unit vectors the module itself would compute, or the comparison stops
 * being a test of the TRANSFORMATION and becomes a test of two normalisers.
 * With `hypot` here, 14 of 792 components came back up to 4 ulp apart; with
 * this, all 792 are bit-identical.
 */
const norm = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const unit = (a) => { const n = norm(a); return [a[0] / n, a[1] / n, a[2] / n]; };

/**
 * A geometry at a chosen observed elongation and heliocentric source
 * distance, built by the law of sines rather than by solving a quadratic:
 * sin(psi) = em sin(phi) / R, and chi = pi - phi - psi on the far branch.
 * `near` takes the obtuse psi instead, which is the branch where the source
 * is between the Sun and the observer's line of sight.
 */
function geometry(elongationDeg, sourceAu, { near = false, tilt = 0, observerAu = 1 } = {}) {
  const em = observerAu * AU_KM;
  const R = sourceAu * AU_KM;
  const phi = elongationDeg * DEG;
  const s = (em * Math.sin(phi)) / R;
  if (!(Math.abs(s) <= 1)) return null;            // elongation unreachable
  const psi = near ? Math.PI - Math.asin(s) : Math.asin(s);
  const chi = Math.PI - phi - psi;
  const eVec = [em, 0, 0];
  let qVec = [R * Math.cos(chi), R * Math.sin(chi), 0];
  if (tilt) {
    const c = Math.cos(tilt); const sn = Math.sin(tilt);
    qVec = [qVec[0], qVec[1] * c, qVec[1] * sn];
  }
  const d = [qVec[0] - eVec[0], qVec[1] - eVec[1], qVec[2] - eVec[2]];
  return { eVec, qVec, d, em: em / AU_KM, elongationDeg, sourceAu, near, tilt, observerAu };
}

const cases = [];
// The supported domain and well outside it, over the contract's distances.
for (const elong of [5, 7, 10, 20, 45, 90, 135, 179]) {
  for (const R of [0.39, 0.72, 1.52, 5.2, 9.5, 19.2, 30, 39.5]) {
    for (const near of [false, true]) {
      for (const tilt of [0, 0.7]) {
        const g = geometry(elong, R, { near, tilt });
        if (g) cases.push(g);
      }
    }
  }
}
// Inside the domain floor, so the fixture also pins what the model says
// where this profile refuses to use it.
for (const elong of [0.3, 1, 2, 4.9]) {
  for (const R of [0.72, 5.2, 30]) {
    for (const near of [false, true]) {
      const g = geometry(elong, R, { near });
      if (g) cases.push(g);
    }
  }
}
// INSIDE THE LIMITER. Everything above sits outside it: at em = 1 au the
// threshold is 291.70 arcsec = 0.08103 degrees, and the smallest elongation
// above is 0.3 degrees. Without these the `max(q.(q+e), dlim)` in eraLd is
// dead code as far as the fixture is concerned -- a mutation that deleted
// the limiter outright passed every test, which is what put these here.
for (const elong of [0.08, 0.05, 0.01, 0.001, 0]) {
  for (const R of [5.2, 30]) {
    for (const near of [false, true]) {
      const g = geometry(elong, R, { near });
      if (g) cases.push(g);
    }
  }
}
// Observer distances other than 1 au, so `dlim = 1e-6 / max(em^2, 1)` is
// exercised on BOTH sides of its max rather than only at the point where
// the two branches meet. 0.39 au takes the constant branch, 5.2 au the
// em^-2 branch, which also moves the limiter threshold by a factor of 5.2.
for (const observerAu of [0.39, 5.2]) {
  for (const elong of [0.01, 0.3, 5, 45, 135]) {
    for (const R of [0.72, 9.5, 39.5]) {
      for (const near of [false, true]) {
        const g = geometry(elong, R, { near, observerAu });
        if (g) cases.push(g);
      }
    }
  }
}

// ON AXIS, written down rather than reached through trig.
//
// The law-of-sines construction above cannot produce a true antipode:
// `Math.sin(Math.PI)` is 1.2246e-16, not 0, so `geometry(0, R)` lands
// 25 microarcsec off the axis and the limiter fires on a denominator of
// 1.5e-32 instead of 0. These are the real thing, and they are the cases
// where `max(q.(q+e), dlim)` stops a division by zero rather than merely
// bounding one: with q = -e exactly, q.(q+e) is 0 and the unlimited form
// is Infinity x 0 = NaN.
for (const [label, sign] of [['antipodal', -1], ['aligned', 1]]) {
  for (const R of [5.2, 30]) {
    cases.push({
      eVec: [AU_KM, 0, 0],
      qVec: [sign * R * AU_KM, 0, 0],
      d: [sign * R * AU_KM - AU_KM, 0, 0],
      em: 1,
      elongationDeg: label === 'antipodal' ? 180 : 0,
      sourceAu: R,
      near: false,
      tilt: 0,
      observerAu: 1,
      axis: label,
    });
  }
}
// BOTH SIDES OF THE LIMITER THRESHOLD, placed from the threshold's own
// definition instead of by scanning elongations until one lands near it.
// With xi the angle from antiparallel, q.(q+e) = 1 - cos(xi) = 2 sin^2(xi/2),
// so the threshold sits at xi = 2 asin(sqrt(dlim/2)) exactly.
for (const observerAu of [1, 5.2]) {
  const dlimHere = 1e-6 / Math.max(observerAu * observerAu, 1);
  const xiLim = 2 * Math.asin(Math.sqrt(dlimHere / 2));
  for (const f of [0.25, 0.5, 0.99, 1, 1.01, 2, 4]) {
    const xi = xiLim * f;
    const R = 30 * AU_KM;
    const em = observerAu * AU_KM;
    const qVec = [-R * Math.cos(xi), R * Math.sin(xi), 0];
    cases.push({
      eVec: [em, 0, 0],
      qVec,
      d: [qVec[0] - em, qVec[1], qVec[2]],
      em: observerAu,
      elongationDeg: null,
      sourceAu: 30,
      near: false,
      tilt: 0,
      observerAu,
      thresholdFactor: f,
    });
  }
}

const vectors = cases.map((g) => {
  const dlim = 1e-6 / Math.max(g.em * g.em, 1);
  // ERFA requires unit q and e; d is passed as-is, which is the linearity
  // the package relies on and which this fixture therefore also exercises.
  const p1 = run(1.0, g.d, unit(g.qVec), unit(g.eVec), g.em, dlim);
  const p1unit = run(1.0, unit(g.d), unit(g.qVec), unit(g.eVec), g.em, dlim);
  return {
    elongationDeg: g.elongationDeg,
    sourceAu: g.sourceAu,
    observerAu: g.observerAu,
    near: g.near,
    tilt: g.tilt,
    axis: g.axis ?? null,
    thresholdFactor: g.thresholdFactor ?? null,
    eVec: g.eVec,
    qVec: g.qVec,
    d: g.d,
    emAu: g.em,
    dlim,
    p1,                                            // eraLd on the raw d
    p1FromUnitD: p1unit,                           // eraLd on unit(d)
  };
});

const digest = (f) => createHash('sha256').update(readFileSync(`${HERE}${f}`)).digest('hex');
process.stdout.write(`${JSON.stringify({
  what: 'eraLd outputs from the pinned liberfa source, compiled and run',
  generator: 'tools/measure/erfa-deflection/make-vectors.mjs',
  erfa: { version: '2.0.1', sofa: '2023-10-11' },
  sources: {
    'ld.c': digest('ld.c'),
    'ldsun.c': digest('ldsun.c'),
    'driver.c': digest('driver.c'),
    'ld_body.h': digest('ld_body.h'),
  },
  constants: { SRS: 1.97412574336e-8, AU_KM, note: 'dlim per case is ERFA eraLdsun\'s 1e-6/max(em^2,1)' },
  count: vectors.length,
  vectors,
}, null, 1)}\n`);
