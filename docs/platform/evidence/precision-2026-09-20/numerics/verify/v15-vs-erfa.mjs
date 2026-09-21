import { readFileSync } from 'node:fs';
import { nut00a, nut00b } from '../src/nutation.mjs';
const lines = readFileSync('verify/erfa_ref.txt','utf8').trim().split('\n');
let mb=0, ma=0, mbe=0, mae=0;
for (const l of lines) {
  const [t, dpb, deb, dpa, dea] = l.split(' ').map(Number);
  const b = nut00b(t), a = nut00a(t);
  mb = Math.max(mb, Math.abs(b.dpsi - dpb));
  mbe = Math.max(mbe, Math.abs(b.deps - deb));
  ma = Math.max(ma, Math.abs(a.dpsi - dpa));
  mae = Math.max(mae, Math.abs(a.deps - dea));
}
console.log('n =', lines.length, 'epochs, t in [-1.5, 1.5] centuries (1850-2150)');
console.log('  JS nut00b vs compiled ERFA eraNut00b: max |ddpsi| =', mb.toExponential(4), '"  max |ddeps| =', mbe.toExponential(4), '"');
console.log('  JS nut00a vs compiled ERFA eraNut00a: max |ddpsi| =', ma.toExponential(4), '"  max |ddeps| =', mae.toExponential(4), '"');
