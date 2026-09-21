/**
 * The omitted gravitational deflection, measured on the quantity the product
 * actually reports: apparent ecliptic LONGITUDE.
 *
 * Scanning for the minimum of solar elongation is the wrong search: at the
 * instant of closest approach the body's offset from the Sun is almost purely
 * in latitude, so the deflection is too, and the longitude component passes
 * through zero.  The longitude effect peaks a day or two either side.  So this
 * scans |delta longitude| itself, daily, then refines each local maximum.
 *
 *   node t4-deflection.mjs > raw/t4-deflection.json
 */
import { Backend, DEFAULTS } from '../src/apparent2.mjs';

const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const cov = de.coverage();
const BODIES = ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const OFF = { ...DEFAULTS, deflection: 'none' };
const circ = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d; };
const SUN_SEMI_DIAMETER_DEG = 0.2666;

const lo = cov.start / 86400 + 5;
const hi = cov.stop / 86400 - 5;

function probe(body, ttDays) {
  const on = de.apparent(body, ttDays, DEFAULTS);
  const off = de.apparent(body, ttDays, OFF);
  const sun = de.apparent('Sun', ttDays, DEFAULTS);
  const dl = circ(on.lon, sun.lon) * Math.cos(((on.lat + sun.lat) / 2) * Math.PI / 180);
  return {
    dLon: circ(on.lon, off.lon) * 3600,
    dLat: (on.lat - off.lat) * 3600,
    elong: Math.hypot(dl, on.lat - sun.lat),
    limited: on.deflectionLimiterBound,
  };
}

const out = { what: 'omitted solar gravitational deflection in apparent ecliptic longitude, 1850-2150',
              sunSemiDiameterDeg: SUN_SEMI_DIAMETER_DEG, coverageEt: cov, bodies: {} };
for (const body of BODIES) {
  const peaks = [];
  let p2 = null; let p1 = null;
  let over05 = 0; let over01 = 0; let days = 0;
  for (let t = lo; t <= hi; t += 1) {
    const r = probe(body, t);
    days += 1;
    if (Math.abs(r.dLon) > 0.05) over05 += 1;
    if (Math.abs(r.dLon) > 0.01) over01 += 1;
    if (p2 && Math.abs(p1.r.dLon) > Math.abs(p2.r.dLon) && Math.abs(p1.r.dLon) > Math.abs(r.dLon) && Math.abs(p1.r.dLon) > 0.02) {
      peaks.push(p1.t);
    }
    p2 = p1; p1 = { t, r };
  }
  // Golden-section on |dLon| around each daily peak.
  const refined = [];
  for (const t0 of peaks) {
    let a = t0 - 1.2; let b = t0 + 1.2;
    const gr = (Math.sqrt(5) - 1) / 2;
    const f = (x) => -Math.abs(probe(body, x).dLon);
    let c = b - gr * (b - a); let d = a + gr * (b - a);
    let fc = f(c); let fd = f(d);
    for (let i = 0; i < 50; i += 1) {
      if (fc < fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = f(c); }
      else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = f(d); }
    }
    const tm = (a + b) / 2;
    const r = probe(body, tm);
    refined.push({ ttDays: tm, year: 2000 + tm / 365.25, dLonArcsec: r.dLon, dLatArcsec: r.dLat,
                   elongDeg: r.elong, insideSolarDisc: r.elong < SUN_SEMI_DIAMETER_DEG, limiterBound: r.limited });
  }
  refined.sort((x, y) => Math.abs(y.dLonArcsec) - Math.abs(x.dLonArcsec));
  const outside = refined.filter((r) => !r.insideSolarDisc);
  out.bodies[body] = {
    daysScanned: days,
    nPeaks: refined.length,
    maxAbsDLonArcsec: refined.length ? Math.abs(refined[0].dLonArcsec) : 0,
    maxAbsDLonOutsideDiscArcsec: outside.length ? Math.abs(outside[0].dLonArcsec) : 0,
    elongAtMaxDeg: refined.length ? refined[0].elongDeg : null,
    daysWithDLonOver0p05: over05,
    daysWithDLonOver0p01: over01,
    fractionOfDaysOver0p05: over05 / days,
    worstTen: refined.slice(0, 10),
  };
}
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
