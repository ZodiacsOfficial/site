/**
 * Body centre versus planetary-system barycentre.
 *
 * de440s has barycentre segments ONLY for Mars..Pluto, so the prototype
 * reports the SYSTEM barycentre for those bodies and calls it the planet.
 * This measures the resulting angular error directly, by adding NAIF
 * satellite-ephemeris kernels that do carry the centre-relative-to-barycentre
 * segment (599<-5, 699<-6, 999<-9), and differencing the two apparent
 * longitudes through the identical reduction.
 *
 *   node t4-barycentre.mjs > raw/t4-barycentre.json
 */
import { Spk2 } from '../src/spk2.mjs';
import { Backend, DEFAULTS } from '../src/apparent2.mjs';

const DE = '/tmp/claude-0/swisslab/de440s.bsp';
const EXTRA = {
  Jupiter: { file: '/tmp/claude-0/satkernels/jup348.bsp', target: 599, centre: 5 },
  Saturn: { file: '/tmp/claude-0/satkernels/sat480.bsp', target: 699, centre: 6 },
  Neptune: { file: '/tmp/claude-0/satkernels/nep097.bsp', target: 899, centre: 8 },
  Pluto: { file: '/tmp/claude-0/satkernels/plu060.bsp', target: 999, centre: 9 },
};

const de = new Backend(DE);
const circ = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d; };
const out = { what: 'apparent ecliptic longitude: planetary-system barycentre minus body centre', bodies: {} };

for (const [body, spec] of Object.entries(EXTRA)) {
  const sat = new Spk2(spec.file);
  const seg = sat.segment(spec.target, spec.centre);
  const cov = de.coverage();
  const lo = Math.max(seg.start, cov.start) + 4 * 86400;
  const hi = Math.min(seg.stop, cov.stop) - 4 * 86400;
  const N = 1500;
  const rows = [];
  let offMax = 0;
  for (let i = 0; i < N; i += 1) {
    const et = lo + (hi - lo) * (i + 0.5) / N;
    const ttDays = et / 86400;                      // this comparison is differential
    const bary = de.apparent(body, ttDays, DEFAULTS);
    // Re-do the reduction with the centre offset added at the emission time.
    const off = sat.position(seg, bary.emissionEt);
    offMax = Math.max(offMax, Math.hypot(off[0], off[1], off[2]));
    const patched = de.apparentWithOffset(body, ttDays, DEFAULTS, off);
    rows.push({ et, dLonArcsec: circ(bary.lon, patched.lon) * 3600,
                dLatArcsec: (bary.lat - patched.lat) * 3600,
                distAu: bary.distKm / 149597870.7,
                offsetKm: Math.hypot(off[0], off[1], off[2]) });
  }
  const abs = rows.map((r) => Math.abs(r.dLonArcsec)).sort((a, b) => a - b);
  out.bodies[body] = {
    kernel: spec.file, segment: `${spec.target}<-${spec.centre}`,
    coverage: { startEt: seg.start, stopEt: seg.stop },
    n: rows.length,
    maxOffsetKm: offMax,
    maxAbsDLonArcsec: abs[abs.length - 1],
    p50AbsDLonArcsec: abs[Math.floor(abs.length / 2)],
    maxAbsDLatArcsec: Math.max(...rows.map((r) => Math.abs(r.dLatArcsec))),
    minDistAu: Math.min(...rows.map((r) => r.distAu)),
    maxDistAu: Math.max(...rows.map((r) => r.distAu)),
  };
  sat.close();
}
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
