/**
 * A pack built here, in the page, from polynomials written down here.
 *
 * The preview has to work for someone who has no kernel and no pack, and
 * the honest way to do that is to compute something real from data that is
 * openly fake. Every result derived from this carries `synthetic: true`,
 * and the interface says "not the sky" next to all of it.
 *
 * The geometry: the Earth sits at the barycentre, the Sun sits at a fixed
 * offset from it, and two bodies run circles at constant rates in tilted
 * planes -- a slow one at a Mars-like distance and a fast one at a
 * Moon-like distance. Those are not planets. They are
 * moving points whose crossings are arithmetic, which is exactly what is
 * wanted for demonstrating a search.
 */
const DAY = 86400;
const NCOEF = 14;
const NREC = 400;
const INTERVAL = 2 * DAY;
const INIT = -200 * DAY;
const EMRAT = 81.30056822149722;

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

/** A circle of `radius` km, period `days`, in a plane tilted by `tilt`. */
function circle(days, radius, tilt, phase = 0) {
  const w = (2 * Math.PI) / (days * DAY);
  return [
    (et) => radius * Math.cos(w * et + phase),
    (et) => radius * Math.sin(w * et + phase) * Math.cos(tilt),
    (et) => radius * Math.sin(w * et + phase) * Math.sin(tilt),
  ];
}

const ORBIT = circle(240, 3.2e8, 0.21);
/**
 * The geocentric Moon, which must not be at the observer.
 *
 * The first version of this fixture left the Moon's record at zero. With
 * the Earth also at the barycentre that put the Moon exactly on the
 * observer, its direction was undefined, and the whole places table was
 * refused -- every body, because one of them was degenerate. A fixture may
 * be fake; it may not be degenerate.
 *
 * The pack stores the vector v with Moon_ssb = emb + v and
 * Earth_ssb = emb - v/EMRAT, so the geocentric Moon is (1 + 1/EMRAT) v and
 * the record carries the geocentric circle divided by that factor.
 */
const MOON_SCALE = 1 / (1 + 1 / EMRAT);
const MOON = circle(27.32, 384400 * MOON_SCALE, 0.09, 1.1);

const zeros = () => new Array(NCOEF).fill(0);
const fixed = (v) => { const c = zeros(); c[0] = v; return c; };

function bodyCoefficients(name, record) {
  const lo = INIT + record * INTERVAL;
  const hi = lo + INTERVAL;
  const fitted = (o) => [...fit(o[0], lo, hi, NCOEF), ...fit(o[1], lo, hi, NCOEF), ...fit(o[2], lo, hi, NCOEF)];
  if (name === 'marsBary') return fitted(ORBIT);
  if (name === 'moon') return fitted(MOON);
  if (name === 'venusBary') return [...fixed(1.1e8), ...fixed(0.4e8), ...zeros()];
  // The Sun must not sit on the observer. It did in the first version of
  // this fixture -- Sun at the barycentre, Earth at the barycentre -- and
  // the solar-deflection term then divided by a zero distance and produced
  // a non-finite place. A fixture may be fake; it may not be degenerate.
  if (name === 'sun') return [...fixed(-1.4e8), ...fixed(0.5e8), ...fixed(0.1e8)];
  return [...zeros(), ...zeros(), ...zeros()];
}

const BODIES = [
  { name: 'sun', frame: 'native' },
  { name: 'emb', frame: 'ssb' },
  { name: 'moon', frame: 'ssb' },
  { name: 'marsBary', frame: 'ssb' },
  { name: 'venusBary', frame: 'ssb' },
];

/** Build and seal a ZODEPH02 pack with WebCrypto. No Node, no Buffer. */
export async function buildSyntheticPack() {
  const enc = new TextEncoder();
  const fields = 3 * NCOEF;
  const stride = fields * 8;
  const blobs = BODIES.map((b) => {
    const bytes = new Uint8Array(stride * NREC);
    const dv = new DataView(bytes.buffer);
    for (let r = 0; r < NREC; r += 1) {
      const c = bodyCoefficients(b.name, r);
      for (let f = 0; f < fields; f += 1) dv.setFloat64(r * stride + f * 8, c[f], true);
    }
    return bytes;
  });

  let headerLen = 0;
  let header = null;
  for (let pass = 0; pass < 8; pass += 1) {
    const payloadOffset = 16 + headerLen;
    let cursor = payloadOffset;
    const placed = BODIES.map((b, i) => {
      const at = cursor;
      cursor += blobs[i].byteLength;
      return {
        name: b.name, frame: b.frame, initEt: INIT, intervalSec: INTERVAL,
        nrec: NREC, ncoef: NCOEF, offset: at,
        layout: { enc: 'f64', stride, midsOffset: 0, recordsOffset: 0 },
      };
    });
    header = {
      format: 'zodiacs-ephemeris-pack',
      formatVersion: 1,
      synthetic: true,
      syntheticWhat: 'built in the browser from polynomials in src/precision-preview/synthetic.mjs. Two bodies on circles -- one slow and far, one fast and near -- with the Earth at the barycentre. NOT a planetary ephemeris and not derived from any kernel.',
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
  const total = payloadOffset + blobs.reduce((n, b) => n + b.byteLength, 0) + 32;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  out.set(enc.encode('ZODEPH02'), 0);
  dv.setUint32(8, json.byteLength, true);
  dv.setUint32(12, payloadOffset, true);
  out.set(json, 16);
  let at = payloadOffset;
  for (const b of blobs) { out.set(b, at); at += b.byteLength; }
  const digest = await crypto.subtle.digest('SHA-256', out.subarray(0, total - 32).slice().buffer);
  out.set(new Uint8Array(digest), total - 32);
  return out;
}

export const SYNTHETIC_NOTE = 'Synthetic fixture: two bodies on circles -- 240 days at 3.2e8 km, and 27.32 days at 384400 km -- with the Earth pinned at the barycentre. The arithmetic is real and the sky is not.';
