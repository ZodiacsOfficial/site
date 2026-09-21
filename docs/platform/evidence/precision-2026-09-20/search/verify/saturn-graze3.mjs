import { findLongitudeCrossingsWith } from './lc.ts';
const { bodyLongitude } = await import('@zodiacs/engine/internal');
const DAY=86400000, lonFn=(b,d)=>bodyLongitude(b,d);
// grid-phase sweep around the constructed grazing birth instant
const base=Date.parse('1961-02-20T08:01:33.835Z');
let drops=0, tot=0, example=null;
for (let k=0;k<25;k++){
  const birth=new Date(base + k*3600000*4);   // 4-hour steps: moves natal a hair AND the scan grid phase
  const natal=bodyLongitude('Saturn',birth);
  const from=new Date(birth.getTime()+26*365.25*DAY), to=new Date(birth.getTime()+92*365.25*DAY);
  const c5=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,5);
  const cf=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,0.1);
  tot++;
  if (c5.length!==cf.length){drops++; if(!example) example={birth:birth.toISOString(),natal,c5:c5.length,cf:cf.length,
     missing: cf.filter(x=>!c5.some(y=>Math.abs(y.at-x.at)<3600000)).map(x=>x.at.toISOString())};}
}
console.log(`grid-phase sweep of ${tot} birth instants around the grazing construction: ${drops} silently drop passes`);
if (example) console.log(JSON.stringify(example,null,1));
