import { coreBackend, circular } from '../lib/backends.mjs';
import * as A from 'astronomy-engine';
const core = await coreBackend();
const t = A.MakeTime(new Date('2020-01-11T00:00:00Z'));
console.log('astronomy-engine Delta-T (TT-UT) at 2020-01-11 =', ((t.tt-t.ut)*86400).toFixed(4), 's   (track reported 71.593)');
// independent core-engine station by golden section on longitude
const L=(ms)=>core.lon('Uranus',ms);
let a=Date.parse('2020-01-05T00:00:00Z'), b=Date.parse('2020-01-17T00:00:00Z');
const phi=(Math.sqrt(5)-1)/2; let c=b-phi*(b-a), d=a+phi*(b-a), fc=L(c), fd=L(d);
for(let i=0;i<200&&(b-a)>1;i++){ if(fc<fd){b=d;d=c;fd=fc;c=b-phi*(b-a);fc=L(c);} else {a=c;c=d;fc=fd;d=a+phi*(b-a);fd=L(d);} }
const tt=Math.round((a+b)/2), lon=L(tt);
console.log('core station', new Date(tt).toISOString(), '|g*| =', Math.abs(lon-32.6940395), ' (track reported 0.04332634157313464)');
console.log('delta arcsec vs track:', (Math.abs(lon-32.6940395)-0.04332634157313464)*3600);
