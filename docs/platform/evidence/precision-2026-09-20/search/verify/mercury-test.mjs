// Mercury: fast body with stations. Same harness, same default settings as the track uses.
import { coreBackend, iso, circular } from '../lib/backends.mjs';
import { buildLevelProblem } from '../lib/astro-harness.mjs';
import { classifyInterval } from '../lib/interval-search.mjs';
const core = await coreBackend();
const aMs = Date.parse('2019-01-01T00:00:00Z'), bMs = Date.parse('2020-01-01T00:00:00Z');
for (const TARGET of [230, 120, 355, 228.5, 231.5]) {
  const p = buildLevelProblem({ lon: core.lon, body: 'Mercury', targetDegrees: TARGET, aMs, bMs });
  const t0=Date.now();
  const r = classifyInterval({
    f: p.f, derivativeEnclosure: p.derivativeEnclosure, secondDerivativeEnclosure: p.secondDerivativeEnclosure,
    a: aMs, b: bMs, epsilon: 0.001, minWidth: 100, maxEvaluations: 500000, boundKind: 'empirical',
    label: `Mercury-${TARGET}`,
  });
  // ground truth: 10-minute scan, ignoring the +-180 branch cut
  let prev = p.f(aMs), truth=0, cut=0;
  for (let t=aMs+600000; t<=bMs; t+=600000){ const y=p.f(t);
    if ((y<0)!==(prev<0)) { if (Math.abs(y)>90) cut++; else truth++; } prev=y; }
  console.log(`TARGET ${TARGET}: verdict=${r.verdict} outcome=${r.outcome} count=${r.rootCount} evals=${r.evaluations} wall=${((Date.now()-t0)/1000).toFixed(1)}s  |  TRUTH(10-min scan)=${truth} real crossings, ${cut} branch-cut jumps`);
}
