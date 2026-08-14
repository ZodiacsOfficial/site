/**
 * Reproducible Phase 4 sharing-loop browser gate.
 *
 * It first proves the default-off build is unchanged, then builds a
 * fixture-only enabled version and drives creation, arrival, completion,
 * return, motion, and share-card states. All matching service calls are
 * intercepted by phase4-sharing-drive.mjs.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const astro = resolve('node_modules/astro/bin/astro.mjs');
const assistantUi = resolve('scripts/build-assistant-ui.mjs');
const driver = resolve('tests/phase4-sharing-drive.mjs');

function run(args, env, quiet = false) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env,
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: quiet ? 'utf8' : undefined,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (quiet) {
      process.stderr.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    process.exit(result.status ?? 1);
  }
}

function buildFixture(env) {
  run([astro, 'build'], env, true);
  // A raw Astro build recreates dist without the stable, separately bundled
  // Guide entrypoint that the previewed pages load.
  run([assistantUi], env, true);
}

const common = { ...process.env };
delete common.ZODIACS_TEST_BASE_URL;

const featureOff = {
  ...common,
  PUBLIC_COMPAT_INVITES_ENABLED: '0',
};
buildFixture(featureOff);
run([driver], { ...common, PHASE4_SHARING_MODE: 'off' });

const fixtureEnabled = {
  ...common,
  PUBLIC_COMPAT_INVITES_ENABLED: '1',
  PUBLIC_SUPABASE_URL: 'https://phase4-test.supabase.co',
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_phase4_fixture',
};
buildFixture(fixtureEnabled);
run([driver], { ...common, PHASE4_SHARING_MODE: 'enabled' });

console.log('Phase 4 sharing fixture builds and browser drives: PASS');
