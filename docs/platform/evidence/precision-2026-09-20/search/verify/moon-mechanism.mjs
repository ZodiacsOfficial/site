import { coreBackend } from '../lib/backends.mjs';
import { measureDerivativeBounds } from '../lib/astro-harness.mjs';
import { classifyInterval, empiricalDerivativeEnclosure, empiricalSecondDerivativeEnclosure } from '../lib/interval-search.mjs';
const core=await coreBackend();
const aMs=Date.parse('2019-01-01T00:00:00Z'), bMs=Date.parse('2020-01-01T00:00:00Z');
const TARGET=100, h=600000;
// CONTINUOUS (unwrapped) version of the same problem: g(t) = lon(t) - TARGET, unwrapped
// by integrating so there is no +-180 jump. Root set of sin-based continuity is identical
// in the sense that crossings of the level are the same, but f is now continuous.
const cache=new Map();
const raw=(ms)=>{const t=Math.round(ms); if(cache.has(t))return cache.get(t); const y=core.lon('Moon',t); cache.set(t,y); return y;};
// unwrapped: use a smooth angle difference via atan2 -> still wraps. Instead use
// f(t) = sin(radians(lon - TARGET)) which is smooth and has the same zero set
// (plus the antipode zeros), so compare counts accordingly.
const f=(ms)=>Math.sin((raw(ms)-TARGET)*Math.PI/180);
const b=measureDerivativeBounds({f,a:aMs,b:bMs,samples:400,h});
const r=classifyInterval({
  f, a:aMs,b:bMs,epsilon:1e-5,minWidth:100,maxEvaluations:3000000,boundKind:'empirical',label:'Moon-sin',
  derivativeEnclosure: empiricalDerivativeEnclosure({h,secondDerivativeBound:b.bounds.secondDerivativeBound,thirdDerivativeBound:b.bounds.thirdDerivativeBound,roundoff:Number.EPSILON*64,maxGridSpacing:86400000,maxSamples:5}),
  secondDerivativeEnclosure: empiricalSecondDerivativeEnclosure({h,thirdDerivativeBound:b.bounds.thirdDerivativeBound,fourthDerivativeBound:b.bounds.fourthDerivativeBound,roundoff:Number.EPSILON*64,maxGridSpacing:86400000,maxSamples:64}),
});
console.log('CONTINUOUS sin() formulation: verdict', r.verdict, 'outcome', r.outcome, 'count', r.rootCount, 'evals', r.evaluations);
console.log('  (expected 27 = 13 crossings of 100 + 14 of the antipode 280)');
