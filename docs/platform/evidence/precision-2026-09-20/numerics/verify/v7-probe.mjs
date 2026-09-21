import { Backend, DEFAULTS } from '../src/apparent2.mjs';
const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const eps = [[2475612.828881469,'Uranus'],[2498117.927378965,'Venus'],[2498117.927378965,'Mars'],[2498117.927378965,'Sun']];
const out = [];
for (const [jd, body] of eps) {
  const tt = jd - 2451545.0;
  const b = de.apparent(body, tt, DEFAULTS);
  const nd = de.apparent(body, tt, {...DEFAULTS, deflection:'none'});
  const s = de.apparent('Sun', tt, DEFAULTS);
  let el = Math.abs(b.lon - s.lon); if (el>180) el=360-el;
  out.push({jd, body, lon:b.lon, lonNoDefl:nd.lon, elongDeg:el, deflLon:(b.lon-nd.lon)*3600, limiter:b.deflectionLimiterBound, distAu:b.distKm/149597870.7});
}
console.log(JSON.stringify(out,null,1));
