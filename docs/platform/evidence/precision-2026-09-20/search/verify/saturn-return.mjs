// The track's proposed-but-unrun experiment 3: does saturnReturns' 5-day scan
// silently drop a grazing pair? Uses the repository's real scanner and real engine.
import { findLongitudeCrossingsWith } from './lc.ts';
const { bodyLongitude } = await import('@zodiacs/engine/internal');
const DAY=86400000;
const lonFn=(b,d)=>bodyLongitude(b,d);
let checked=0, dropped=[];
for (let y=1950; y<=1999; y++){
 for (let m=0;m<12;m++){
  const birth=new Date(Date.UTC(y,m,15));
  const natal=bodyLongitude('Saturn',birth);
  const from=new Date(birth.getTime()+26*365.25*DAY), to=new Date(birth.getTime()+92*365.25*DAY);
  const c5=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,5);      // production default
  const cf=findLongitudeCrossingsWith(lonFn,'Saturn',natal,from,to,0.25);   // reference
  checked++;
  if (c5.length!==cf.length) dropped.push({birth:birth.toISOString().slice(0,10),natal:natal.toFixed(5),coarse:c5.length,fine:cf.length});
 }
}
console.log('birth dates checked:',checked);
console.log('cases where the production 5-day scan differs from a 0.25-day scan:',dropped.length);
console.log(JSON.stringify(dropped.slice(0,20),null,1));
