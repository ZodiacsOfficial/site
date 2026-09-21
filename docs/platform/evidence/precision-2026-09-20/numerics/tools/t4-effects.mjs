/**
 * The output-contract audit: every modelling choice measured DIFFERENTIALLY
 * on the model's own output, across all ten bodies and a 300-year epoch grid,
 * with the solar elongation recorded for every row so that effects which only
 * bite near conjunction can be reported where they bite.
 *
 * This measures the SIZE OF EACH EFFECT, not agreement with anything.  It is
 * therefore independent of Swiss entirely.
 *
 *   node t4-effects.mjs <kernel> > raw/t4-effects.json
 */
import { Backend, DEFAULTS, PROTOTYPE } from '../src/apparent2.mjs';

const kernel = process.argv[2];
const de = new Backend(kernel);
const cov = de.coverage();
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

// A step chosen to be incommensurate with the synodic periods, the 18.6-year
// nutation cycle and the year, so the grid does not sit on one phase.
const STEP = 73.03;
const PAD = 4;                                   // days of light-time headroom
const t0 = cov.start / 86400 + PAD;
const t1 = cov.stop / 86400 - PAD;
const epochs = [];
for (let d = t0; d <= t1; d += STEP) epochs.push(d);

const VARIANTS = {
  base: DEFAULTS,
  nut_ae: { ...DEFAULTS, nutation: 'ae' },
  nut_2000a: { ...DEFAULTS, nutation: '2000a' },
  bias_off: { ...DEFAULTS, bias: false },
  defl_off: { ...DEFAULTS, deflection: 'none' },
  aberr_first: { ...DEFAULTS, aberration: 'first' },
  aberr_off: { ...DEFAULTS, aberration: 'none' },
  tt_as_tdb: { ...DEFAULTS, timescale: 'tt' },
  vel_h60: { ...DEFAULTS, observerVelocity: 'central60' },
  vel_h600: { ...DEFAULTS, observerVelocity: 'central600' },
  lt_1: { ...DEFAULTS, lightTimeIters: 1 },
  lt_2: { ...DEFAULTS, lightTimeIters: 2 },
  lt_3: { ...DEFAULTS, lightTimeIters: 3 },
};

const circ = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d; };
const rows = [];
let sunSkipped = 0;
for (const ttDays of epochs) {
  const out = {};
  for (const [k, o] of Object.entries(VARIANTS)) out[k] = {};
  const sunBase = de.apparent('Sun', ttDays, DEFAULTS);
  for (const body of BODIES) {
    const res = {};
    for (const [k, o] of Object.entries(VARIANTS)) res[k] = de.apparent(body, ttDays, o);
    const b = res.base;
    // geocentric elongation from the Sun, degrees
    const elong = body === 'Sun' ? 0 : Math.abs(circ(b.lon, sunBase.lon));
    rows.push({
      ttDays, body, elong, lon: b.lon, lat: b.lat, distAu: b.distKm / 149597870.7,
      ltSec: b.lightTimeSec, ltIters: b.lightTimeIters, ltConverged: b.lightTimeConverged,
      d: Object.fromEntries(Object.entries(res).filter(([k]) => k !== 'base')
        .map(([k, r]) => [k, circ(r.lon, b.lon) * 3600])),
      dLat: Object.fromEntries(Object.entries(res).filter(([k]) => k !== 'base')
        .map(([k, r]) => [k, (r.lat - b.lat) * 3600])),
    });
  }
}
process.stdout.write(`${JSON.stringify({
  what: 'per-effect differential size in arcsec of apparent ecliptic longitude, model vs model',
  kernel, coverageEtSeconds: cov, paddingDays: PAD,
  grid: { stepDays: STEP, nEpochs: epochs.length, nRows: rows.length, firstTtDays: t0, lastTtDays: t1 },
  baseline: DEFAULTS, prototype: PROTOTYPE, variants: VARIANTS, rows,
})}\n`);
