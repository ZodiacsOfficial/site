import { Backend, DEFAULTS } from '../src/apparent2.mjs';
import { writeFileSync } from 'node:fs';
const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const out=[];
// dense daily scan around the 2065-11 Uranus solar conjunction
const base = (Date.parse('2065-11-08T00:00:00Z')/86400000) - 10957.5;
for (let i=0;i<40;i++){
  const ttDays = base + i;
  const b = de.apparent('Uranus', ttDays, DEFAULTS);
  const nd = de.apparent('Uranus', ttDays, {...DEFAULTS, deflection:'none'});
  const s = de.apparent('Sun', ttDays, DEFAULTS);
  let el = Math.abs(b.lon - s.lon); if (el>180) el=360-el;
  out.push({jdTt: ttDays+2451545.0, lon: b.lon, lonNoDefl: nd.lon, elongDeg: el,
            deflLonArcsec: (b.lon-nd.lon)*3600, limiter: b.deflectionLimiterBound});
}
writeFileSync('verify/v6-conj.json', JSON.stringify(out));
console.log('wrote', out.length);
