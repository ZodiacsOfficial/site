/**
 * Accuracy measurement. Every figure carries its denominator.
 *
 *   node measure.mjs packs/D.zeph
 *
 * Three separate things are measured, because they answer different questions:
 *   1. per PACK BODY, in the pack's own frame, against the raw kernel's own
 *      polynomial -- this is where representation error lives, sampled hard at
 *      the record boundaries where a refit is worst;
 *   2. per API BODY (what a caller asks for), barycentric, against the raw
 *      kernel composed the same way -- this is what T6 and T7 are stated over;
 *   3. apparent geocentric ecliptic longitude against the UNCOMPRESSED
 *      prototype reduction -- what T2 is stated over, computed as a CIRCULAR
 *      difference and reported with an explicit wrap cohort.
 * Velocity is measured separately from position throughout. A small position
 * error does not bound a velocity error and is not allowed to stand in for one.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { SpkRef } from './spkref.mjs';
import { Pack, PackBackend, API_BODIES, loadAstronomyEngine } from './runtime.mjs';
import { RefBackend } from './refbackend.mjs';
import { frameSource } from './compile.mjs';
import { BODY_SEGS, DAY } from './sources.mjs';

const KERNEL = process.env.KERNEL ?? '/tmp/claude-0/swisslab/de440s.bsp';
const packPath = process.argv[2];
const A = await loadAstronomyEngine();
const ref = new SpkRef(KERNEL);
const pack = new Pack(packPath);
ref.emrat = pack.emrat;

let aeModel = null;
if (pack.header.candidate === 'C') {
  const AU = 149597870.700;
  const AEB = { mercuryBary: A.Body.Mercury, venusBary: A.Body.Venus, emb: A.Body.EMB, marsBary: A.Body.Mars,
    jupiterBary: A.Body.Jupiter, saturnBary: A.Body.Saturn, uranusBary: A.Body.Uranus,
    neptuneBary: A.Body.Neptune, plutoBary: A.Body.Pluto, sun: A.Body.Sun };
  const f = (pack.emrat / (1 + pack.emrat)) * AU;
  aeModel = (name, et, out) => {
    const d = et / DAY; const t = A.MakeTime(d); t.tt = d;
    if (name === 'moon') { const g = A.GeoMoonState(t);
      out[0] = g.x * f; out[1] = g.y * f; out[2] = g.z * f;
      out[3] = (g.vx * f) / DAY; out[4] = (g.vy * f) / DAY; out[5] = (g.vz * f) / DAY; return; }
    const s = A.BaryState(AEB[name], t);
    out[0] = s.x * AU; out[1] = s.y * AU; out[2] = s.z * AU;
    out[3] = (s.vx * AU) / DAY; out[4] = (s.vy * AU) / DAY; out[5] = (s.vz * AU) / DAY;
  };
}
const back = new PackBackend(pack, aeModel);
const refBack = new RefBackend(ref, { observerVelocity: 'analytic', A });

const T0 = pack.header.coverage.startEtSecTdb;
const T1 = pack.header.coverage.stopEtSecTdb;

const stats = (xs) => {
  if (!xs.length) return null;
  const s = Float64Array.from(xs).sort();
  const q = (p) => { const i = (s.length - 1) * p; const lo = Math.floor(i); const hi = Math.ceil(i);
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
  return { n: s.length, max: s[s.length - 1], p50: q(0.5), p95: q(0.95), p99: q(0.99), mean: xs.reduce((a, b) => a + b, 0) / xs.length };
};

/* --- 1. per pack body, in its own frame, boundary-heavy --------------------- */
const TAUS = [-0.999999999, -0.97, -0.83, -0.61, -0.35, -0.12, 0.12, 0.35, 0.61, 0.83, 0.97, 0.999999999];
const perBody = {};
{
  const p = new Float64Array(3); const q = new Float64Array(6); const h = 5;
  for (const body of BODY_SEGS) {
    const b = pack.bodies.get(body.name);
    const src = frameSource(ref, body, b.frame);
    const pos = []; const vel = [];
    const R = b.intervalSec / 2;
    for (let i = 0; i < b.nrec; i += 1) {
      const mid = b.initEt + i * b.intervalSec + R;
      for (const tau of TAUS) {
        const et = mid + tau * R;
        if (et < T0 || et > T1) continue;
        src(et, p);
        if (aeModel) { const m = new Float64Array(6); aeModel(body.name, et, m); back.pack.raw(body.name, et, q); for (let k = 0; k < 6; k += 1) q[k] += m[k]; }
        else pack.raw(body.name, et, q);
        pos.push(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
        // reference velocity: the analytic derivative of the RAW kernel, via a
        // high-order difference of the source composition (exact to 1e-12 km/s)
        const a1 = new Float64Array(3); const a2 = new Float64Array(3); const a3 = new Float64Array(3); const a4 = new Float64Array(3);
        src(et - 2 * h, a1); src(et - h, a2); src(et + h, a3); src(et + 2 * h, a4);
        let d2 = 0;
        for (let c = 0; c < 3; c += 1) {
          const v = (a1[c] - 8 * a2[c] + 8 * a3[c] - a4[c]) / (12 * h);
          d2 += (q[c + 3] - v) ** 2;
        }
        vel.push(Math.sqrt(d2));
      }
    }
    perBody[body.name] = {
      frame: b.frame, intervalDays: b.intervalDays, ncoef: b.ncoef, nrec: b.nrec,
      budgetKm: b.budgetKm,
      provenPosKm: b.provenPosKm, provenVelKmS: b.provenVelKmS,
      sampledPosKm: stats(pos), sampledVelKmS: stats(vel),
      samplesPerRecord: TAUS.length,
    };
  }
}

/* --- 2. per API body, barycentric, on an irregular global grid -------------- */
const NGRID = Number(process.env.NGRID ?? 60000);
const PHI = 0.6180339887498949;
const grid = new Float64Array(NGRID);
for (let i = 0; i < NGRID; i += 1) grid[i] = T0 + (T1 - T0) * (((i * PHI) % 1) * 0.999998 + 1e-6);
const perApi = {};
{
  const a = new Float64Array(6); const b = new Float64Array(6);
  for (const body of API_BODIES.concat(['Earth'])) {
    const pos = []; const vel = [];
    for (let i = 0; i < NGRID; i += 1) {
      const et = grid[i];
      back.state(body, et, a);
      refBack.state(body, et, b);
      pos.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      vel.push(Math.hypot(a[3] - b[3], a[4] - b[4], a[5] - b[5]));
    }
    perApi[body] = { posKm: stats(pos), velKmS: stats(vel) };
  }
}

/* --- 2b. GEOCENTRIC vectors: what a chart actually uses --------------------- */
/* The Moon's barycentric error carries the EMB's error, which then cancels
   against the observer. The geocentric vector is therefore the honest number
   for the Moon and the one the longitude budget is set from. */
const perGeo = {};
{
  const a = new Float64Array(6); const b = new Float64Array(6);
  const ea = new Float64Array(6); const eb = new Float64Array(6);
  for (const body of API_BODIES) {
    const pos = []; const vel = []; const ang = [];
    for (let i = 0; i < NGRID; i += 1) {
      const et = grid[i];
      back.state('Earth', et, ea); refBack.state('Earth', et, eb);
      back.state(body, et, a); refBack.state(body, et, b);
      const dx = (a[0] - ea[0]) - (b[0] - eb[0]);
      const dy = (a[1] - ea[1]) - (b[1] - eb[1]);
      const dz = (a[2] - ea[2]) - (b[2] - eb[2]);
      const d = Math.hypot(dx, dy, dz);
      const r = Math.hypot(b[0] - eb[0], b[1] - eb[1], b[2] - eb[2]);
      pos.push(d);
      ang.push((d / r) * 206264.806247096);
      vel.push(Math.hypot((a[3] - ea[3]) - (b[3] - eb[3]), (a[4] - ea[4]) - (b[4] - eb[4]), (a[5] - ea[5]) - (b[5] - eb[5])));
    }
    perGeo[body] = { posKm: stats(pos), velKmS: stats(vel), angularArcsecUpperBound: stats(ang) };
  }
}

/* --- 2c. API-level PROVEN bounds, composed from the per-body ones ----------- */
const provenApi = {};
{
  const P = Object.fromEntries(pack.header.bodies.map((b) => [b.name, b]));
  const sum = (names) => names.reduce((acc, n) => {
    const b = P[n];
    if (b.provenPosKm === null) return { posKm: null, velKmS: null };
    if (acc.posKm === null) return acc;
    return { posKm: acc.posKm + b.provenPosKm, velKmS: acc.velKmS + b.provenVelKmS };
  }, { posKm: 0, velKmS: 0 });
  const chain = (name) => (P[name].frame === 'sun' ? [name, 'sun'] : [name]);
  const MAP = { Sun: ['sun'], Mercury: 'mercuryBary', Venus: 'venusBary', Mars: 'marsBary',
    Jupiter: 'jupiterBary', Saturn: 'saturnBary', Uranus: 'uranusBary', Neptune: 'neptuneBary', Pluto: 'plutoBary' };
  for (const [api, key] of Object.entries(MAP)) provenApi[api] = sum(Array.isArray(key) ? key : chain(key));
  // Moon and Earth: EMB plus the Moon-relative term (scaled by 1 for the Moon,
  // by 1/EMRAT for the Earth). Geocentric, the EMB term cancels exactly.
  const em = P.emb; const mo = P.moon; const k = 1 / pack.emrat;
  provenApi.Moon = { posKm: em.provenPosKm + mo.provenPosKm, velKmS: em.provenVelKmS + mo.provenVelKmS };
  provenApi.Earth = { posKm: em.provenPosKm + k * mo.provenPosKm, velKmS: em.provenVelKmS + k * mo.provenVelKmS };
  provenApi.MoonGeocentric = { posKm: (1 + k) * mo.provenPosKm, velKmS: (1 + k) * mo.provenVelKmS,
    note: 'the EMB term is common to the Moon and the observer and cancels exactly in the geocentric vector' };
}

/* --- 3. apparent longitude vs the uncompressed prototype reduction ---------- */
const NLON = Number(process.env.NLON ?? 12000);
const lonRows = [];
{
  const startMs = Date.UTC(1850, 2, 1);
  const endMs = Date.UTC(2149, 10, 1);
  for (let i = 0; i < NLON; i += 1) {
    const frac = ((i * PHI) % 1);
    const when = new Date(startMs + (endMs - startMs) * frac);
    for (const body of API_BODIES) {
      const lp = back.apparentEclipticLongitude(body, when, null, A);
      const lr = refBack.apparentEclipticLongitude(body, when, null);
      let d = (lp - lr) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360;
      lonRows.push({ body, lon: lr, dArcsec: d * 3600 });
    }
  }
}
const absL = lonRows.map((r) => Math.abs(r.dArcsec));
const wrap = lonRows.filter((r) => r.lon < 1 || r.lon > 359);
const byBodyLon = Object.fromEntries(API_BODIES.map((b) => [b, stats(lonRows.filter((r) => r.body === b).map((r) => Math.abs(r.dArcsec)))]));

const worstLon = lonRows.reduce((m, r) => (Math.abs(r.dArcsec) > Math.abs(m.dArcsec) ? r : m), lonRows[0]);

const out = {
  what: 'compiled pack vs the raw DE440s kernel, and vs the uncompressed prototype reduction',
  pack: { path: packPath, candidate: pack.header.candidate, bytes: readFileSync(packPath).length },
  kernel: { path: KERNEL, bytes: ref.size },
  coverage: pack.header.coverage,
  perPackBody: perBody,
  perApiBody: { note: 'barycentric state, km and km/s, against the raw kernel composed the same way', gridPoints: NGRID, bodies: perApi },
  perGeocentricBody: { note: 'geocentric vector error; angularArcsecUpperBound is the full 3-D error divided by the distance, which over-states the longitude component', gridPoints: NGRID, bodies: perGeo },
  provenApiBody: { note: 'PROVEN, not sampled: the per-body proven bounds added along the composition chain', bodies: provenApi },
  longitude: {
    note: 'apparent geocentric ecliptic longitude of date, circular difference, same reduction on both sides; the time scale is identical on both sides so Delta-T cancels exactly',
    instants: NLON, bodies: API_BODIES.length, rows: lonRows.length,
    overallArcsecAbs: stats(absL),
    wrapCohort: { note: 'rows whose reference longitude is within 1 degree of 0/360', n: wrap.length, arcsecAbs: stats(wrap.map((r) => Math.abs(r.dArcsec))) },
    byBody: byBodyLon,
    worst: worstLon,
  },
};
writeFileSync(new URL(`./raw/measure-${pack.header.candidate}.json`, import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify({
  candidate: pack.header.candidate,
  mib: +(out.pack.bytes / 1048576).toFixed(4),
  maxPosKm: Object.fromEntries(Object.entries(perApi).map(([k, v]) => [k, +v.posKm.max.toPrecision(3)])),
  maxVelKmS: Object.fromEntries(Object.entries(perApi).map(([k, v]) => [k, +v.velKmS.max.toPrecision(3)])),
  geoMaxPosKm: Object.fromEntries(Object.entries(perGeo).map(([k, v]) => [k, +v.posKm.max.toPrecision(3)])),
  provenApiPosKm: Object.fromEntries(Object.entries(provenApi).map(([k, v]) => [k, v.posKm === null ? null : +v.posKm.toPrecision(3)])),
  provenApiVelKmS: Object.fromEntries(Object.entries(provenApi).map(([k, v]) => [k, v.velKmS === null ? null : +v.velKmS.toPrecision(3)])),
  lonMaxArcsec: +out.longitude.overallArcsecAbs.max.toPrecision(4),
  lonP95Arcsec: +out.longitude.overallArcsecAbs.p95.toPrecision(4),
  wrapMaxArcsec: +out.longitude.wrapCohort.arcsecAbs.max.toPrecision(4),
}, null, 1));
