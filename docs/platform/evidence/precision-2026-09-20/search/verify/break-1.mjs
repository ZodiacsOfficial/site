import { classifyInterval } from '../lib/interval-search.mjs';

// BREAK 1: a caller declares a derivative enclosure that is WRONG (too narrow).
// f has a sharp spike crossing zero twice; the caller claims |f'| <= 0.1.
const f = (t) => (t > 0.49 && t < 0.51) ? (1 - 4000*Math.abs(t-0.5)) : -1;
const r = classifyInterval({
  f, a: 0, b: 1, epsilon: 1e-6, minWidth: 1e-4,
  derivativeEnclosure: () => [-0.1, 0.1],       // a lie
  boundKind: 'proven',                            // the caller even claims PROVEN
  label: 'lying-enclosure',
});
console.log('verdict     :', r.verdict);
console.log('outcome     :', r.outcome);
console.log('rootCount   :', r.rootCount);
console.log('certified   :', r.certified);
console.log('boundKind   :', r.boundKind);
console.log('cellStatus  :', JSON.stringify(r.cellStatusCounts));
console.log('TRUTH: f has 2 roots near t=0.4998 and t=0.5002');
console.log('notes:', JSON.stringify(r.notes));
