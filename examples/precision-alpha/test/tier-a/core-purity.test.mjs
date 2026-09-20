/** A1: the numerical core must be loadable anywhere. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CORE = new URL('../../src/core/', import.meta.url).pathname;
const files = readdirSync(CORE).filter((f) => f.endsWith('.mjs'));

test('the core has files to check', () => {
  assert.ok(files.length >= 7, `expected the whole core, found ${files.join(', ')}`);
});

for (const f of files) {
  const src = readFileSync(join(CORE, f), 'utf8');
  // Comments are allowed to say the words; code is not.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  test(`core/${f} imports nothing environment-specific`, () => {
    for (const [what, re] of [
      ['a node: import', /['"]node:[a-z_/]+['"]/],
      ['require(', /\brequire\s*\(/],
      ['Buffer', /\bBuffer\b/],
      ['process.', /\bprocess\s*\./],
      ['__dirname', /\b__dirname\b/],
      ['import.meta.url', /\bimport\.meta\b/],
      ['a wall clock', /\bDate\s*\.\s*now\b|\bnew\s+Date\b/],
      ['randomness', /\bMath\s*\.\s*random\b/],
      ['fetch', /\bfetch\s*\(/],
    ]) {
      assert.equal(re.test(code), false, `core/${f} uses ${what}`);
    }
  });
}

test('the core reaches WebCrypto only through the one helper', () => {
  const users = files.filter((f) => /globalThis\.crypto/.test(readFileSync(join(CORE, f), 'utf8')));
  assert.deepEqual(users, ['source.mjs'], `expected only source.mjs, got ${users.join(', ')}`);
});

test('no module offers a way to skip verification', () => {
  const all = files.map((f) => readFileSync(join(CORE, f), 'utf8'))
    .concat(['index.mjs', 'browser.mjs', 'node.mjs'].map((f) => readFileSync(new URL(`../../src/${f}`, import.meta.url).pathname, 'utf8')))
    .join('\n');
  for (const re of [/skipVerif/i, /noVerify/i, /unsafeOpen/i, /allowUnverified/i, /requireIntegrity/i]) {
    assert.equal(re.test(all), false, `found a verification bypass matching ${re}`);
  }
});
