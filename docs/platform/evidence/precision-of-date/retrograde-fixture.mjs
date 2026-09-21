/**
 * THE RETROGRADE FIXTURE, for checking a DECREASING label on the deployed
 * preview.
 *
 * ## Why it exists at all
 *
 * The deployed preview's own fixture has no retrograde geometry. Measured
 * against the deployed worker over the whole usable window, all four of
 * its bodies are strictly prograde -- every body orbits the observer
 * directly, so the smallest step in ecliptic longitude is positive at
 * every one of 241 samples and no change of period could alter that. A
 * decreasing crossing therefore cannot be established on it, and an
 * inverted direction label would be wrong in one direction only and look
 * right in the other.
 *
 * ## What this is, exactly
 *
 * `examples/precision-alpha/examples/synthetic-pack.mjs`, copied, with ONE
 * change: the Moon, which that file leaves at a zero vector because
 * nothing in the package needs it, is given a real path. A Moon at the
 * origin sits exactly on the observer, its direction is undefined, and the
 * preview refuses its whole places table -- every body, because one of
 * them is degenerate. The preview's own fixture carries a comment about
 * having hit the same thing.
 *
 * The Moon path and its EMRAT scaling are taken from
 * `src/precision-preview/synthetic.mjs`, which is where that fix was
 * already worked out. Nothing else differs: the observer, the Mars-like
 * target, the Sun and the fast companion are the package's own constants,
 * and it is the package's geometry -- an Earth-like observer and a slower
 * outer body sharing a heliocentric longitude at t = 0 -- that produces
 * the retrograde loop.
 *
 * It is synthetic. Nothing here is derived from any kernel and nothing is
 * redistributed.
 *
 * ---
 *
 * A pack built here, from polynomials written down here, so the examples
 * run for someone who has no kernel and no coefficient pack.
 *
 * ## Why a fixture rather than real data
 *
 * Distribution of real ephemeris coefficients is a licensing question this
 * package has not settled, and an example that cannot be run is not an
 * example. The arithmetic below is real; the sky it describes is openly
 * fake, and every result derived from it should be read that way.
 *
 * ## The geometry, and why this one
 *
 * An Earth-like observer -- 1.496e8 km, 365.25 days, so 29.785 km/s, which
 * is |v|/c = 9.94e-5 and an aberration of about twenty arcseconds -- and a
 * Mars-like target at 2.2794e8 km and 686.98 days, phased so the two share
 * a heliocentric longitude at t = 0. The geocentric longitude therefore
 * turns retrograde, which is the interesting case: near the turn the
 * crossings come in close pairs and the operation has to say how wide its
 * own bracket is.
 *
 * These are the same constants `test/tier-a/_geometry.mjs` uses, so the
 * numbers an example prints are numbers the suite asserts against an
 * independent reference rather than numbers nobody has checked.
 *
 * Browser-safe: WebCrypto for the seal, no `node:` import, no Buffer.
 */
const DAY = 86400;
const NCOEF = 20;
const INTERVAL = DAY;
const INIT = -41 * DAY;
const NREC = 82;
const EMRAT = 81.30056822149722;
const EPS0 = ((84381.406 / 3600) * Math.PI) / 180;
const CE = Math.cos(EPS0);
const SE = Math.sin(EPS0);

/** Chebyshev fit of g on [lo, hi] by discrete cosine transform. */
function fit(g, lo, hi, n) {
  const m = 4 * n;
  const xs = [];
  const ys = [];
  for (let j = 0; j < m; j += 1) {
    const tau = Math.cos((Math.PI * (j + 0.5)) / m);
    xs.push(tau);
    ys.push(g(lo + ((tau + 1) / 2) * (hi - lo)));
  }
  const c = new Array(n).fill(0);
  for (let k = 0; k < n; k += 1) {
    let s = 0;
    for (let j = 0; j < m; j += 1) s += ys[j] * Math.cos(k * Math.acos(xs[j]));
    c[k] = ((k === 0 ? 1 : 2) / m) * s;
  }
  return c;
}

/** A circle of `radiusKm` in the ECLIPTIC plane, expressed equatorially. */
function circle(radiusKm, periodSec, phase) {
  const w = (2 * Math.PI) / periodSec;
  return [
    (t) => radiusKm * Math.cos(w * t + phase),
    (t) => radiusKm * Math.sin(w * t + phase) * CE,
    (t) => radiusKm * Math.sin(w * t + phase) * SE,
  ];
}

const OBSERVER = circle(1.495978707e8, 365.25 * DAY, Math.PI / 2);
const TARGET = circle(2.2794e8, 686.98 * DAY, Math.PI / 2);
/** Off the observer, so nothing that needs a Sun distance divides by zero. */
const SUN = circle(1.0e8, 500 * DAY, 0);

/**
 * The geocentric Moon, which must not be at the observer.
 *
 * The pack stores the vector v with Moon_ssb = emb + v and
 * Earth_ssb = emb - v/EMRAT, so the geocentric Moon is (1 + 1/EMRAT) v and
 * the record carries the geocentric circle divided by that factor. Lifted
 * from `src/precision-preview/synthetic.mjs`, including the reasoning.
 */
const MOON_SCALE = 1 / (1 + 1 / EMRAT);
const MOON_OFFSET = circle(384400 * MOON_SCALE, 27.32 * DAY, 1.1);
const MOON = [0, 1, 2].map((i) => (t) => OBSERVER[i](t) + MOON_OFFSET[i](t));

/**
 * A close companion riding with the observer, lapping every 0.7 days.
 *
 * `Venus` in the contract's naming; a moving point in fact. It exists so
 * there is a case long enough to INTERRUPT: the geocentric direction turns
 * a hundred and eight times inside the example window, which costs about
 * 149,000 evaluations and two and a bit seconds, against twenty
 * milliseconds for the Mars-like target. Cancelling a twenty-millisecond
 * search demonstrates nothing.
 *
 * Aberration is undiminished on it — the transformation depends on the
 * OBSERVER's velocity alone, so a companion 400,000 km away is aberrated
 * by the same twenty-odd arcseconds as a body at 2 au, while its
 * light-time is a second and a third rather than eleven minutes.
 *
 * 0.7 days is the fastest this pack's twenty Chebyshev coefficients per
 * one-day record can carry honestly: measured, the stored path stays
 * 3.7e-6 km from the intended one. Faster and the fixture would be
 * testing its own fit.
 */
const COMPANION_OFFSET = circle(4.0e5, 0.7 * DAY, 0);
const COMPANION = [0, 1, 2].map((i) => (t) => OBSERVER[i](t) + COMPANION_OFFSET[i](t));

export const SYNTHETIC = Object.freeze({
  variantOf: 'examples/precision-alpha/examples/synthetic-pack.mjs, with the Moon given a real path so the preview\'s places table is not degenerate',
  note: 'Synthetic fixture: an Earth-like observer (1.495978707e8 km, 365.25 d, 29.785 km/s) and a Mars-like target (2.2794e8 km, 686.98 d), phased to share a heliocentric longitude at t = 0. The arithmetic is real and the sky is not.',
  observerSpeedKmS: (1.495978707e8 * 2 * Math.PI) / (365.25 * DAY),
  coverageTdbSec: Object.freeze([INIT, INIT + NREC * INTERVAL]),
  /** A window well inside coverage, with room for the light-time reach-back. */
  windowTdbSec: Object.freeze([-38 * DAY, 38 * DAY]),
  /** A longitude the Mars-like target crosses exactly once inside that window. */
  targetDeg: 95,
  /**
   * The long case, for demonstrating cancellation: `Venus` is the fast
   * companion, and this longitude is crossed 108 times inside the window.
   */
  longCase: Object.freeze({ body: 'Venus', targetDeg: 137 }),
});

const zeros = () => new Array(NCOEF).fill(0);

const BODIES = [
  { name: 'sun', frame: 'native', path: SUN },
  { name: 'emb', frame: 'ssb', path: OBSERVER },
  { name: 'moon', frame: 'ssb', path: MOON },
  { name: 'marsBary', frame: 'ssb', path: TARGET },
  { name: 'venusBary', frame: 'ssb', path: COMPANION },
];

/** Build and seal a ZODEPH02 pack. Returns the bytes. */
export async function buildSyntheticPack() {
  const enc = new TextEncoder();
  const fields = 3 * NCOEF;
  const stride = fields * 8;
  const blobs = BODIES.map((b) => {
    const bytes = new Uint8Array(stride * NREC);
    const dv = new DataView(bytes.buffer);
    for (let r = 0; r < NREC; r += 1) {
      const lo = INIT + r * INTERVAL;
      const hi = lo + INTERVAL;
      const c = b.path === null
        ? [...zeros(), ...zeros(), ...zeros()]
        : [0, 1, 2].flatMap((comp) => fit(b.path[comp], lo, hi, NCOEF));
      for (let f = 0; f < fields; f += 1) dv.setFloat64(r * stride + f * 8, c[f], true);
    }
    return bytes;
  });

  // The header must be written before the offsets are known, and the
  // offsets depend on its length. Size it with placeholders, then rewrite.
  let headerLen = 0;
  let header = null;
  for (let pass = 0; pass < 8; pass += 1) {
    const payloadOffset = 16 + headerLen;
    let cursor = payloadOffset;
    const placed = BODIES.map((b, i) => {
      const at = cursor;
      cursor += blobs[i].byteLength;
      return {
        name: b.name,
        frame: b.frame,
        initEt: INIT,
        intervalSec: INTERVAL,
        nrec: NREC,
        ncoef: NCOEF,
        offset: at,
        layout: { enc: 'f64', stride, midsOffset: 0, recordsOffset: 0 },
      };
    });
    header = {
      format: 'zodiacs-ephemeris-pack',
      formatVersion: 1,
      synthetic: true,
      coverage: { startEtSecTdb: INIT, stopEtSecTdb: INIT + NREC * INTERVAL },
      conventions: { chebyshev: 'p(tau) = sum_k c_k T_k(tau), tau = (t - mid)/radius, c_0 NOT halved' },
      derived: { earth399: { emrat: EMRAT, from: 'moon' } },
      bodies: placed,
      payloadEndOffset: cursor,
    };
    const json = enc.encode(JSON.stringify(header));
    if (json.byteLength === headerLen) break;
    headerLen = json.byteLength;
  }

  const json = enc.encode(JSON.stringify(header));
  const payloadOffset = 16 + json.byteLength;
  const payloadBytes = blobs.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(payloadOffset + payloadBytes + 32);
  const dv = new DataView(out.buffer);
  out.set(enc.encode('ZODEPH02'), 0);
  dv.setUint32(8, json.byteLength, true);
  dv.setUint32(12, payloadOffset, true);
  out.set(json, 16);
  let at = payloadOffset;
  for (const b of blobs) { out.set(b, at); at += b.byteLength; }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', out.subarray(0, out.byteLength - 32));
  out.set(new Uint8Array(digest), out.byteLength - 32);
  return out;
}
