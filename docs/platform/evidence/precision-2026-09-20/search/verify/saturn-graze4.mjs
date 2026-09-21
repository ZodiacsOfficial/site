import { findLongitudeCrossingsWith } from './lc.ts';
const { bodyLongitude } = await import('@zodiacs/engine/internal');
const DAY=86400000, lonFn=(b,d)=>bodyLongitude(b,d);
const L=(ms)=>bodyLongitude('Saturn',new Date(ms));
const d1=(ms)=>(L(ms+6*3600000)-L(ms-6*3600000));
let a=Date.parse('1990-01-01T00:00:00Z'), b=Date.parse('1990-08-01T00:00:00Z'), da=d1(a);
for(let i=0;i<60&&b-a>1000;i++){const m=Math.floor((a+b)/2);const dm=d1(m); if((dm<0)===(da<0)){a=m;da=dm}else b=m;}
const ts=Math.round((a+b)/2), Ls=L(ts);
const g=(ms,want)=>{let d=(L(ms)-want)%360; if(d>180)d-=360; if(d<=-180)d+=360; return d;};
let drops=0, tot=0, examples=[];
for (let i=1;i<=40;i++){
  const dip = i*0.0001;
  const want = Ls - dip;
  let found=null, prev=g(ts-31*365.25*DAY,want);
  for(let t=ts-31*365.25*DAY+DAY;t<=ts-28*365.25*DAY;t+=DAY){const cur=g(t,want); if(prev!==0&&Math.sign(cur)!==Math.sign(prev)&&Math.abs(cur)<90&&Math.abs(prev)<90){found=[t-DAY,t];break;} prev=cur;}
  if(!found) continue;
  let [lo,hi]=found, glo=g(lo,want);
  for(let k=0;k<60&&hi-lo>1;k++){const m=Math.floor((lo+hi)/2);const gm=g(m,want); if((gm<0)===(glo<0)){lo=m;glo=gm}else hi=m;}
  const birth=new Date(Math.round((lo+hi)/2));
  const natal=bodyLongitude('Saturn',birth);
  const from=new Date(birth.getTime()+26*365.25*DAY), to=new Date(birth.getTime()+92*365.25*DAY);
  const c5=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,5);
  const cf=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,0.1);
  tot++;
  if (c5.length!==cf.length){drops++; if(examples.length<3) examples.push({dip:+(Ls-natal).toFixed(7),birth:birth.toISOString(),coarse:c5.length,fine:cf.length,
     missing: cf.filter(x=>!c5.some(y=>Math.abs(y.at-x.at)<3600000)).map(x=>x.at.toISOString())});}
}
console.log(`grazing Saturn returns constructed: ${tot}; production 5-day scan silently drops passes in ${drops} of them`);
console.log(JSON.stringify(examples,null,1));
