/**
 * The experimental modes, and the ladder that attributes what each adds.
 *
 *   node examples/04-experimental-aberrated.mjs                  # synthetic fixture
 *   node examples/04-experimental-aberrated.mjs /path/pack.zeph  # your own pack
 *
 * With no argument this builds the committed synthetic fixture described in
 * `synthetic-pack.mjs` and searches that. The arithmetic is real; the sky
 * is not, and nothing printed below is about the actual solar system.
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
console.log('time scale:', EXPERIMENTAL.timeScale);
if (!path) console.log('\ndata:', SYNTHETIC.note);

const [from, to] = path ? [rt.coverage.startEtSecTdb + DAY, rt.coverage.stopEtSecTdb - DAY] : SYNTHETIC.windowTdbSec;
const spec = { body: 'Mars', targetDeg: SYNTHETIC.targetDeg, fromTdbSec: from, toTdbSec: to };

// Rung 2: reception light-time only.
const lightTime = x.searchRetarded(spec);
// Rung 3: the same, plus the observer's own motion.
const aberrated = x.searchRetardedAberrated(spec);

const report = (label, r) => {
  console.log(`\n${label}  (${r.mode})`);
  console.log('  finished           ', r.execution.finished, `- ${r.execution.evaluations} evaluations, ${r.execution.cells} cells`);
  console.log('  completeness proved', r.completeness.established, `(support: ${r.completeness.support})`);
  console.log('  exact total        ', r.eventCount.isExactTotal, `- found ${r.eventCount.found}`);
  for (const e of r.events) {
    console.log(`    crossing at TDB ${e.tdbSec.toFixed(6)} s  bracket ${e.bracketWidthSec.toExponential(2)} s`
      + `  ${e.direction}  light-time ${e.lightTimeSec.lo.toFixed(3)}..${e.lightTimeSec.hi.toFixed(3)} s`);
  }
};
report('light-time only   ', lightTime);
report('light-time + aberration', aberrated);

if (lightTime.events.length === aberrated.events.length) {
  console.log('\nwhat the observer-motion correction moved:');
  aberrated.events.forEach((e, i) => {
    const shift = e.tdbSec - lightTime.events[i].tdbSec;
    console.log(`  crossing ${i}: ${shift >= 0 ? '+' : ''}${shift.toFixed(3)} s`);
  });
  console.log(`  worst |v_observer|/c over the run: ${aberrated.diagnostics.aberration.worstObserverSpeedOverC.toExponential(3)}`);
}

console.log('\nstill NOT applied, on every aberrated result, by name:');
for (const item of aberrated.diagnostics.notApplied) console.log('  -', item);
console.log('\nThis is not an apparent place and not a chart. Read `request.operation`');
console.log('before comparing it with an almanac:');
console.log(' ', aberrated.request.operation);

// The handle detaches; the runtime owns the buffers and releases them.
x.dispose();
rt.dispose();
try {
  x.searchRetardedAberrated(spec);
} catch (error) {
  console.log('\nafter dispose:', error.code, '-', error.message);
}
