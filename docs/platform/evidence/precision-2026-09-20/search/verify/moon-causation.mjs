import { coreBackend, circular } from '../lib/backends.mjs';
import { buildLevelProblem } from '../lib/astro-harness.mjs';
import { classifyInterval } from '../lib/interval-search.mjs';
const core=await coreBackend();
const run=(from,to,target,label)=>{
  const aMs=Date.parse(from), bMs=Date.parse(to);
  const p=buildLevelProblem({lon:core.lon,body:'Moon',targetDegrees:target,aMs,bMs});
  const r=classifyInterval({f:p.f,derivativeEnclosure:p.derivativeEnclosure,secondDerivativeEnclosure:p.secondDerivativeEnclosure,
    a:aMs,b:bMs,epsilon:0.001,minWidth:100,maxEvaluations:2000000,boundKind:'empirical',label});
  let prev=p.f(aMs),real=0,cut=0;
  for(let t=aMs+60000;t<=bMs;t+=60000){const y=p.f(t); if((y<0)!==(prev<0)){ if(Math.abs(y)>90)cut++; else real++;} prev=y;}
  console.log(`${label}: verdict=${r.verdict} outcome=${r.outcome} certified=${r.certified} complete=${r.complete} rootCount=${r.rootCount} | TRUTH ${real} crossings, ${cut} antipode jumps  ${r.rootCount!==real?'<<< WRONG BY '+(real-r.rootCount):'(correct)'}`);
};
run('2019-01-01T00:00:00Z','2020-01-01T00:00:00Z',100,'Moon 100deg, full year   (antipode crossed)');
run('2019-01-01T00:00:00Z','2019-01-20T00:00:00Z',100,'Moon 100deg, 19-day win  (antipode crossed)');
run('2019-01-08T00:00:00Z','2019-01-14T00:00:00Z',100,'Moon 100deg, 6-day win   (no antipode)      ');
