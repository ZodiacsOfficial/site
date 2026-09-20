import { classifyInterval } from '../lib/interval-search.mjs';
const base = { a:0, b:1, epsilon:1e-6, minWidth:1e-4, derivativeEnclosure:()=>[-2,2] };
const show=(n,r)=>console.log(`${n.padEnd(38)} verdict=${r.verdict} outcome=${r.outcome} reason=${r.reason}`);
show('b < a',            classifyInterval({...base, f:t=>t, a:1, b:0}));
show('epsilon NaN',      classifyInterval({...base, f:t=>t, epsilon:NaN}));
show('epsilon negative', classifyInterval({...base, f:t=>t, epsilon:-1}));
show('minWidth 0',       classifyInterval({...base, f:t=>t, minWidth:0}));
show('maxEvaluations 3', classifyInterval({...base, f:t=>t, maxEvaluations:3}));
show('no enclosure',     classifyInterval({...base, f:t=>t, derivativeEnclosure:undefined}));
// a backend that returns NaN mid-interval (a real failure mode: a kernel gap, a bad epoch)
try {
  const r = classifyInterval({...base, f:(t)=> (t>0.3&&t<0.4) ? NaN : t-0.5});
  show('f returns NaN mid-interval', r);
} catch (e) { console.log('f returns NaN mid-interval'.padEnd(38), 'THREW', e.constructor.name+': '+e.message); }
// an enclosure that returns a reversed pair
try {
  const r = classifyInterval({...base, f:t=>t-0.5, derivativeEnclosure:()=>[2,-2]});
  show('reversed enclosure pair', r);
} catch (e) { console.log('reversed enclosure pair'.padEnd(38), 'THREW', e.constructor.name+': '+e.message); }
// budget overrun accounting
const g = classifyInterval({ f:t=>t*t, a:-1, b:1, epsilon:0, minWidth:1e-15, derivativeEnclosure:(u,v)=>[2*u,2*v], maxEvaluations:20 });
console.log('maxEvaluations=20 -> evaluations used =', g.evaluations, '(declared limit exceeded by', g.evaluations-20, ')');
