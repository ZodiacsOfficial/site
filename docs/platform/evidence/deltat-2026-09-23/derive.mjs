/*
 * ΔT (TT − UT1) as observed, against the formula the engine uses today.
 *
 * Observed: TT − UT1 = 32.184 s + (TAI − UTC) − (UT1 − UTC), with UT1 − UTC
 * from the IERS finals2000A.all file (Bulletin A, columns 59–68, at 0h UTC)
 * and TAI − UTC = 37 s, in force since 2017-01-01. Formula: astronomy-engine's
 * DeltaT_EspenakMeeus, which @zodiacs/engine 0.1.1-rc.6 uses unchanged.
 *
 *   node docs/platform/evidence/deltat-2026-09-23/derive.mjs <finals2000A.all>
 *
 * writes values.json beside this file. The finals file is not committed; its
 * digest is recorded, and the audit's copy is listed in
 * docs/platform/evidence/engine-audit-2026-09-22/ARTIFACTS.sha256.tsv.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeltaT_EspenakMeeus } from 'astronomy-engine';

const here = dirname(fileURLToPath(import.meta.url));
const finalsPath = process.argv[2];
if (!finalsPath) throw new Error('usage: derive.mjs <finals2000A.all>');
const bytes = readFileSync(finalsPath);
const root = resolve(here, '../../../..');
const aeVersion = JSON.parse(readFileSync(resolve(root, 'node_modules/astronomy-engine/package.json'), 'utf8')).version;

const DATES = ['2017-08-21', '2020-01-01', '2024-04-08', '2026-09-22'];
const TAI_MINUS_UTC = 37;
const J2000 = Date.UTC(2000, 0, 1, 12);
// The Moon's mean motion, 13.176° a day, in arcseconds per second of time.
const MOON_ARCSEC_PER_SECOND = (13.176358 * 3600) / 86_400;

const rows = new Map();
for (const line of bytes.toString('latin1').split('\n')) {
  if (line.length < 68) continue;
  const yy = Number(line.slice(0, 2));
  const date = `${yy < 73 ? 2000 + yy : 1900 + yy}-${line.slice(2, 4).trim().padStart(2, '0')}-${line.slice(4, 6).trim().padStart(2, '0')}`;
  rows.set(date, { flag: line.slice(57, 58), ut1MinusUtc: Number(line.slice(58, 68)) });
}

const round = (x, places) => Number(x.toFixed(places));
const values = DATES.map((date) => {
  const row = rows.get(date);
  if (!row || !Number.isFinite(row.ut1MinusUtc)) throw new Error(`no UT1 − UTC for ${date}`);
  const observed = 32.184 + TAI_MINUS_UTC - row.ut1MinusUtc;
  const formula = DeltaT_EspenakMeeus((Date.parse(`${date}T00:00:00Z`) - J2000) / 86_400_000);
  return {
    date,
    ut1MinusUtcFlag: row.flag,
    observedSeconds: round(observed, 3),
    formulaSeconds: round(formula, 3),
    differenceSeconds: round(formula - observed, 3),
    moonArcseconds: round((formula - observed) * MOON_ARCSEC_PER_SECOND, 2),
  };
});

writeFileSync(resolve(here, 'values.json'), `${JSON.stringify({
  source: {
    file: 'finals2000A.all',
    publisher: 'IERS Rapid Service/Prediction Centre (Bulletin A, IAU 2000A)',
    retrieved: '2026-09-22',
    sha256: createHash('sha256').update(bytes).digest('hex'),
  },
  taiMinusUtcSeconds: TAI_MINUS_UTC,
  formula: { function: 'DeltaT_EspenakMeeus', package: 'astronomy-engine', version: aeVersion },
  moonArcsecondsPerSecond: round(MOON_ARCSEC_PER_SECOND, 4),
  values,
}, null, 2)}\n`);
console.log(values);
