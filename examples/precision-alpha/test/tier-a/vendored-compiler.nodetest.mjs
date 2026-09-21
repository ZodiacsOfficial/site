/**
 * The vendored compiler must actually be runnable from wherever it lands.
 *
 * Named `.nodetest.mjs`, not `.test.mjs`: vitest's repo-wide glob collects
 * `*.test.mjs` and these are `node:test` suites.
 *
 * This exists because packing the archive and running it caught what the
 * source tree hid: `compile.mjs` reads `raw/choice.json` from beside
 * itself, that file was not in the `files` list, and the documented route
 * from a kernel to a pack died on a missing file in a clean install. A test
 * that only ever ran in the repository would never have seen it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools', 'compiler');

test('the vendored compiler is present', () => {
  for (const f of ['compile.mjs', 'cheb.mjs', 'format.mjs', 'sources.mjs', 'spkref.mjs', 'runtime.mjs', 'SOURCE.md']) {
    assert.ok(existsSync(join(DIR, f)), `tools/compiler/${f} is missing`);
  }
});

test('every file the compiler reads from beside itself is there', () => {
  const sources = readdirSync(DIR).filter((f) => f.endsWith('.mjs'));
  const wanted = new Set();
  for (const f of sources) {
    const src = readFileSync(join(DIR, f), 'utf8');
    for (const m of src.matchAll(/here\(\s*'([^']+)'\s*\)/g)) wanted.add(m[1]);
    // `sourceHashes()` reads a literal list of its own files to hash them.
    // That is a real read, and it broke the clean install when one of the
    // listed files was not vendored.
    for (const m of src.matchAll(/for \(const f of \[([^\]]+)\]\) \{\s*\n\s*out\[f\]/g)) {
      for (const q of m[1].matchAll(/'([^']+)'/g)) wanted.add(q[1]);
    }
    for (const m of src.matchAll(/new URL\(\s*`\.\/([^`$]+)`/g)) wanted.add(m[1]);
  }
  assert.ok(wanted.size > 0, 'the scan found no data dependencies at all, which is suspicious');
  for (const rel of wanted) {
    assert.ok(existsSync(join(DIR, rel)), `the compiler reads ${rel}, which is not vendored alongside it`);
  }
});

test('the compiler reaches nothing outside its own directory', () => {
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.mjs'))) {
    const code = readFileSync(join(DIR, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of code.matchAll(/from\s+'([^']+)'/g)) {
      const spec = m[1];
      assert.ok(spec.startsWith('node:') || spec.startsWith('./'),
        `tools/compiler/${f} imports ${spec}; the vendored compiler must be self-contained`);
    }
  }
});

test('the vendored copy matches the research tree, when the research tree is there', async () => {
  const research = join(DIR, '..', '..', '..', '..', 'docs', 'platform', 'evidence', 'precision-2026-09-20', 'compiler');
  if (!existsSync(research)) return;      // a packed archive has no research tree
  const { createHash } = await import('node:crypto');
  const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  for (const f of ['compile.mjs', 'cheb.mjs', 'format.mjs', 'sources.mjs', 'spkref.mjs', 'runtime.mjs', 'raw/choice.json']) {
    assert.equal(sha(join(DIR, f)), sha(join(research, f)),
      `tools/compiler/${f} has drifted from the research tree it was copied from`);
  }
});

test('the recorded hashes in SOURCE.md match the files', async () => {
  const { createHash } = await import('node:crypto');
  const doc = readFileSync(join(DIR, 'SOURCE.md'), 'utf8');
  let checked = 0;
  for (const m of doc.matchAll(/\| `([^`]+\.mjs)` \| `([0-9a-f]{64})` \|/g)) {
    const actual = createHash('sha256').update(readFileSync(join(DIR, m[1]))).digest('hex');
    assert.equal(actual, m[2], `SOURCE.md records the wrong hash for ${m[1]}`);
    checked += 1;
  }
  assert.equal(checked, 6, `expected six recorded hashes, checked ${checked}`);
});

test('nothing in the numerical core reaches into the vendored compiler', () => {
  // The package has ONE numerical core, `src/core/`. `tools/compiler/` is a
  // separate program that makes packs, and `tools/compiler/runtime.mjs` is
  // a reader this package does not use -- it is vendored only because the
  // compiler hashes its own source set. If src/ ever imported any of it,
  // there would be two.
  const core = join(DIR, '..', '..', 'src');
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  for (const f of walk(core)) {
    const src = readFileSync(f, 'utf8');
    assert.equal(/tools\/compiler/.test(src), false, `${f} reaches into tools/compiler`);
  }
});
