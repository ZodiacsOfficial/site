/*
 * Provenance for the Phase 1 verdict runs (steps 1.2, 1.3, 1.8, 1.9): which engine bytes, which
 * runtime, which site commit and corpora. The two measured runs' env/provenance.mjs, merged.
 *
 * Reads SITE_ROOT (the installed @zodiacs/engine, vendor/, the corpora, git) and the tarballs
 * run-all.sh extracts to $WORK/tgz and $WORK/tgz-rc6; fails unless every file of the installed
 * dist/ equals the vendored rc.7 tarball's. ENGINE_REPO, if set, is a checkout of
 * zodiacs-org/engine whose artifacts/ tarball is compared too. Prints JSON (absolute paths
 * included; summarize.mjs keeps only repository-relative ones):
 *
 *   node tools/env/provenance.mjs > $WORK/env/provenance-node.json
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CORPORA, ENGINE, RC6, SITE_ROOT, WORK } from '../lib/paths.mjs';

const TREE = SITE_ROOT;
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const git = (...args) => execFileSync('git', ['-C', TREE, ...args], { encoding: 'utf8' }).trim();
const version = (name) => JSON.parse(readFileSync(`${TREE}/node_modules/${name}/package.json`, 'utf8')).version;

const pkg = JSON.parse(readFileSync(`${ENGINE}/package.json`, 'utf8'));
const root = await import(`${ENGINE}/dist/index.js`);
const math = await import(`${ENGINE}/dist/internal-math.js`);
const receipt = await import(`${ENGINE}/dist/receipt.js`);
if (pkg.version !== '0.1.1-rc.7') throw new Error(`package.json version ${pkg.version}`);
if (root.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error(`ENGINE_VERSION ${root.ENGINE_VERSION}`);
if (math.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error(`internal-math ENGINE_VERSION ${math.ENGINE_VERSION}`);

// The installed copy against the vendored tarball's own bytes (extracted to $WORK/tgz/package).
const dist = readdirSync(`${ENGINE}/dist`).sort();
const mismatches = [];
const files = {};
for (const name of dist) {
  const a = sha(join(ENGINE, 'dist', name));
  const b = sha(join(WORK, 'tgz/package/dist', name));
  files[name] = a;
  if (a !== b) mismatches.push(name);
}
if (mismatches.length) throw new Error(`node_modules differs from tarball: ${mismatches}`);

// The measured inputs as committed: no change under these paths against HEAD.
const inputs = ['src', 'scripts/angles-grid.test.mjs', 'vendor', 'package.json', 'package-lock.json',
  'docs/platform/evidence/engine-beyond-swiss/corpora'];
const inputChanges = git('status', '--porcelain', '--', ...inputs);
const porcelain = git('status', '--porcelain');
const engineRepo = process.env.ENGINE_REPO;

console.log(JSON.stringify({
  node: process.version,
  viteNode: version('vite-node'),
  vite: version('vite'),
  vitest: version('vitest'),
  siteTree: {
    path: TREE,
    head: git('rev-parse', 'HEAD'),
    headSubject: git('log', '-1', '--format=%s'),
    trackedChanges: porcelain === '' ? 0 : porcelain.split('\n').length,
    measuredInputs: inputs,
    measuredInputsMatchHead: inputChanges === '',
  },
  engine: {
    path: ENGINE,
    packageVersion: pkg.version,
    ENGINE_VERSION: root.ENGINE_VERSION,
    placidusPolarFallback: math.PLACIDUS_POLAR_FALLBACK,
    houseSystems: [...math.HOUSE_SYSTEMS],
    receiptConventions: receipt.NATAL_RECEIPT_CONVENTION_SETS[0],
    vendorTarball: 'vendor/zodiacs-engine-0.1.1-rc.7.tgz',
    vendorTarballSha256: sha(`${TREE}/vendor/zodiacs-engine-0.1.1-rc.7.tgz`),
    vendorSha256File: readFileSync(`${TREE}/vendor/zodiacs-engine-0.1.1-rc.7.sha256`, 'utf8').trim(),
    engineRepoArtifactSha256: engineRepo ? sha(`${engineRepo}/artifacts/zodiacs-engine-0.1.1-rc.7.tgz`) : null,
    nodeModulesDistEqualsTarball: true,
    distSha256: files,
  },
  rc6Control: {
    vendorTarball: 'vendor/zodiacs-engine-0.1.1-rc.6.tgz',
    vendorTarballSha256: sha(`${TREE}/vendor/zodiacs-engine-0.1.1-rc.6.tgz`),
    packageVersion: JSON.parse(readFileSync(`${RC6}/package.json`, 'utf8')).version,
    internalMathSha256: sha(`${RC6}/dist/internal-math.js`),
  },
  sitePath: {
    'src/lib/engine/full.ts': sha(`${TREE}/src/lib/engine/full.ts`),
    'src/lib/engine/chart-adapter.ts': sha(`${TREE}/src/lib/engine/chart-adapter.ts`),
    'scripts/angles-grid.test.mjs': sha(`${TREE}/scripts/angles-grid.test.mjs`),
  },
  astronomyEngine: {
    version: version('astronomy-engine'),
    esmSha256: sha(`${TREE}/node_modules/astronomy-engine/esm/astronomy.js`),
    cjsSha256: sha(`${TREE}/node_modules/astronomy-engine/astronomy.js`),
  },
  corpora: {
    'angle-grid-inputs.json': sha(`${CORPORA}/angle-grid-inputs.json`),
    'angle-grid-erfa.json': sha(`${CORPORA}/angle-grid-erfa.json`),
    'tools/angle-arbiter.py': sha(`${CORPORA}/tools/angle-arbiter.py`),
    'tools/angle-clock.ts': sha(`${CORPORA}/tools/angle-clock.ts`),
  },
}, null, 1));
