import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workdirs = [];
afterEach(() => { for (const dir of workdirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

// Exercise the real Bash harness against a simulated Docker lifecycle. The
// temporary server accepts sockets; TCP becomes ready only after its shutdown.
// No database behavior or migration assertion is simulated as a passing test.
function run(mode = 'normal', socketRegression = false) {
  const dir = mkdtempSync(join(tmpdir(), 'zodiacs-games-readiness-'));
  workdirs.push(dir);
  const statePath = join(dir, 'state.json');
  writeFileSync(statePath, JSON.stringify({ probes: 0, sql: 0, sleeps: 0, ready: false, cleaned: false, logged: false }));
  writeFileSync(join(dir, 'docker'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const path = process.env.GAMES_READINESS_TEST_STATE;
const state = JSON.parse(fs.readFileSync(path, 'utf8'));
const mode = process.env.GAMES_READINESS_TEST_MODE;
function finish(code) { fs.writeFileSync(path, JSON.stringify(state)); process.exit(code); }
if (args[0] === 'info') finish(0);
if (args[0] === 'run') { process.stdout.write('fixture-container\\n'); finish(0); }
if (args[0] === 'rm') { state.cleaned = true; finish(0); }
if (args[0] === 'logs') { state.logged = true; finish(0); }
if (args[0] !== 'exec') finish(90);
const hostIndex = args.indexOf('--host');
const tcp = hostIndex >= 0 && args[hostIndex + 1] === '127.0.0.1';
const password = args.includes('PGPASSWORD=games-local-test-only');
const noPrompt = args.includes('--no-password');
if (args.includes('--command')) {
  state.probes++;
  if (!tcp) finish(0); // The socket-only initialization server is reachable.
  if (!password || !noPrompt) finish(91);
  if (mode === 'never-ready' || state.probes < 3) finish(1);
  state.ready = true;
  finish(0);
}
state.sql++;
if (!state.ready || !tcp) { process.stderr.write('temporary database server is shutting down\\n'); finish(79); }
if (!password || !noPrompt || !args.includes('ON_ERROR_STOP=1')) finish(92);
state.nonemptySql = Boolean(fs.readFileSync(0, 'utf8').trim());
if (mode === 'sql-failure' && state.sql === 2) { process.stderr.write('fixture SQL assertion failure\\n'); finish(42); }
finish(0);
`, { mode: 0o755 });
  const eventsPath = join(dir, 'docker-events.txt');
  writeFileSync(eventsPath, '');
  if (mode === 'never-ready') {
    // Preserve all 60 real harness attempts without starting a Node runtime
    // per failed probe. This shell double records the observed lifecycle;
    // it never simulates a ready database or a successful SQL assertion.
    writeFileSync(join(dir, 'docker'), `#!/usr/bin/env bash
case "$1" in
  info) exit 0 ;;
  run) printf 'fixture-container\\n'; exit 0 ;;
  rm) printf 'cleaned\\n' >> "$GAMES_READINESS_TEST_EVENTS"; exit 0 ;;
  logs) printf 'logged\\n' >> "$GAMES_READINESS_TEST_EVENTS"; exit 0 ;;
  exec) ;;
  *) exit 90 ;;
esac
tcp=false; password=false; no_prompt=false; command=false; previous=''
for argument in "$@"; do
  if [[ "$previous" == '--host' && "$argument" == '127.0.0.1' ]]; then tcp=true; fi
  case "$argument" in
    PGPASSWORD=games-local-test-only) password=true ;;
    --no-password) no_prompt=true ;;
    --command) command=true ;;
  esac
  previous="$argument"
done
if [[ "$command" == true ]]; then
  printf 'probe\\n' >> "$GAMES_READINESS_TEST_EVENTS"
  if [[ "$tcp" != true ]]; then exit 0; fi
  if [[ "$password" != true || "$no_prompt" != true ]]; then exit 91; fi
  exit 1
fi
printf 'sql\\n' >> "$GAMES_READINESS_TEST_EVENTS"
printf 'temporary database server is shutting down\\n' >&2
exit 79
`, { mode: 0o755 });
  }
  const sleepPath = join(dir, 'sleeps.txt');
  writeFileSync(sleepPath, '');
  // A shell-only fake avoids starting 60 extra Node runtimes for the deadline
  // fixture. The harness still executes every one of its original 60 probes.
  writeFileSync(join(dir, 'sleep'), `#!/usr/bin/env bash
printf '1\\n' >> "$GAMES_READINESS_TEST_SLEEPS"
`, { mode: 0o755 });
  const original = readFileSync(join(repo, 'scripts/test-games-sql.sh'), 'utf8');
  // Replacing only the harness's own absolute source-directory resolution lets
  // the disposable copy consume the unchanged real migration files.
  let script = original.replace(/^games_script_dir=.*$/m, `games_script_dir='${join(repo, 'scripts').replaceAll("'", "'\\''")}'`);
  if (socketRegression) script = script.replace(/\s*--host 127\.0\.0\.1 \\\n/g, '\n');
  const scriptPath = join(dir, 'run.sh');
  writeFileSync(scriptPath, script);
  const result = spawnSync('bash', [scriptPath], {
    cwd: repo, encoding: 'utf8', timeout: 20_000,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`,
      GAMES_READINESS_TEST_STATE: statePath, GAMES_READINESS_TEST_MODE: mode,
      GAMES_READINESS_TEST_SLEEPS: sleepPath, GAMES_READINESS_TEST_EVENTS: eventsPath },
  });
  if (result.error) throw result.error;
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (mode === 'never-ready') {
    const events = readFileSync(eventsPath, 'utf8').split('\n').filter(Boolean);
    state.probes = events.filter((event) => event === 'probe').length;
    state.sql = events.filter((event) => event === 'sql').length;
    state.cleaned = events.includes('cleaned');
    state.logged = events.includes('logged');
  }
  state.sleeps = readFileSync(sleepPath, 'utf8').split('\n').filter(Boolean).length;
  return { ...result, state };
}

describe('Zodiac Games SQL container readiness', () => {
  it('waits through socket-only initialization before the unchanged SQL sequence', () => {
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    const migrations = readdirSync(join(repo, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).length;
    expect(result.state).toMatchObject({ probes: 3, sleeps: 2, sql: migrations + 5,
      ready: true, cleaned: true, nonemptySql: true });
    expect(result.stdout).toContain('PostgreSQL 17 Zodiac Games SQL tests passed.');
  });

  it('reproduces the original premature socket-readiness failure', () => {
    const result = run('normal', true);
    expect(result.status).toBe(79);
    expect(result.state).toMatchObject({ probes: 1, sql: 1, ready: false, cleaned: true });
    expect(result.stderr).toContain('temporary database server is shutting down');
    expect(result.stdout).not.toContain('tests passed.');
  });

  it('retains the bounded readiness failure, diagnostics and container cleanup', () => {
    const result = run('never-ready');
    expect(result.status).toBe(1);
    expect(result.state).toMatchObject({ probes: 60, sleeps: 60, sql: 0, ready: false, cleaned: true, logged: true });
    expect(result.stderr).toContain('did not become ready within 60 seconds');
    expect(result.stdout).not.toContain('tests passed.');
  });

  it('keeps a real SQL-stage failure fatal without retrying or running later files', () => {
    const result = run('sql-failure');
    expect(result.status).toBe(42);
    expect(result.state).toMatchObject({ probes: 3, sql: 2, cleaned: true });
    expect(result.stderr).toContain('fixture SQL assertion failure');
    expect(result.stdout).not.toContain('tests passed.');
  });
});
