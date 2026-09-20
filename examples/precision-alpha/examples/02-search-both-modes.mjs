/**
 * The two search modes, side by side, and what each can establish.
 *
 *   node examples/02-search-both-modes.mjs /path/to/pack.zeph
 */
import { openPackFile, CORRECTED } from '@zodiacs/precision-alpha/node';

const path = process.argv[2];
if (!path) { console.error('usage: node 02-search-both-modes.mjs <pack.zeph>'); process.exit(2); }
const rt = await openPackFile(path);
const iso = (tt) => new Date((tt + 10957.5) * 86400000).toISOString();

// 2019, in TT days past J2000.
const window = { fromTtDays: 6939, toTtDays: 7304 };

// 1. The empirical mode: apparent longitude of date, what an almanac means.
const apparent = rt.search({
  kind: 'longitude', body: 'Moon', targetDeg: 100,
  ...window, epsilonDeg: 1 / 3600, options: CORRECTED,
});
console.log('empirical, apparent of date');
console.log('  finished           ', apparent.execution.finished);
console.log('  events found       ', apparent.eventCount.found);
console.log('  completeness proved', apparent.completeness.established, `(support: ${apparent.completeness.support})`);
console.log('  exact total        ', apparent.eventCount.isExactTotal, '- conditional total:', apparent.eventCount.conditionalTotal);
console.log('  conditional on     ', apparent.completeness.conditionalOn.join(', '));

// 2. The validated mode: geometric longitude in the fixed J2000 ecliptic.
//    A DIFFERENT QUANTITY. No light-time, no aberration, no precession.
const geometric = rt.searchGeometric({ body: 'Moon', targetDeg: 100, ...window });
console.log('\nvalidated, geometric J2000');
console.log('  finished           ', geometric.execution.finished);
console.log('  events found       ', geometric.eventCount.found);
console.log('  completeness proved', geometric.completeness.established, `(support: ${geometric.completeness.support})`);
console.log('  exact total        ', geometric.eventCount.isExactTotal);
console.log('  assumptions        ', geometric.assumptions.length, '(proven means none)');

console.log('\nfirst event from each, and they are not the same instant:');
console.log('  apparent ', iso(apparent.events[0].ttDays));
console.log('  geometric', iso(geometric.events[0].ttDays));
console.log('  the gap is precession plus light-time, not an error in either');

rt.dispose();
