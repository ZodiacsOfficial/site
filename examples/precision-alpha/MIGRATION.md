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
if (r.contract !== 'zodiacs-precision-search/2') throw new Error('unexpected contract');

// Always usable, whatever else is true:
for (const e of r.events) use(e.ttDays, e.bracketTtDays);

if (!r.execution.finished) {
  // budget-exhausted, cancelled or refused. r.events is what was found first.
}

if (r.completeness.established) {
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

## What did not change

The alpha's recorded evidence, its measurements, its receipts and the
archived JSON under `docs/platform/evidence/precision-2026-09-20/raw/` are
untouched and still describe what they described. `ACCEPTANCE.md` and its
verdicts stand. The Uranus D contract is unchanged. Where a recorded
document quotes a v1 field, it is quoting the run that produced it, and that
run is not being rewritten.
