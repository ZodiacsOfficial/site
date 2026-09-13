import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from '@zodiacs/engine';
import { assertEngineCandidate } from './platform-engine-candidate.mjs';
import { readPackageArchive } from './verify-platform-starter.mjs';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const candidate = JSON.parse(read('src/data/platform-engine-candidate.json'));
const archive = readFileSync(resolve(root, candidate.artifactPath));
// Read named members without extracting files or making network requests.
const packed = (path) => execFileSync('tar', ['-xOf', resolve(root, candidate.artifactPath), `package/${path}`], { encoding: 'utf8' });
const manifest = JSON.parse(packed('package.json'));

describe('developer candidate documentation', () => {
  it('identifies the installed public engine and exact archived package', () => {
    expect(assertEngineCandidate(candidate)).toBe(candidate);
    expect(candidate.schemaVersion).toBe(1);
    expect(candidate.name).toBe(manifest.name);
    expect(candidate.version).toBe(manifest.version);
    expect(candidate.version).toBe(ENGINE_VERSION);
    expect(candidate.sha256).toBe(createHash('sha256').update(archive).digest('hex'));
    const siteManifest = JSON.parse(read('package.json'));
    expect(siteManifest.dependencies[candidate.name]).toBe(`file:${candidate.artifactPath}`);
    const lock = JSON.parse(read('package-lock.json'));
    expect(lock.packages[`node_modules/${candidate.name}`].integrity)
      .toBe(`sha512-${createHash('sha512').update(archive).digest('base64')}`);
    const files = readPackageArchive(archive);
    expect(files.size).toBe(23);
    for (const [path, bytes] of files) {
      expect(readFileSync(resolve(root, 'node_modules/@zodiacs/engine', path)), path).toEqual(bytes);
    }
  });

  it('uses the recorded immutable public URL for that archive', () => {
    const url = new URL(candidate.artifactUrl);
    expect(url.origin).toBe('https://raw.githubusercontent.com');
    expect(url.username + url.password + url.search + url.hash).toBe('');
    const [, owner, repository, commit, ...path] = url.pathname.split('/');
    expect(`https://github.com/${owner}/${repository}`).toBe(candidate.artifactRepository);
    expect(commit).toBe(candidate.artifactCommit);
    expect(path.join('/')).toBe(candidate.artifactRepositoryPath);
    expect(read(candidate.evidencePaths.ledger)).toContain(candidate.artifactUrl);
  });

  it('cross-checks source provenance and the linked packaged documents', () => {
    expect(candidate.sourceCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(manifest.repository.url).toBe(`git+${candidate.sourceRepository}.git`);
    expect(manifest.repository.directory).toBe(candidate.sourcePackagePath);
    const provenance = read('vendor/README.md');
    expect(provenance).toContain(`Source commit: \`${candidate.sourceCommit}\``);
    expect(provenance).toContain(`Artifact SHA-256: \`${candidate.sha256}\``);
    for (const path of ['README.md', 'CHANGELOG.md', 'LICENSING.md', 'NOTICE']) {
      expect(packed(path).trim().length, path).toBeGreaterThan(0);
    }
    // A source checkout is not required: the archive must expose the documented
    // public ESM/type paths, independent of its internal site-only subpaths.
    for (const entry of ['.', './geo', './receipt']) {
      expect(packed(manifest.exports[entry].import.replace(/^\.\//, ''))).not.toBe('');
      expect(packed(manifest.exports[entry].types.replace(/^\.\//, ''))).not.toBe('');
    }
  });

  it.each([
    ['artifactCommit', 'main'],
    ['artifactCommit', 'a'.repeat(40) + '\n'],
    ['sourceCommit', 'a'.repeat(40) + '\r'],
    ['evidenceCommit', null],
    ['artifactRepository', 'https://github.com/another/sdk'],
    ['artifactRepositoryPath', 'artifacts/%2e%2e/private.tgz'],
    ['artifactPath', '../private.tgz'],
    ['artifactUrl', candidate.artifactUrl + '?token=synthetic'],
    ['sha256', '0'.repeat(64) + '\n'],
    ['version', candidate.version + '\r'],
    ['version', '00.1.1-rc.5'],
    ['version', '0.1.1-rc.05'],
    ['releaseStatus', 'published'],
    ['schemaVersion', 2],
  ])('rejects inconsistent or noncanonical metadata: %s', (key, value) => {
    const validFixture = { ...candidate, evidenceCommit: 'a'.repeat(40) };
    expect(assertEngineCandidate(validFixture)).toBe(validFixture);
    expect(() => assertEngineCandidate({ ...validFixture, [key]: value }))
      .toThrow('Invalid engine candidate metadata');
  });

  it('rejects extra metadata fields and evidence path traversal', () => {
    const validFixture = { ...candidate, evidenceCommit: 'a'.repeat(40) };
    expect(assertEngineCandidate(validFixture)).toBe(validFixture);
    expect(() => assertEngineCandidate({ ...validFixture, anotherIdentity: true })).toThrow();
    expect(() => assertEngineCandidate({ ...validFixture, evidencePaths: {
      ...candidate.evidencePaths, node22: 'docs/platform/../private.json',
    } })).toThrow();
  });

  it('links existing evidence for the same artifact rather than another candidate', () => {
    expect(candidate.evidenceRepository).toBe('https://github.com/ZodiacsOfficial/site');
    expect(candidate.evidenceCommit).toMatch(/^[a-f0-9]{40}$/);
    for (const path of Object.values(candidate.evidencePaths)) {
      expect(path).toMatch(/^docs\/platform\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/);
      expect(read(path).trim().length, path).toBeGreaterThan(0);
    }
    for (const key of ['node22', 'node24']) {
      const report = JSON.parse(read(candidate.evidencePaths[key]));
      expect(report.engineVersion).toBe(candidate.version);
      expect(report.artifactSHA256).toBe(candidate.sha256);
    }
    const log = read(candidate.evidencePaths.publicConsumer);
    const receipt = JSON.parse(log.slice(log.indexOf('\n{') + 1));
    expect(receipt.version).toBe(candidate.version);
    expect(receipt.sha256).toBe(candidate.sha256);
    expect(receipt.publicExamples).toBe('passed');
    expect(receipt.types).toBe('passed');
  });

  it('keeps the public distribution explicitly unpublished', () => {
    expect(candidate.releaseStatus).toBe('unpublished-candidate');
    expect(candidate.releaseLabel).toBe('Unpublished candidate');
    expect(manifest.version).toMatch(/-rc\.[0-9]+$/);
    expect(packed('README.md')).toContain('not a published release');
  });

  it('makes both developer pages consume one candidate identity', () => {
    for (const path of ['src/pages/developers/index.astro', 'src/pages/developers/support/index.astro']) {
      const page = read(path);
      expect(page, path).toMatch(/import candidate from ['"][^'"]*\/data\/platform-engine-candidate\.json['"]/);
      expect(page, path).toContain('candidate.version');
      expect(page, path).toContain('candidate.releaseLabel');
      expect(page, path).not.toContain(candidate.version);
      expect(page, path).not.toContain(candidate.sha256);
      expect(page, path).not.toContain(candidate.sourceCommit);
    }
  });

  it('identifies current source documentation separately from the archived TypeDoc and starter', () => {
    const guide = read('public/llms-full.txt');
    expect(guide).toContain(`candidate version ${candidate.version}`);
    expect(guide).toContain(`${candidate.sourceRepository}/blob/${candidate.sourceCommit}/${candidate.sourcePackagePath}/README.md`);
    expect(guide).toContain(`${candidate.sourceRepository}/blob/${candidate.sourceCommit}/docs/platform/receipt-draft-v1.md`);
    expect(guide).toContain('Archived rc.1 typed API reference (earlier candidate)');
    expect(read('public/sdk/engine/index.html')).toContain('<title>@zodiacs/engine 0.1.1-rc.1</title>');
    const support = read('src/pages/developers/support/index.astro');
    expect(support).toContain('current candidate API guide');
    expect(support).toContain('archived rc.1 API reference');
    expect(support).toContain('site saved-chart/account format is unchanged');
  });
});
