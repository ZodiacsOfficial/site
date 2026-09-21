/**
 * Gravitational deflection WHERE IT BITES.
 *
 * A grid coarse enough to be cheap will step straight over the tightest solar
 * conjunctions, so this scans daily for minima of geocentric elongation, then
 * refines each candidate on the full reduction and reports the omitted
 * deflection at the actual minimum.
 *
 *   node t4-conjunctions.mjs > raw/t4-conjunctions.json
 */
import { Backend, DEFAULTS } from '../src/apparent2.mjs';

const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const cov = de.coverage();
const BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Moon'];
const OFF = { ...DEFAULTS, deflection: 'none' };
const circ = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d; };
const SUN_RADIUS_DEG = 0.2666;      // mean apparent semi-diameter

const lo = cov.start / 86400 + 5;
const hi = cov.stop / 86400 - 5;

/** True angular separation from the Sun's centre, degrees. */
function elong(body, ttDays) {
  const b = de.apparent(body, ttDays, DEFAULTS);
  const s = de.apparent('Sun', ttDays, DEFAULTS);
  const dl = circ(b.lon, s.lon) * Math.cos((b.lat + s.lat) / 2 * Math.PI / 180);
  const db = b.lat - s.lat;
  return Math.hypot(dl, db);
}

const out = { what: 'omitted gravitational deflection at the tightest solar conjunctions in 1850-2150', sunSemiDiameterDeg: SUN_RADIUS_DEG, bodies: {} };
for (const body of BODIES) {
  let best = { e: 1e9, t: null };
  const events = [];
  let prev = null; let prev2 = null;
  for (let t = lo; t <= hi; t += 1) {
    const e = elong(body, t);
    if (prev2 !== null && prev.e < prev2.e && prev.e < e && prev.e < 6) events.push(prev.t);
    prev2 = prev; prev = { e, t };
  }
  // Golden-section refine every candidate minimum.
  const refined = [];
  for (const t0 of events) {
    let a = t0 - 1.5; let b = t0 + 1.5;
    const gr = (Math.sqrt(5) - 1) / 2;
    let c = b - gr * (b - a); let d = a + gr * (b - a);
    let fc = elong(body, c); let fd = elong(body, d);
    for (let i = 0; i < 60; i += 1) {
      if (fc < fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = elong(body, c); }
      else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = elong(body, d); }
    }
    const tm = (a + b) / 2;
    const e = elong(body, tm);
    const on = de.apparent(body, tm, DEFAULTS);
    const off = de.apparent(body, tm, OFF);
    const behindDisc = e < SUN_RADIUS_DEG;
    refined.push({ ttDays: tm, year: 2000 + tm / 365.25, elongDeg: e, behindSolarDisc: behindDisc,
                   limiterBound: on.deflectionLimiterBound,
                   deflectionLonArcsec: circ(off.lon, on.lon) * 3600,
                   deflectionLatArcsec: (off.lat - on.lat) * 3600,
                   totalDeflectionArcsec: Math.hypot(circ(off.lon, on.lon) * 3600 * Math.cos(on.lat * Math.PI / 180), (off.lat - on.lat) * 3600) });
    if (e < best.e) best = { e, t: tm };
  }
  refined.sort((x, y) => x.elongDeg - y.elongDeg);
  const outside = refined.filter((r) => !r.behindSolarDisc);
  out.bodies[body] = {
    nCandidateMinima: events.length,
    tightestOutsideDiscDeg: outside.length ? Math.min(...outside.map((r) => r.elongDeg)) : null,
    maxDeflectionOutsideDiscArcsec: outside.length ? Math.max(...outside.map((r) => Math.abs(r.deflectionLonArcsec))) : null,
    nEventsBehindDisc: refined.length - outside.length,
    tightestElongDeg: refined[0]?.elongDeg ?? null,
    tightestIsInsideSolarDisc: (refined[0]?.elongDeg ?? 99) < SUN_RADIUS_DEG,
    maxDeflectionLonArcsec: refined.length ? Math.max(...refined.map((r) => Math.abs(r.deflectionLonArcsec))) : null,
    nEventsUnder5deg: refined.filter((r) => r.elongDeg < 5).length,
    nEventsWithDeflectionOver0p05: refined.filter((r) => Math.abs(r.deflectionLonArcsec) > 0.05).length,
    tightestTen: refined.slice(0, 10),
  };
}
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
