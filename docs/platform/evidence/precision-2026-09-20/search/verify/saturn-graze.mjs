// Construct the grazing Saturn return the track hypothesised but did not build.
import { findLongitudeCrossingsWith } from './lc.ts';
const { bodyLongitude } = await import('@zodiacs/engine/internal');
const DAY=86400000, lonFn=(b,d)=>bodyLongitude(b,d);
const L=(ms)=>bodyLongitude('Saturn',new Date(ms));
// 1. find a Saturn station (longitude maximum) near 1990
const d1=(ms)=>(L(ms+6*3600000)-L(ms-6*3600000));
let a=Date.parse('1990-01-01T00:00:00Z'), b=Date.parse('1990-08-01T00:00:00Z');
let da=d1(a);
for(let i=0;i<60&&b-a>1000;i++){const m=Math.floor((a+b)/2);const dm=d1(m); if((dm<0)===(da<0)){a=m;da=dm}else b=m;}
const ts=Math.round((a+b)/2), Ls=L(ts);
console.log('Saturn station', new Date(ts).toISOString(), 'longitude', Ls.toFixed(6));
for (const dip of [0.004, 0.001]) {
  const want = Ls - dip;
  // 2. solve for a birth instant ~29.46 y earlier with natal Saturn == want
  let lo=ts-30.5*365.25*DAY, hi=ts-28.5*365.25*DAY;
  const g=(ms)=>{let d=(L(ms)-want)%360; if(d>180)d-=360; if(d<=-180)d+=360; return d;};
  let glo=g(lo);
  if (glo*g(hi)>0){ console.log('  no bracket for dip',dip); continue; }
  for(let i=0;i<70&&hi-lo>1;i++){const m=Math.floor((lo+hi)/2);const gm=g(m); if((gm<0)===(glo<0)){lo=m;glo=gm}else hi=m;}
  const birth=new Date(Math.round((lo+hi)/2));
  const natal=bodyLongitude('Saturn',birth);
  const from=new Date(birth.getTime()+26*365.25*DAY), to=new Date(birth.getTime()+92*365.25*DAY);
  const c5=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,5);
  const cf=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,0.1);
  console.log(`  dip ${dip}: birth ${birth.toISOString()}  natal ${natal.toFixed(7)} (station-natal = ${(Ls-natal).toFixed(7)} deg)`);
  console.log(`     production 5-day scan: ${c5.length} crossings | 0.1-day reference: ${cf.length} crossings  ${c5.length!==cf.length?'*** PRODUCTION DROPS '+(cf.length-c5.length)+' PASS(ES) ***':''}`);
  console.log('     reference times:', cf.map(x=>x.at.toISOString()).join(', '));
}
