import { findLongitudeCrossingsWith as cur } from '<base>/src/lib/engine/longitude-crossings';
import { findLongitudeCrossingsWith as cand } from '<candidate>/src/lib/engine/longitude-crossings';
import { bodyLongitude } from '<base>/src/lib/engine/full';
const DAY = 86_400_000;
const STEP: Record<string, number> = { Sun: 1, Moon: 0.25, Mercury: 0.5, Venus: 1, Mars: 1, Jupiter: 2, Saturn: 5, Uranus: 5, Neptune: 5, Pluto: 5 };
let seed = 20260923; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let identical = 0, supersets = 0, other = 0; const examples: unknown[] = [];
for (let i = 0; i < 3000; i++) {
  const bodies = Object.keys(STEP); const body = bodies[Math.floor(rnd() * bodies.length)] as any;
  const from = new Date(Date.UTC(1900, 0, 1) + rnd() * 290 * 365.25 * DAY);
  const span = (body === 'Moon' ? 60 : body === 'Sun' || body === 'Mercury' || body === 'Venus' || body === 'Mars' ? 400 : 3000) * rnd() + 1;
  const to = new Date(from.getTime() + span * DAY); const target = rnd() * 360;
  const a = cur(bodyLongitude, body, target, from, to, STEP[body]).map((c) => `${c.at.getTime()}${c.retrograde ? 'R' : ''}`);
  const b = cand(bodyLongitude, body, target, from, to, STEP[body]).map((c) => `${c.at.getTime()}${c.retrograde ? 'R' : ''}`);
  if (a.join() === b.join()) identical++; else if (a.every((x) => b.includes(x))) { supersets++; examples.push({ body, from: from.toISOString(), target, a: a.length, b: b.length }); } else { other++; examples.push({ body, from: from.toISOString(), to: to.toISOString(), target, a, b }); }
}
console.log(JSON.stringify({ cases: 3000, identical, candidateStrictSuperset: supersets, other, examples: examples.slice(0, 8) }, null, 1));
