/**
 * Plan the domain once; answer several longitudes over it.
 *
 *   node examples/06-plan-once-many-longitudes.mjs                  # synthetic fixture
 *   node examples/06-plan-once-many-longitudes.mjs /path/pack.zeph  # your own pack
 *
 * The fourth rung can decline part of a window, and finding out WHERE it
 * declines is most of what it costs. That question has no target longitude
 * in it, so it can be answered once and reused -- which is the whole of
 * this example.
 *
 * What it shows, in order:
 *
 *   1. the plan: four span lists that tile the request, and what each one
 *      does and does not license;
 *   2. the same plan answering four longitudes, with the cost of each;
 *   3. a plan handed to the wrong request, which is REFUSED rather than
 *      quietly recomputed;
 *   4. the events, and why an event from a boundary span is not the same
 *      kind of fact as an event from an admissible one.
 *
 * Nothing here lowers the five-degree floor, changes the deflection model,
 * or claims completeness over a window the profile declines part of.
 */
import { openPackFromBytes } from '@zodiacs/precision-alpha';
import { openPackFile } from '@zodiacs/precision-alpha/node';
import { experimental, EXPERIMENTAL, PARTITION_DEFAULTS } from '@zodiacs/precision-alpha/experimental';
import { buildSyntheticPack, SYNTHETIC } from './synthetic-pack.mjs';

const DAY = 86400;
const path = process.argv[2] ?? null;

const rt = path
  ? await openPackFile(path)
  : await openPackFromBytes(await buildSyntheticPack());
const x = experimental(rt);

/**
 * The digest matters. A plan is a proof about ONE pack, and without a
 * digest its identity falls back to the pack's structure and proven error
 * bounds -- which cannot separate two packs of the same shape holding
 * different coefficients. The plan says which it has.
 */
const packDigest = rt.integrity?.computedDigest ?? null;

const [from, to] = path
  ? [rt.coverage.startEtSecTdb + DAY, rt.coverage.stopEtSecTdb - DAY]
  : [-DAY, DAY];
const body = path ? 'Mercury' : 'Venus';

// --------------------------------------------------------------- 1. the plan
console.log('what this subpath promises:', EXPERIMENTAL.stability);
console.log('plan contract   :', EXPERIMENTAL.partitioned.planContract);
console.log('search contract :', EXPERIMENTAL.partitioned.searchContract, '(NOT the released search result)');
console.log('independent of the target longitude:', EXPERIMENTAL.partitioned.independentOfTargetLongitude);
console.log('boundary tolerance, seconds:', PARTITION_DEFAULTS.boundaryToleranceSec);

const plan = x.planDeflectedDomain({ body, fromTdbSec: from, toTdbSec: to, packDigest });

const days = (spans) => spans.reduce((n, [a, b]) => n + (b - a), 0) / DAY;
const window = (to - from) / DAY;
console.log(`\n1. the plan for ${body} over ${window.toFixed(2)} days`);
console.log('   identity strength :', plan.request.identityStrength,
  packDigest ? '' : '(no digest was available: weaker, and it says so)');
console.log('   cost              :', plan.execution.evaluations, 'evaluations,', plan.execution.cells, 'cells');
console.log(`   admissible        : ${plan.admissible.length} span(s), ${days(plan.admissible).toFixed(4)} d`);
console.log('                       PROVED at or above the floor at every instant.');
console.log(`   excluded          : ${plan.excluded.length} span(s), ${days(plan.excluded).toFixed(4)} d`);
console.log('                       PROVED below it. No answer here at any resolution --');
console.log('                       which is NOT the same as no crossing here.');
console.log(`   boundary          : ${plan.boundary.length} span(s), ${days(plan.boundary).toFixed(4)} d`);
console.log('                       proved NEITHER. The transition is inside these, and');
console.log('                       the width of each is the whole of what is known about it.');
console.log(`   unprocessed       : ${plan.unprocessed.length} span(s), ${days(plan.unprocessed).toFixed(4)} d`);
console.log('                       never examined. Not excluded, not searched-and-empty.');

// ------------------------------------------------- 2. many longitudes, one plan
const targets = [0, 90, 180, 270];
console.log(`\n2. ${targets.length} longitudes over that one plan`);
let reusedTotal = 0;
const results = [];
for (const targetDeg of targets) {
  const r = x.searchRetardedAberratedDeflectedOfDateOverPlan({
    body, targetDeg, fromTdbSec: from, toTdbSec: to, plan, packDigest,
  });
  results.push(r);
  reusedTotal += r.execution.evaluations;
  console.log(`   ${String(targetDeg).padStart(3)} deg: ${String(r.execution.evaluations).padStart(8)} evaluations`
    + ` (partition ${r.execution.partitionEvaluations}, reused=${r.execution.partitionReused})`
    + ` -> ${r.events.length} crossing(s),`
    + ` ${r.eventCount.eligibilityEstablished} with eligibility established`);
}
const cold = x.searchRetardedAberratedDeflectedOfDateOverPlan({
  body, targetDeg: targets[0], fromTdbSec: from, toTdbSec: to, packDigest,
});
console.log(`   cold (plan built inside the request): ${cold.execution.evaluations} evaluations,`
  + ` of which ${cold.execution.partitionEvaluations} were the plan`);
console.log(`   ${targets.length} warm queries + one plan: ${plan.execution.evaluations + reusedTotal} evaluations total`);
console.log('   The budget is ONE allowance per request covering the plan and every');
console.log('   subsearch. It is not reset per span.');

// ------------------------------------------------------- 3. the wrong request
console.log('\n3. a plan handed to a request it is not about');
try {
  x.searchRetardedAberratedDeflectedOfDateOverPlan({
    body, targetDeg: 0, fromTdbSec: from, toTdbSec: to - DAY / 2, plan, packDigest,
  });
  console.log('   NOT REACHED: a plan for a different window was accepted');
} catch (error) {
  console.log('   refused:', error.code);
  // The last clause is the one worth reading: the keys themselves are long
  // and differ in one field.
  console.log('  ', error.message.slice(error.message.lastIndexOf('. A partition') + 2));
}

// ------------------------------------------------------------- 4. the events
const shown = results.find((r) => r.events.length > 0) ?? results[0];
console.log('\n4. what a result does and does not claim');
console.log('   complete over the request :', shown.completeness.overRequest);
if (!shown.completeness.overRequest) console.log('     because:', shown.completeness.overRequestWhyNot);
console.log('   exhaustive over the proved-admissible spans:', shown.completeness.exhaustiveOverAdmissible);
console.log('   may still hold unfound supported events    :', shown.completeness.mayHoldUnfoundSupportedEvents);
console.log('   the four classes tile the request exactly  :', shown.accounting.coversRequestExactly);
for (const e of shown.events.slice(0, 6)) {
  console.log(`   ${(e.tdbSec / DAY).toFixed(6)} d  domain=${e.domain}  eligibility=${e.eligibility}`);
  if (e.positionNote) console.log('     ', e.positionNote);
}
console.log('\n  ', shown.completeness.statement);

x.dispose();
rt.dispose();
