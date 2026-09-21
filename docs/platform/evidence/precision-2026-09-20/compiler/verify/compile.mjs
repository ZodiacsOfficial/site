/**
 * The offline, deterministic data-pack compiler.
 *
 *   node compile.mjs --candidate=A|B|C|D [--kernel=PATH] [--out=PATH]
 *
 * No network. No LLM. No clock, hostname, path or process detail enters the
 * output, so the same kernel and the same settings produce a byte-identical
 * pack; `npm run` is not involved and nothing is read from the environment
 * except the two flags above. Determinism is proved, not asserted: compile
 * twice, hash twice (see measure-determinism.mjs).
 *
 * Candidates, declared before measurement (see RESULTS.md for the hypotheses):
 *   A  keep DE440s's own segmentation; truncate the high-order Chebyshev
 *      coefficients and quantise the rest under an explicit error budget.
 *   B  refit adaptive segments -- interval length and degree chosen per body
 *      from validation error -- with float64 coefficients.
 *   C  a compact residual correction over astronomy-engine's own model.
 *   D  B plus the same quantiser A uses. Declared after A/B/C and before it
 *      was measured, on the reasoning that A and B attack different costs
 *      (bits per coefficient vs number of coefficients) and compose.
 *
 * Three structural facts about DE440s are exploited by EVERY candidate, and
 * are reported as a separate line item because they are not compression:
 *   1. segment 399/3 (Earth relative to the Earth-Moon barycentre) equals
 *      -(1/EMRAT) times segment 301/3, to 1 ulp. It is stored as that one
 *      scalar, not as 8.57 MiB of duplicate coefficients.
 *   2. segments 199/1 and 299/2 are identically zero: in DE440s the Mercury
 *      and Venus body centres coincide with their barycentres.
 *   3. the DAF file's own headers, comment area and reserved records are not
 *      data and are not carried.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SpkRef } from './spkref.mjs';
import { chebNodes, chebFit, clenshaw, clenshawD } from './cheb.mjs';
import { BODY_SEGS, BUDGET_KM, SPAN_DAYS, DAY } from './sources.mjs';
import { MAGIC, ALIGN, align, widthForHalf, writeField, WIDTH_ORDER } from './format.mjs';

export const COMPILER_VERSION = '1.0.0';
const SQRT3 = Math.sqrt(3);
const here = (f) => new URL(`./${f}`, import.meta.url);

const argOf = (k, d) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/* ------------------------------------------------------------------ sources */

/** Position of a body in its fitting frame, km. Vectors only; no angles. */
function frameSource(ref, body, frame) {
  const seg = ref.segment(body.target, body.center);
  const a = new Float64Array(6); const b = new Float64Array(6);
  if (frame === 'sun') {
    const sun = ref.segment(10, 0);
    return (et, out) => {
      ref.state(seg, et, a); ref.state(sun, et, b);
      out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2];
    };
  }
  return (et, out) => { ref.state(seg, et, a); out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; };
}

/** Candidate C subtracts astronomy-engine's own model from the DE vector. */
async function residualSource(ref, body, base) {
  const A = await import('astronomy-engine');
  const AU = 149597870.700;
  const EMRAT = ref.emrat;
  const AEB = {
    mercuryBary: A.Body.Mercury, venusBary: A.Body.Venus, emb: A.Body.EMB, marsBary: A.Body.Mars,
    jupiterBary: A.Body.Jupiter, saturnBary: A.Body.Saturn, uranusBary: A.Body.Uranus,
    neptuneBary: A.Body.Neptune, plutoBary: A.Body.Pluto, sun: A.Body.Sun,
  };
  const model = (et, out) => {
    const days = et / DAY;
    const t = A.MakeTime(days); t.tt = days;            // et is TDB/TT seconds past J2000
    if (body.name === 'moon') {
      const g = A.GeoMoonState(t);                       // Moon relative to Earth
      const f = (EMRAT / (1 + EMRAT)) * AU;              // -> Moon relative to EMB
      out[0] = g.x * f; out[1] = g.y * f; out[2] = g.z * f;
      return;
    }
    const s = A.BaryState(AEB[body.name], t);
    out[0] = s.x * AU; out[1] = s.y * AU; out[2] = s.z * AU;
  };
  const m = new Float64Array(3); const d = new Float64Array(3);
  return {
    source: (et, out) => { base(et, d); model(et, m); out[0] = d[0] - m[0]; out[1] = d[1] - m[1]; out[2] = d[2] - m[2]; },
    model,
  };
}

/* --------------------------------------------------------------- refitting */

/** Fit one body on a uniform grid of `nrec` intervals of `Lsec`. Record-major coefficients. */
function refit(source, initEt, Lsec, nrec, ncoef) {
  const nodes = chebNodes(ncoef);
  const radius = Lsec / 2;
  const coef = new Float64Array(nrec * 3 * ncoef);
  const fv = [new Float64Array(ncoef), new Float64Array(ncoef), new Float64Array(ncoef)];
  const p = new Float64Array(3);
  for (let i = 0; i < nrec; i += 1) {
    const mid = initEt + i * Lsec + radius;
    for (let j = 0; j < ncoef; j += 1) {
      source(mid + nodes[j] * radius, p);
      fv[0][j] = p[0]; fv[1][j] = p[1]; fv[2][j] = p[2];
    }
    for (let c = 0; c < 3; c += 1) {
      const ck = chebFit(fv[c], ncoef);
      coef.set(ck, (i * 3 + c) * ncoef);
    }
  }
  return coef;
}

/* ------------------------------------------------- proven bounds (no sampling) */

/**
 * PROVEN refit bound -- no sampling anywhere in the argument.
 *
 * Cut the span at the union of (a) every refit-record boundary and (b) every
 * source-record boundary of every segment the fitting frame is built from. On
 * each resulting elementary interval BOTH sides are single polynomials, so
 * their difference g is a polynomial of degree D = max(degrees). Interpolating
 * g at D+1 Chebyshev nodes of that interval recovers its coefficients EXACTLY,
 * and then, writing g(cos theta) = sum_k g_k cos(k theta),
 *
 *     |dg/dtheta| <= sum_k k |g_k|       (differentiate term by term)
 *
 * so evaluating g on a theta grid of M points, spacing pi/M, gives
 *
 *     max |g| <= max over the grid + (pi / 2M) * sum_k k |g_k|
 *
 * which is an upper bound over the WHOLE interval, not over the points looked
 * at. For the derivative, |dT_k/dtau| = |k U_{k-1}| <= k^2 gives
 *
 *     |dg/dt| <= (1/radius) * sum_k k^2 |g_k|.
 *
 * Both are proven. The only caveat, stated rather than hidden: the
 * re-expansion runs in float64, so the bound itself carries round-off of
 * order 1e-12 km.
 */
const THETA_GRID = 256;

/**
 * Rigorous supremum bound for a Chebyshev series on [-1,1]:
 * the maximum over a theta grid of spacing pi/M, plus (pi/2M) * sum_k k|c_k|,
 * which bounds how far the function can move between grid points because
 * |d/dtheta sum c_k cos(k theta)| <= sum_k k |c_k|.
 */
function supBound(c, n) {
  if (n <= 0) return 0;
  let s1 = 0;
  for (let k = 0; k < n; k += 1) s1 += Math.abs(c[k]) * k;
  let peak = 0;
  for (let j = 0; j <= THETA_GRID; j += 1) {
    const x = Math.abs(clenshaw(c, 0, n, Math.cos((Math.PI * j) / THETA_GRID)));
    if (x > peak) peak = x;
  }
  return peak + (Math.PI / (2 * THETA_GRID)) * s1;
}

/** Chebyshev coefficients of the derivative of a Chebyshev series (exact). */
function chebDeriv(c, n) {
  const d = new Float64Array(Math.max(n - 1, 1));
  if (n < 2) return d;
  for (let k = n - 1; k >= 1; k -= 1) {
    const prev = k + 1 < d.length ? d[k + 1] : 0;
    d[k - 1] = prev + 2 * k * c[k];
  }
  d[0] *= 0.5;
  return d;
}

function provenRefitBound(parts, coefFit, initEt, Lsec, nrec, ncoef, T0, T1) {
  // breakpoints: every place either side can change polynomial
  const marks = new Set();
  for (let i = 0; i <= nrec; i += 1) marks.add(initEt + i * Lsec);
  for (const { seg } of parts) {
    for (let r = 0; r <= seg.nrec; r += 1) marks.add(seg.init + r * seg.intlen);
  }
  const cuts = [...marks].filter((t) => t >= T0 - 1e-6 && t <= T1 + 1e-6).sort((a, b) => a - b);
  let D = ncoef - 1;
  for (const { seg } of parts) D = Math.max(D, seg.ncoef - 1);
  const m = D + 1;
  const nodes = chebNodes(m);
  const g = new Float64Array(m);
  const radiusFit = Lsec / 2;
  let worstPos = 0; let worstVel = 0; let worstAt = 0;

  const srcAt = (seg, t, c) => {
    let r = Math.floor((t - seg.init) / seg.intlen);
    if (r < 0) r = 0; if (r > seg.nrec - 1) r = seg.nrec - 1;
    const off = r * seg.rsize;
    return clenshaw(seg.data, off + 2 + c * seg.ncoef, seg.ncoef, (t - seg.data[off]) / seg.data[off + 1]);
  };

  for (let p = 0; p + 1 < cuts.length; p += 1) {
    const a = cuts[p]; const b = cuts[p + 1];
    if (b - a < 1e-6) continue;
    const mid = (a + b) / 2; const rad = (b - a) / 2;
    let i = Math.floor((mid - initEt) / Lsec);
    if (i < 0) i = 0; if (i > nrec - 1) i = nrec - 1;
    const midF = initEt + i * Lsec + radiusFit;
    for (let c = 0; c < 3; c += 1) {
      for (let j = 0; j < m; j += 1) {
        const t = mid + nodes[j] * rad;
        let v = -clenshaw(coefFit, (i * 3 + c) * ncoef, ncoef, (t - midF) / radiusFit);
        for (const { seg, sign } of parts) v += sign * srcAt(seg, t, c);
        g[j] = v;
      }
      const gk = chebFit(g, m);
      const dk = chebDeriv(gk, m);      // exact Chebyshev coefficients of dg/dtau
      const sp = supBound(gk, m);
      const sv = supBound(dk, m - 1) / rad;
      if (sp > worstPos) { worstPos = sp; worstAt = mid; }
      if (sv > worstVel) worstVel = sv;
    }
  }
  return { posKm: SQRT3 * worstPos, velKmS: SQRT3 * worstVel, atEt: worstAt, pieces: cuts.length - 1, gridPoints: THETA_GRID };
}

/**
 * PROVEN quantisation bound. Round-to-nearest with step q gives |delta_k| <= q/2
 * for every stored coefficient, so per component
 *     |dp| <= sum_k |delta_k| |T_k| <= n q / 2
 *     |dv| <= (1/R) sum_k |delta_k| k^2 <= (q / 2R) * (n-1)n(2n-1)/6
 * and the three components combine as a vector with a factor sqrt(3).
 *
 * The equal step across all coefficient indices is not a convenience: with
 * bits_k = log2(2 M_k / q_k), minimising sum_k bits_k subject to sum_k q_k = 2e
 * gives q_k constant (the Lagrange stationarity condition is 1/(q_k ln2) = L).
 * So the uniform step IS the optimal bit allocation for this error model.
 */
function provenQuantBound(ncoef, q, radiusSec) {
  const sumK2 = ((ncoef - 1) * ncoef * (2 * ncoef - 1)) / 6;
  return { posKm: SQRT3 * ncoef * (q / 2), velKmS: (SQRT3 * (q / 2) * sumK2) / radiusSec };
}

/* --------------------------------------------------------------- quantising */

/** Quantise a record-major coefficient array with a single step q. */
function quantise(coef, nrec, ncoef, q) {
  const nf = 3 * ncoef;
  const mids = new Float64Array(nf);
  // Float64, not Int32: the integer for a low-order coefficient of a body with a
  // large orbit exceeds 2^31 and silently wrapped when this was an Int32Array,
  // which produced a pack that decoded to the wrong number without any error.
  const halves = new Float64Array(nf);
  for (let f = 0; f < nf; f += 1) {
    let lo = Infinity; let hi = -Infinity;
    for (let i = 0; i < nrec; i += 1) { const v = coef[i * nf + f]; if (v < lo) lo = v; if (v > hi) hi = v; }
    const mid = (lo + hi) / 2;
    mids[f] = mid;
    let half = 0;
    for (let i = 0; i < nrec; i += 1) {
      const iv = Math.abs(Math.round((coef[i * nf + f] - mid) / q));
      if (iv > half) half = iv;
    }
    halves[f] = half;
  }
  const widths = new Uint8Array(nf);
  for (let f = 0; f < nf; f += 1) widths[f] = widthForHalf(halves[f]);
  // field order keeps the 4- and 8-byte reads naturally aligned within a record
  const rank = (w) => WIDTH_ORDER.indexOf(w);
  const order = [...widths.keys()].sort((a, b) => (rank(widths[a]) - rank(widths[b])) || (a - b));
  const fieldOffset = new Int32Array(nf);
  let stride = 0;
  for (const f of order) { fieldOffset[f] = stride; stride += widths[f]; }
  stride = align(stride, 4);
  return { mids, widths, fieldOffset, stride, q };
}

/* -------------------------------------------------------------- measurement */

/** Densely SAMPLED error of a decoded pack body against the source function. */
function sampledError(source, decode, initEt, Lsec, nrec, ncoef, samplesPerRecord, refVel) {
  const p = new Float64Array(3); const q = new Float64Array(6);
  let maxPos = 0; let maxVel = 0; let atPos = 0;
  const radius = Lsec / 2;
  for (let i = 0; i < nrec; i += 1) {
    for (let s = 0; s < samplesPerRecord; s += 1) {
      const tau = -1 + (2 * (s + 0.5)) / samplesPerRecord;
      const et = initEt + i * Lsec + radius + tau * radius;
      source(et, p);
      decode(et, q);
      const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      if (d > maxPos) { maxPos = d; atPos = et; }
      if (refVel) {
        refVel(et, p);
        const dv = Math.hypot(q[3] - p[0], q[4] - p[1], q[5] - p[2]);
        if (dv > maxVel) maxVel = dv;
      }
    }
  }
  return { maxPosKm: maxPos, maxVelKmS: maxVel, atEt: atPos };
}

/* -------------------------------------------------------------------- build */

function encodeBody(spec) {
  const { enc, nrec, ncoef, coef } = spec;
  if (enc === 'f64') {
    const bytes = nrec * 3 * ncoef * 8;
    const buf = Buffer.alloc(bytes);
    const dv = new DataView(buf.buffer, buf.byteOffset, bytes);
    for (let i = 0; i < nrec * 3 * ncoef; i += 1) dv.setFloat64(i * 8, coef[i], true);
    return { buf, layout: { enc: 'f64', stride: 3 * ncoef * 8 } };
  }
  const { mids, widths, fieldOffset, stride, q } = spec.quant;
  const nf = 3 * ncoef;
  const head = nf * 8;
  const buf = Buffer.alloc(head + nrec * stride);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  for (let f = 0; f < nf; f += 1) dv.setFloat64(f * 8, mids[f], true);
  for (let i = 0; i < nrec; i += 1) {
    const rb = head + i * stride;
    for (let f = 0; f < nf; f += 1) {
      const w = widths[f];
      if (w === 0) continue;
      const v = coef[i * nf + f];
      writeField(dv, rb + fieldOffset[f], w, w === 8 ? v : Math.round((v - mids[f]) / q));
    }
  }
  return {
    buf,
    layout: {
      enc: 'q', q, stride, midsOffset: 0, recordsOffset: head,
      widths: Array.from(widths), fieldOffset: Array.from(fieldOffset),
    },
  };
}

async function main() {
  const candidate = (argOf('candidate', 'D')).toUpperCase();
  if (!'ABCD'.includes(candidate) || candidate.length !== 1) throw new Error(`unknown candidate ${candidate}`);
  const kernelPath = argOf('kernel', '/tmp/claude-0/swisslab/de440s.bsp');
  const outPath = argOf('out', new URL(`./packs/${candidate}.zeph`, import.meta.url).pathname);
  // Experiment (ii) only: a user-selected sub-range or body subset. This is
  // NOT compression and is never reported as such -- it is a smaller product.
  const fromYear = argOf('fromYear', null);
  const toYear = argOf('toYear', null);
  const wantBodies = argOf('bodies', null);

  const kernelBytes = readFileSync(kernelPath);
  const ref = new SpkRef(kernelPath);
  const T0 = ref.segment(1, 0).start;
  const T1 = ref.segment(1, 0).stop;

  // --- structural fact 1: Earth/EMB is a scalar multiple of Moon/EMB ---
  const s301 = ref.segment(301, 3); const s399 = ref.segment(399, 3);
  const emrat = -s301.data[2] / s399.data[2];
  let emratWorstKm = 0;
  for (let i = 0; i < s301.data.length - 4; i += 1) {
    if (i % s301.rsize < 2) continue;
    const d = Math.abs(-s301.data[i] / emrat - s399.data[i]);
    if (d > emratWorstKm) emratWorstKm = d;
  }
  ref.emrat = emrat;
  // --- structural fact 2: Mercury/Venus body centres are identically zero ---
  const zeroSegs = [[199, 1], [299, 2]].map(([t, c]) => {
    const s = ref.segment(t, c);
    let mx = 0;
    for (let i = 0; i < s.data.length; i += 1) if (i % s.rsize >= 2 && i < s.data.length - 4) mx = Math.max(mx, Math.abs(s.data[i]));
    return { target: t, center: c, maxAbsCoefKm: mx };
  });

  const J2000_UNIX = 946728000;
  const covFrom = fromYear === null ? T0 : Math.max(T0, Date.UTC(Number(fromYear), 0, 1) / 1000 - J2000_UNIX);
  const covTo = toYear === null ? T1 : Math.min(T1, Date.UTC(Number(toYear), 0, 1) / 1000 - J2000_UNIX);
  if (covTo <= covFrom) throw new Error('empty coverage window');
  const cropped = fromYear !== null || toYear !== null || wantBodies !== null;
  // Earth, and therefore the observer, is built from emb and moon, and any
  // sun-framed body needs the Sun, so a subset always carries those three.
  const REQUIRED = new Set(['emb', 'moon', 'sun']);
  const selected = wantBodies === null ? null : new Set([...wantBodies.split(','), ...REQUIRED]);

  const choice = JSON.parse(readFileSync(here('raw/choice.json'), 'utf8'));
  const bodies = [];
  const blocks = [];
  const diag = [];

  for (const body of BODY_SEGS) {
    if (selected && !selected.has(body.name)) continue;
    const seg = ref.segment(body.target, body.center);
    const budget = BUDGET_KM[body.name];
    const epsFit = 0.5 * budget; const epsQ = 0.5 * budget;
    let frame; let Ldays; let ncoef; let nrec; let enc; let coef; let source; let modelTag = null;

    if (candidate === 'A') {
      // keep DE440s's own segmentation exactly; truncate, then quantise.
      frame = 'native'; enc = 'q';
      Ldays = seg.intlen / DAY;
      var recFrom = Math.max(0, Math.floor((covFrom - seg.init) / seg.intlen));
      var recTo = Math.min(seg.nrec, Math.ceil((covTo - seg.init) / seg.intlen));
      nrec = recTo - recFrom;
      const tail = [];                                  // tail[K] = sum_{k>=K} max_r |c_k|, per component
      const mx = Array.from({ length: 3 }, () => new Float64Array(seg.ncoef));
      for (let r = 0; r < seg.nrec; r += 1) {
        const off = r * seg.rsize;
        for (let c = 0; c < 3; c += 1) for (let k = 0; k < seg.ncoef; k += 1) {
          const a = Math.abs(seg.data[off + 2 + c * seg.ncoef + k]); if (a > mx[c][k]) mx[c][k] = a;
        }
      }
      for (let K = 1; K <= seg.ncoef; K += 1) {
        let s2 = 0;
        for (let c = 0; c < 3; c += 1) { let s = 0; for (let k = K; k < seg.ncoef; k += 1) s += mx[c][k]; s2 += s * s; }
        tail[K] = Math.sqrt(s2);
      }
      ncoef = seg.ncoef;
      for (let K = 1; K <= seg.ncoef; K += 1) if (tail[K] <= epsFit) { ncoef = K; break; }
      coef = new Float64Array(nrec * 3 * ncoef);
      for (let r = 0; r < nrec; r += 1) {
        const off = (r + recFrom) * seg.rsize;
        for (let c = 0; c < 3; c += 1) for (let k = 0; k < ncoef; k += 1) coef[(r * 3 + c) * ncoef + k] = seg.data[off + 2 + c * seg.ncoef + k];
      }
      source = frameSource(ref, body, 'native');
      diag.push({ body: body.name, truncatedFrom: seg.ncoef, to: ncoef, provenTruncKm: tail[ncoef] });
    } else {
      const pick = choice[body.name][candidate === 'B' ? 'float64' : 'quant'];
      frame = pick.frame; Ldays = pick.Ldays; ncoef = pick.ncoef;
      var gridFrom = Math.max(0, Math.floor((covFrom - T0) / (Ldays * DAY)));
      var gridTo = Math.min(SPAN_DAYS / Ldays, Math.ceil((covTo - T0) / (Ldays * DAY)));
      nrec = gridTo - gridFrom;
      enc = candidate === 'B' ? 'f64' : 'q';
      const base = frameSource(ref, body, frame);
      if (candidate === 'C') {
        const r = await residualSource(ref, body, base);
        source = r.source; modelTag = 'astronomy-engine BaryState/GeoMoonState';
        // the residual can need a different degree than the absolute vector; walk
        // n up until the sampled fit error is inside the fit budget, bounded at 64.
        let n = ncoef;
        for (; n <= 64; n += 1) {
          const c2 = refit(source, T0 + gridFrom * Ldays * DAY, Ldays * DAY, nrec, n);
          const e = sampledFitOnly(source, c2, T0 + gridFrom * Ldays * DAY, Ldays * DAY, nrec, n, 7);
          if (e <= epsFit) { ncoef = n; coef = c2; break; }
        }
        if (!coef) { ncoef = 64; coef = refit(source, T0 + gridFrom * Ldays * DAY, Ldays * DAY, nrec, 64); }
      } else {
        source = base;
        coef = refit(source, T0 + gridFrom * Ldays * DAY, Ldays * DAY, nrec, ncoef);
      }
    }

    const Lsec = Ldays * DAY;
    const gridInit = candidate === 'A' ? 0 : T0 + gridFrom * Lsec;
    const bodyInit = candidate === 'A' ? seg.init + recFrom * seg.intlen : gridInit;
    let quant = null; let q = 0;
    if (enc === 'q') {
      q = (2 * epsQ) / (SQRT3 * ncoef);
      quant = quantise(coef, nrec, ncoef, q);
    }
    const { buf, layout } = encodeBody({ enc, nrec, ncoef, coef, quant });
    blocks.push(buf);

    const provenQ = enc === 'q' ? provenQuantBound(ncoef, q, Lsec / 2) : { posKm: 0, velKmS: 0 };
    let provenFit = { posKm: 0, velKmS: 0 };
    if (candidate === 'A') {
      // truncation, proven from the coefficient envelope
      const d = diag.find((x) => x.body === body.name);
      let sv2 = 0;
      for (let c = 0; c < 3; c += 1) {
        let s = 0;
        for (let r = 0; r < seg.nrec; r += 1) {
          const off = r * seg.rsize;
          let ss = 0; for (let k = ncoef; k < seg.ncoef; k += 1) ss += Math.abs(seg.data[off + 2 + c * seg.ncoef + k]) * k * k;
          if (ss > s) s = ss;
        }
        sv2 += (s / (seg.intlen / 2)) ** 2;
      }
      provenFit = { posKm: d.provenTruncKm, velKmS: Math.sqrt(sv2) };
    } else if (candidate === 'B' || candidate === 'D') {
      const parts = frame === 'sun'
        ? [{ seg, sign: 1 }, { seg: ref.segment(10, 0), sign: -1 }]
        : [{ seg, sign: 1 }];
      provenFit = provenRefitBound(parts, coef, bodyInit, Lsec, nrec, ncoef, bodyInit, bodyInit + nrec * Lsec);
    } else {
      provenFit = { posKm: null, velKmS: null, why: 'the residual is fitted against a model that is not a polynomial, so the exact re-expansion argument does not apply; sampled only' };
    }

    bodies.push({
      name: body.name, target: body.target, center: body.center,
      frame, encoding: enc, model: modelTag,
      initEt: bodyInit, intervalSec: Lsec, intervalDays: Ldays, nrec, ncoef,
      budgetKm: budget, epsFitKm: epsFit, epsQuantKm: epsQ,
      provenPosKm: provenFit.posKm === null ? null : provenFit.posKm + provenQ.posKm,
      provenVelKmS: provenFit.velKmS === null ? null : provenFit.velKmS + provenQ.velKmS,
      provenParts: { refit: provenFit, quantisation: provenQ },
      layout, bytes: buf.length,
    });
  }

  // ------------------------------------------------------------- container
  const header = {
    format: 'zodiacs-ephemeris-pack',
    formatVersion: 1,
    candidate,
    compiler: { name: 'zodiacs precision compiler', version: COMPILER_VERSION, sourceSha256: sourceHashes() },
    input: { file: kernelPath.split('/').pop(), bytes: kernelBytes.length, sha256: sha256(kernelBytes) },
    settings: {
      budgetsKm: BUDGET_KM,
      budgetSplit: 'half the per-body position budget to the fit, half to quantisation',
      quantiser: 'uniform step q = 2*eps/(sqrt(3)*ncoef) per body, round to nearest, per-(component,index) midpoint and byte-aligned width',
      choiceSource: candidate === 'A' ? 'DE440s segmentation, unchanged' : 'raw/sweep.json -> raw/choice.json',
    },
    coverage: {
      startEtSecTdb: covFrom, stopEtSecTdb: covTo,
      startUtcApprox: new Date((covFrom + J2000_UNIX) * 1000).toISOString(),
      stopUtcApprox: new Date((covTo + J2000_UNIX) * 1000).toISOString(),
      croppedFromKernel: cropped,
      bodySubset: selected ? [...selected].sort() : null,
      timeScale: 'TDB seconds past J2000; the runtime is fed TT, and |TDB-TT| < 2 ms is below every budget here',
      spanDays: (covTo - covFrom) / DAY,
      kernelSpanDays: SPAN_DAYS,
    },
    conventions: {
      frame: 'ICRF / J2000 mean equator and equinox (DE440s segment frame id 1)',
      units: { position: 'km', velocity: 'km/s' },
      origin: 'per body: see bodies[].frame -- "native" = the DE segment centre, "sun" = heliocentric, "ssb" = solar-system barycentre',
      chebyshev: 'p(tau) = sum_k c_k T_k(tau), tau = (t - mid)/radius, c_0 NOT halved (SPK type-2 convention)',
      velocity: 'the analytic derivative of the stored polynomial, not a finite difference',
      angles: 'none are stored; every quantity in this pack is a vector component',
    },
    derived: {
      earth399: { rule: 'r(399 rel 3) = -(1/EMRAT) * r(301 rel 3)', emrat, worstResidualKm: emratWorstKm, note: 'exact in DE440s to 1 ulp; verified over every coefficient of both segments' },
      mercury199: { rule: 'r(199 rel 1) = 0', evidence: zeroSegs[0] },
      venus299: { rule: 'r(299 rel 2) = 0', evidence: zeroSegs[1] },
    },
    dependencies: dependencies(candidate),
    bodies,
    payloadSha256: '0'.repeat(64),
  };

  let payloadOffset = align(16 + Buffer.byteLength(JSON.stringify(header)) + 4096);
  // two-pass: body offsets depend on the header size, which depends on the offsets
  for (let pass = 0; pass < 3; pass += 1) {
    let off = payloadOffset;
    for (let i = 0; i < bodies.length; i += 1) { bodies[i].offset = off; off = align(off + blocks[i].length); }
    header.payloadEndOffset = off;
    const hl = Buffer.byteLength(JSON.stringify(header));
    const want = align(16 + hl + 16);
    if (want === payloadOffset) break;
    payloadOffset = want;
  }
  const payload = Buffer.alloc(header.payloadEndOffset - payloadOffset);
  for (let i = 0; i < bodies.length; i += 1) blocks[i].copy(payload, bodies[i].offset - payloadOffset);
  header.payloadSha256 = sha256(payload);

  const hjson = Buffer.from(JSON.stringify(header), 'utf8');
  const out = Buffer.alloc(header.payloadEndOffset);
  out.write(MAGIC, 0, 'latin1');
  out.writeUInt32LE(hjson.length, 8);
  out.writeUInt32LE(payloadOffset, 12);
  hjson.copy(out, 16);
  payload.copy(out, payloadOffset);

  mkdirSync(new URL('./packs/', import.meta.url), { recursive: true });
  writeFileSync(outPath, out);
  process.stdout.write(`${JSON.stringify({ candidate, out: outPath, bytes: out.length, mib: +(out.length / 1048576).toFixed(4), sha256: sha256(out), headerBytes: hjson.length }, null, 1)}\n`);
}

function sampledFitOnly(source, coef, initEt, Lsec, nrec, ncoef, per) {
  const p = new Float64Array(3);
  const radius = Lsec / 2;
  let worst = 0;
  for (let i = 0; i < nrec; i += 1) {
    for (let s = 0; s < per; s += 1) {
      const tau = -1 + (2 * (s + 0.5)) / per;
      source(initEt + i * Lsec + radius + tau * radius, p);
      let d2 = 0;
      for (let c = 0; c < 3; c += 1) { const d = clenshaw(coef, (i * 3 + c) * ncoef, ncoef, tau) - p[c]; d2 += d * d; }
      if (d2 > worst) worst = d2;
    }
  }
  return Math.sqrt(worst);
}

function sourceHashes() {
  const out = {};
  for (const f of ['compile.mjs', 'cheb.mjs', 'sources.mjs', 'spkref.mjs', 'format.mjs', 'runtime.mjs']) {
    out[f] = sha256(readFileSync(here(f)));
  }
  return out;
}

function dependencies(candidate) {
  const d = [
    { what: 'JPL DE440s SPK kernel', role: 'the only source of position data', licence: 'US Government work, public domain (JPL/Caltech-NASA)', neededAtRuntime: false },
    { what: 'raw/sweep.json + raw/choice.json', role: 'per-body interval and degree choice', neededAtRuntime: false },
  ];
  if (candidate === 'C') {
    d.push({ what: 'astronomy-engine 2.1.19', role: 'REQUIRED AT RUNTIME: the pack stores only the residual DE minus this model, so the model must be evaluated on every call and any change to it invalidates the pack', licence: 'MIT', neededAtRuntime: true, pinnedVersion: '2.1.19' });
  }
  d.push({ what: 'no Swiss Ephemeris code, data or output', role: 'none: Swiss is a measuring instrument elsewhere in this study and was not consulted by the compiler', neededAtRuntime: false });
  return d;
}

export { refit, quantise, provenRefitBound, provenQuantBound, sampledError, frameSource };

if (import.meta.url === `file://${process.argv[1]}`) await main();
