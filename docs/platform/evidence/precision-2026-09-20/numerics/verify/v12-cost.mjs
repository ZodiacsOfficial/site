import { readFileSync } from 'node:fs';
import { nut00a, nut00b, nutAstronomyEngine } from '../src/nutation.mjs';
const S = JSON.parse(readFileSync('src/nutation-series.json','utf8'));
const b = JSON.stringify(S.nut00b_luniSolar.rows);
const a1 = JSON.stringify(S.nut00a_luniSolar.rows);
const a2 = JSON.stringify(S.nut00a_planetary.rows);
console.log('JSON.stringify bytes: 2000B rows', Buffer.byteLength(b), '| 2000A rows', Buffer.byteLength(a1)+Buffer.byteLength(a2));
console.log('RESULTS claims:       2000B 2788 B  | 2000A 46510 B');
// timing
const T = [];
for (let i=0;i<20000;i++) T.push((i-10000)/6000);
const bench = (f, label) => {
  for (let k=0;k<3;k++) { let s=0; for (const t of T) s += f(t).dpsi; }
  const t0 = process.hrtime.bigint();
  let s = 0;
  for (const t of T) s += f(t).dpsi;
  const t1 = process.hrtime.bigint();
  console.log(label, (Number(t1-t0)/1000/T.length).toFixed(3), 'us/eval  (checksum', s.toExponential(3), ')');
};
bench(nutAstronomyEngine, 'AE 5-term ');
bench(nut00b, 'IAU 2000B ');
bench(nut00a, 'IAU 2000A ');
console.log('RESULTS claims: AE 0.460 us, 2000B 4.593 us, 2000A 77.525 us');
