# Migrating from the alpha search result (v1) to the preview contract (v2)

The alpha's search returned an object with an `isolation` block carrying
`certified` and `complete` booleans. Those are gone. This is not a rename:
the v1 booleans said more than the method could support, and a consumer that
branched on them got an unconditional answer built on an unverified
assumption.

## Why

`certified: true, complete: true` came from derivative bounds that were
maxima sampled on a grid and multiplied by a safety factor. The result
carried a sentence explaining that. The sentence did not undo the Boolean.

Measured, against the alpha at `542c0e72`:

| case | truth | v1 returned |
| --- | --- | --- |
| an angle making 96 turns across the 96 default sampling intervals | 96 crossings | `no-crossing`, `certified: true`, count 0 |
| the same at 95 turns | 95 crossings | `crossing`, `certified: true`, count 1 |

Both are now in `test/tier-a/angle-counterexamples.nodetest.mjs`, and both
now return every event.

## The field map

| v1 | v2 | note |
| --- | --- | --- |
| `candidates` | `events` | same shape, same brackets |
| `isolation.certified` | **withdrawn** | nearest honest reading: `accounting.allIntervalsAccountedFor && completeness.support === 'conditional'`. That is a conditional claim, and the conditions are listed |
| `isolation.complete` | **withdrawn** | see `completeness.established`, which the empirical mode never sets |
| `isolation.verdict` | **withdrawn** | a single word cannot carry this. Read `eventCount.found`, `completeness.support` and `accounting.unresolved` |
| `isolation.outcome` | `execution.status` | and `execution.status === 'finished'` now means the run finished, nothing more |
| `isolation.rootCount` | `eventCount.conditionalTotal` | null unless `eventCount.support === 'conditional'`. There is no exact total without established completeness |
| `isolation.possibleRootCounts` | `eventCount.conditionalPossibleTotals` | |
| `isolation.support` | `completeness.support` | values changed: `'none'`, `'conditional'`, `'proven'` |
| `isolation.declaredBounds` | `diagnostics.declaredBounds` | and each is also an entry in `assumptions` |
| `isolation.branches` | `diagnostics.branches` | |
| `isolation.meaning` | `completeness.statement` | |
| `unresolved` | `accounting.unresolved` | |
| `budget.evaluations` | `execution.evaluations` | |
| `budget.exhausted` | `execution.status === 'budget-exhausted'` | |
| `externalUncertainty` | `uncertainty.model`, `uncertainty.physical` | split, because they are different questions |
| — | `contract` | `'zodiacs-precision-search/2'`. Branch on this |
| — | `assumptions` | every unverified thing by name, with what would settle it |
| — | `interval.processedTtDays` | what was actually decided, against what was requested |
| — | `diagnostics.aliasing` | the implied angular travel between samples, and whether it forced refinement |

## What a consumer should do

```js
import { isProven } from '@zodiacs/precision-alpha';

if (r.contract !== 'zodiacs-precision-search/2') throw new Error('unexpected contract');

// Always usable, whatever else is true:
for (const e of r.events) use(e.ttDays, e.bracketTtDays);

if (!r.execution.finished) {
  // budget-exhausted, cancelled or refused. r.events is what was found first.
}

if (isProven(r)) {
  // Only the validated geometric mode reaches this, and only from bounds
  // that are true of the pack's polynomial by construction.
  const total = r.eventCount.found;         // exact
} else if (r.completeness.support === 'conditional') {
  // A total is offered, and it holds only if r.completeness.conditionalOn
  // all hold. Show them, or do not use the total.
} else {
  // Nothing was established. r.accounting.unresolved says where.
}
```

### Use the guard, not the nested boolean

`isProven(r)`, `isUnproven(r)` and `isFinished(r)` are exported, and in
TypeScript they are the narrowing. `if (r.completeness.established)` is
true at runtime and narrows **nothing** at compile time -- TypeScript
discriminates a union on a direct property, not on a nested one, so
`r.eventCount.isExactTotal` stays `boolean` inside that branch and the
type-level guarantee the two result shapes are meant to give you is not
there. This was measured against a consumer compiled from the archive, not
assumed. In plain JavaScript either form works; the guard reads better in
both.

## A behaviour change, not just a field change: cancellation

**In the alpha, cancelling a search threw.** `PrecisionError` with code
`cancelled`, the evaluation count on `error.detail`, and every event the
run had already isolated discarded with the stack.

**In v2 it returns a result.** `cancelled` is one of the four execution
states the contract names, and a state nothing can produce is a lie about
the contract. So:

```js
// v1
try {
  r = rt.search({ ...spec, signal });
} catch (error) {
  if (error.code === 'cancelled') showPartial(error.detail.evaluations);
  else throw error;
}

// v2 -- no catch. The cancel IS the result.
const r = rt.search({ ...spec, signal });
if (r.execution.status === 'cancelled') showPartial(r.events, r.accounting.unresolved);
```

A cancelled result always has `finished: false`, `established: false`,
`support: 'none'` and `isExactTotal: false`: a run that stopped early
cannot have accounted for what it did not reach. The **validated geometric**
mode carries out the events it had already isolated; the **empirical** mode
still reports zero on this path, because it reports through the
empty-result shape, and that limitation is stated in
`EVALUATION-RESULTS.md` rather than papered over.

Code that catches `cancelled` still compiles and simply never fires. Code
that relied on the throw to skip its result handling needs the branch
above. A `budget-exhausted` run behaved this way in the alpha already and
is unchanged.

## What did not change

The alpha's recorded evidence, its measurements, its receipts and the
archived JSON under `docs/platform/evidence/precision-2026-09-20/raw/` are
untouched and still describe what they described. `ACCEPTANCE.md` and its
verdicts stand. The Uranus D contract is unchanged. Where a recorded
document quotes a v1 field, it is quoting the run that produced it, and that
run is not being rewritten.
