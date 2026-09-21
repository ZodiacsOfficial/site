import { Backend, DEFAULTS } from '../src/apparent2.mjs';
const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
// The deepest conjunction found by the published scan: Mercury, ttDays -16673.5397
const cases = [['Mercury', -16673.539719440196], ['Uranus', -13475.0], ['Mercury', -3703.7205855339553]];
console.log('Effect of ERFA eraLdsun clamp (1e-6) vs the 1e-14 used here, on |dLon| of the deflection:');
for (const [body, tt] of cases) {
  const off = de.apparent(body, tt, {...DEFAULTS, deflection:'none'});
  const a14 = de.apparent(body, tt, {...DEFAULTS, deflectionLimit:1e-14});
  const a6  = de.apparent(body, tt, {...DEFAULTS, deflectionLimit:1e-6});
  const d14 = (a14.lon-off.lon)*3600, d6 = (a6.lon-off.lon)*3600;
  console.log(`  ${body} tt=${tt}:  1e-14 -> ${d14.toFixed(5)}"  |  1e-6 (ERFA) -> ${d6.toFixed(5)}"  | ERFA limiter bound=${a6.deflectionLimiterBound}`);
}
// find the deflection value at which the ERFA clamp starts to bind, by scanning a conjunction
let maxCapped = 0, maxUncapped = 0;
for (let t = -16675; t <= -16672; t += 0.002) {
  const off = de.apparent('Mercury', t, {...DEFAULTS, deflection:'none'});
  const a6  = de.apparent('Mercury', t, {...DEFAULTS, deflectionLimit:1e-6});
  const a14 = de.apparent('Mercury', t, {...DEFAULTS, deflectionLimit:1e-14});
  maxCapped = Math.max(maxCapped, Math.abs((a6.lon-off.lon)*3600));
  maxUncapped = Math.max(maxUncapped, Math.abs((a14.lon-off.lon)*3600));
}
console.log(`Over the 1954 Mercury transit window: max |dLon| with ERFA clamp = ${maxCapped.toFixed(4)}" ; with 1e-14 = ${maxUncapped.toFixed(4)}"`);
