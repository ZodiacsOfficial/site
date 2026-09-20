/**
 * Does the in-memory reference reproduce the committed prototype exactly?
 *
 * Every longitude number in RESULTS.md is "pack vs reference". If the
 * reference were not the prototype, the whole comparison would be against
 * something nobody else has. This checks it against the actual committed
 * prototype code, and separately measures the one deliberate difference --
 * the observer's velocity, taken analytically here and from a 60-second
 * central difference there.
 */
import { writeFileSync } from 'node:fs';
import { SpkRef } from './spkref.mjs';
import { RefBackend } from './refbackend.mjs';
import { loadAstronomyEngine, API_BODIES } from './runtime.mjs';
import { DeBackend } from '/home/user/site/docs/platform/evidence/swiss-benchmark/prototype/apparent.mjs';

const KERNEL = process.env.KERNEL ?? '/tmp/claude-0/swisslab/de440s.bsp';
const A = await loadAstronomyEngine();
const ref = new SpkRef(KERNEL);
const proto = new DeBackend(KERNEL);
const fd60 = new RefBackend(ref, { observerVelocity: 'fd60', A });
const ana = new RefBackend(ref, { observerVelocity: 'analytic', A });

const circ = (x, y) => { let d = (x - y) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d * 3600; };
const PHI = 0.6180339887498949;
const N = 400;
const start = Date.UTC(1850, 2, 1); const end = Date.UTC(2149, 10, 1);
let worstProto = 0; let worstConv = 0; let rows = 0;
for (let i = 0; i < N; i += 1) {
  const when = new Date(start + (end - start) * ((i * PHI) % 1));
  for (const b of API_BODIES) {
    const p = proto.apparentEclipticLongitude(b, when);
    worstProto = Math.max(worstProto, Math.abs(circ(fd60.apparentEclipticLongitude(b, when), p)));
    worstConv = Math.max(worstConv, Math.abs(circ(ana.apparentEclipticLongitude(b, when), p)));
    rows += 1;
  }
}
const out = {
  what: 'the in-memory reference against the committed prototype',
  rows, instants: N, bodies: API_BODIES.length,
  refBackendFd60_vs_prototype_maxArcsec: worstProto,
  refBackendAnalyticObserverVelocity_vs_prototype_maxArcsec: worstConv,
  reading: 'the first number is the reference reproducing the prototype and must be ~0; the second is the size of the one reduction difference (observer velocity), which is what the pack comparison also carries',
};
writeFileSync(new URL('./raw/equivalence.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
