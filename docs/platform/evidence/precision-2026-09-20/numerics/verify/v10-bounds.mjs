import { Backend, DEFAULTS } from '../src/apparent2.mjs';
const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const cov = de.coverage();
const t0 = cov.start/86400 + 4, t1 = cov.stop/86400 - 4;
// 1) Moon apparent longitude rate, dense: every 0.25 d over 12 years around
//    epochs where perigee and max rate coincide, plus a coarse 300-yr scan.
const rate = (body, tt, h=0.02) => {
  const a = de.apparent(body, tt-h, DEFAULTS).lon, b = de.apparent(body, tt+h, DEFAULTS).lon;
  let d = (b-a)%360; if (d>180) d-=360; if (d<=-180) d+=360;
  return Math.abs(d)*3600/(2*h*86400);   // arcsec per second
};
let mx=0, at=0;
for (let tt=t0; tt<=t1; tt+=0.35) { const r = rate('Moon', tt); if (r>mx){mx=r;at=tt;} }
console.log('Moon max apparent lon rate, step 0.35 d over 1850-2150, n=', Math.round((t1-t0)/0.35), '->', mx.toFixed(7), '"/s at ttDays', at.toFixed(3));
// refine
let bmx=0,bat=at;
for (let tt=at-1; tt<=at+1; tt+=0.002) { const r=rate('Moon',tt); if(r>bmx){bmx=r;bat=tt;} }
console.log('  refined ->', bmx.toFixed(7), '"/s');
console.log('  t6 published maxApparentLonRateArcsecPerSec (Moon) = 0.6410883708585402');
console.log('  B4 bound recomputed with refined rate: |dlam| <=', (0.0017*bmx).toFixed(7), '" (published 0.0010899)');
// 2) Pluto light time max
let lt=0, lat=0;
for (let tt=t0; tt<=t1; tt+=0.5) { const r=de.apparent('Pluto', tt, DEFAULTS).lightTimeSec; if(r>lt){lt=r;lat=tt;} }
console.log('Pluto max light time, step 0.5 d, n=', Math.round((t1-t0)/0.5), '->', lt.toFixed(3), 's at', lat.toFixed(2));
console.log('  t6 published tau* used in B1 = 25091.081742538783 s ; t4 measured 25091.46775043403 s');
// 3) Mercury max barycentric speed
let vm=0;
for (let tt=t0; tt<=t1; tt+=0.5) { const s=de.baryState('Mercury', tt*86400); const v=Math.hypot(...s.vel); if(v>vm) vm=v; }
console.log('Mercury max barycentric speed, step 0.5 d ->', vm.toFixed(6), 'km/s ; t6 published 58.99008280923636');
