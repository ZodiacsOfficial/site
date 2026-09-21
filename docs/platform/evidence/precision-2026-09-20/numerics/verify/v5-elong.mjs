import { Backend, DEFAULTS } from '../src/apparent2.mjs';
const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const D2R=Math.PI/180;
const cases = [['2065-11-23','Uranus'],['2127-07-07','Venus'],['2127-07-07','Mars'],['1884-07-20','Venus'],['2127-01-05','Jupiter']];
for (const [date, body] of cases) {
  const ttDays = (Date.parse(date+'T00:00:00Z')/86400000) - 10957.5;
  // find nearest grid epoch actually used is not needed; use the date
  const b = de.apparent(body, ttDays, DEFAULTS);
  const s = de.apparent('Sun', ttDays, DEFAULTS);
  let dlon = Math.abs(b.lon - s.lon); if (dlon>180) dlon = 360-dlon;
  const noDefl = de.apparent(body, ttDays, {...DEFAULTS, deflection:'none'});
  let dd = (b.lon - noDefl.lon)*3600;
  console.log(`${date} ${body}: elongation~${dlon.toFixed(3)} deg, deflection contribution to lon = ${dd.toFixed(6)}", limiterBound=${b.deflectionLimiterBound}`);
}
