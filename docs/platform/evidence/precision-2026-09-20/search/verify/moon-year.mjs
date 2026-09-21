import { coreBackend, iso, circular } from '../lib/backends.mjs';
import { buildLevelProblem } from '../lib/astro-harness.mjs';
import { classifyInterval } from '../lib/interval-search.mjs';
const core = await coreBackend();
const aMs=Date.parse('2019-01-01T00:00:00Z'), bMs=Date.parse('2020-01-01T00:00:00Z');
for (const TARGET of [100, 250]) {
  const p = buildLevelProblem({ lon: core.lon, body:'Moon', targetDegrees: TARGET, aMs, bMs });
  const t0=Date.now();
  const r = classifyInterval({ f:p.f, derivativeEnclosure:p.derivativeEnclosure, secondDerivativeEnclosure:p.secondDerivativeEnclosure,
    a:aMs,b:bMs,epsilon:0.001,minWidth:100,maxEvaluations:2000000,boundKind:'empirical',label:`Moon-${TARGET}` });
  let prev=p.f(aMs), real=0, cut=0;
  for(let t=aMs+60000;t<=bMs;t+=60000){const y=p.f(t); if((y<0)!==(prev<0)){ if(Math.abs(y)>90) cut++; else real++;} prev=y;}
  console.log(`Moon T=${TARGET}: verdict=${r.verdict} outcome=${r.outcome} count=${r.rootCount} possible=${JSON.stringify(r.possibleRootCounts)} evals=${r.evaluations} wall=${((Date.now()-t0)/1000).toFixed(1)}s`);
  console.log(`   TRUTH (1-min scan): ${real} real crossings of ${TARGET}, ${cut} branch-cut jumps at the antipode`);
  console.log(`   measured f'' per day^2 = ${p.bounds.measuredPerDay.secondDegPerDay2.toExponential(3)}`);
}
