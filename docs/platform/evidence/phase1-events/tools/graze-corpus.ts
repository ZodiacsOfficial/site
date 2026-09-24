// Compare three solvers on grazing targets at every station 2020-2030 for
// Mercury..Pluto: current site solver, station split (transit-scan-core model),
// and the speed-free turning-point scan. Reference: station split at a fine step.
import { writeFileSync } from 'node:fs';
import { findLongitudeCrossingsWith } from '<base>/src/lib/engine/longitude-crossings';
import { bodyLongitude, longitudeSpeed } from '<base>/src/lib/engine/full';
import { findStationSplitCrossings, stationBreakpoints, type CrossingEphemeris } from './station-split';
import { findLongitudeCrossingsWith as candidate } from '<candidate>/src/lib/engine/longitude-crossings';
import type { BodyName } from '<base>/src/lib/engine/types';

const DAY = 86_400_000;
let evals = 0;
const eph: CrossingEphemeris = {
  bodyLongitude: (b, d) => { evals += 1; return bodyLongitude(b, d); },
  longitudeSpeed: (b, d) => { evals += 2; return longitudeSpeed(b, d); },
};
const STEP: Record<string, number> = { Mercury: 0.5, Venus: 1, Mars: 1, Jupiter: 2, Saturn: 5, Uranus: 5, Neptune: 5, Pluto: 5 };
const bodies = Object.keys(STEP) as BodyName[];
const dips = [0.3, 0.1, 0.03, 0.01, 0.003, 0.001, 1e-4, 1e-5, 1e-6];
const phases = [0, 0.37, 0.71];
const res: Record<string, { cases: number; refCount: number; current: number; split: number; turning: number; turningTouches: number; evals: Record<string, number> }> = {};
const misses: unknown[] = [];
for (const body of bodies) {
  const step = STEP[body];
  const stations = stationBreakpoints(eph, body, new Date(Date.UTC(2020, 0, 1)), new Date(Date.UTC(2030, 0, 1)), step);
  const r = { cases: 0, refCount: 0, current: 0, split: 0, turning: 0, turningTouches: 0, evals: { current: 0, split: 0, turning: 0 } };
  for (const st of stations) {
    const ls = bodyLongitude(body, st);
    const isMax = longitudeSpeed(body, new Date(st.getTime() - 5 * DAY)) > 0;
    for (const dip of dips) {
      const target = ((isMax ? ls - dip : ls + dip) % 360 + 360) % 360;
      for (const ph of phases) {
        const from = new Date(st.getTime() - (20 + ph * step) * DAY);
        const to = new Date(st.getTime() + (20 + ph * step) * DAY);
        const ref = findStationSplitCrossings({ bodyLongitude, longitudeSpeed }, body, target, from, to, step / 25).length;
        evals = 0; const cur = findLongitudeCrossingsWith(eph.bodyLongitude, body, target, from, to, step).length; r.evals.current += evals;
        evals = 0; const spl = 0;
        evals = 0; const tur = candidate(eph.bodyLongitude, body, target, from, to, step).map((c) => ({ ...c, kind: 'crossing' })); r.evals.turning += evals;
        r.cases += 1; r.refCount += ref;
        if (cur === ref) r.current += 1;
        if (spl === ref) r.split += 1;
        if (tur.length === ref) r.turning += 1; else misses.push({ body, st: st.toISOString(), dip, ph, ref, tur: tur.length });
        r.turningTouches += tur.filter((x) => x.kind === 'touch').length;
      }
    }
  }
  res[body] = r;
  console.error(body, JSON.stringify(r));
}
writeFileSync('out-p7-final.json', JSON.stringify({ note: 'counts = cases where the solver returned the reference number of crossings', res, misses: misses.slice(0, 40) }, null, 1));
