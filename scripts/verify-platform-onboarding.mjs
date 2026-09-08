import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { consumerEnvironment, verifyPlatformStarter } from './verify-platform-starter.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const MAX_LOG_BYTES = 4 * 1024 * 1024;

function options(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    requireValue(['--setup', '--output'].includes(key) && args[index + 1]
      && !args[index + 1].startsWith('--') && !result[key], 'Usage: node scripts/verify-platform-onboarding.mjs --setup <rendered-setup.sh> [--output <new-evidence-directory>]');
    result[key] = resolve(args[index + 1]);
  }
  requireValue(result['--setup'], 'An explicit --setup file is required; no setup commands are inferred.');
  return result;
}

function workspace(root, name, setup) {
  const directory = join(root, name);
  mkdirSync(directory);
  const cwd = join(directory, 'work');
  mkdirSync(cwd);
  const script = join(directory, 'setup.sh');
  writeFileSync(script, setup, { flag: 'wx' });
  for (const name of ['user.npmrc', 'global.npmrc', '.curlrc']) writeFileSync(join(directory, name), '', { flag: 'wx' });
  const env = { ...consumerEnvironment(directory), CURL_HOME: directory };
  return { directory, cwd, script, env };
}

function killOwnGroup(run, signal) {
  if (!run.child.pid) return;
  try { process.kill(-run.child.pid, signal); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
}

function ownGroupExists(run) {
  if (!run.child.pid) return false;
  try { process.kill(-run.child.pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}

function launch(work, logPath) {
  const child = spawn('/bin/sh', [work.script], { cwd: work.cwd, env: work.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const run = { child, output: '', closed: false, error: null, status: null, signal: null, logPath };
  writeFileSync(logPath, '', { flag: 'wx' });
  let bytes = 0;
  function capture(chunk) {
    bytes += chunk.length;
    if (bytes > MAX_LOG_BYTES) {
      run.error = new Error('Setup log exceeded the 4 MiB limit');
      killOwnGroup(run, 'SIGTERM');
      return;
    }
    appendFileSync(logPath, chunk);
    run.output += chunk.toString('utf8');
  }
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  run.done = new Promise((done) => {
    child.once('error', (error) => { run.error = error; });
    child.once('close', (status, signal) => {
      Object.assign(run, { closed: true, status, signal });
      done();
    });
  });
  return run;
}

async function stopOwnGroup(run) {
  if (run.closed) return { group: run.child.pid ?? null, closed: true, exitStatus: run.status, signal: run.signal, cleanup: 'Already exited; no signal sent.' };
  // The detached shell and its npm/Node descendants share this group. Never
  // target a process by name, port, or an unrelated pre-existing server's PID.
  killOwnGroup(run, 'SIGTERM');
  const deadline = Date.now() + 5000;
  while ((!run.closed || ownGroupExists(run)) && Date.now() < deadline) await pause(50);
  if (!run.closed || ownGroupExists(run)) {
    killOwnGroup(run, 'SIGKILL');
    const killDeadline = Date.now() + 5000;
    while ((!run.closed || ownGroupExists(run)) && Date.now() < killDeadline) await pause(50);
  }
  requireValue(run.closed && !ownGroupExists(run), `Own setup process group did not close: ${run.child.pid}`);
  return { group: run.child.pid, groupGone: true, closed: run.closed, exitStatus: run.status, signal: run.signal };
}

async function waitUntil(run, predicate, timeout, signal) {
  const deadline = Date.now() + timeout;
  while (true) {
    signal.throwIfAborted();
    if (run.error) throw run.error;
    const value = predicate();
    if (value) return value;
    requireValue(!run.closed, `Setup exited before the expected result (status ${run.status}, signal ${run.signal}); see ${run.logPath}`);
    requireValue(Date.now() < deadline, `Setup exceeded ${timeout / 1000}s; see ${run.logPath}`);
    await pause(50);
  }
}

function localPage(url) {
  return new Promise((done, reject) => {
    const request = get(url, (response) => {
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > 1024 * 1024) request.destroy(new Error('Local page exceeds 1 MiB'));
        else chunks.push(chunk);
      });
      response.once('error', reject);
      response.once('end', () => done({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks) }));
    });
    request.setTimeout(5000, () => request.destroy(new Error('Local page request timed out')));
    request.once('error', reject);
  });
}

function testCounts(output) {
  const count = (name) => Number([...output.matchAll(new RegExp(`^# ${name} (\\d+)\\r?$`, 'gm'))].at(-1)?.[1]);
  const result = { tests: count('tests'), pass: count('pass'), fail: count('fail') };
  requireValue(result.tests === 39 && result.pass === 39 && result.fail === 0, 'Literal npm test did not report all 39 starter candidate checks passing');
  return result;
}

async function successCase({ setup, projectDirectory, workRoot, output, verified, signal }) {
  const started = performance.now();
  const work = workspace(workRoot, 'success', setup);
  const log = join(output, 'success.log');
  const run = launch(work, log);
  let result;
  try {
    // This line is emitted only after this shell's server successfully binds.
    // An occupied port fails startup; an unrelated server is never substituted.
    const address = await waitUntil(run, () => run.output.match(/^Examples: (http:\/\/127\.0\.0\.1:\d+\/) /m)?.[1], 240_000, signal);
    requireValue(!run.closed, 'The newly started server exited before verification');
    const project = join(work.cwd, projectDirectory, 'package');
    const downloaded = readFileSync(join(work.cwd, projectDirectory, verified.metadata.file));
    requireValue(sha256(downloaded) === verified.metadata.sha256, 'Downloaded starter differs from the verified public artifact');
    const manifest = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
    const installedEngine = JSON.parse(readFileSync(join(project, 'node_modules/@zodiacs/engine/package.json'), 'utf8'));
    const engineHash = sha256(readFileSync(join(project, verified.enginePath)));
    requireValue(manifest.name === verified.metadata.name && manifest.version === verified.metadata.version && manifest.private === true, 'Installed starter manifest identity mismatch');
    requireValue(installedEngine.name === verified.candidate.package && installedEngine.version === verified.candidate.version
      && engineHash === verified.candidate.sha256, 'Installed engine version or artifact hash mismatch');
    const pages = await Promise.all(['natal.html', 'transits.html', 'widget.html'].map(async (path) => {
      const url = new URL(path, address).href;
      const response = await localPage(url);
      requireValue(response.status === 200 && response.headers['content-type'] === 'text/html; charset=utf-8', `Local example failed: ${url} (${response.status})`);
      requireValue(response.bytes.equals(readFileSync(join(project, 'dist', path))), `Served page differs from this consumer's build: ${path}`);
      return { url, status: response.status, sha256: sha256(response.bytes), matchesOwnBuild: true };
    }));
    const npm = spawnSync('npm', ['--version'], { cwd: work.cwd, env: work.env, encoding: 'utf8', timeout: 10000 });
    requireValue(npm.status === 0 && !npm.error && !npm.signal, 'Could not observe isolated npm version');
    result = { result: 'passed', literalSetup: work.script, log, consumer: project, address,
      starter: { name: manifest.name, version: manifest.version, sha256: sha256(downloaded), artifactCommit: verified.metadata.artifactCommit },
      engine: { name: installedEngine.name, version: installedEngine.version, sha256: engineHash },
      npm: npm.stdout.trim(), checks: testCounts(run.output), pages,
      elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)) };
  } finally {
    const cleanup = await stopOwnGroup(run);
    if (result) result.cleanup = cleanup;
  }
  return result;
}

function fakeCommands(work, mode, archive) {
  const bin = join(work.directory, 'fake-bin');
  mkdirSync(bin);
  const markers = join(work.directory, 'invocations.txt');
  const mark = (name) => `printf '%s\\n' '${name}' >> "$ZODIACS_ONBOARDING_MARKERS"\n`;
  for (const name of ['tar', 'npm']) {
    writeFileSync(join(bin, name), `#!/bin/sh\n${mark(name)}exit 99\n`, { flag: 'wx', mode: 0o700 });
  }
  const curl = mode === 'hash-mismatch'
    ? `output=''\nwhile [ "$#" -gt 0 ]; do\n  if [ "$1" = '-o' ]; then shift; output="$1"; fi\n  shift\ndone\n[ -n "$output" ] || exit 98\ncp "$ZODIACS_ONBOARDING_ARCHIVE" "$output"\n`
    : `printf '%s\\n' 'curl: (22) simulated HTTP response 404' >&2\nexit 22\n`;
  writeFileSync(join(bin, 'curl'), `#!/bin/sh\n${mark('curl')}${curl}`, { flag: 'wx', mode: 0o700 });
  work.env = { ...work.env, PATH: `${bin}${delimiter}${work.env.PATH}`,
    ZODIACS_ONBOARDING_MARKERS: markers, ZODIACS_ONBOARDING_ARCHIVE: archive };
  return markers;
}

async function failureCase({ mode, setup, projectDirectory, workRoot, output, verified, signal }) {
  const started = performance.now();
  const changedSetup = mode === 'hash-mismatch' ? setup.replace(verified.metadata.sha256, '0'.repeat(64)) : setup;
  const work = workspace(workRoot, mode, changedSetup);
  if (mode === 'existing-directory') mkdirSync(join(work.cwd, projectDirectory));
  // Only these contained command shims are replaced; actual Node performs the
  // hash check against the genuine artifact in the hash-mismatch scenario.
  const archive = join(work.directory, verified.metadata.file);
  writeFileSync(archive, readFileSync(new URL(`../public/examples/${verified.metadata.file}`, import.meta.url)), { flag: 'wx' });
  const markers = fakeCommands(work, mode, archive);
  const log = join(output, `${mode}.log`);
  const run = launch(work, log);
  let result;
  try {
    await waitUntil(run, () => run.closed, 15_000, signal);
    const invoked = existsSync(markers) ? readFileSync(markers, 'utf8').trim().split('\n').filter(Boolean) : [];
    requireValue(run.status !== null && run.status !== 0 && !run.signal && !run.error, `Failure scenario did not exit normally with an error: ${mode}`);
    requireValue(!invoked.includes('tar') && !invoked.includes('npm'), `Pasted setup continued to tar/npm after ${mode}`);
    if (mode === 'existing-directory') requireValue(invoked.length === 0, 'Pasted setup continued past a failing mkdir');
    else requireValue(invoked.length === 1 && invoked[0] === 'curl', `Expected exactly the contained curl shim in ${mode}`);
    if (mode === 'http-failure') requireValue(run.status === 22, 'Pasted setup did not propagate the simulated curl HTTP failure');
    if (mode === 'hash-mismatch') requireValue(run.output.includes('Archive checksum mismatch.'), 'Expected the actual Node checksum rejection');
    result = { result: 'passed', scenario: mode, literalSetup: work.script, log, exitStatus: run.status, invoked,
      tarOrNpmInvoked: false, simulation: mode === 'hash-mismatch'
        ? 'Only the expected SHA-256 was replaced by zeros. A contained curl shim supplied the genuine artifact; actual Node performed the checksum check.'
        : mode === 'http-failure' ? 'Contained curl shim exits 22, simulating an HTTP failure.' : 'The literal mkdir target already exists.',
      elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)) };
  } finally {
    const cleanup = await stopOwnGroup(run);
    if (result) result.cleanup = cleanup;
  }
  return result;
}

async function main(args) {
  const config = options(args);
  requireValue(process.platform !== 'win32' && process.versions.node.split('.')[0] === '22', 'Use Node 22 on a POSIX system (or WSL)');
  const setupFile = config['--setup'];
  const info = lstatSync(setupFile);
  requireValue(info.isFile() && info.size > 0 && info.size <= 64 * 1024, 'Setup must be a nonempty regular file under 64 KiB');
  const setup = readFileSync(setupFile, 'utf8');
  const verified = verifyPlatformStarter();
  const archiveUrl = `https://raw.githubusercontent.com/ZodiacsOfficial/site/${verified.metadata.artifactCommit}/public/examples/${verified.metadata.file}`;
  requireValue(setup.includes(archiveUrl) && setup.split(verified.metadata.sha256).length === 2, 'Setup must identify the current immutable starter URL and exactly one expected SHA-256');
  const directories = [...setup.matchAll(/^mkdir ([A-Za-z0-9_-]+)\r?$/gm)];
  requireValue(directories.length === 1, 'Expected one literal relative mkdir target in the rendered setup');
  const projectDirectory = directories[0][1];
  const output = config['--output'] || mkdtempSync(join(tmpdir(), 'zodiacs-onboarding-evidence-'));
  if (config['--output']) mkdirSync(output); // Never overwrite an earlier receipt.
  writeFileSync(join(output, 'rendered-setup.sh'), setup, { flag: 'wx' });
  const workRoot = mkdtempSync(join(tmpdir(), 'zodiacs-onboarding-work-'));
  const controller = new AbortController();
  const interrupted = () => controller.abort(new Error('Onboarding verifier interrupted'));
  process.once('SIGINT', interrupted);
  process.once('SIGTERM', interrupted);
  const started = performance.now();
  const record = { schemaVersion: 1, result: 'running', startedAt: new Date().toISOString(),
    classification: 'Internal automated onboarding check; not unfamiliar-developer timing, human review, or external adoption.',
    setup: { source: setupFile, copy: join(output, 'rendered-setup.sh'), sha256: sha256(Buffer.from(setup)) },
    runtime: { node: process.version, executable: process.execPath, platform: process.platform, arch: process.arch },
    isolation: 'Fresh working directories, empty npm/curl configuration, empty npm cache, and a restricted child environment. No owner configuration or PATH binary was modified.',
    workRoot, output, success: null, adversarial: [] };
  const common = { setup, projectDirectory, workRoot, output, verified, signal: controller.signal };
  console.log(`Onboarding evidence: ${output}`);
  try {
    // Fail-closed scenarios are offline and precede the real public download.
    for (const mode of ['existing-directory', 'http-failure', 'hash-mismatch']) {
      console.log(`Checking pasted setup failure: ${mode}`);
      record.adversarial.push(await failureCase({ ...common, mode }));
    }
    console.log('Running literal setup: public download, install, tests, build, and own local server');
    record.success = await successCase(common);
    record.result = 'passed';
  } catch (error) {
    record.result = 'failed';
    record.error = error.message;
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', interrupted);
    process.removeListener('SIGTERM', interrupted);
    record.finishedAt = new Date().toISOString();
    record.elapsedSeconds = Number(((performance.now() - started) / 1000).toFixed(3));
    writeFileSync(join(output, 'onboarding.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(record, null, 2));
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Platform onboarding verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
