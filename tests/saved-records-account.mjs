/**
 * Reproducible fixture gate for saved calculation records under the real
 * account coordinator. Builds the site with the records flag, the
 * account-sync-v2 flags and a synthetic auth origin, then drives the real
 * bootstrap and account panel (tests/saved-records-account-drive.mjs).
 *
 * The fixture uses the plain build steps (`npm run build` without its pre and
 * post gates): the production bundle budgets and receipts are calibrated for
 * production configurations and run in Build & Check, and this build never
 * ships. Same pattern as tests/phase4-sharing.mjs.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const driver = resolve('tests/saved-records-account-drive.mjs');

function run(command, args, env) {
  const result = spawnSync(command, args, { cwd: process.cwd(), env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const env = {
  ...process.env,
  PUBLIC_SAVED_RECORDS_ENABLED: '1',
  PUBLIC_ACCOUNT_SYNC_V2_ENABLED: '1',
  PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK: '1',
  // Synthetic origin: every request to it is answered by the drive. Never a real project.
  PUBLIC_SUPABASE_URL: 'https://saved-records-test.supabase.co',
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_saved_records_fixture',
};
delete env.ZODIACS_TEST_BASE_URL;

run(npm, ['run', 'build', '--ignore-scripts'], env);
run(process.execPath, [driver], env);
console.log('Saved calculation records account-coordinator fixture build and drive: PASS');
