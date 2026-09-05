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
      GAMES_READINESS_TEST_SLEEPS: sleepPath },
  });
  if (result.error) throw result.error;
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
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
    expect(result.state).toMatchObject({ probes: 60, sleeps: 60, sql: 0, cleaned: true, logged: true });
    expect(result.stderr).toContain('did not become ready within 60 seconds');
  });

  it('keeps a real SQL-stage failure fatal without retrying or running later files', () => {
    const result = run('sql-failure');
    expect(result.status).toBe(42);
    expect(result.state).toMatchObject({ probes: 3, sql: 2, cleaned: true });
    expect(result.stderr).toContain('fixture SQL assertion failure');
    expect(result.stdout).not.toContain('tests passed.');
  });
});
