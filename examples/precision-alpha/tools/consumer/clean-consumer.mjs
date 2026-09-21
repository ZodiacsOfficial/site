/**
 * Pack the package, install the archive into an empty project, and run a
 * consumer that has nothing else.
 *
 *   node tools/consumer/clean-consumer.mjs [--out evidence.json]
 *
 * ## What this catches that the test suite cannot
 *
 * Every test in `test/` imports by relative path from inside the
 * repository. A consumer imports by package specifier, through the
 * `exports` map, from whatever `files` actually shipped. Those are
 * different resolutions, and the first run of this script found the gap:
 * `examples/synthetic-pack.mjs` was in `files`, so it shipped, but no
 * `exports` entry named it, so a consumer importing it got
 * ERR_PACKAGE_PATH_NOT_EXPORTED. The package could be installed and the
 * experimental mode could not be run without a coefficient pack -- which,
 * while pack distribution is unresolved, means it could not be run.
 *
 * Offline by construction: the package has no dependencies, `npm install`
 * is given `--offline`, and the fixture the consumer searches is built in
 * memory from polynomials in the archive.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const outAt = argv.indexOf('--out');
const outPath = outAt >= 0 ? argv[outAt + 1] : null;

const CONSUMER = `// A consumer that has only the published archive: no repository, no source
// tree, no dev dependencies. Every import is by package specifier.
import { openPackFromBytes, isProven } from '@zodiacs/precision-alpha';
import {
  experimental, EXPERIMENTAL, ABERRATED_CONTRACT, OF_DATE_CONTRACT, OF_DATE_MODEL_RANGE_TDB_SEC,
} from '@zodiacs/precision-alpha/experimental';
import { buildSyntheticPack, SYNTHETIC } from '@zodiacs/precision-alpha/examples/synthetic-pack.mjs';

const rt = await openPackFromBytes(await buildSyntheticPack());
const x = experimental(rt);
const spec = {
  body: 'Mars', targetDeg: SYNTHETIC.targetDeg,
  fromTdbSec: SYNTHETIC.windowTdbSec[0], toTdbSec: SYNTHETIC.windowTdbSec[1],
};
const lightTime = x.searchRetarded(spec);
const aberrated = x.searchRetardedAberrated(spec);
// The of-date rung, through the installed archive. Its targetDeg is
// measured from a different origin, so the same number asks a different
// question -- which is the point of reporting both frames below.
const ofDate = x.searchRetardedAberratedOfDate(spec);
let afterDispose = null;
let afterDisposeOfDate = null;
x.dispose();
rt.dispose();
try { x.searchRetardedAberrated(spec); } catch (error) { afterDispose = error.code; }
try { x.searchRetardedAberratedOfDate(spec); } catch (error) { afterDisposeOfDate = error.code; }
process.stdout.write(JSON.stringify({
  modes: EXPERIMENTAL.modes,
  resultContract: aberrated.contract,
  mode: aberrated.mode,
  established: aberrated.completeness.established,
  isProvenNarrows: isProven(aberrated),
  found: aberrated.eventCount.found,
  isExactTotal: aberrated.eventCount.isExactTotal,
  rootTdbSec: aberrated.events[0] ? aberrated.events[0].tdbSec : null,
  bracketWidthSec: aberrated.events[0] ? aberrated.events[0].bracketWidthSec : null,
  aberrationShiftSec: aberrated.events[0] && lightTime.events[0]
    ? aberrated.events[0].tdbSec - lightTime.events[0].tdbSec : null,
  appliedCount: ABERRATED_CONTRACT.applied.length,
  notAppliedCount: aberrated.diagnostics.notApplied.length,
  afterDispose,
  ofDate: {
    mode: ofDate.mode,
    frame: ofDate.request.frame,
    aberratedFrame: aberrated.request.frame,
    contractFrame: OF_DATE_CONTRACT.frame,
    modelRangeTdbSec: [...OF_DATE_MODEL_RANGE_TDB_SEC],
    established: ofDate.completeness.established,
    isProvenNarrows: isProven(ofDate),
    found: ofDate.eventCount.found,
    isExactTotal: ofDate.eventCount.isExactTotal,
    rootTdbSec: ofDate.events[0] ? ofDate.events[0].tdbSec : null,
    frameShiftSec: ofDate.events[0] && aberrated.events[0]
      ? ofDate.events[0].tdbSec - aberrated.events[0].tdbSec : null,
    requestWithinModelRange: ofDate.diagnostics.frameOfDate.requestWithinModelRange,
    obliquityEntersTheProjection: ofDate.diagnostics.frameOfDate.obliquityEntersTheProjection,
    // The three sources, present and separate. A consumer that reads only
    // one of them is reading a third of the answer.
    timeScaleKeys: Object.keys(ofDate.uncertainty.timeScale).sort(),
    conversionInducedLongitudeArcsec:
      ofDate.uncertainty.timeScale.conversionApproximation.inducedLongitudeArcsec,
    externalTimeModelBounded: ofDate.uncertainty.timeScale.externalTimeModel.bounded,
    notAppliedCount: ofDate.diagnostics.notApplied.length,
    afterDispose: afterDisposeOfDate,
  },
}));
`;

const work = mkdtempSync(join(tmpdir(), 'zprecision-consumer-'));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
let record;
try {
  const packDir = join(work, 'archive');
  const consumerDir = join(work, 'consumer');
  run('mkdir', ['-p', packDir, consumerDir], work);
  run('npm', ['pack', '--pack-destination', packDir], PKG);
  const tarball = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
  if (!tarball) throw new Error('npm pack produced no archive');

  writeFileSync(join(consumerDir, 'package.json'),
    `${JSON.stringify({ name: 'clean-consumer', private: true, type: 'module', version: '0.0.0' }, null, 2)}\n`);
  writeFileSync(join(consumerDir, 'run.mjs'), CONSUMER);
  run('npm', ['install', '--no-audit', '--no-fund', '--offline', join(packDir, tarball)], consumerDir);
  const stdout = run(process.execPath, ['run.mjs'], consumerDir);

  record = {
    archive: tarball,
    archiveBytes: readFileSync(join(packDir, tarball)).byteLength,
    installedFrom: 'the packed archive only, --offline, no dependencies',
    consumer: JSON.parse(stdout),
  };
} finally {
  rmSync(work, { recursive: true, force: true });
}

// The consumer's own verdict, checked here rather than eyeballed.
const c = record.consumer;
const problems = [];
if (c.mode !== 'validated-retarded-aberrated') problems.push(`mode is ${c.mode}`);
if (c.resultContract !== 'zodiacs-precision-search/2') problems.push(`contract is ${c.resultContract}`);
if (c.established !== true || c.isProvenNarrows !== true) problems.push('completeness was not established through the published narrowing helper');
if (c.isExactTotal !== true || c.found !== 1) problems.push(`found ${c.found}, exact ${c.isExactTotal}`);
if (!(Math.abs(c.aberrationShiftSec) > 1)) problems.push(`the aberration shifted the crossing by ${c.aberrationShiftSec} s, which is not a demonstration`);
if (c.notAppliedCount < 6) problems.push(`only ${c.notAppliedCount} omissions are listed`);
if (c.afterDispose !== 'disposed') problems.push(`after dispose the error code was ${c.afterDispose}`);

// The of-date rung, checked through the archive rather than assumed to be
// there because the source tree has it.
const o = c.ofDate;
if (o.mode !== 'validated-retarded-aberrated-of-date') problems.push(`of-date mode is ${o.mode}`);
if (o.frame !== 'ecliptic-of-date-true-equinox-of-date') problems.push(`of-date frame is ${o.frame}`);
if (o.frame !== o.contractFrame) problems.push('the result frame and the exported contract disagree');
if (o.frame === o.aberratedFrame) problems.push('the of-date rung claims the fixed frame the aberrated rung uses');
if (o.established !== true || o.isProvenNarrows !== true) problems.push('the of-date rung did not establish completeness through the published narrowing helper');
if (o.isExactTotal !== true || o.found !== 1) problems.push(`of-date found ${o.found}, exact ${o.isExactTotal}`);
if (!(Math.abs(o.frameShiftSec) > 1)) problems.push(`the frame moved the crossing by ${o.frameShiftSec} s, which is not a demonstration`);
if (o.requestWithinModelRange !== true) problems.push('the fixture window is outside the declared model range');
if (o.obliquityEntersTheProjection !== false) problems.push('the of-date projection is carrying an obliquity it should have cancelled');
if (o.timeScaleKeys.join(',') !== 'conversionApproximation,externalTimeModel,implementationNumerical') {
  problems.push(`the three time-scale sources are not all present: ${o.timeScaleKeys.join(',')}`);
}
if (o.externalTimeModelBounded !== false) problems.push('the external time model is reported as bounded, which it is not');
if (!(o.conversionInducedLongitudeArcsec > 0)) problems.push('the conversion contribution is not reported in longitude');
if (o.afterDispose !== 'disposed') problems.push(`after dispose the of-date error code was ${o.afterDispose}`);
record.passed = problems.length === 0;
record.problems = problems;

const text = `${JSON.stringify(record, null, 2)}\n`;
if (outPath) writeFileSync(outPath, text);
process.stdout.write(text);
if (!record.passed) process.exitCode = 1;
