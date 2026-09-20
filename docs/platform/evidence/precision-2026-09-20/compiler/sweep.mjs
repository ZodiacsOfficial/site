/**
 * The (interval length, degree) sweep that candidate B's per-body choice is
 * made from. Offline, deterministic, no network, no LLM.
 *
 * Output: raw/sweep.json -- for every (body, frame, L, ncoef) the sampled max
 * position error against the raw kernel and the per-(component,k) coefficient
 * magnitude envelope, which is what the quantisation cost model in candidate D
 * needs. One sweep feeds both candidates so they are costed off the same data.
 */
import { writeFileSync } from 'node:fs';
import { SpkRef } from './spkref.mjs';
import { chebNodes, chebFit, clenshaw } from './cheb.mjs';
import { BODY_SEGS, LADDER, SPAN_DAYS, DAY } from './sources.mjs';

const KERNEL = process.env.KERNEL ?? '/tmp/claude-0/swisslab/de440s.bsp';
const ref = new SpkRef(KERNEL);
const T0 = ref.segment(1, 0).start;

const tmp = new Float64Array(6);
const tmpB = new Float64Array(6);

/** Position of a body in a chosen frame, km. frame: 'ssb' or 'sun'. */
function makeSource(body, frame) {
  const seg = ref.segment(body.target, body.center);
  if (frame === 'ssb' || body.name === 'moon' || body.name === 'sun') {
    return (et, out) => { ref.state(seg, et, tmp); out[0] = tmp[0]; out[1] = tmp[1]; out[2] = tmp[2]; };
  }
  const sun = ref.segment(10, 0);
  return (et, out) => {
    ref.state(seg, et, tmp); ref.state(sun, et, tmpB);
    out[0] = tmp[0] - tmpB[0]; out[1] = tmp[1] - tmpB[1]; out[2] = tmp[2] - tmpB[2];
  };
}

const PROBE_INTERVALS = 24;   // intervals sampled per (L, ncoef) cell
const PROBE_POINTS = 5;       // extra evaluation points per node gap

function cellError(source, Lsec, ncoef, nrec) {
  const nodes = chebNodes(ncoef);
  const radius = Lsec / 2;
  const fv = [new Float64Array(ncoef), new Float64Array(ncoef), new Float64Array(ncoef)];
  const p = new Float64Array(3);
  let worst = 0;
  const envelope = [new Float64Array(ncoef), new Float64Array(ncoef), new Float64Array(ncoef)];
  const nEval = ncoef * PROBE_POINTS + 3;
  for (let s = 0; s < PROBE_INTERVALS; s += 1) {
    const i = Math.round((s * (nrec - 1)) / (PROBE_INTERVALS - 1));
    const mid = T0 + i * Lsec + radius;
    for (let j = 0; j < ncoef; j += 1) {
      source(mid + nodes[j] * radius, p);
      fv[0][j] = p[0]; fv[1][j] = p[1]; fv[2][j] = p[2];
    }
    const c = [chebFit(fv[0], ncoef), chebFit(fv[1], ncoef), chebFit(fv[2], ncoef)];
    for (let cc = 0; cc < 3; cc += 1) for (let k = 0; k < ncoef; k += 1) {
      const a = Math.abs(c[cc][k]); if (a > envelope[cc][k]) envelope[cc][k] = a;
    }
    for (let e = 0; e < nEval; e += 1) {
      const tau = -1 + (2 * (e + 0.5)) / nEval;
      source(mid + tau * radius, p);
      let d2 = 0;
      for (let cc = 0; cc < 3; cc += 1) { const d = clenshaw(c[cc], 0, ncoef, tau) - p[cc]; d2 += d * d; }
      const d = Math.sqrt(d2); if (d > worst) worst = d;
    }
  }
  return { worst, envelope: envelope.map((e) => Array.from(e)) };
}

const out = { kernel: KERNEL, probeIntervals: PROBE_INTERVALS, probePointsPerCoef: PROBE_POINTS, cells: [] };
for (const body of BODY_SEGS) {
  const frames = (body.name === 'sun' || body.name === 'moon') ? ['native'] : ['ssb', 'sun'];
  for (const frame of frames) {
    const source = makeSource(body, frame);
    for (const Ldays of LADDER) {
      const Lsec = Ldays * DAY;
      const nrec = SPAN_DAYS / Ldays;
      if (!Number.isInteger(nrec)) throw new Error(`ladder ${Ldays} does not divide the span`);
      let prev = Infinity;
      for (let ncoef = 3; ncoef <= 44; ncoef += 1) {
        const { worst, envelope } = cellError(source, Lsec, ncoef, nrec);
        out.cells.push({ body: body.name, frame, Ldays, ncoef, nrec, maxErrKm: worst, envelope });
        // stop once the fit has bottomed out (round-off floor) -- more degree buys nothing
        if (worst < 1e-7 || (worst > prev * 0.9 && worst < 1e-4)) break;
        prev = worst;
      }
      process.stderr.write(`${body.name}/${frame} L=${Ldays} done\n`);
    }
  }
}
writeFileSync(new URL('./raw/sweep.json', import.meta.url), JSON.stringify(out));
console.log('cells', out.cells.length);
