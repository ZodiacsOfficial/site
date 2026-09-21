/*
 * A hidden double-crossing inside one scan step needs the planet to cross
 * a sign boundary, turn, and cross back -- so it needs a STATION, and the
 * station has to sit within the excursion the planet makes in half a step
 * of that boundary. This measures both quantities instead of sampling
 * harder: for every station in each scanned window, the distance from the
 * station's longitude to the nearest 30-degree boundary, and the largest
 * excursion the planet makes within +/-12h of any station.
 */
import { MakeTime, GeoVector, RotateVector, Rotation_EQJ_ECT, Body } from 'astronomy-engine';
const DAY = 86400000, HOUR = 3600000;
const lonAt = (p, d) => { const t = MakeTime(d); const v = RotateVector(Rotation_EQJ_ECT(t), GeoVector(Body[p], t, true));
  return ((Math.atan2(v.y, v.x) * 180) / Math.PI + 360) % 360; };
const dlon = (p, a, b) => { let d = lonAt(p, new Date(b)) - lonAt(p, new Date(a)); if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
const rate = (p, t) => dlon(p, t - HOUR * 3, t + HOUR * 3);

const GROUPS = [
  { planets: ['Mercury','Venus','Mars'], from: Date.parse('2026-01-01T00:00:00Z'), to: Date.parse('2029-07-01T00:00:00Z') },
  { planets: ['Jupiter'], from: Date.parse('2014-01-01T00:00:00Z'), to: Date.parse('2046-01-01T00:00:00Z') },
  { planets: ['Saturn'], from: Date.parse('1980-01-01T00:00:00Z'), to: Date.parse('2080-01-01T00:00:00Z') },
  { planets: ['Uranus','Neptune','Pluto'], from: Date.parse('1900-01-01T00:00:00Z'), to: Date.parse('2100-01-01T00:00:00Z') },
];
const toBoundary = (lon) => { const m = ((lon % 30) + 30) % 30; return Math.min(m, 30 - m); };

for (const g of GROUPS) {
  for (const p of g.planets) {
    let n = 0, minMargin = Infinity, minAt = null, maxExc = 0;
    let prev = rate(p, g.from);
    for (let t = g.from + DAY; t <= g.to; t += DAY) {
      const r = rate(p, t);
      if (Math.sign(r) !== Math.sign(prev)) {
        // bisect to the station
        let lo = t - DAY, hi = t, rl = prev;
        for (let i = 0; i < 30; i += 1) { const mid = (lo + hi) / 2; const rm = rate(p, mid);
          if (Math.sign(rm) === Math.sign(rl)) { lo = mid; rl = rm; } else hi = mid; }
        const ts = (lo + hi) / 2; n += 1;
        const m = toBoundary(lonAt(p, new Date(ts)));
        if (m < minMargin) { minMargin = m; minAt = new Date(ts).toISOString().slice(0, 10); }
        // excursion within +/-12h of the station
        const l0 = lonAt(p, new Date(ts));
        for (const h of [-12, -6, 6, 12]) { const e = Math.abs(lonAt(p, new Date(ts + h * HOUR)) - l0);
          if (e < 180 && e > maxExc) maxExc = e; }
      }
      prev = r;
    }
    const safe = minMargin > maxExc;
    console.log(`${p.padEnd(8)} stations=${String(n).padStart(4)}  closest station to a sign boundary = ${minMargin.toFixed(4)} deg (${minAt})  ` +
      `max excursion within +/-12h of a station = ${maxExc.toFixed(4)} deg  ->  ${safe ? 'cannot double-cross in one day' : '*** MARGIN NOT ESTABLISHED ***'}`);
  }
}
