/*
 * What changes for users between rc.7's ΔT (Espenak–Meeus) and a
 * zodiacs-deltat/1 module, at a few instants: ΔT from each, and the engine's
 * Moon longitude computed with each (arcseconds, model minus rc.7). A smaller
 * ΔT puts the same UT at an earlier TT, so the Moon sits a little behind and
 * Moon events come later by about the ΔT difference.
 *
 *   node --experimental-strip-types tools/what-changes.mjs [module] > outputs/what-changes.json
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { bodyLongitude } from '@zodiacs/engine/internal';
import { DeltaT_EspenakMeeus, SetDeltaTFunction } from 'astronomy-engine';

const path = process.argv[2] ?? new URL('./deltat-reference.ts', import.meta.url).pathname;
const D = await import(pathToFileURL(resolve(path)).href);
const J2000 = Date.UTC(2000, 0, 1, 12);
const wrap = (x) => ((x + 540) % 360) - 180;
const rows = [];
for (const iso of ['1800-01-01T12:00:00Z', '1850-01-01T12:00:00Z', '1900-01-01T12:00:00Z', '1950-01-01T12:00:00Z', '2000-01-01T12:00:00Z',
  '2026-09-22T00:00:00Z', '2026-09-25T00:00:00Z', '2027-06-01T00:00:00Z', '2030-01-01T00:00:00Z', '2050-01-01T00:00:00Z',
  '2100-01-01T00:00:00Z', '2150-01-01T00:00:00Z', '2199-12-31T12:00:00Z']) {
  const date = new Date(iso);
  const ut = (date.getTime() - J2000) / 86_400_000;
  SetDeltaTFunction(DeltaT_EspenakMeeus);
  const moonOld = bodyLongitude('Moon', date);
  SetDeltaTFunction(D.deltaT);
  const moonNew = bodyLongitude('Moon', date);
  const r = D.deltaTAt(ut);
  rows.push({ utc: iso, model: +r.seconds.toFixed(3), sigma: +r.sigma.toFixed(3), segment: r.segment, rc7: +DeltaT_EspenakMeeus(ut).toFixed(3),
    difference: +(r.seconds - DeltaT_EspenakMeeus(ut)).toFixed(3), moonArcsec: +(wrap(moonNew - moonOld) * 3600).toFixed(2) });
}
process.stdout.write(`${JSON.stringify({ module: path.split('/').pop(), table: D.DELTA_T_TABLE.digest, rows }, null, 1)}\n`);
