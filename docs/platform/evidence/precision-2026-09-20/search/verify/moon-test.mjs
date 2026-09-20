// Hard case the track never measured: the MOON. Same harness, same settings.
import { coreBackend, DAY_MS, iso } from '../lib/backends.mjs';
import { buildLevelProblem } from '../lib/astro-harness.mjs';
import { classifyInterval } from '../lib/interval-search.mjs';
const core = await coreBackend();
const aMs = Date.parse('2020-01-01T00:00:00Z'), bMs = Date.parse('2020-02-01T00:00:00Z');
const TARGET = 100.0;
const t0=Date.now();
const p = buildLevelProblem({ lon: core.lon, body: 'Moon', targetDegrees: TARGET, aMs, bMs });
console.log('measured per day:', JSON.stringify(p.bounds.measuredPerDay));
const r = classifyInterval({
  f: p.f, derivativeEnclosure: p.derivativeEnclosure, secondDerivativeEnclosure: p.secondDerivativeEnclosure,
  a: aMs, b: bMs, epsilon: 0.001, minWidth: 100, maxEvaluations: 200000, boundKind: 'empirical', label: 'Moon-100deg-Jan2020',
});
console.log('verdict:', r.verdict, '| outcome:', r.outcome, '| rootCount:', r.rootCount, '| evals:', r.evaluations, '| wall s', ((Date.now()-t0)/1000).toFixed(1));
console.log('crossings:', (r.crossings||[]).map(c=>iso(c.centre)));
// ground truth: dense 1-minute scan for sign changes
let prev = p.f(aMs), truth=[];
for (let t=aMs+60000; t<=bMs; t+=60000){ const y=p.f(t); if ((y<0)!==(prev<0)) truth.push(iso(t)); prev=y; }
console.log('TRUTH (1-min scan sign changes):', truth.length, truth);
