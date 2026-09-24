/**
 * The fourth rung, and the first one that can refuse.
 *
 *   node examples/05-experimental-deflected.mjs                  # synthetic fixture
 *   node examples/05-experimental-deflected.mjs /path/pack.zeph  # your own pack
 *
 * With no argument this builds the committed synthetic fixture described in
 * `synthetic-pack.mjs`. The arithmetic is real; the sky is not, and nothing
 * printed below is about the actual solar system.
 *
 * Three things this shows that no earlier example could:
 *
 *   1. what solar deflection moves, on a window that never approaches the
 *      Sun -- which is very little, and the point of printing it is that a
 *      shifted event time is not by itself an accuracy improvement;
 *   2. how to READ a refusal, on a window that crosses the five-degree
 *      floor three times. A caller that reads `events` without reading
 *      `accounting.excluded` turns "we did not look there" into "there is
 *      nothing there";
 *   3. the deflector as target, which is answered and NOT deflected.
 */
import { openPackFromBytes } from '@zodiacs/precision-alpha';
import { openPackFile } from '@zodiacs/precision-alpha/node';
import { experimental, EXPERIMENTAL } from '@zodiacs/precision-alpha/experimental';
import { buildSyntheticPack, SYNTHETIC } from './synthetic-pack.mjs';

const DAY = 86400;
const path = process.argv[2] ?? null;

const rt = path
  ? await openPackFile(path)
  : await openPackFromBytes(await buildSyntheticPack());
const x = experimental(rt);

console.log('stability:', EXPERIMENTAL.stability);
console.log('restricted domain:', EXPERIMENTAL.restrictedDomain.floor);
console.log('  ', EXPERIMENTAL.restrictedDomain.behaviour);
console.log('floor, radians:', x.deflectionMinElongationRad,
  `(${((x.deflectionMinElongationRad * 180) / Math.PI).toFixed(3)} degrees)`);
if (!path) console.log('\ndata:', SYNTHETIC.note);

const [from, to] = path ? [rt.coverage.startEtSecTdb + DAY, rt.coverage.stopEtSecTdb - DAY] : SYNTHETIC.windowTdbSec;

// ---------------------------------------------------------------- 1. the shift
// The Mars-like target stays above 100 degrees of elongation over the whole
// window, so the floor is never approached and the answer is complete.
const spec = { body: 'Mars', targetDeg: SYNTHETIC.targetDeg, fromTdbSec: from, toTdbSec: to };
const ofDate = x.searchRetardedAberratedOfDate(spec);
const deflected = x.searchRetardedAberratedDeflectedOfDate(spec);

console.log(`\n1. what the deflection moved  (${deflected.mode})`);
console.log('   completeness proved', deflected.completeness.established,
  `- ${deflected.execution.evaluations} evaluations against ${ofDate.execution.evaluations} without deflection`);
if (ofDate.events.length === deflected.events.length) {
  deflected.events.forEach((e, i) => {
    console.log(`   crossing ${i}: ${(e.tdbSec - ofDate.events[i].tdbSec).toExponential(3)} s`);
  });
}
const d = deflected.diagnostics.deflection;
console.log('   widest deflection over the run:', d.widestDeflectionArcsec.toExponential(4), 'arcsec');
console.log('     ...which is an ENCLOSURE upper bound, not a value at an instant:',
  d.widestDeflectionIsAnEnclosureUpperBound);
console.log('   closest elongation reported:', d.closestElongationDeg.toFixed(4), 'degrees (a report, not the minimum)');
console.log('   A moved event time is NOT an accuracy improvement. It is a different question');
console.log('   answered, and whether the new answer is closer to the sky is a separate claim.');

// ------------------------------------------------------------- 2. the refusal
// The companion passes the Sun's direction once every 0.7 days, so a
// one-day window crosses the floor three times.
const near = { body: 'Venus', targetDeg: SYNTHETIC.longCase.targetDeg, fromTdbSec: -DAY, toTdbSec: DAY };
const refused = path ? null : x.searchRetardedAberratedDeflectedOfDate(near);
if (refused) {
  console.log('\n2. how to read a refusal');
  console.log('   established         ', refused.completeness.established, `(support: ${refused.completeness.support})`);
  console.log('   exact total         ', refused.eventCount.isExactTotal, `- found ${refused.eventCount.found}`);
  console.log('   decided fraction    ', refused.interval.decidedFraction.toFixed(6));
  console.log('   excluded spans      ', refused.accounting.excluded.length,
    '- the profile has no answer here at any resolution');
  for (const s of refused.accounting.excluded) {
    console.log(`     ${(s.fromTdbSec / DAY).toFixed(5)} .. ${(s.toTdbSec / DAY).toFixed(5)} d`);
  }
  console.log('   unresolved spans    ', refused.accounting.unresolved.length,
    '- a DIFFERENT answer: not settled at the cell size reached');
  console.log('   events found        ', refused.events.map((e) => (e.tdbSec / DAY).toFixed(6)).join(', '), 'd');
  console.log('   ...and that list is a LOWER BOUND over the request. It is exhaustive only over:');
  for (const [a, b] of refused.interval.decidedTdbSec) {
    console.log(`     ${(a / DAY).toFixed(5)} .. ${(b / DAY).toFixed(5)} d`);
  }
}

// ------------------------------------------------- 3. the deflector as target
const sun = x.searchRetardedAberratedDeflectedOfDate({ ...spec, body: 'Sun' });
console.log('\n3. the deflector as target');
console.log('   mode               ', sun.mode);
console.log('   deflection applied ', sun.diagnostics.deflection.appliedToThisBody);
console.log('   because            ', sun.diagnostics.deflection.notAppliedBecause);
console.log('   established        ', sun.completeness.established,
  '- an undeflected answer, and complete, which the mode name alone would not tell you');

console.log('\nstill NOT applied, on every deflected result, by name:');
for (const item of deflected.diagnostics.notApplied) console.log('  -', item);
console.log('\nThis is not an apparent place and not a chart. Read `request.operation`');
console.log('before comparing it with an almanac:');
console.log(' ', deflected.request.operation);

x.dispose();
rt.dispose();
