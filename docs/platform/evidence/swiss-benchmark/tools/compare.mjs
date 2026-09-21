/**
 * Compares the two dumps and reports the distribution, not a single number.
 *
 *   node compare.mjs zodiacs.json swiss.json > report.json
 *
 * Longitudes are compared around the circle, so 359.9 and 0.1 are 0.2 degrees
 * apart rather than 359.8. Every figure carries its denominator: a maximum
 * over an unstated number of cases is not a measurement.
 *
 * This reports agreement between two implementations. Both ultimately descend
 * from JPL development ephemerides, so agreement here is consistency, NOT
 * independent observational accuracy, and the report says so in its own text.
 */
import { readFileSync } from 'node:fs';

const arcsec = (deg) => deg * 3600;
/** Signed separation around the circle, in degrees, in (-180, 180]. */
const circular = (a, b) => {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
};
const quantile = (sorted, q) => {
  if (sorted.length === 0) return null;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i); const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

const zod = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const swi = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const swissById = new Map(swi.cases.map((c) => [c.id, c]));

const rows = [];
const excluded = [];

for (const zc of zod.cases) {
  const sc = swissById.get(zc.id);
  if (!sc) { excluded.push({ id: zc.id, why: 'no Swiss counterpart' }); continue; }
  if (zc.error) { excluded.push({ id: zc.id, why: `Zodiacs refused: ${zc.error}` }); continue; }
  for (const [body, zb] of Object.entries(zc.bodies)) {
    const sb = sc.bodies[body];
    if (!zb) { excluded.push({ id: zc.id, body, why: 'body absent from Zodiacs result' }); continue; }
    if (!sb || sb.error) { excluded.push({ id: zc.id, body, why: `Swiss error: ${sb?.error ?? 'missing'}` }); continue; }
    if (sb.ephemeris_used !== 'SWIEPH') {
      excluded.push({ id: zc.id, body, why: `Swiss fell back to ${sb.ephemeris_used}` });
      continue;
    }
    rows.push({
      id: zc.id, stratum: zc.stratum, body,
      dLonArcsec: arcsec(circular(zb.lon, sb.lon)),
      dLatArcsec: arcsec((zb.lat ?? 0) - (sb.lat ?? 0)),
      dSpeedArcsecPerDay: arcsec((zb.speed ?? 0) - (sb.speed ?? 0)),
    });
  }
}

const summarise = (subset) => {
  const abs = subset.map((r) => Math.abs(r.dLonArcsec)).sort((a, b) => a - b);
  const worst = subset.reduce((m, r) => (Math.abs(r.dLonArcsec) > Math.abs(m?.dLonArcsec ?? -1) ? r : m), null);
  return {
    n: subset.length,
    maxAbsArcsec: abs.length ? abs[abs.length - 1] : null,
    p50ArcsecAbs: quantile(abs, 0.5),
    p95ArcsecAbs: quantile(abs, 0.95),
    worstCase: worst && { id: worst.id, body: worst.body, dLonArcsec: worst.dLonArcsec },
  };
};

const by = (key) => Object.fromEntries(
  [...new Set(rows.map((r) => r[key]))].sort().map((v) => [v, summarise(rows.filter((r) => r[key] === v))]),
);

process.stdout.write(`${JSON.stringify({
  what: 'Zodiacs @zodiacs/engine vs Swiss Ephemeris, apparent geocentric ecliptic longitude of date, tropical',
  interpretation: 'Agreement between two implementations that both descend from JPL development ephemerides. This measures consistency with Swiss, NOT independent observational accuracy.',
  zodiacsEngine: zod.engine,
  swissBinding: swi.swisseph_binding,
  swissBackendsObserved: swi.ephemeris_backends_observed,
  isFullSwissConfiguration: swi.is_full_swiss_configuration,
  set: zod.set,
  overall: summarise(rows),
  byBody: by('body'),
  byStratum: by('stratum'),
  excluded,
  rows,
}, null, 1)}\n`);
