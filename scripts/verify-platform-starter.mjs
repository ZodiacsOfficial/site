import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MAX_ARCHIVE_BYTES = 4 * 1024 * 1024;
const MAX_TAR_BYTES = 16 * 1024 * 1024;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const json = (bytes) => JSON.parse(bytes.toString('utf8'));

export function starterFiles(engineVersion) {
  requireValue(/^\d+\.\d+\.\d+-rc\.\d+$/.test(engineVersion), 'Invalid candidate version');
  return [
    'README.md', 'candidate.json', 'npm-shrinkwrap.json', 'package.json',
    'scripts/build.mjs', 'scripts/fetch-engine.mjs', 'scripts/server.mjs',
    'src/app.mjs', 'src/calculate.mjs', 'src/favicon.svg', 'src/natal.html',
    'src/styles.css', 'src/transits.html', 'src/widget-contract.mjs', 'src/widget.html', 'src/widget.mjs',
    'tests/calculate.check.mjs', 'tests/server.check.mjs', 'tests/widget.check.mjs',
    `vendor/zodiacs-engine-${engineVersion}.tgz`,
  ];
}

function tarString(field) {
  const end = field.indexOf(0);
  const content = end < 0 ? field : field.subarray(0, end);
  requireValue([...content].every((byte) => byte >= 32 && byte <= 126), 'Invalid tar text field');
  requireValue(end < 0 || field.subarray(end).every((byte) => byte === 0), 'Ambiguous tar text field');
  return content.toString('ascii');
}

function tarOctal(field) {
  requireValue([...field].every((byte) => byte === 0 || byte === 32 || (byte >= 48 && byte <= 55)), 'Invalid tar numeric field');
  const value = field.toString('ascii').replace(/[\0 ]+$/, '').replace(/^ +/, '');
  requireValue(/^[0-7]+$/.test(value), 'Invalid tar numeric field');
  const result = Number.parseInt(value, 8);
  requireValue(Number.isSafeInteger(result), 'Oversized tar numeric field');
  return result;
}

/** Strictly read the regular-file subset emitted by npm pack. Never extract via tar.
 * Reject extensions (including PAX), links and ambiguous names instead of trying
 * to interpret alternate extraction semantics. The current artifact needs none.
 */
export function readPackageArchive(archive, expectedFiles) {
  requireValue(Buffer.isBuffer(archive) && archive.length <= MAX_ARCHIVE_BYTES, 'Archive exceeds size limit');
  const tar = gunzipSync(archive, { maxOutputLength: MAX_TAR_BYTES });
  requireValue(tar.length % 512 === 0, 'Truncated tar archive');
  const files = new Map();
  let offset = 0;
  let ended = false;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      requireValue(offset + 1024 <= tar.length && tar.subarray(offset).every((byte) => byte === 0), 'Invalid tar end marker');
      ended = true;
      break;
    }
    const checksum = header.reduce((total, byte, index) => total + (index >= 148 && index < 156 ? 32 : byte), 0);
    requireValue(tarOctal(header.subarray(148, 156)) === checksum, 'Tar checksum mismatch');
    requireValue(header.subarray(257, 263).equals(Buffer.from('ustar\0')) && header.toString('ascii', 263, 265) === '00', 'Unsupported tar format');
    requireValue(header[156] === 0 || header[156] === 48, 'Archive must contain only regular files');
    requireValue(tarString(header.subarray(157, 257)) === '', 'Archive link target is forbidden');
    const prefix = tarString(header.subarray(345, 500));
    const name = `${prefix ? `${prefix}/` : ''}${tarString(header.subarray(0, 100))}`;
    requireValue(/^package\/(?:[A-Za-z0-9@_.-]+\/)*[A-Za-z0-9@_.-]+$/.test(name)
      && !name.split('/').some((part) => part === '.' || part === '..'), `Unsafe archive path: ${name}`);
    const relative = name.slice('package/'.length);
    requireValue(!files.has(relative), `Duplicate archive file: ${relative}`);
    requireValue(!expectedFiles || expectedFiles.includes(relative), `Unexpected archive file: ${relative}`);
    const size = tarOctal(header.subarray(124, 136));
    const dataStart = offset + 512;
    const next = dataStart + Math.ceil(size / 512) * 512;
    requireValue(next <= tar.length, 'Truncated tar member');
    requireValue(tar.subarray(dataStart + size, next).every((byte) => byte === 0), 'Invalid tar member padding');
    files.set(relative, tar.subarray(dataStart, dataStart + size));
    offset = next;
  }
  requireValue(ended, 'Missing tar end marker');
  if (expectedFiles) {
    for (const path of expectedFiles) requireValue(files.has(path), `Missing archive file: ${path}`);
  }
  return files;
}

function readRegularFile(root, relative) {
  requireValue(!relative.split('/').some((part) => part === '..' || part === '.' || !part) && !relative.includes('\\'), 'Unsafe source path');
  let current = root;
  const segments = relative.split('/');
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    const info = lstatSync(current);
    requireValue(index === segments.length - 1 ? info.isFile() : info.isDirectory(), `Source must not contain links or special files: ${relative}`);
  }
  return readFileSync(current);
}

export function verifyPlatformStarter({ root = ROOT } = {}) {
  const metadata = json(readRegularFile(root, 'public/examples/platform-starter.json'));
  requireValue(metadata.schemaVersion === 1 && metadata.name === 'zodiacs-platform-starter'
    && /^\d+\.\d+\.\d+-rc\.\d+$/.test(metadata.version), 'Invalid starter metadata identity');
  requireValue(metadata.file === `${metadata.name}-${metadata.version}.tgz`, 'Invalid starter archive filename');
  requireValue(/^[a-f0-9]{64}$/.test(metadata.sha256), 'Invalid starter SHA-256');
  requireValue(typeof metadata.artifactCommit === 'string' && /^[a-f0-9]{40}$/.test(metadata.artifactCommit), 'Invalid immutable starter commit');
  const archive = readRegularFile(root, `public/examples/${metadata.file}`);
  requireValue(sha256(archive) === metadata.sha256, 'Starter archive SHA-256 mismatch');
  const candidate = json(readRegularFile(root, 'src/data/platform-engine-candidate.json'));
  const files = readPackageArchive(archive, starterFiles(candidate.version));
  for (const [path, bytes] of files) {
    requireValue(bytes.equals(readRegularFile(root, `examples/platform/${path}`)), `Archive/source byte mismatch: ${path}`);
  }
  const manifest = json(files.get('package.json'));
  requireValue(manifest.name === metadata.name && manifest.version === metadata.version
    && manifest.private === true && manifest.type === 'module' && manifest.engines?.node === '22.x', 'Starter package identity/private/runtime mismatch');
  const engine = json(files.get('candidate.json'));
  requireValue(candidate.schemaVersion === 1 && candidate.name === '@zodiacs/engine'
    && candidate.releaseStatus === 'unpublished-candidate'
    && engine.status === 'Unpublished npm release candidate; review and publication gates remain open', 'Candidate release status mismatch');
  for (const [starterKey, siteKey] of Object.entries({ package: 'name', version: 'version', url: 'artifactUrl', sha256: 'sha256', sourceRepository: 'sourceRepository', sourceCommit: 'sourceCommit' })) {
    requireValue(engine[starterKey] === candidate[siteKey], `Candidate metadata mismatch: ${starterKey}`);
  }
  requireValue(engine.artifactRepository === 'https://github.com/ZodiacsOfficial/site'
    && /^[a-f0-9]{40}$/.test(engine.artifactCommit)
    && engine.sourceRepository === 'https://github.com/ZodiacsOfficial/sdk'
    && /^[a-f0-9]{40}$/.test(engine.sourceCommit), 'Invalid candidate repository provenance');
  const enginePath = `vendor/zodiacs-engine-${candidate.version}.tgz`;
  requireValue(candidate.artifactPath === enginePath
    && engine.url === `https://raw.githubusercontent.com/ZodiacsOfficial/site/${engine.artifactCommit}/${enginePath}`, 'Candidate URL must identify the immutable artifact');
  const engineBytes = files.get(enginePath);
  requireValue(sha256(engineBytes) === candidate.sha256
    && engineBytes.equals(readRegularFile(root, enginePath)), 'Contained engine artifact mismatch');
  const engineFiles = readPackageArchive(engineBytes);
  const engineManifest = json(engineFiles.get('package.json'));
  requireValue(engineManifest.name === candidate.name && engineManifest.version === candidate.version
    && engineManifest.repository?.url === `git+${candidate.sourceRepository}.git`
    && engineManifest.repository?.directory === candidate.sourcePackagePath, 'Contained engine package identity mismatch');
  for (const entry of ['.', './geo']) {
    for (const kind of ['import', 'types']) {
      const target = engineManifest.exports?.[entry]?.[kind];
      requireValue(typeof target === 'string' && target.startsWith('./') && engineFiles.has(target.slice(2)), `Missing public engine export: ${entry} ${kind}`);
    }
  }
  requireValue(JSON.stringify(manifest.dependencies) === JSON.stringify({ [candidate.name]: `file:${enginePath}` }), 'Starter must install the contained engine');
  const lock = json(files.get('npm-shrinkwrap.json'));
  requireValue(lock.lockfileVersion === 3 && lock.name === manifest.name && lock.version === manifest.version, 'Starter shrinkwrap identity mismatch');
  for (const key of ['dependencies', 'devDependencies', 'engines']) {
    requireValue(JSON.stringify(lock.packages?.['']?.[key]) === JSON.stringify(manifest[key]), `Starter shrinkwrap mismatch: ${key}`);
  }
  const lockedEngine = lock.packages?.[`node_modules/${candidate.name}`];
  requireValue(lockedEngine?.version === candidate.version && lockedEngine.resolved === `file:${enginePath}`
    && lockedEngine.integrity === `sha512-${createHash('sha512').update(engineBytes).digest('base64')}`, 'Locked engine integrity mismatch');
  for (const [path, dependency] of Object.entries(lock.packages)) {
    if (!path || path === `node_modules/${candidate.name}`) continue;
    requireValue(typeof dependency.resolved === 'string' && dependency.resolved.startsWith('https://registry.npmjs.org/')
      && /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(dependency.integrity), `Dependency must use an integrity-pinned public registry archive: ${path}`);
  }
  return { metadata, candidate, files };
}

/** Do not inherit auth tokens, personal npm config, caches, or NODE_OPTIONS. */
export function consumerEnvironment(consumerRoot, inherited = process.env) {
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'ComSpec', 'COMSPEC', 'PATHEXT', 'TMPDIR', 'TMP', 'TEMP', 'LANG']) {
    if (inherited[key]) env[key] = inherited[key];
  }
  // npm's shebang and the starter's `node` scripts must use this observed runtime,
  // even when the verifier was invoked with an absolute path to Node 22.
  env.PATH = [dirname(process.execPath), env.PATH || env.Path].filter(Boolean).join(delimiter);
  delete env.Path;
  return { ...env, npm_config_userconfig: join(consumerRoot, 'user.npmrc'),
    npm_config_globalconfig: join(consumerRoot, 'global.npmrc'), npm_config_cache: join(consumerRoot, 'npm-cache'),
    npm_config_registry: 'https://registry.npmjs.org/', npm_config_update_notifier: 'false' };
}

export function installFreshConsumer(verified) {
  requireValue(process.versions.node.split('.')[0] === '22', 'The starter fresh consumer check requires Node 22 (its declared runtime)');
  const consumerRoot = mkdtempSync(join(tmpdir(), 'zodiacs-platform-consumer-'));
  const project = join(consumerRoot, 'package');
  mkdirSync(project);
  for (const [path, bytes] of verified.files) {
    const target = join(project, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes, { flag: 'wx', mode: 0o644 });
  }
  for (const file of ['user.npmrc', 'global.npmrc']) writeFileSync(join(consumerRoot, file), '', { flag: 'wx' });
  const env = consumerEnvironment(consumerRoot);
  console.log(`Fresh consumer directory: ${project}`);
  const commands = [['ci', '--ignore-scripts', '--no-fund'], ['test']];
  for (const args of commands) {
    const result = spawnSync('npm', args, { cwd: project, env, encoding: 'utf8', timeout: args[0] === 'ci' ? 180_000 : 90_000, maxBuffer: 4 * 1024 * 1024 });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    requireValue(!result.error && !result.signal && result.status === 0,
      `Fresh consumer npm ${args.join(' ')} failed (${result.error?.message || result.signal || result.status}); retained at ${project}`);
  }
  return { path: project, install: 'passed', testsAndBuild: 'passed', commands: commands.map((args) => `npm ${args.join(' ')}`) };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const started = performance.now();
  try {
    requireValue(process.argv.slice(2).every((arg) => arg === '--install') && process.argv.length <= 3, 'Usage: node scripts/verify-platform-starter.mjs [--install]');
    const verified = verifyPlatformStarter();
    const consumer = process.argv.includes('--install') ? installFreshConsumer(verified) : null;
    console.log(JSON.stringify({ schemaVersion: 1, result: 'passed', mode: consumer ? 'fresh-consumer' : 'offline',
      starter: verified.metadata, engine: { name: verified.candidate.name, version: verified.candidate.version, sha256: verified.candidate.sha256 },
      filesVerified: verified.files.size, runtime: { node: process.version, platform: process.platform, arch: process.arch },
      consumer, elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)) }, null, 2));
  } catch (error) {
    console.error(`Platform starter verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
