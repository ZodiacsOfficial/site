/**
 * Reproducible Phase 3 post-chart browser gate.
 *
 * The values below are non-secret fixtures. The browser driver intercepts the
 * matching Supabase origin and first-party preference endpoint, so this build
 * cannot contact a subscriber, provider, or real project.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const astro = resolve('node_modules/astro/bin/astro.mjs');
const assistantUi = resolve('scripts/build-assistant-ui.mjs');

const fixtureEnv = {
  ...process.env,
  DAILY_EMAIL_ENABLED: '1',
  EMAIL_PROVIDER: 'resend',
  STANDALONE_WEEKLY_EMAIL_ENABLED: '1',
  RESEND_API_KEY: 're_fixture_sending_not_a_secret',
  RESEND_CONTACTS_API_KEY: 're_fixture_contacts_not_a_secret',
  RESEND_SEGMENT_ID: 'fixture_weekly_segment',
  RESEND_FROM_EMAIL: 'Zodiacs.org <fixture@zodiacs.org>',
  EMAIL_CONFIRM_SECRET: 'fixture-confirm-secret-000000000000000000000000',
  EMAIL_CONFIRM_BASE_URL: 'https://zodiacs.org',
  DAILY_EMAIL_UNSUBSCRIBE_SECRET: 'fixture-unsubscribe-secret-0000000000000000000',
  DAILY_EMAIL_RECIPIENT_HASH_SECRET: 'fixture-recipient-secret-000000000000000000000',
  RESEND_DAILY_SEGMENT_ID: 'fixture_daily_sun_segment',
  PUBLIC_SUPABASE_URL: 'https://phase3-test.supabase.co',
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  SUPABASE_SERVICE_ROLE_KEY: 'service_fixture_not_a_secret',
  PUBLIC_WEB_PUSH_ENABLED: '0',
};

function run(args, env = process.env, quiet = false) {
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

run([astro, 'build'], fixtureEnv, true);
// A raw Astro build recreates dist; restore the stable Guide bundle before
// the browser driver starts the fixture preview.
run([assistantUi], fixtureEnv, true);
console.log('Phase 3 post-chart fixture build: PASS');
const driverEnv = { ...process.env };
delete driverEnv.ZODIACS_TEST_BASE_URL;
run([resolve('tests/post-chart-daily-drive.mjs'), '--summary'], driverEnv);
