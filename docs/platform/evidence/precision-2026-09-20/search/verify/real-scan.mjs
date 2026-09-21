// Run the REPOSITORY'S ACTUAL findLongitudeCrossingsWith (type-stripped, unmodified logic)
// against the same synthetic-dip Uranus setup the track demonstrated with a reimplementation.
import { findLongitudeCrossingsWith } from './lc.ts';
import { deBackend, DAY_MS, circular } from '../lib/backends.mjs';
import { buildLevelProblem, locateTurningPoint } from '../lib/astro-harness.mjs';
const de = await deBackend();
const TARGET = 32.6940395;
const aMs = Date.parse('2019-09-30T09:06:55.823Z'), bMs = Date.parse('2020-04-10T15:17:01.450Z');
const p = buildLevelProblem({ lon: de.lon, body:'Uranus', targetDegrees: TARGET, aMs, bMs });
const st = locateTurningPoint({ f:p.f, fromMs:Date.parse('2019-12-01T00:00:00Z'), toMs:Date.parse('2020-02-15T00:00:00Z'), secondDerivativeBound:p.bounds.bounds.secondDerivativeBound });
const h=600000;
const curv = ((p.f(st.tMs+h)-2*p.f(st.tMs)+p.f(st.tMs-h))/(h*h))*DAY_MS*DAY_MS;
console.log('station', new Date(st.tMs).toISOString(), 'g*', st.value, 'curvature deg/day^2', curv);
const lonFn = (body, date) => de.lon(body, date.getTime());
for (const dip of [0.05, 0.01, 0.002, 0.0005]) {
  const synth = TARGET + (st.value + dip);
  const sep = 2*Math.sqrt(2*dip/curv);
  const r5 = findLongitudeCrossingsWith(lonFn, 'Uranus', synth, new Date(aMs), new Date(bMs), 5);
  const rh = findLongitudeCrossingsWith(lonFn, 'Uranus', synth, new Date(aMs), new Date(bMs), 0.5);
  console.log(`dip ${dip}  predicted sep ${sep.toFixed(2)}d  REPO 5-day scan: ${r5.length}  REPO 0.5-day scan: ${rh.length}`);
}
