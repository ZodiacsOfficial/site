// Independent DE440s station location - verifier's own code, golden-section on longitude,
// not the track's derivative bisection.
import { DeBackend } from '/home/user/site/docs/platform/evidence/swiss-benchmark/prototype/apparent.mjs';
const eng = new DeBackend('/tmp/claude-0/swisslab/de440s.bsp');
const TARGET = 32.6940395;
const L = (ms) => eng.apparentEclipticLongitude('Uranus', new Date(ms), 69.184);
// golden section minimise longitude over Jan 5..Jan 17 2020
let a = Date.parse('2020-01-05T00:00:00Z'), b = Date.parse('2020-01-17T00:00:00Z');
const phi = (Math.sqrt(5)-1)/2;
let c = b - phi*(b-a), d = a + phi*(b-a);
let fc = L(c), fd = L(d);
for (let i=0;i<200 && (b-a)>1;i++){
  if (fc < fd){ b=d; d=c; fd=fc; c=b-phi*(b-a); fc=L(c);} else {a=c;c=d;fc=fd;d=a+phi*(b-a); fd=L(d);}
}
const t = Math.round((a+b)/2);
const lon = L(t);
console.log('station utc      :', new Date(t).toISOString());
console.log('station longitude:', lon);
console.log('g* signed        :', lon-TARGET);
console.log('|g*|             :', Math.abs(lon-TARGET));
console.log('track reported   :', 0.044174733140231126);
console.log('delta arcsec     :', (Math.abs(lon-TARGET)-0.044174733140231126)*3600);
console.log('vs recorded arcsec:', (Math.abs(lon-TARGET)-0.04418806505509565)*3600);
// curvature at the station by second central difference at several h, degrees/day^2
const DAY=86400000;
for (const hd of [0.5, 1, 2, 5]) {
  const h = hd*DAY;
  const dd = (L(t+h) - 2*lon + L(t-h))/(h*h)*DAY*DAY;
  console.log(`curvature h=${hd}d :`, dd);
}
