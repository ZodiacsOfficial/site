import { coreBackend, deBackend, circular, DAY_MS } from '../lib/backends.mjs';
import { measureDerivativeBounds } from '../lib/astro-harness.mjs';
const h=600000;
const core=await coreBackend(), de=await deBackend();
function mk(lon,body,target){const c=new Map();return ms=>{const t=Math.round(ms);if(c.has(t))return c.get(t);const y=circular(lon(body,t),target);c.set(t,y);return y};}
const a=Date.parse('2019-01-01T00:00:00Z'), b=Date.parse('2020-12-31T00:00:00Z');
for (const [id,lon] of [['core',core.lon],['de',de.lon]]) {
  const f=mk(lon,'Uranus',32.6940395);
  const g=measureDerivativeBounds({f,a,b,samples:400,h});
  // dense scan at 1 hour
  let m2=0,m3=0,m4=0,t2=0,t3=0,t4=0;
  for(let t=a;t<=b;t+=3600000){
    const T=t;
    const [ym2,ym1,y0,yp1,yp2]=[T-2*h,T-h,T,T+h,T+2*h].map(f);
    const v2=Math.abs((yp1-2*y0+ym1)/(h*h)); if(v2>m2){m2=v2;t2=T;}
    const v3=Math.abs((yp2-2*yp1+2*ym1-ym2)/(2*h**3)); if(v3>m3){m3=v3;t3=T;}
    const v4=Math.abs((yp2-4*yp1+6*y0-4*ym1+ym2)/(h**4)); if(v4>m4){m4=v4;t4=T;}
  }
  const ULP=Number.EPSILON*64;
  console.log(`--- ${id} ---`);
  console.log(` f''   grid ${g.measured.maxAbsSecondDerivative.toExponential(4)}  dense ${m2.toExponential(4)}  ratio ${(m2/g.measured.maxAbsSecondDerivative).toFixed(2)}  bound(x10) ${g.bounds.secondDerivativeBound.toExponential(4)}  violated=${m2>g.bounds.secondDerivativeBound}`);
  console.log(` f'''  grid ${g.measured.maxAbsThirdDerivative.toExponential(4)}  dense ${m3.toExponential(4)}  ratio ${(m3/g.measured.maxAbsThirdDerivative).toFixed(2)}  bound(x10) ${g.bounds.thirdDerivativeBound.toExponential(4)}  violated=${m3>g.bounds.thirdDerivativeBound}`);
  console.log(` f'''' grid ${g.measured.maxAbsFourthDerivative.toExponential(4)}  dense ${m4.toExponential(4)}  ratio ${(m4/g.measured.maxAbsFourthDerivative).toFixed(2)}  bound(x10) ${g.bounds.fourthDerivativeBound.toExponential(4)}  violated=${m4>g.bounds.fourthDerivativeBound}`);
  console.log(` noise floors at h=10min: f''' ~ ${(2*ULP/h**3).toExponential(2)}   f'''' ~ ${(16*ULP/h**4).toExponential(2)}`);
  console.log(` argmax f'''' at ${new Date(t4).toISOString()}, argmax f''' at ${new Date(t3).toISOString()}`);
}
