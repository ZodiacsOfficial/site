/** Emits the experimental DE backend's side of the corpus, in the dump shape. */
import { DeBackend } from './apparent.mjs';
import { MEASURE, HOLDOUT, BODIES } from '../tools/corpus.mjs';

const set = process.argv.includes('--holdout') ? HOLDOUT : MEASURE;
const de = new DeBackend(process.argv[2]);
// Delta-T per case, taken from the reference run, so the two are compared on
// the same TT instant. Without this the comparison measures Delta-T model
// disagreement — an unknowable extrapolation — rather than the ephemerides.
const swissPath = process.argv[3];
const swissDeltaT = swissPath
  ? new Map(JSON.parse((await import('node:fs')).readFileSync(swissPath, 'utf8')).cases.map((c) => [c.id, c.delta_t_seconds]))
  : new Map();
const out = { engine: 'de440s-prototype', deltaTMatched: Boolean(process.argv[3]), node: process.version, set: process.argv.includes('--holdout') ? 'holdout' : 'measure', cases: [] };

for (const kase of set) {
  const rec = { id: kase.id, stratum: kase.stratum, utc: kase.utc, bodies: {} };
  for (const b of BODIES) {
    try {
      const dt = swissDeltaT.has(kase.id) ? swissDeltaT.get(kase.id) : null;
      rec.bodies[b] = { lon: de.apparentEclipticLongitude(b, new Date(kase.utc), dt), lat: 0, speed: 0 };
    } catch (error) {
      rec.bodies[b] = null;
      rec.outOfRange = /outside segment coverage/.test(String(error.message)) || rec.outOfRange;
    }
  }
  out.cases.push(rec);
}
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
