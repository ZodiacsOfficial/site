/** Independent dense stress of the PROVEN bounds, different phase/grid from measure.mjs. */
import { Pack, PackBackend } from '../runtime.mjs';
import { SpkRef } from '../spkref.mjs';
import { RefBackend } from '../refbackend.mjs';
import { frameSource } from '../compile.mjs';
import { BODY_SEGS } from '../sources.mjs';

const KERNEL = '/tmp/claude-0/swisslab/de440s.bsp';
const P = process.argv[2] ?? '/home/user/precision/compiler/packs/D.zeph';
const ref = new SpkRef(KERNEL);
const pack = new Pack(P);
ref.emrat = pack.emrat;
const back = new PackBackend(pack);
const refBack = new RefBackend(ref, {});
const T0 = pack.coverage.startEtSecTdb, T1 = pack.coverage.stopEtSecTdb;

// --- 1. per pack body, own frame, boundary-hammering with a DIFFERENT tau set ---
console.log('== per-pack-body: independent dense sample vs the pack\'s own proven bound ==');
console.log('body          n samples   sampledMax km   provenPos km   ratio   violated?');
const p = new Float64Array(3), q = new Float64Array(6);
// taus that are NOT the measure.mjs set, and that sit exactly ON the endpoints
const TAUS = [];
for (let i = 0; i <= 40; i += 1) TAUS.push(-1 + (2 * i) / 40);      // includes tau = -1 and +1 exactly
for (const x of [-0.9999999, 0.9999999, -0.99999, 0.99999, -0.5000001, 0.3333333]) TAUS.push(x);
let anyViolation = false;
for (const body of BODY_SEGS) {
  const b = pack.bodies.get(body.name);
  if (!b) continue;
  const src = frameSource(ref, body, b.frame);
  const R = b.intervalSec / 2;
  let worst = 0, n = 0, at = 0;
  for (let i = 0; i < b.nrec; i += 1) {
    const mid = b.initEt + i * b.intervalSec + R;
    for (const tau of TAUS) {
      const et = mid + tau * R;
      if (et < T0 || et > T1) continue;
      src(et, p); pack.raw(body.name, et, q);
      const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      n += 1;
      if (d > worst) { worst = d; at = et; }
    }
  }
  const viol = worst > b.provenPosKm;
  if (viol) anyViolation = true;
  console.log(`${body.name.padEnd(13)} ${String(n).padStart(8)} ${worst.toExponential(4).padStart(15)} ${b.provenPosKm.toExponential(4).padStart(14)} ${(worst/b.provenPosKm).toFixed(3).padStart(7)}   ${viol ? 'YES  <-- BOUND BROKEN' : 'no'}`);
}

// --- 2. velocity, same treatment, against the raw kernel's analytic derivative ---
console.log('\n== per-pack-body velocity: analytic vs analytic, vs proven velocity bound ==');
console.log('body          sampledMax km/s  provenVel km/s  ratio  violated?');
{
  const a6 = new Float64Array(6), b6 = new Float64Array(6);
  for (const body of BODY_SEGS) {
    const b = pack.bodies.get(body.name);
    if (!b) continue;
    const segMain = ref.segment(body.target, body.center);
    const segSun = b.frame === 'sun' ? ref.segment(10, 0) : null;
    const R = b.intervalSec / 2;
    let worst = 0;
    for (let i = 0; i < b.nrec; i += 1) {
      const mid = b.initEt + i * b.intervalSec + R;
      for (const tau of TAUS) {
        const et = mid + tau * R;
        if (et < T0 || et > T1) continue;
        ref.state(segMain, et, a6);
        if (segSun) { ref.state(segSun, et, b6); for (let k = 0; k < 6; k += 1) a6[k] -= b6[k]; }
        pack.raw(body.name, et, q);
        const d = Math.hypot(q[3] - a6[3], q[4] - a6[4], q[5] - a6[5]);
        if (d > worst) worst = d;
      }
    }
    const viol = worst > b.provenVelKmS;
    if (viol) anyViolation = true;
    console.log(`${body.name.padEnd(13)} ${worst.toExponential(4).padStart(15)} ${b.provenVelKmS.toExponential(4).padStart(15)} ${(worst/b.provenVelKmS).toFixed(3).padStart(6)}  ${viol ? 'YES <-- BROKEN' : 'no'}`);
  }
}

// --- 3. API bodies on a large independent pseudo-random grid (different generator) ---
console.log('\n== API bodies, barycentric + geocentric, 250k independent instants ==');
{
  const N = 250000;
  let s = 123456789;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const a = new Float64Array(6), b = new Float64Array(6), ea = new Float64Array(6), eb = new Float64Array(6);
  const BODIES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Earth'];
  const wb = {}, wg = {}, wv = {};
  for (const x of BODIES) { wb[x] = 0; wg[x] = 0; wv[x] = 0; }
  for (let i = 0; i < N; i += 1) {
    const et = T0 + (T1 - T0) * rnd();
    back.state('Earth', et, ea); refBack.state('Earth', et, eb);
    for (const body of BODIES) {
      back.state(body, et, a); refBack.state(body, et, b);
      const d = Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
      if (d > wb[body]) wb[body] = d;
      const dv = Math.hypot(a[3]-b[3], a[4]-b[4], a[5]-b[5]);
      if (dv > wv[body]) wv[body] = dv;
      const g = Math.hypot((a[0]-ea[0])-(b[0]-eb[0]), (a[1]-ea[1])-(b[1]-eb[1]), (a[2]-ea[2])-(b[2]-eb[2]));
      if (g > wg[body]) wg[body] = g;
    }
  }
  console.log('body      baryMax km   geoMax km    velMax km/s');
  for (const x of BODIES) console.log(`${x.padEnd(9)} ${wb[x].toFixed(6).padStart(11)} ${wg[x].toFixed(6).padStart(11)} ${wv[x].toExponential(4).padStart(13)}`);
  console.log(`outer planets (Jup..Pluto) bary max = ${Math.max(...['Jupiter','Saturn','Uranus','Neptune','Pluto'].map(x=>wb[x])).toFixed(6)} km`);
  console.log(`outer planets (Jup..Pluto) geo  max = ${Math.max(...['Jupiter','Saturn','Uranus','Neptune','Pluto'].map(x=>wg[x])).toFixed(6)} km`);
  console.log(`any-body velocity max = ${Math.max(...BODIES.map(x=>wv[x])).toExponential(4)} km/s`);
}
console.log(`\nANY PROVEN BOUND VIOLATED: ${anyViolation}`);
