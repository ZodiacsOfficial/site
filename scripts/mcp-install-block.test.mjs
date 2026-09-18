/**
 * The install commands the MCP page publishes, executed.
 *
 * An audit found the previous block running `shasum -a 256` and printing the
 * expected digest in a comment. That reads like a check and is not one: shasum
 * exits 0 on any readable file, and the lines after it ran regardless. A
 * tampered archive extracted, installed, and passed `npm run verify` — the
 * verifier tests behaviour, not identity, so it is no backstop.
 *
 * A test that greps the page for the word "checksum" would have passed
 * throughout. So this one runs the block. The only substitution is the download:
 * `curl` is replaced by a shell function with the same contract (writes the file
 * and exits 0, or exits non-zero and writes nothing), because the real line
 * fetches over https from a pinned commit and a unit test should not depend on
 * the network. The real line's flags are asserted separately, statically.
 *
 * `npm` is stubbed too, and for a second reason: what these cases establish is
 * the block's control flow — that nothing downstream of a failed step runs — and
 * a real `npm ci` would add a registry round trip to every case without
 * testing anything the stub does not.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const page = readFileSync(resolve(root, 'src/pages/developers/mcp/index.astro'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve(root, 'public/examples/mcp-server.json'), 'utf8'));
const archive = readFileSync(resolve(root, `public/examples/${manifest.file}`));

/** The page's own template literal, rendered with the page's own manifest. */
function renderedBlock() {
  const source = page.match(/const install = (`[\s\S]*?`);\n/u);
  if (!source) throw new Error('could not find the install template in the page');
  const dest = manifest.file.replace(/\.tgz$/u, '');
  const archiveUrl = `https://raw.githubusercontent.com/ZodiacsOfficial/site/${manifest.artifactCommit}/public/examples/${manifest.file}`;
  // eslint-disable-next-line no-new-func
  return new Function('manifest', 'archiveUrl', 'dest', `return ${source[1]};`)(manifest, archiveUrl, dest);
}

const block = renderedBlock();

/**
 * Run the block in a throwaway directory with the download and npm replaced.
 * `bytes` null means the download fails the way `curl --fail` fails on a 404.
 */
function run(bytes, { seedDest = false, npmFails = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'zodiacs-install-'));
  const payload = join(dir, 'payload.bin');
  if (bytes) writeFileSync(payload, bytes);
  if (seedDest) {
    mkdirSync(join(dir, manifest.file.replace(/\.tgz$/u, '')));
    writeFileSync(join(dir, manifest.file.replace(/\.tgz$/u, ''), 'mine.txt'), 'do not touch');
  }
  const curl = bytes
    ? `curl() { while [ $# -gt 0 ]; do [ "$1" = "-o" ] && { cp '${payload}' "$2"; return 0; }; shift; done; return 1; }`
    : 'curl() { echo "curl: (22) The requested URL returned error: 404" >&2; return 22; }';
  const npm = npmFails
    ? `npm() { echo "npm $*" >> '${dir}/npm.log'; [ "$1" = "${npmFails}" ] && return 1; return 0; }`
    : `npm() { echo "npm $*" >> '${dir}/npm.log'; return 0; }`;
  const script = `${curl}\n${npm}\n${block}\n`;
  let status = 0;
  let output = '';
  try {
    output = execFileSync('bash', ['-c', script], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    status = error.status ?? 1;
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  const dest = join(dir, manifest.file.replace(/\.tgz$/u, ''));
  const state = {
    status,
    output,
    extracted: existsSync(dest),
    serverPresent: existsSync(join(dest, 'server.mjs')),
    archiveLeftBehind: existsSync(join(dir, manifest.file)),
    npmLog: existsSync(join(dir, 'npm.log')) ? readFileSync(join(dir, 'npm.log'), 'utf8') : '',
    seededFileIntact: seedDest ? readFileSync(join(dest, 'mine.txt'), 'utf8') : null,
  };
  rmSync(dir, { recursive: true, force: true });
  return state;
}

describe('the install commands the MCP page publishes', () => {
  it('states the flags that make the real download fail closed', () => {
    // The executed cases below substitute curl, so its contract is pinned here.
    expect(block).toContain('--fail');
    expect(block).toContain("--proto '=https'");
    expect(block).toContain('--max-time');
    expect(block).toMatch(/^\( set -eu$/mu);
  });

  it('compares the digest rather than printing it', () => {
    expect(block).toContain(manifest.sha256);
    expect(block).toContain('createHash');
    // The shape of the defect this test exists for: a lone `shasum` display.
    expect(block).not.toMatch(/shasum\s+-a\s+256/u);
    // …and verification has to come before anything is created or unpacked.
    const verified = block.indexOf('createHash');
    expect(verified).toBeGreaterThan(-1);
    expect(verified).toBeLessThan(block.indexOf('mkdir "$DEST"'));
    expect(verified).toBeLessThan(block.indexOf('tar -xzf'));
  });

  it('installs and verifies when the archive is the published one', () => {
    const result = run(archive);
    expect(result.status, result.output).toBe(0);
    expect(result.extracted).toBe(true);
    expect(result.serverPresent).toBe(true);
    expect(result.npmLog).toMatch(/npm ci/u);
    expect(result.npmLog).toMatch(/npm run verify/u);
    expect(result.output).toContain('Archive verified');
  });

  it('stops before extracting when the digest does not match', () => {
    // Flip a byte rather than setting one: the first draft of this test wrote
    // 0x00 over a byte that was already 0x00, producing an identical archive
    // and a "tamper" that proved nothing. The assertion below is what caught it.
    const tampered = Buffer.from(archive);
    tampered[tampered.length - 1] ^= 0xff;
    expect(tampered.length).toBe(archive.length);
    expect(createHash('sha256').update(tampered).digest('hex')).not.toBe(manifest.sha256);
    const result = run(tampered);
    expect(result.status).not.toBe(0);
    expect(result.extracted, 'a mismatched archive must not be extracted').toBe(false);
    expect(result.npmLog, 'nothing may be installed after a failed digest').toBe('');
    expect(result.archiveLeftBehind, 'the rejected download is not left lying around').toBe(false);
    expect(result.output).toContain('Nothing was extracted and nothing was installed.');
  });

  it('stops before extracting when the download fails', () => {
    const result = run(null);
    expect(result.status).not.toBe(0);
    expect(result.extracted).toBe(false);
    expect(result.npmLog).toBe('');
  });

  it('stops before extracting when the archive is truncated', () => {
    const result = run(archive.subarray(0, Math.floor(archive.length / 2)));
    expect(result.status).not.toBe(0);
    expect(result.extracted).toBe(false);
    expect(result.npmLog).toBe('');
    expect(result.output).toContain('incomplete or altered download');
  });

  it('refuses to reuse or overwrite an existing destination', () => {
    const result = run(archive, { seedDest: true });
    expect(result.status).not.toBe(0);
    expect(result.seededFileIntact, 'an unrelated file in the way must survive').toBe('do not touch');
    expect(result.npmLog).toBe('');
    expect(result.output).toContain('already exists here');
  });

  it('stops when dependency installation fails, before claiming success', () => {
    const result = run(archive, { npmFails: 'ci' });
    expect(result.status).not.toBe(0);
    expect(result.npmLog).toMatch(/npm ci/u);
    expect(result.npmLog, 'the verifier must not run after a failed install').not.toMatch(/run verify/u);
    expect(result.output).not.toContain('Installed and verified');
  });

  it('stops when the package verifier fails, before claiming success', () => {
    const result = run(archive, { npmFails: 'run' });
    expect(result.status).not.toBe(0);
    expect(result.npmLog).toMatch(/npm run verify/u);
    expect(result.output).not.toContain('Installed and verified');
  });
});
