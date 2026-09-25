/*
 * Evaluates a zodiacs-deltat/1 module on a list of instants: reads a JSON array
 * of astronomy-engine UT days on stdin, writes {seconds, sigma, segment} arrays
 * and the module's table identity on stdout. The module defaults to the
 * reference implementation beside this file; pass another path (for example
 * the vendored engine's dist/deltat.js) to check what ships.
 *
 *   node --experimental-strip-types tools/eval-model.mjs [module] < uts.json
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// 'espenak-meeus' evaluates astronomy-engine's own DeltaT_EspenakMeeus, which rc.7 uses (no band).
const arg = process.argv[2];
let path, D;
if (arg === 'espenak-meeus') {
  const A = await import('astronomy-engine');
  path = 'astronomy-engine DeltaT_EspenakMeeus';
  D = { deltaT: A.DeltaT_EspenakMeeus, deltaTAt: (ut) => ({ seconds: A.DeltaT_EspenakMeeus(ut), sigma: null, segment: null }),
        DELTA_T_MODEL: 'espenak-meeus', DELTA_T_TABLE: { version: null, digest: null, from: null, observedTo: null, predictedTo: null, knots: [] } };
} else {
  path = arg ? resolve(arg) : new URL('./deltat-reference.ts', import.meta.url).pathname;
  D = await import(pathToFileURL(path).href);
}
const uts = JSON.parse(readFileSync(0, 'utf8'));
const seconds = [], sigma = [], segment = [];
for (const ut of uts) {
  const r = D.deltaTAt(ut);
  seconds.push(r.seconds);
  sigma.push(r.sigma);
  segment.push(r.segment);
  if (D.deltaT(ut) !== r.seconds) throw new Error(`deltaT and deltaTAt disagree at ${ut}`);
}
const T = D.DELTA_T_TABLE;
process.stdout.write(JSON.stringify({ module: path, model: D.DELTA_T_MODEL, table: { version: T.version, digest: T.digest, from: T.from, observedTo: T.observedTo, predictedTo: T.predictedTo, knots: T.knots }, seconds, sigma, segment }));
