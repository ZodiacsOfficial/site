/*
 * Versions and digests of everything the 2026-09-26 verdicts were measured
 * on. Swiss's readings are not recorded here, only the files it read.
 *
 *   node tools/provenance.mjs <rc.7 install directory> > results/provenance.json
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ENGINE_VERSION } from '@zodiacs/engine';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const tarball = 'vendor/zodiacs-engine-0.1.1-rc.8.tgz';
const dist = 'node_modules/@zodiacs/engine/dist';
const distSha256 = {};
let installedDistEqualsTarball = true;
for (const name of readdirSync(dist).sort()) {
  const installed = readFileSync(join(dist, name));
  const packed = execFileSync('tar', ['-xzOf', tarball, `package/dist/${name}`]);
  distSha256[name] = sha(installed);
  if (sha(packed) !== distSha256[name]) installedDistEqualsTarball = false;
}
const sourcesRoot = process.env.DELTAT_SOURCES;
const recorded = JSON.parse(readFileSync('docs/platform/evidence/deltat-2026-09-25/sources.json', 'utf8'));
const deltatSources = {};
for (const entry of recorded.sources) {
  if (!entry.sha256 || !sourcesRoot) continue;
  const actual = sha(readFileSync(join(sourcesRoot, entry.file)));
  deltatSources[entry.file] = { sha256: actual, matchesRecord: actual === entry.sha256 };
}
const ephe = process.env.SWISS_EPHE;
const rc7Root = process.argv[2] ? resolve(process.argv[2]) : null;
const out = {
  what: 'Versions and digests for the Phase 1 verdict runs of 2026-09-26 (steps 1.4, 1.5 under A4, 1.7, 1.10, 1.11). Swiss Ephemeris readings are not committed.',
  site: {
    head: git('rev-parse', 'HEAD'),
    headSubject: git('log', '-1', '--format=%s'),
    measuredInputsMatchHead: git('status', '--porcelain', '--', 'src', 'scripts', 'vendor', 'package.json', 'package-lock.json', 'docs/platform/evidence/deltat-2026-09-25') === '',
  },
  engine: {
    package: '@zodiacs/engine',
    ENGINE_VERSION,
    vendorTarball: tarball,
    vendorTarballSha256: sha(readFileSync(tarball)),
    installedDistEqualsTarball,
    distSha256,
  },
  rc7: rc7Root ? {
    installed: JSON.parse(readFileSync(join(rc7Root, 'node_modules/@zodiacs/engine/package.json'), 'utf8')).version,
    vendorTarballSha256: sha(readFileSync('vendor/zodiacs-engine-0.1.1-rc.7.tgz')),
  } : null,
  deltatSources,
  swiss: ephe ? {
    pyswisseph: execFileSync('python3', ['-c', 'import swisseph; print(swisseph.version)'], { encoding: 'utf8' }).trim(),
    files: Object.fromEntries(['sepl_18.se1', 'semo_18.se1'].map((name) => [name, sha(readFileSync(join(ephe, name)))])),
  } : null,
  runtime: { node: process.version, python: execFileSync('python3', ['--version'], { encoding: 'utf8' }).trim() },
};
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
