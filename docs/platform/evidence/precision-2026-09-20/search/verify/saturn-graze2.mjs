import { findLongitudeCrossingsWith } from './lc.ts';
const { bodyLongitude } = await import('@zodiacs/engine/internal');
const DAY=86400000, lonFn=(b,d)=>bodyLongitude(b,d);
const L=(ms)=>bodyLongitude('Saturn',new Date(ms));
const d1=(ms)=>(L(ms+6*3600000)-L(ms-6*3600000));
let a=Date.parse('1990-01-01T00:00:00Z'), b=Date.parse('1990-08-01T00:00:00Z');
let da=d1(a);
for(let i=0;i<60&&b-a>1000;i++){const m=Math.floor((a+b)/2);const dm=d1(m); if((dm<0)===(da<0)){a=m;da=dm}else b=m;}
const ts=Math.round((a+b)/2), Ls=L(ts);
console.log('Saturn station', new Date(ts).toISOString(), 'longitude', Ls.toFixed(6), '(max of longitude)');
const g=(ms,want)=>{let d=(L(ms)-want)%360; if(d>180)d-=360; if(d<=-180)d+=360; return d;};
for (const dip of [0.004, 0.0008]) {
  const want = Ls - dip;
  // scan daily for a sign change of g over the 29-30 y earlier window
  let found=null, lo0=ts-31*365.25*DAY, hi0=ts-28*365.25*DAY, prev=g(lo0,want);
  for(let t=lo0+DAY;t<=hi0;t+=DAY){const cur=g(t,want); if(prev!==0&&Math.sign(cur)!==Math.sign(prev)&&Math.abs(cur)<90&&Math.abs(prev)<90){found=[t-DAY,t];break;} prev=cur;}
  if(!found){console.log('  dip',dip,'no bracket'); continue;}
  let [lo,hi]=found, glo=g(lo,want);
  for(let i=0;i<60&&hi-lo>1;i++){const m=Math.floor((lo+hi)/2);const gm=g(m,want); if((gm<0)===(glo<0)){lo=m;glo=gm}else hi=m;}
  const birth=new Date(Math.round((lo+hi)/2));
  const natal=bodyLongitude('Saturn',birth);
  const from=new Date(birth.getTime()+26*365.25*DAY), to=new Date(birth.getTime()+92*365.25*DAY);
  const c5=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,5);
  const cf=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,0.1);
  console.log(`  dip ${dip}: birth ${birth.toISOString()} natal ${natal.toFixed(7)}  station-natal ${(Ls-natal).toFixed(7)} deg`);
  console.log(`     production 5-day: ${c5.length}   0.1-day reference: ${cf.length}   ${c5.length!==cf.length?'*** PRODUCTION DROPS '+(cf.length-c5.length)+' ***':'(agree)'}`);
  console.log('     ref times:', cf.map(x=>x.at.toISOString().slice(0,19)).join(' | '));
  console.log('     5d  times:', c5.map(x=>x.at.toISOString().slice(0,19)).join(' | '));
}
