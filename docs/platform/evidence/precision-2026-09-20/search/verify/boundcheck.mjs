// Is the 401-point measured max x10 actually a bound? Compare with a dense scan.
import { coreBackend, circular, DAY_MS } from '../lib/backends.mjs';
import { measureDerivativeBounds } from '../lib/astro-harness.mjs';
const core = await coreBackend();
const h = 600000;
function mk(body, target){ const c=new Map(); return (ms)=>{const t=Math.round(ms); if(c.has(t))return c.get(t); const y=circular(core.lon(body,t),target); c.set(t,y); return y;}; }
function denseMax(f,a,b,stepMs){
  let m2=0,m3=0,m4=0;
  for(let t=a;t<=b;t+=stepMs){
    const T=Math.round(t);
    const [ym2,ym1,y0,yp1,yp2]=[T-2*h,T-h,T,T+h,T+2*h].map(f);
    m2=Math.max(m2,Math.abs((yp1-2*y0+ym1)/(h*h)));
    m3=Math.max(m3,Math.abs((yp2-2*yp1+2*ym1-ym2)/(2*h*h*h)));
    m4=Math.max(m4,Math.abs((yp2-4*yp1+6*y0-4*ym1+ym2)/(h**4)));
  }
  return {m2,m3,m4};
}
const cases=[
  ['Uranus',32.6940395,'2019-01-01','2020-12-31'],
  ['Mercury',230,'2019-01-01','2020-01-01'],
  ['Mercury',230,'2010-01-01','2020-01-01'],
  ['Moon',100,'2020-01-01','2020-02-01'],
  ['Moon',100,'2019-01-01','2020-01-01'],
  ['Venus',45,'2019-01-01','2020-01-01'],
];
for (const [body,target,from,to] of cases){
  const f=mk(body,target); const a=Date.parse(from+'T00:00:00Z'), b=Date.parse(to+'T00:00:00Z');
  const g=measureDerivativeBounds({f,a,b,samples:400,h});
  const step=Math.max(3600000, Math.round((b-a)/20000));
  const d=denseMax(f,a,b,step);
  const r2=d.m2/g.measured.maxAbsSecondDerivative, r3=d.m3/g.measured.maxAbsThirdDerivative, r4=d.m4/g.measured.maxAbsFourthDerivative;
  console.log(`${body} T=${target} ${from}..${to}  grid step ${( (b-a)/400/DAY_MS).toFixed(2)}d, dense step ${(step/DAY_MS).toFixed(3)}d`);
  console.log(`   dense/401grid ratios  f''=${r2.toFixed(3)}  f'''=${r3.toFixed(3)}  f''''=${r4.toFixed(3)}   ${(r2>10||r3>10||r4>10)?'*** SAFETY FACTOR 10 VIOLATED ***':'(within 10x)'}`);
}
