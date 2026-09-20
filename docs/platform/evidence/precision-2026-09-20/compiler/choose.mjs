/**
 * Turn the sweep into a per-body choice under two cost models, and write it as
 * raw/choice.json. Model F: float64 coefficients (candidate B). Model Q:
 * byte-aligned per-(component,index) quantisation (candidate D).
 *
 * Budget split: half the body's position budget to the fit, half to
 * quantisation. Both halves are checked again, densely and over every record,
 * at compile time -- this is only the search.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { BODY_SEGS, BUDGET_KM } from './sources.mjs';

const sweep = JSON.parse(readFileSync(new URL('./raw/sweep.json', import.meta.url), 'utf8'));

/** Width in bytes for a value range +/-M quantised with step q. 8 => float64 escape. */
export function widthFor(M, q) {
  if (M === 0) return 0;
  const levels = (2 * M) / q + 1;
  const bits = Math.log2(levels);
  if (bits <= 8) return 1;
  if (bits <= 16) return 2;
  if (bits <= 24) return 3;
  if (bits <= 32) return 4;
  if (bits <= 40) return 5;
  if (bits <= 48) return 6;
  return 8;
}

export function quantBytesPerRecord(envelope, ncoef, epsQ) {
  const q = (2 * epsQ) / ncoef;
  let b = 0;
  for (let c = 0; c < 3; c += 1) for (let k = 0; k < ncoef; k += 1) b += widthFor(envelope[c][k], q);
  return b;
}

const choice = {};
for (const body of BODY_SEGS) {
  const B = BUDGET_KM[body.name];
  const epsFit = 0.5 * B; const epsQ = 0.5 * B;
  const cells = sweep.cells.filter((c) => c.body === body.name && c.maxErrKm <= epsFit);
  let bestF = null; let bestQ = null;
  for (const c of cells) {
    const bytesF = c.nrec * c.ncoef * 3 * 8;
    const bytesQ = c.nrec * quantBytesPerRecord(c.envelope, c.ncoef, epsQ);
    if (!bestF || bytesF < bestF.bytes) bestF = { ...c, bytes: bytesF, envelope: undefined };
    if (!bestQ || bytesQ < bestQ.bytes) bestQ = { ...c, bytes: bytesQ, envelope: undefined };
  }
  choice[body.name] = { budgetKm: B, epsFit, epsQ, float64: bestF, quant: bestQ, candidates: cells.length };
}
writeFileSync(new URL('./raw/choice.json', import.meta.url), JSON.stringify(choice, null, 1));

let tf = 0; let tq = 0; let traw = 0;
const RAWB = { mercuryBary: 4822432, venusBary: 1753632, emb: 2246832, marsBary: 959032, jupiterBary: 712432, saturnBary: 630232, uranusBary: 548032, neptuneBary: 548032, plutoBary: 548032, sun: 1918032, moon: 8987232 };
for (const [n, v] of Object.entries(choice)) {
  tf += v.float64.bytes; tq += v.quant.bytes; traw += RAWB[n];
  console.log(n.padEnd(13), 'budget', String(v.budgetKm).padEnd(6),
    '| F', v.float64.frame, `L=${v.float64.Ldays}`, `n=${v.float64.ncoef}`, `err=${v.float64.maxErrKm.toExponential(2)}`, (v.float64.bytes / 1048576).toFixed(3) + 'MiB',
    '| Q', v.quant.frame, `L=${v.quant.Ldays}`, `n=${v.quant.ncoef}`, `err=${v.quant.maxErrKm.toExponential(2)}`, (v.quant.bytes / 1048576).toFixed(3) + 'MiB');
}
console.log('--- totals (11 fitted segments; Earth-399 derived, 199/299 exactly zero) ---');
console.log('raw   ', (traw / 1048576).toFixed(3), 'MiB');
console.log('modelF', (tf / 1048576).toFixed(3), 'MiB  ratio', (traw / tf).toFixed(2));
console.log('modelQ', (tq / 1048576).toFixed(3), 'MiB  ratio', (traw / tq).toFixed(2));
