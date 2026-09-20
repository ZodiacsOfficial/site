/**
 * Cancellation, budget exhaustion, and carrying on afterwards.
 *
 *   node examples/03-cancel-and-recover.mjs /path/to/pack.zeph
 */
import { openPackFile, CORRECTED, PrecisionError } from '@zodiacs/precision-alpha/node';

const path = process.argv[2];
if (!path) { console.error('usage: node 03-cancel-and-recover.mjs <pack.zeph>'); process.exit(2); }
const rt = await openPackFile(path);

// 1. Cancellation. Any object with an `aborted` getter will do, including
//    an AbortSignal.
const controller = new AbortController();
let seen = 0;
const spy = { get aborted() { seen += 1; return seen > 200; } };
try {
  rt.search({
    kind: 'aspect', body: 'Moon', other: 'Sun', targetDeg: 0,
    fromTtDays: 8766, toTtDays: 9131, epsilonDeg: 1 / 3600,
    options: CORRECTED, signal: spy,
  });
} catch (error) {
  if (!(error instanceof PrecisionError) || error.code !== 'cancelled') throw error;
  console.log('cancelled after', error.detail.evaluations, 'evaluations');
}

// 2. A budget that runs out is an ANSWER, not an exception. The events it
//    found before stopping are still returned.
const tight = rt.search({
  kind: 'aspect', body: 'Moon', other: 'Sun', targetDeg: 0,
  fromTtDays: 8766, toTtDays: 9131, epsilonDeg: 1 / 3600,
  options: CORRECTED, maxEvaluations: 500,
});
console.log('budget run      :', tight.execution.status, '| finished', tight.execution.finished,
  '| events', tight.eventCount.found, '| completeness', tight.completeness.established);

// 3. The runtime is still usable.
console.log('still works     :', rt.apparent('Sun', 8765.5, CORRECTED).lon.toFixed(6));

// 4. Dispose, and then it is not.
rt.dispose();
try {
  rt.apparent('Sun', 8765.5, CORRECTED);
} catch (error) {
  console.log('after dispose   :', error.code);
}
void controller;
