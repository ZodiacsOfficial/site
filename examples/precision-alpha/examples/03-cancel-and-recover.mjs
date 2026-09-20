/**
 * Cancellation, budget exhaustion, and carrying on afterwards.
 *
 *   node examples/03-cancel-and-recover.mjs /path/to/pack.zeph
 */
import { openPackFile, CORRECTED } from '@zodiacs/precision-alpha/node';

const path = process.argv[2];
if (!path) { console.error('usage: node 03-cancel-and-recover.mjs <pack.zeph>'); process.exit(2); }
const rt = await openPackFile(path);

const WINDOW = { fromTtDays: 8766, toTtDays: 9131, epsilonDeg: 1 / 3600, options: CORRECTED };
const ASPECT = { kind: 'aspect', body: 'Moon', other: 'Sun', targetDeg: 0 };
const show = (label, r) => console.log(
  `${label.padEnd(16)}:`, r.execution.status,
  '| finished', r.execution.finished,
  '| events', r.eventCount.found,
  '| established', r.completeness.established,
  '| undecided intervals', r.accounting.unresolved.length,
);

// 1. Cancellation is an ANSWER, not an exception. Any object with an
//    `aborted` getter will do, including an AbortSignal.
let seen = 0;
const spy = { get aborted() { seen += 1; return seen > 200; } };
show('cancelled', rt.search({ ...ASPECT, ...WINDOW, signal: spy }));

// 2. So is a budget that runs out.
show('budget spent', rt.search({ ...ASPECT, ...WINDOW, maxEvaluations: 500 }));

// 3. The validated mode keeps what it had already isolated when it stops.
const cut = { n: 0, get aborted() { this.n += 1; return this.n > 400; } };
show('geometric cut', rt.searchGeometric({ body: 'Mars', targetDeg: 100, fromTtDays: 7000, toTtDays: 9000, signal: cut }));

// Neither of the three may claim anything about completeness, whatever
// they found: a run that stopped early cannot have accounted for the rest.

// 4. The runtime is still usable, and a full search after the stopped ones
//    is the same search it would have been.
console.log('still works     :', rt.apparent('Sun', 8765.5, CORRECTED).lon.toFixed(6));
const full = rt.search({ ...ASPECT, ...WINDOW });
show('recovered', full);

// 5. Dispose, and then it is not.
rt.dispose();
try {
  rt.apparent('Sun', 8765.5, CORRECTED);
} catch (error) {
  console.log('after dispose   :', error.code);
}
