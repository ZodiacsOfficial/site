/**
 * Runs the saved-records flag rollback gates end to end.
 *
 * Builds the same source four times in the order a real activation and rollback
 * would happen, driving one persistent browser profile through every step:
 *
 *   flag off -> a new visitor sees nothing and no database is created
 *   flag on  -> two records are kept with their exact receipt bytes
 *   flag off -> those records stay findable, exportable byte-for-byte and removable
 *   flag on  -> nothing stranded, nothing resurrected, keeping works again
 *
 * Builds use the plain Astro steps (`--ignore-scripts`): the production pre/post
 * gates are calibrated for the released configuration and these fixture builds
 * never ship. Same pattern as tests/saved-records-account.mjs.
 *
 *   OUT_DIR=tests/visual/artifacts/saved-records-rollback node tests/saved-records-rollback.mjs
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const driver = resolve('tests/saved-records-rollback-drive.mjs');
const profileDir = resolve(process.env.PROFILE_DIR ?? '/tmp/zodiacs-rollback-profile');
const outDir = process.env.OUT_DIR ?? 'tests/visual/artifacts/saved-records-rollback';

function run(command, args, env, label) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: process.cwd(), env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const base = { ...process.env, OUT_DIR: outDir, PROFILE_DIR: profileDir };
delete base.ZODIACS_TEST_BASE_URL;
const flagOff = { ...base, PUBLIC_SAVED_RECORDS_ENABLED: '' };
const flagOn = { ...base, PUBLIC_SAVED_RECORDS_ENABLED: '1' };

// A genuinely fresh profile, so "no database is created" means what it says.
rmSync(profileDir, { recursive: true, force: true });
rmSync(resolve(outDir, 'carry.json'), { force: true });

run(npm, ['run', 'build', '--ignore-scripts'], flagOff, 'build 1/4: flag off');
run(process.execPath, [driver], { ...flagOff, PHASE: 'fresh-off' }, 'phase 1/4: fresh visitor, feature off');

run(npm, ['run', 'build', '--ignore-scripts'], flagOn, 'build 2/4: flag on (activation)');
run(process.execPath, [driver], { ...flagOn, PHASE: 'keep' }, 'phase 2/4: keep records while enabled');

run(npm, ['run', 'build', '--ignore-scripts'], flagOff, 'build 3/4: flag off (rollback)');
run(process.execPath, [driver], { ...flagOff, PHASE: 'disabled' }, 'phase 3/4: rolled back, records must stay reachable');

run(npm, ['run', 'build', '--ignore-scripts'], flagOn, 'build 4/4: flag on again');
run(process.execPath, [driver], { ...flagOn, PHASE: 'reenabled' }, 'phase 4/4: re-enabled, nothing stranded');

console.log('\nSaved calculation records flag rollback gates: PASS');
