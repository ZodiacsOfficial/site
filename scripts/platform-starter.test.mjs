import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { gunzipSync, gzipSync } from 'node:zlib';
import { parse } from '@astrojs/compiler';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { consumerEnvironment, readPackageArchive, starterFiles, verifyPlatformStarter } from './verify-platform-starter.mjs';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path));
const metadata = JSON.parse(read('public/examples/platform-starter.json'));
const candidate = JSON.parse(read('src/data/platform-engine-candidate.json'));
const archive = read(`public/examples/${metadata.file}`);
const originalFiles = readPackageArchive(archive);
const temporary = [];

afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });

// Small independent tar writer for adversarial fixtures; no extraction or npm.
function pack(entries) {
  const blocks = [];
  for (const { path, bytes = Buffer.from('fixture'), type = '0', link = '' } of entries) {
    const header = Buffer.alloc(512);
    header.write(path, 0, 100, 'ascii');
    header.write('0000644\0', 100, 'ascii');
    header.write(bytes.length.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
    header.fill(32, 148, 156);
    header.write(type, 156, 'ascii');
    header.write(link, 157, 100, 'ascii');
    header.write('ustar\0' + '00', 257, 'ascii');
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');
    blocks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}

function fixture({ mutateFiles, mutateCandidate, mutateMetadata } = {}) {
  const path = mkdtempSync(join(tmpdir(), 'zodiacs-starter-verifier-test-'));
  temporary.push(path);
  const put = (name, bytes) => { mkdirSync(dirname(join(path, name)), { recursive: true }); writeFileSync(join(path, name), bytes); };
  const files = new Map(originalFiles);
  mutateFiles?.(files);
  const changedArchive = pack([...files].map(([name, bytes]) => ({ path: `package/${name}`, bytes })));
  const changedMetadata = { ...metadata, sha256: createHash('sha256').update(changedArchive).digest('hex') };
  mutateMetadata?.(changedMetadata);
  put('public/examples/platform-starter.json', JSON.stringify(changedMetadata));
  put(`public/examples/${metadata.file}`, changedArchive);
  const changedCandidate = structuredClone(candidate);
  mutateCandidate?.(changedCandidate);
  put('src/data/platform-engine-candidate.json', JSON.stringify(changedCandidate));
  put(candidate.artifactPath, read(candidate.artifactPath));
  // Keep the repository source independent from the mutated archive.
  for (const [name, bytes] of originalFiles) put(`examples/platform/${name}`, bytes);
  return { root: path, put, files };
}

describe('platform starter archive and source identity (offline)', () => {
  it('verifies the public-directory archive against every source byte and the candidate', () => {
    const result = verifyPlatformStarter();
    expect(result.metadata).toEqual(metadata);
    expect([...result.files.keys()].sort()).toEqual(starterFiles(candidate.version).sort());
    expect(result.files.size).toBe(20);
  });

  it('detects an archive digest change before reading package data', () => {
    const test = fixture({ mutateMetadata: (value) => { value.sha256 = '0'.repeat(64); } });
    expect(() => verifyPlatformStarter(test)).toThrow('Starter archive SHA-256 mismatch');
  });

  it.each([undefined, 'main', '80dff5f', 'g'.repeat(40), 'a'.repeat(41), 123, ['a'.repeat(40)]])('requires a full immutable starter commit: %j', (artifactCommit) => {
    const test = fixture({ mutateMetadata: (value) => { value.artifactCommit = artifactCommit; } });
    expect(() => verifyPlatformStarter(test)).toThrow('Invalid immutable starter commit');
  });

  it('detects stale or substituted source even after the public digest is updated', () => {
    const test = fixture({ mutateFiles: (files) => files.set('src/app.mjs', Buffer.from('alert("changed")')) });
    expect(() => verifyPlatformStarter(test)).toThrow('Archive/source byte mismatch: src/app.mjs');
  });

  it('detects candidate provenance drift independently of starter source and digest', () => {
    const test = fixture({ mutateCandidate: (value) => { value.sourceCommit = 'a'.repeat(40); } });
    expect(() => verifyPlatformStarter(test)).toThrow('Candidate metadata mismatch: sourceCommit');
  });

  it('rejects mutable artifact URLs even when both metadata copies match', () => {
    const test = fixture({ mutateFiles: (files) => {
      const value = JSON.parse(files.get('candidate.json'));
      value.url = value.url.replace(value.artifactCommit, 'main');
      files.set('candidate.json', Buffer.from(JSON.stringify(value)));
    }, mutateCandidate: (value) => { value.artifactUrl = value.artifactUrl.replace(/\/site\/[a-f0-9]{40}\//, '/site/main/'); } });
    test.put('examples/platform/candidate.json', test.files.get('candidate.json'));
    expect(() => verifyPlatformStarter(test)).toThrow('Candidate URL must identify the immutable artifact');
  });

  it('rejects a repacked engine even when starter source and its own digest agree', () => {
    const test = fixture({ mutateFiles: (files) => files.set(candidate.artifactPath, Buffer.from('different engine')) });
    test.put(`examples/platform/${candidate.artifactPath}`, test.files.get(candidate.artifactPath));
    expect(() => verifyPlatformStarter(test)).toThrow('Contained engine artifact mismatch');
  });

  it('rejects a starter that drops its private flag', () => {
    const test = fixture({ mutateFiles: (files) => {
      const value = JSON.parse(files.get('package.json'));
      delete value.private;
      files.set('package.json', Buffer.from(JSON.stringify(value)));
    } });
    test.put('examples/platform/package.json', test.files.get('package.json'));
    expect(() => verifyPlatformStarter(test)).toThrow('Starter package identity/private/runtime mismatch');
  });

  it('checks shrinkwrap engine integrity beyond source byte equality', () => {
    const test = fixture({ mutateFiles: (files) => {
      const lock = JSON.parse(files.get('npm-shrinkwrap.json'));
      lock.packages['node_modules/@zodiacs/engine'].integrity = 'sha512-wrong';
      files.set('npm-shrinkwrap.json', Buffer.from(JSON.stringify(lock)));
    } });
    test.put('examples/platform/npm-shrinkwrap.json', test.files.get('npm-shrinkwrap.json'));
    expect(() => verifyPlatformStarter(test)).toThrow('Locked engine integrity mismatch');
  });

  it('rejects source symlinks even if the target contains matching bytes', () => {
    const test = fixture();
    const target = join(test.root, 'examples/platform/README.md');
    test.put('elsewhere.md', read('examples/platform/README.md'));
    rmSync(target);
    symlinkSync(join(test.root, 'elsewhere.md'), target);
    expect(() => verifyPlatformStarter(test)).toThrow('Source must not contain links or special files');
  });
});

describe('examples page artifact identity', () => {
  it('renders links, setup values, and release identity from shared metadata', async () => {
    const pagePath = 'src/pages/developers/examples/index.astro';
    const { ast } = await parse(read(pagePath).toString('utf8'));
    const frontmatter = ast.children.find((node) => node.type === 'frontmatter').value;
    const source = ts.createSourceFile(pagePath, frontmatter, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const bindings = new Map(source.statements.filter(ts.isImportDeclaration).map((statement) => [
      resolve(root, dirname(pagePath), statement.moduleSpecifier.text), statement.importClause?.name?.text,
    ]));
    const starterBinding = bindings.get(join(root, 'public/examples/platform-starter.json'));
    const candidateBinding = bindings.get(join(root, 'src/data/platform-engine-candidate.json'));
    expect(starterBinding).toBeTypeOf('string');
    expect(candidateBinding).toBeTypeOf('string');
    const declarations = source.statements.filter((statement) => !ts.isImportDeclaration(statement)).map((statement) => statement.getFullText(source)).join('\n');

    // Evaluate the actual frontmatter and template expressions with substituted
    // metadata. This checks data flow without pinning prose or variable names.
    function render(starterValue, candidateValue) {
      const evaluate = (expression) => runInNewContext(ts.transpileModule(`${declarations}\n(${expression})`, {
        compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
      }).outputText, { [starterBinding]: starterValue, [candidateBinding]: candidateValue }, { timeout: 1000 });
      const text = (node) => node.type === 'expression' ? String(evaluate(node.children.map((child) => child.value).join('')))
        : node.type === 'text' ? node.value : node.type === 'frontmatter' ? '' : (node.children || []).map(text).join('');
      const links = [];
      const pre = [];
      function walk(node) {
        if (node.type === 'element' && node.name === 'a') {
          const href = node.attributes.find((attribute) => attribute.name === 'href');
          if (href) links.push(href.kind === 'expression' ? evaluate(href.value) : href.value);
        }
        if (node.type === 'element' && node.name === 'pre') pre.push(text(node));
        for (const child of node.children || []) walk(child);
      }
      walk(ast);
      return { links, setup: pre[0], visible: text(ast) };
    }

    const original = render(metadata, candidate);
    const changedStarter = { ...metadata, version: '8.7.6-rc.5', file: 'zodiacs-platform-starter-8.7.6-rc.5.tgz', sha256: 'b'.repeat(64), artifactCommit: 'a'.repeat(40) };
    const changedCandidate = { ...candidate, name: '@example/engine', version: '9.8.7-rc.6', releaseLabel: 'Unpublished test candidate' };
    const changed = render(changedStarter, changedCandidate);
    expect(changed.links).toContain(`https://raw.githubusercontent.com/ZodiacsOfficial/site/${changedStarter.artifactCommit}/public/examples/${changedStarter.file}`);
    expect(changed.links).toContain(`https://github.com/ZodiacsOfficial/site/blob/${changedStarter.artifactCommit}/examples/platform/README.md`);
    expect(changed.setup).toBe(original.setup.replaceAll(metadata.file, changedStarter.file)
      .replaceAll(metadata.sha256, changedStarter.sha256).replaceAll(metadata.artifactCommit, changedStarter.artifactCommit));
    for (const value of [changedStarter.file, changedStarter.sha256, changedStarter.artifactCommit]) expect(changed.setup).toContain(value);
    for (const value of [changedStarter.version, `${changedCandidate.name}@${changedCandidate.version}`, changedCandidate.releaseLabel.toLowerCase()]) expect(changed.visible).toContain(value);
    for (const value of [metadata.file, metadata.sha256, metadata.artifactCommit, candidate.version]) expect(changed.visible).not.toContain(value);
  });
});

describe('starter archive extraction boundary', () => {
  it.each(['package/../outside', '/absolute', 'package/a/../../outside', 'package/a\\b', 'package//double', 'package/./dot'])('rejects unsafe path %s', (path) => {
    expect(() => readPackageArchive(pack([{ path }]))).toThrow('Unsafe archive path');
  });

  it.each(['1', '2', '3', '5', 'x', 'g', 'L'])('rejects nonregular or alternate tar entries %s', (type) => {
    expect(() => readPackageArchive(pack([{ path: 'package/README.md', type }]))).toThrow('Archive must contain only regular files');
  });

  it.each(['node_modules/secret', 'dist/app.js', '.env', 'unexpected.txt'])('rejects unlisted content %s', (path) => {
    expect(() => readPackageArchive(pack([{ path: `package/${path}` }]), starterFiles(candidate.version))).toThrow('Unexpected archive file');
  });

  it('rejects duplicate members, misleading link targets and missing expected files', () => {
    const member = { path: 'package/README.md' };
    expect(() => readPackageArchive(pack([member, member]))).toThrow('Duplicate archive file');
    expect(() => readPackageArchive(pack([{ ...member, link: '../secret' }]))).toThrow('Archive link target is forbidden');
    expect(() => readPackageArchive(pack([member]), ['README.md', 'package.json'])).toThrow('Missing archive file: package.json');
  });

  it('rejects bad checksums, truncated archives and data after the end marker', () => {
    const tar = gunzipSync(pack([{ path: 'package/README.md' }]));
    const corrupt = Buffer.from(tar);
    corrupt[0] ^= 1;
    expect(() => readPackageArchive(gzipSync(corrupt))).toThrow('Tar checksum mismatch');
    expect(() => readPackageArchive(gzipSync(tar.subarray(0, tar.length - 1)))).toThrow('Truncated tar archive');
    expect(() => readPackageArchive(gzipSync(tar.subarray(0, tar.length - 1024)))).toThrow('Missing tar end marker');
    expect(() => readPackageArchive(gzipSync(Buffer.concat([tar, Buffer.alloc(512, 1)])))).toThrow('Invalid tar end marker');
  });

  it('bounds compressed and inflated archive sizes', () => {
    expect(() => readPackageArchive(Buffer.alloc(4 * 1024 * 1024 + 1))).toThrow('Archive exceeds size limit');
    expect(() => readPackageArchive(gzipSync(Buffer.alloc(16 * 1024 * 1024 + 512)))).toThrow();
  });

  it('isolates the install from private npm settings and inherited credentials', () => {
    const env = consumerEnvironment('/tmp/isolated-consumer', { PATH: '/bin', NPM_TOKEN: 'secret', NODE_AUTH_TOKEN: 'secret',
      npm_config_userconfig: '/private/.npmrc', npm_config_cache: '/private/cache', NODE_OPTIONS: '--require=private.js', OTHER_SECRET: 'secret' });
    expect(env.PATH).toBe(`${dirname(process.execPath)}${delimiter}/bin`);
    expect(env.npm_config_cache).toBe('/tmp/isolated-consumer/npm-cache');
    expect(env.npm_config_userconfig).toBe('/tmp/isolated-consumer/user.npmrc');
    for (const key of ['NPM_TOKEN', 'NODE_AUTH_TOKEN', 'NODE_OPTIONS', 'OTHER_SECRET']) expect(env).not.toHaveProperty(key);
    expect(JSON.stringify(env)).not.toMatch(/secret|\/private\/(?:\.npmrc|cache)/);
  });
});
