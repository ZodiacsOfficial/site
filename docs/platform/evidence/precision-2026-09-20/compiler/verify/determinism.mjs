/**
 * Determinism proof: compile each candidate twice into different files and
 * compare the SHA-256 of the bytes. Same input, same settings, byte-identical
 * output -- demonstrated, not asserted.
 *
 * Scope, stated honestly: this proves determinism of this compiler on this
 * platform and Node build. The fits call Math.cos, whose last bit is not
 * specified by ECMA-262, so a different engine could in principle produce a
 * different pack. The header records the compiler source hashes so a reader
 * can tell whether two packs were even meant to be identical.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const here = (f) => new URL(`./${f}`, import.meta.url).pathname;
const only = process.argv.slice(2).length ? process.argv.slice(2) : ['A', 'B', 'D'];
const rows = [];
for (const c of only) {
  const a = here(`packs/_det_${c}_1.zeph`);
  const b = here(`packs/_det_${c}_2.zeph`);
  for (const out of [a, b]) execFileSync(process.execPath, [here('compile.mjs'), `--candidate=${c}`, `--out=${out}`], { encoding: 'utf8' });
  const ha = sha(a); const hb = sha(b);
  rows.push({ candidate: c, sha256Run1: ha, sha256Run2: hb, identical: ha === hb, bytes: readFileSync(a).length });
  rmSync(a); rmSync(b);
}
const out = { what: 'compile twice, hash twice', platform: process.platform, node: process.version, runs: rows, allIdentical: rows.every((r) => r.identical) };
writeFileSync(new URL('./raw/determinism.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
