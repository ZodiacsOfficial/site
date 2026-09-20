/**
 * The install commands the engine page publishes, executed.
 *
 * The page tells readers to verify a digest before installing, so these cases
 * run the block rather than grep it: a test that looked for the word "sha256"
 * would pass over a block that printed the digest instead of comparing it,
 * which is exactly the defect an audit found in the first MCP block.
 *
 * `curl` is replaced by a shell function with the same contract — writes the
 * file and exits 0, or exits non-zero — because the real line fetches over
 * https from a pinned commit and a unit test should not depend on the network.
 * Its flags are asserted separately and statically. `npm` is stubbed because
 * what these cases establish is control flow: that nothing reaches `npm
 * install` unless the bytes matched.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { engineInstallBlock, archiveNameFor } from '../src/lib/engine-install-block.ts';

const root = process.cwd();
const page = readFileSync(resolve(root, 'src/pages/developers/engine/index.astro'), 'utf8');
const artifact = JSON.parse(readFileSync(resolve(root, 'src/data/platform-engine-candidate.json'), 'utf8'));
const archive = readFileSync(resolve(root, artifact.artifactPath));

/** Exactly what the page renders: same function, same manifest. */
const block = engineInstallBlock(artifact);
const file = archiveNameFor(artifact);

function run(bytes, { seedFile = false, npmFails = false, dir = null } = {}) {
  dir = dir ?? mkdtempSync(join(tmpdir(), 'zodiacs-engine-install-'));
  const payload = join(dir, 'payload.bin');
  if (bytes) writeFileSync(payload, bytes);
  if (seedFile) writeFileSync(join(dir, file), 'something of mine');
  const curl = bytes
    ? `curl() { while [ $# -gt 0 ]; do [ "$1" = "-o" ] && { cp '${payload}' "$2"; return 0; }; shift; done; return 1; }`
    : `curl() { : > "${file}"; echo "curl: (22) The requested URL returned error: 404" >&2; return 22; }`;
  const npm = `npm() { echo "npm $*" >> '${dir}/npm.log'; return ${npmFails ? 1 : 0}; }`;
  let status = 0;
  let output = '';
  try {
    output = execFileSync('bash', ['-c', `${curl}\n${npm}\n${block}\n`], {
      cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    status = error.status ?? 1;
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  return {
    dir,
    status,
    output,
    archivePresent: existsSync(join(dir, file)),
    npmLog: existsSync(join(dir, 'npm.log')) ? readFileSync(join(dir, 'npm.log'), 'utf8') : '',
    seededIntact: seedFile && existsSync(join(dir, file))
      ? readFileSync(join(dir, file), 'utf8') : null,
  };
}

const discard = (dir) => rmSync(dir, { recursive: true, force: true });

describe('the install commands the engine page publishes', () => {
  it('is the block the page publishes, not a copy of it', () => {
    expect(page).toMatch(/import \{[^}]*\bengineInstallBlock\b[^}]*\} from '[^']*\/engine-install-block'/u);
    expect(page).toMatch(/engineInstallBlock\(candidate\)/u);
    expect(page).toContain('<code>{install}</code>');
  });

  it('states the flags that make the real download fail closed', () => {
    expect(block).toContain('--fail');
    expect(block).toContain("--proto '=https'");
    expect(block).toContain('--max-time');
    expect(block).toMatch(/^\( set -eu$/mu);
    expect(block).toContain(artifact.artifactUrl);
  });

  it('compares the digest rather than printing it, before npm sees the file', () => {
    expect(block).toContain(artifact.sha256);
    expect(block).toContain('createHash');
    expect(block).not.toMatch(/shasum\s+-a\s+256/u);
    const verified = block.indexOf('createHash');
    expect(verified).toBeGreaterThan(-1);
    expect(verified).toBeLessThan(block.indexOf('npm install'));
  });

  it('installs when the archive is the published one', () => {
    const result = run(archive);
    discard(result.dir);
    expect(result.status, result.output).toBe(0);
    expect(result.npmLog).toMatch(new RegExp(`npm install \\./${file.replace(/\./gu, '\\.')}`, 'u'));
    expect(result.output).toContain('Archive verified');
  });

  it('never reaches npm when the digest does not match', () => {
    // Flip a byte rather than setting one: writing 0x00 over a byte that was
    // already 0x00 produces an identical archive and proves nothing.
    const tampered = Buffer.from(archive);
    tampered[tampered.length - 1] ^= 0xff;
    expect(tampered.length).toBe(archive.length);
    expect(createHash('sha256').update(tampered).digest('hex')).not.toBe(artifact.sha256);
    const result = run(tampered);
    discard(result.dir);
    expect(result.status).not.toBe(0);
    expect(result.npmLog, 'nothing may be installed after a failed digest').toBe('');
    expect(result.archivePresent, 'the rejected download is not left lying around').toBe(false);
    expect(result.output).toContain('Nothing was installed.');
  });

  it('never reaches npm when the archive is truncated', () => {
    const result = run(archive.subarray(0, Math.floor(archive.length / 2)));
    discard(result.dir);
    expect(result.status).not.toBe(0);
    expect(result.npmLog).toBe('');
    expect(result.archivePresent).toBe(false);
  });

  it('never reaches npm when the download fails', () => {
    // curl --fail can leave an empty file behind on a 404; the stub does too.
    const result = run(null);
    discard(result.dir);
    expect(result.status).not.toBe(0);
    expect(result.npmLog).toBe('');
    expect(result.archivePresent, 'the empty file curl left must not survive').toBe(false);
  });

  it('refuses to overwrite an archive of the same name that it did not download', () => {
    const result = run(archive, { seedFile: true });
    discard(result.dir);
    expect(result.status).not.toBe(0);
    expect(result.npmLog).toBe('');
    expect(result.seededIntact, 'a file in the way must survive untouched').toBe('something of mine');
    expect(result.output).toContain('already exists here');
  });

  it('can simply be run again after a rejected download', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zodiacs-engine-retry-'));
    const tampered = Buffer.from(archive);
    tampered[tampered.length - 1] ^= 0xff;
    expect(run(tampered, { dir }).status).not.toBe(0);
    const retried = run(archive, { dir });
    discard(dir);
    expect(retried.status, retried.output).toBe(0);
    expect(retried.output).not.toContain('already exists here');
  });

  it('keeps the verified archive when npm itself fails, and does not claim success', () => {
    // Deliberately unlike the MCP block, which cleans up a directory it created.
    // Here npm owns whatever state it left; the verified archive is what a
    // retry needs, so removing it would only make the failure harder to fix.
    const result = run(archive, { npmFails: true });
    discard(result.dir);
    expect(result.status).not.toBe(0);
    expect(result.npmLog).toMatch(/npm install/u);
    expect(result.archivePresent).toBe(true);
    expect(result.output).not.toContain('Installed @zodiacs/engine');
  });
});
