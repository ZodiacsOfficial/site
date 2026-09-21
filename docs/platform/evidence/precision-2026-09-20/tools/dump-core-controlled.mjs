/**
 * The shipped core, run under two explicit time policies.
 *
 * The previous benchmark has a confound its own report names: the prototype's
 * best number was taken with Delta-T pinned to the reference's value, and the
 * shipped core was never re-run the same way. A difference measured that way
 * mixes the time scale with the position series, and cannot be attributed to
 * either.
 *
 * astronomy-engine exposes `SetDeltaTFunction`, so the control is available
 * without touching the package or the site: the core's own Delta-T model is
 * replaced, for the duration of this process only, by the reference's value
 * for the case being measured. Nothing is written back, no default changes,
 * and the production path never calls this file.
 *
 *   node dump-core-controlled.mjs <swiss.json> [--holdout] [--pinned] > out.json
 *
 * Without --pinned this is cell A (core, own time policy). With it, cell B
 * (core, matched time policy). The two differ in exactly one input.
 */
import { readFileSync } from 'node:fs';
import * as A from 'astronomy-engine';
import { natalChart, ENGINE_VERSION } from '@zodiacs/engine';
import { MEASURE, HOLDOUT, BODIES } from '../../swiss-benchmark/tools/corpus.mjs';

const swissPath = process.argv[2];
const holdout = process.argv.includes('--holdout');
const pinned = process.argv.includes('--pinned');
const set = holdout ? HOLDOUT : MEASURE;

const swissDeltaT = new Map(
  JSON.parse(readFileSync(swissPath, 'utf8')).cases.map((c) => [c.id, c.delta_t_seconds]),
);

// What the core's own model says, recorded per case so the control's size is
// visible rather than assumed.
const ownDeltaT = (utc) => {
  const t = A.MakeTime(new Date(utc));
  return (t.tt - t.ut) * 86400;
};

const out = {
  what: 'shipped @zodiacs/engine core, controlled time policy',
  engine: ENGINE_VERSION,
  node: process.version,
  set: holdout ? 'holdout' : 'measure',
  timePolicy: pinned ? 'matched-to-reference' : 'engine-default',
  cell: pinned ? 'B' : 'A',
  cases: [],
};

for (const kase of set) {
  const own = ownDeltaT(kase.utc);
  const ref = swissDeltaT.get(kase.id);
  const rec = {
    id: kase.id, stratum: kase.stratum, utc: kase.utc,
    deltaTEngineSeconds: own,
    deltaTReferenceSeconds: ref ?? null,
    deltaTAppliedSeconds: pinned ? ref : own,
  };
  if (pinned) {
    if (typeof ref !== 'number') throw new Error(`no reference Delta-T for ${kase.id}`);
    A.SetDeltaTFunction(() => ref);
  } else {
    A.SetDeltaTFunction(A.DeltaT_EspenakMeeus);
  }
  try {
    const chart = natalChart({
      utc: kase.utc,
      latitude: kase.latitude,
      longitude: kase.longitude,
      houseSystem: kase.houseSystem,
      timeKnown: kase.timeKnown,
    });
    rec.bodies = Object.fromEntries(BODIES.map((b) => {
      const hit = chart.bodies.find((x) => x.body === b);
      return [b, hit ? { lon: hit.lon, lat: hit.lat, speed: hit.speed } : null];
    }));
    rec.angles = chart.angles;
  } catch (error) {
    rec.error = error instanceof Error ? error.message : String(error);
  } finally {
    A.SetDeltaTFunction(A.DeltaT_EspenakMeeus);
  }
  out.cases.push(rec);
}

// Prove the override actually took effect, so a silent no-op cannot be
// reported as a control.
out.controlVerified = pinned
  ? out.cases.every((c) => Math.abs(c.deltaTAppliedSeconds - c.deltaTReferenceSeconds) < 1e-9)
  : out.cases.every((c) => Math.abs(c.deltaTAppliedSeconds - c.deltaTEngineSeconds) < 1e-9);

process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
