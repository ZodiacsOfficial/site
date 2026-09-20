import { classifyInterval } from '../lib/interval-search.mjs';
// BREAK 2: the declared enclosure is refuted BY THE SEARCH'S OWN TWO SAMPLES.
// f goes from -5 to +5 over [0,1] (mean slope 10) but the caller declares f' in [-0.1,0.1].
// The mean-value enclosure from the two ends is then EMPTY -- a detectable contradiction.
const f = (t) => 10*t - 5;
const r = classifyInterval({
  f, a: 0, b: 1, epsilon: 1e-9, minWidth: 1e-6,
  derivativeEnclosure: () => [-0.1, 0.1],
  boundKind: 'proven', label: 'self-refuting-enclosure',
});
console.log('verdict   :', r.verdict, '| outcome:', r.outcome, '| rootCount:', r.rootCount);
console.log('cells     :', JSON.stringify(r.cellStatusCounts), 'evals', r.evaluations);
console.log('endpoints :', JSON.stringify(r.endpointValues));
console.log('TRUTH: exactly 1 root at t=0.5; the declared enclosure is refuted by f(0)=-5, f(1)=+5.');
console.log('crossings :', JSON.stringify(r.crossings));
