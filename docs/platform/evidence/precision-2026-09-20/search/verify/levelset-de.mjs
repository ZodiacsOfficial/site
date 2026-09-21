import { DeBackend } from '/home/user/site/docs/platform/evidence/swiss-benchmark/prototype/apparent.mjs';
const eng = new DeBackend('/tmp/claude-0/swisslab/de440s.bsp');
const TARGET = 32.6940395, B = 0.05;
const g = (ms) => { let d=(eng.apparentEclipticLongitude('Uranus', new Date(ms), 69.184)-TARGET)%360; if(d>180)d-=360; if(d<=-180)d+=360; return d; };
const h = (ms) => Math.abs(g(ms)) - B;   // <=0 inside
const bis=(lo,hi)=>{let flo=h(lo);for(let i=0;i<80&&hi-lo>1;i++){const m=Math.floor((lo+hi)/2);const fm=h(m);if((fm<0)===(flo<0)){lo=m;flo=fm}else hi=m}return Math.round((lo+hi)/2)};
const st = Date.parse('2020-01-11T02:10:34Z');
console.log('h at station', h(st));
const L = bis(Date.parse('2019-11-15T00:00:00Z'), st);
const R = bis(st, Date.parse('2020-03-01T00:00:00Z'));
console.log('level set DE  :', new Date(L).toISOString(), '..', new Date(R).toISOString());
console.log('duration days :', (R-L)/86400000);
console.log('recorded v6   : 2019-12-27T07:43:29.465Z .. 2020-01-25T19:18:24.834Z');
console.log('recorded days :', (1579979904834-1577432609465)/86400000);
console.log('endpoint delta s:', (L-1577432609465)/1000, (R-1579979904834)/1000);
