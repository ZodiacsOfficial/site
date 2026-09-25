/*
 * Rule 1c asks that it be said before the result whether the Moon's residual
 * against Horizons rises until M2. This measures it on the committed 24-instant
 * corpus (engine-beyond-swiss/corpora/horizons-24/Moon_UT.txt: Horizons's
 * apparent ecliptic Moon at the UT instants, DE441, its own ΔT): the engine's
 * Moon at the same UT with rc.7's ΔT and with a zodiacs-deltat/1 module.
 * Statistics only.
 *
 *   node --experimental-strip-types tools/moon/horizons-ut.mjs <site root> [module] > outputs/moon-horizons.json
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { bodyLongitude } from '@zodiacs/engine/internal';
import { DeltaT_EspenakMeeus, SetDeltaTFunction } from 'astronomy-engine';

const root = resolve(process.argv[2]);
const path = process.argv[3] ?? new URL('../deltat-reference.ts', import.meta.url).pathname;
const D = await import(pathToFileURL(resolve(path)).href);
const text = readFileSync(`${root}/docs/platform/evidence/engine-beyond-swiss/corpora/horizons-24/Moon_UT.txt`, 'utf8');
const body = text.slice(text.indexOf('$$SOE') + 5, text.indexOf('$$EOE'));
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const rows = body.trim().split('\n').map((line) => {
  const [stamp, , , lon] = line.split(',').map((x) => x.trim());
  const [, y, mo, d, hh, mm, ss] = stamp.match(/^(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2}):([\d.]+)$/);
  return { date: new Date(Date.UTC(+y, MONTHS[mo], +d, +hh, +mm, 0, Math.round(+ss * 1000))), lon: +lon };
});
const wrap = (x) => ((x + 540) % 360) - 180;
const stat = (xs) => {
  const a = xs.map(Math.abs).sort((p, q) => p - q);
  return { n: a.length, p50: +a[Math.floor(a.length / 2)].toFixed(3), max: +a.at(-1).toFixed(3) };
};
const run = (fn) => {
  SetDeltaTFunction(fn);
  return rows.map((r) => wrap(bodyLongitude('Moon', r.date) - r.lon) * 3600);
};
const old = run(DeltaT_EspenakMeeus);
const neu = run(D.deltaT);
const year = rows.map((r) => r.date.getUTCFullYear());
const part = (xs) => ({ all: stat(xs), 'before 1962': stat(xs.filter((_, i) => year[i] < 1962)),
  '1962-2026': stat(xs.filter((_, i) => year[i] >= 1962 && year[i] <= 2026)), 'after 2026': stat(xs.filter((_, i) => year[i] > 2026)) });
process.stdout.write(`${JSON.stringify({
  corpus: 'engine-beyond-swiss/corpora/horizons-24/Moon_UT.txt (24 instants 1851–2148)',
  model: D.DELTA_T_TABLE.digest,
  rc7: part(old),
  withModel: part(neu),
}, null, 1)}\n`);
