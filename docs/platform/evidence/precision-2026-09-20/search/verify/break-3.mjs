import { classifyInterval } from '../lib/interval-search.mjs';
// BREAK 3: EVERY DECLARED ENCLOSURE IS TRUE. exactArithmetic is honestly declared
// (an exact polynomial). Yet the search certifies `stationary-touch` with rootCount 1
// where the truth is TWO transversal roots (t=0 and t=0.5).
const f = (t) => t * (t - 0.5);          // roots 0 and 0.5; f'' = 2 everywhere
const r = classifyInterval({
  f,
  a: -1, b: 1,
  epsilon: 0,
  minWidth: 2,                            // the whole interval is one floor cell
  derivativeEnclosure: () => [-10, 10],   // TRUE: f' = 2t-0.5 in [-2.5, 1.5]
  secondDerivativeEnclosure: () => [2, 2],// TRUE and exact
  exactArithmetic: true,                  // honest: exact polynomial arithmetic
  boundKind: 'proven',
  label: 'false-tangency',
});
console.log('verdict           :', r.verdict);
console.log('outcome           :', r.outcome);
console.log('rootCount         :', r.rootCount);
console.log('possibleRootCounts:', JSON.stringify(r.possibleRootCounts));
console.log('certified         :', r.certified, '| complete:', r.complete);
console.log('crossings         :', JSON.stringify(r.crossings));
console.log('TRUTH             : 2 transversal roots at t=0 and t=0.5, no tangency anywhere');
console.log('notes             :', JSON.stringify(r.notes, null, 1));
