/** Best model on a dense TT grid inside kernel coverage — no Delta-T anywhere. */
import { writeFileSync } from 'node:fs';
import { Backend, DEFAULTS, PROTOTYPE } from '../src/apparent2.mjs';
const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const cov = de.coverage();
const BODIES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
// stay 1 day inside coverage on both ends
const startTt = cov.start/86400 + 1.0;
const stopTt  = cov.stop/86400 - 1.0;
const N = 600;
const rows = [];
for (let i = 0; i < N; i++) {
  const ttDays = startTt + (stopTt - startTt) * i / (N - 1);
  const rec = { jdTt: ttDays + 2451545.0, best: {}, proto: {} };
  for (const b of BODIES) {
    rec.best[b] = de.apparent(b, ttDays, DEFAULTS).lon;
    rec.proto[b] = de.apparent(b, ttDays, PROTOTYPE).lon;
  }
  rows.push(rec);
}
writeFileSync('verify/v4-dense.json', JSON.stringify({ bodies: BODIES, coverage: cov, n: N, rows }));
console.log('n', N, 'jdTt', rows[0].jdTt, '->', rows[rows.length-1].jdTt);
