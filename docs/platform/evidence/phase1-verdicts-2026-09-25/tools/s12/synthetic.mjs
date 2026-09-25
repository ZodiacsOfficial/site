// Step 1.2 (rule 1a): the synthetic sweep and the wrap/retrograde cases, run on the
// VENDORED rc.7 dist (aspectMotion and findAspects, the functions computeChart uses).
// rc.6's findAspects (from its vendored tarball) runs beside it as a positive control.
//   S1  the engine's own seeded sweep (packages/engine/src/aspects.test.ts at 7ae919f,
//       400,000 pairs, linear-motion truth) ported to the dist;
//   S2  the Phase 1 planner's sweep (phase1-design/aspects-speeds/p1-applying.mjs, part C:
//       400,000 cases, luminary orbs, a 1 % tiny-orb branch, fast and slow speeds);
//   S3  a wrap/retrograde sweep written for this run (parameters fixed before running):
//       200,000 cases with one body within 15 deg of the 0/360 seam, every sign
//       combination of the two speeds, and oppositions straddling the +-180 wrap;
//   N   named cases: the engine test's, the planner's and the audit's.
// No Swiss input. Reads the installed @zodiacs/engine and $WORK/tgz-rc6; writes
// $WORK/s12/synthetic.json and prints it without the named cases' detail.
//   node tools/s12/synthetic.mjs > $WORK/s12/synthetic.log
import fs from 'node:fs';
import { ENGINE, RC6, outDir } from '../lib/paths.mjs';

const OUT = outDir('s12');
const rc7 = await import(`${ENGINE}/dist/index.js`);
const rc6 = await import(`${RC6}/dist/internal-math.js`);
if (rc7.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error('not rc.7');
const { ASPECTS, aspectMotion, findAspects, matchAspect, separation, STATIONARY_RELATIVE_SPEED } = rc7;

const body = (name, lon, speed) => ({ body: name, lon, lat: 0, speed, retrograde: speed < 0 });
const steppedApplying = (a, b, angle, orb) => Math.abs(separation(a.lon + a.speed * 0.02, b.lon + b.speed * 0.02) - angle) < orb;
const result = { engine: rc7.ENGINE_VERSION, STATIONARY_RELATIVE_SPEED };

// ---- S1: the engine test's sweep ------------------------------------------------
{
  let state = 12345;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  let wrong = 0, falsePositive = 0, stepWrong = 0, rc6Wrong = 0, cases = 0;
  for (let index = 0; index < 400_000; index += 1) {
    const definition = ASPECTS[index % ASPECTS.length];
    const fast = index % 2 === 0;
    const orb = definition.orb * (0.01 + 0.99 * next());
    const sign = next() < 0.5 ? -1 : 1;
    const side = next() < 0.5 ? -1 : 1;
    const bLon = next() * 360;
    const aLon = bLon + side * (definition.angle + sign * orb);
    const range = fast ? 15 : 1.5;
    const a = body('Mars', ((aLon % 360) + 360) % 360, (next() * 2 - 1) * range);
    const b = body('Jupiter', bLon, (next() * 2 - 1) * range);
    const h = 1e-7 / Math.abs(a.speed - b.speed);
    const orbNow = Math.abs(separation(a.lon, b.lon) - definition.angle);
    const orbNext = Math.abs(separation(a.lon + a.speed * h, b.lon + b.speed * h) - definition.angle);
    const truth = orbNext < orbNow;
    cases += 1;
    const got = aspectMotion(a, b, definition.angle) === 'applying';
    if (got !== truth) { wrong += 1; if (got) falsePositive += 1; }
    if (steppedApplying(a, b, definition.angle, orbNow) !== truth) stepWrong += 1;
    const old = rc6.findAspects([a, b]).find((x) => x.type === definition.type);
    if (old && old.applying !== truth) rc6Wrong += 1;
  }
  result.S1_engineTestSweep = { cases, rc7Misclassified: wrong, rc7FalsePositives: falsePositive, steppedRuleMisclassified: stepWrong, rc6FindAspectsMisclassified: rc6Wrong, note: 'the engine test expects 0 for rc.7 and records 769 for the 0.02-day step' };
}

// ---- S2: the planner's sweep -----------------------------------------------------
{
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let cases = 0, rc7Wrong = 0, rc7FindWrong = 0, rc7FalsePositive = 0, rc6Wrong = 0, ties = 0, skippedNoMatch = 0, skippedExact = 0;
  for (let n = 0; n < 400_000; n += 1) {
    const def = ASPECTS[Math.floor(rnd() * ASPECTS.length)];
    const orbMax = def.luminaryOrb;
    const dev = (rnd() * 2 - 1) * orbMax * (rnd() < 0.5 ? 1 : 0.01);
    let sep = def.angle + dev; if (sep < 0) sep = -sep; if (sep > 180) sep = 360 - sep;
    const sgn = rnd() < 0.5 ? -1 : 1;
    const bLon = rnd() * 360;
    const aLon = (((bLon + sgn * sep) % 360) + 360) % 360;
    const va = (rnd() * 2 - 1) * (rnd() < 0.3 ? 15 : 1.5), vb = (rnd() * 2 - 1) * (rnd() < 0.3 ? 15 : 1.5);
    const a = body('Moon', aLon, va), b = body('Sun', bLon, vb);
    const m = matchAspect('Moon', aLon, 'Sun', bLon);
    if (!m) { skippedNoMatch += 1; continue; }
    const eps = 1e-9;
    const orbNow = Math.abs(separation(aLon, bLon) - m.definition.angle);
    const orbNext = Math.abs(separation(aLon + va * eps, bLon + vb * eps) - m.definition.angle);
    if (orbNow < 1e-6) { skippedExact += 1; continue; }
    if (orbNext === orbNow) ties += 1;
    const truth = orbNext < orbNow;
    cases += 1;
    const motion = aspectMotion(a, b, m.definition.angle);
    if ((motion === 'applying') !== truth) { rc7Wrong += 1; if (motion === 'applying') rc7FalsePositive += 1; }
    if (findAspects([a, b])[0].applying !== truth) rc7FindWrong += 1;
    if (rc6.findAspects([a, b])[0].applying !== truth) rc6Wrong += 1;
  }
  result.S2_plannerSweep = { cases, rc7AspectMotionMisclassified: rc7Wrong, rc7FalsePositives: rc7FalsePositive, rc7FindAspectsMisclassified: rc7FindWrong, rc6FindAspectsMisclassified: rc6Wrong, ties, skippedNoMatch, skippedExact, note: 'planner run on the rc.7 candidate: candidate 0, rc.6 44,541' };
}

// ---- S3: wrap and retrograde sweep (new) -----------------------------------------
{
  let state = 0x5eed1a2b;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  const speedFor = (kind, range) => (kind === 'zero' ? 0 : (kind === 'retro' ? -1 : 1) * range * (0.001 + 0.999 * next()));
  const KINDS = ['direct', 'retro', 'zero'];
  const counts = { cases: 0, rc7Misclassified: 0, rc7FalsePositives: 0, rc6Misclassified: 0, stationaryExpected: 0, stationaryGot: 0, stationaryWrong: 0, seamCrossings: 0, oppositionWrapCases: 0, byCombo: {} };
  for (let n = 0; n < 200_000; n += 1) {
    const def = ASPECTS[n % ASPECTS.length];
    const lum = next() < 0.5;
    const maxOrb = lum ? def.luminaryOrb : def.orb;
    const orb = maxOrb * (0.0001 + 0.9999 * next());
    const sign = next() < 0.5 ? -1 : 1;
    const side = next() < 0.5 ? -1 : 1;
    const bLon = (((next() * 30 - 15) % 360) + 360) % 360; // within 15 deg of the seam
    const rawA = bLon + side * (def.angle + sign * orb);
    const aLon = ((rawA % 360) + 360) % 360;
    if (Math.abs(aLon - bLon) > 180) counts.seamCrossings += 1; // the raw difference wraps
    if (def.angle === 180) counts.oppositionWrapCases += 1;
    const ka = KINDS[Math.floor(next() * 3)], kb = KINDS[Math.floor(next() * 3)];
    const range = next() < 0.5 ? 15 : 1.5;
    const a = body(lum ? 'Moon' : 'Mars', aLon, speedFor(ka, range));
    const b = body(lum ? 'Sun' : 'Jupiter', bLon, speedFor(kb, next() < 0.5 ? 15 : 1.5));
    const combo = `${ka}/${kb}`;
    counts.byCombo[combo] ??= { cases: 0, rc7Wrong: 0 };
    const rel = a.speed - b.speed;
    const got = aspectMotion(a, b, def.angle);
    const flag = findAspects([a, b]).find((x) => x.type === def.type);
    if (!flag) throw new Error('constructed aspect not found');
    counts.cases += 1;
    counts.byCombo[combo].cases += 1;
    if (Math.abs(rel) < STATIONARY_RELATIVE_SPEED) {
      counts.stationaryExpected += 1;
      if (got === 'stationary' && flag.applying === false) counts.stationaryGot += 1; else counts.stationaryWrong += 1;
      continue;
    }
    const h = 1e-7 / Math.abs(rel);
    const orbNow = Math.abs(separation(a.lon, b.lon) - def.angle);
    const orbNext = Math.abs(separation(a.lon + a.speed * h, b.lon + b.speed * h) - def.angle);
    const truth = orbNext < orbNow;
    if ((got === 'applying') !== truth || flag.applying !== truth) {
      counts.rc7Misclassified += 1; counts.byCombo[combo].rc7Wrong += 1;
      if (got === 'applying') counts.rc7FalsePositives += 1;
    }
    const old = rc6.findAspects([a, b]).find((x) => x.type === def.type);
    if (old.applying !== truth) counts.rc6Misclassified += 1;
  }
  result.S3_wrapRetrogradeSweep = counts;
}

// ---- N: named cases ---------------------------------------------------------------
const named = [];
const check = (source, label, a, b, angle, expected) => {
  const got = aspectMotion(a, b, angle);
  const flag = findAspects([a, b]).find((x) => ASPECTS.find((d) => d.type === x.type).angle === angle);
  const pass = got === expected && Boolean(flag) && flag.applying === (expected === 'applying');
  named.push({ source, label, inputs: { a, b, angle }, expected, rc7: got, findAspectsApplying: flag ? flag.applying : null, rc6Applying: rc6.findAspects([a, b])[0]?.applying ?? null, pass });
};
// The engine's own named cases (aspects.test.ts at 7ae919f).
check('engine test', 'Moon 0.1 deg before a conjunction with the Sun', body('Moon', 99.9, 13.2), body('Sun', 100, 0.98), 0, 'applying');
check('engine test', 'Moon square Mars 0.05 deg before exact', body('Moon', 9.95, 13.2), body('Mars', 100, 0.5), 90, 'applying');
check('engine test', 'Moon opposition Sun across 0/360', body('Moon', 179.85, 13.2), body('Sun', 359.9, 0.98), 180, 'applying');
check('engine test', 'Jupiter-Saturn ten minutes before exact', body('Jupiter', 299.99896, 0.25), body('Saturn', 300, 0.1), 0, 'applying');
check('engine test', 'Jupiter-Saturn ten minutes after exact', body('Jupiter', 300.00104, 0.25), body('Saturn', 300, 0.1), 0, 'separating');
check('engine test', 'retrograde Mercury meeting the Sun', body('Mercury', 101, -1), body('Sun', 100, 0.98), 0, 'applying');
check('engine test', 'Mars square Jupiter, both retrograde', body('Mars', 10.5, -0.3), body('Jupiter', 100, -0.1), 90, 'applying');
check('engine test', 'Moon trine Sun, Moon faster and ahead (the brief shorthand trap)', body('Moon', 245, 13.2), body('Sun', 0, 0.98), 120, 'separating');
check('engine test', 'exact conjunction', body('Moon', 100, 13.2), body('Sun', 100, 0.98), 0, 'separating');
check('engine test', 'exact square', body('Moon', 190, 13.2), body('Sun', 100, 0.98), 90, 'separating');
check('engine test', 'both speeds zero', body('Mars', 10, 0), body('Jupiter', 100, 0), 90, 'stationary');
check('engine test', 'relative speed 1e-10', body('Mars', 10, 1.2), body('Jupiter', 100, 1.2 + 1e-10), 90, 'stationary');
check('engine test', 'speed NaN', body('Mars', 10, Number.NaN), body('Jupiter', 100, 1), 90, 'stationary');
// The planner's named cases (p1-applying.mjs).
check('planner', 'Moon square Mars orb 0.05, Mars 0.6 deg/day', body('Moon', 9.95, 13.2), body('Mars', 100, 0.6), 90, 'applying');
check('planner', 'Both retrograde Mars/Jupiter square (Mars 10.5)', body('Mars', 10.5, -0.3), body('Jupiter', 100, -0.1), 90, 'applying');
check('planner', 'Exact orb 0', body('Moon', 100, 13), body('Sun', 100, 1), 0, 'separating');
check('planner', 'Both speed 0', body('Venus', 10, 0), body('Mars', 100.5, 0), 90, 'stationary');
check('planner', 'Moon 245 / Sun 0 trine, Moon speed 13', body('Moon', 245, 13), body('Sun', 0, 1), 120, 'separating');
check('planner', 'Jupiter-Saturn conj 10 min before exact', body('Jupiter', 100 - (0.15 * 10) / 1440, 0.2), body('Saturn', 100, 0.05), 0, 'applying');
// The audit's synthetic cases (aspects_applying.mjs), expected from the orb's linear motion.
check('audit', 'Moon 0.13 deg before exact trine (beyond half-step)', body('Moon', 339.87, 13.2), body('Venus', 100, 1.2), 120, 'applying');
check('audit', 'wrap: Moon 359.9 -> Sun 0.1 conjunction', body('Moon', 359.9, 13.2), body('Sun', 0.1, 0.98), 0, 'applying');
check('audit', 'both retrograde, Mars 190.5 catching Jupiter square', body('Mars', 190.5, -0.3), body('Jupiter', 100, -0.1), 90, 'applying');
check('audit', 'Moon 0.01 before exact sextile with Saturn', body('Moon', 159.99, 13.2), body('Saturn', 100, 0.1), 60, 'applying');
check('audit', 'stationary pair (speed 0) at 0.5 deg orb', body('Mars', 100.5, 0), body('Jupiter', 10, 0), 90, 'stationary');
// Opposition straddling the +-180 wrap, both directions, and a retrograde body.
check('this run', 'opposition, s just under +180, closing', body('Moon', 179.9, 13.2), body('Sun', 0.05, 0.98), 180, 'applying');
check('this run', 'opposition, s just past -180 side, opening', body('Moon', 180.2, 13.2), body('Sun', 0.05, 0.98), 180, 'separating');
check('this run', 'retrograde Venus opposing Saturn across the seam, closing', body('Venus', 0.3, -0.6), body('Saturn', 180.1, 0.02), 180, 'applying');
check('this run', 'retrograde Mars conjunction across the seam, opening', body('Mars', 359.7, -0.3), body('Jupiter', 0.2, 0.1), 0, 'separating');
// Every named expectation is also checked against the orb's linear motion (1e-6 day),
// so a wrong hand-written expectation cannot pass silently.
for (const row of named) {
  if (row.expected === 'stationary') continue;
  const { a, b, angle } = row.inputs;
  const eps = 1e-6;
  const now = Math.abs(separation(a.lon, b.lon) - angle);
  const nxt = Math.abs(separation(a.lon + a.speed * eps, b.lon + b.speed * eps) - angle);
  row.linearTruth = now === 0 ? 'separating' : nxt < now ? 'applying' : 'separating';
  if (row.linearTruth !== row.expected) throw new Error('named expectation contradicts linear motion: ' + row.label);
}
result.named = { cases: named.length, failures: named.filter((x) => !x.pass), all: named };
fs.writeFileSync(OUT + 'synthetic.json', JSON.stringify(result, null, 1));
console.log(JSON.stringify({ ...result, named: { cases: named.length, failures: result.named.failures } }, null, 1));
