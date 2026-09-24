# Review B — implementation, cache identity, resource accounting, consumer claims

Worktree: `partition-review-b` @ 09929f76. Left clean (`git status` empty).
Tier-A baseline before any change: 400/400 pass, 19.4 s. Synthetic fixture used for
every reproduction below so each one runs in seconds; the real pack was not needed to
produce any of them.

All reproduction scripts are in
a scratch directory on the reviewer's machine, not committed (see the integrator's note at the head of `REVIEW.md`)
(`e1-budget.mjs` … `e6.mjs`, `mutate.mjs`). They import the worktree's `src/` by
absolute path.

**Mutations run: 12. Caught by `npm test`: 3. Survived: 9.** Detail in finding MAJOR-6.

---

## BLOCKING

### B-1 A supplied plan's span lists are never validated. A plan that keeps the key and the window is believed wholesale, and the result then emits the maximal claim.

`examples/precision-alpha/src/core/partitioned-search.mjs:90-149` (`assertPartitionUsable`).
The function checks exactly four things: `plan.contract`, that `plan.request` is an
object, that `plan.key` equals a key rebuilt from the caller's values, and that
`plan.request.windowTdbSec` equals the caller's `[from, to]`. It never looks at
`plan.admissible`, `plan.excluded`, `plan.boundary` or `plan.unprocessed` — not for
tiling, not for disjointness, not for containment in the requested window, not against
`plan.request.identity`.

The comment at lines 128-133 states the opposite:

> *"A plan whose spans do not match its own key is not a plan this runtime produced,
> whatever key it carries. Cheap, and it catches a hand-edited or truncated import that
> kept the header."*

The only thing under that comment is the window-endpoint comparison. Nothing compares
spans to anything.

**Reproduction (`exp/e3.mjs`, section E).** Take an honest plan, keep `key`,
`contract` and `request` byte-for-byte, and replace the span lists:

```js
const forged = JSON.parse(JSON.stringify(honest));
forged.admissible = [[-DAY, DAY]];
forged.boundary = []; forged.excluded = []; forged.unprocessed = []; forged.boundaryReasons = [];
x.searchRetardedAberratedDeflectedOfDateOverPlan({ body:'Venus', targetDeg:0, fromTdbSec:-DAY, toTdbSec:DAY, plan: forged });
```

Output:

```
  accepted? yes. status finished
  completeness.overRequest            : true   <-- the honest run says false
  eventCount.isExactTotalOverRequest  : true
  exhaustiveOverAdmissible            : true
  mayHoldUnfoundSupportedEvents       : false
  events 3 all eligibility= [ 'established' ]
  statement: Every crossing of the requested longitude by the light-time-, solar-deflection- ...
```

The honest plan for that identical request leaves three boundary spans totalling
0.1294 d and yields `overRequest: false`, `mayHoldUnfoundSupportedEvents: true`. The
forged plan turns every hedge in the contract off at once, and the three crossings are
labelled `eligibility: 'established'` with
`positionFrom: 'validated-retarded-aberrated-deflected-of-date'` — i.e. the deflected
rung ran with the domain gate disabled (`control: { domainProvedByCaller: true }`,
`src/core/retarded-search.mjs:1559-1569`) on spans nothing proved admissible. That
comment at `retarded-search.mjs:1576-1580` is explicit that `domainProvedByCaller`
"is only sound with a proof in hand"; here there is no proof, only a header.

**Second reproduction (`exp/e3.mjs`, section F): a plan whose spans leave the request.**

```js
out.admissible = [[-3 * DAY, 3 * DAY]];   // request is -1 d .. +1 d
```

```
  accepted. status finished events 9
  event times (d): -2.8000 -2.1000 -1.4000 -0.7000 0.0000 0.7000 1.4000 2.1000 2.8000
  accounting.admissibleSec (d): 6   requestSec (d): 2
```

`result.request.windowTdbSec` still reads `[-86400, 86400]` while `result.events`
carries six crossings outside it. Nothing clamps plan spans to `[a, b]`.

**Why it matters.** The whole value proposition is "plan once, search many", which means
plans live somewhere — a cache, a file, a worker message, a JSON column. The key is a
non-cryptographic FNV pair (`domain-partition.mjs:202-213`, and its own docstring says so)
*and* it is recomputed locally from the live pack, so reproducing a valid key costs one
function call; there is no signature and no cross-check. Any round-trip that alters the
span arrays while preserving the header — a partial write, a schema change that drops
`boundary`, a compaction that keeps only `admissible` — is accepted and converted into
the strongest claim the contract can make. This is precisely "an over-claim a consumer
would act on".

I am not claiming this is reachable from the in-repo code paths alone: `partitionDomain`
never produces such a plan. The finding is that the boundary between "a proof" and "a
JSON object shaped like one" is a 16-character non-cryptographic hash plus two number
comparisons, under a comment asserting a span check that does not exist.

---

## MAJOR

### MAJOR-1 `partitionKey` omits `maxEvaluations` and `maxCells`, which change the plan. The docstring says it omits nothing that does.

`src/core/domain-partition.mjs:143-171`. The key carries contract id, profile, pack
digest, pack structure, observer, body, `'tdb'`, window, `boundaryToleranceSec`,
`relightWidthRatio`, `maxTauWidenings`, `tauPadFloorSec`. It does not carry
`maxEvaluations`, `maxCells`, or any record of whether the partition ran to completion.
Those three determine which spans end up `unprocessed` instead of classified — i.e. they
change the plan's span lists.

The docstring above it (`:132-142`) says *"Everything here changes what the answer MEANS"*
and `partitionDomain`'s `identity` comment (`:431-434`) says *"It names everything that
changes the answer"*. Both are false as stated.

**Reproduction (`exp/e4.mjs`, section H):**

```
  starved.execution.status : budget-exhausted   unprocessed spans: 1
  keys identical?          : true
  accepted. run execution.status = finished  finished = true
  plan.execution.status inside result = budget-exhausted
  unprocessedSec(d) = 1.9375   overRequest = false   mayHold = true
  exhaustiveOverAdmissible = true   isExactTotalOverAdmissible = true   events = 0
```

A plan built with `maxEvaluations: 100` (0.0625 d classified, 1.9375 d never examined)
has a key identical to the full plan's, so a cache keyed on `partitionKey` returns it for
a request with a 10,000,000 budget. The run reports `execution.status: 'finished'`,
`execution.finished: true`, `exhaustiveOverAdmissible: true`,
`isExactTotalOverAdmissible: true` and **zero events**, where the same request with the
full plan returns three. `mayHoldUnfoundSupportedEvents: true` and `unprocessedSec` are
the only things that stop this being a silent zero.

`assertPartitionUsable` never consults `plan.execution.status` either, so a plan that was
*cancelled* mid-partition is equally reusable.

### MAJOR-2 The four classes do not tile the request at any starved or cancelled budget, and `coversRequestExactly` is computed from a different quantity than the one it appears to check.

`src/core/partitioned-search.mjs`:

* `:397` `const unprocessedTotal = total(unprocessed);` — `unprocessed` is
  `[...plan.unprocessed]` **plus** every span `runOn` skipped (`:238`, `:242`, `:296`).
* `:515-517` `coversRequestExactly: Math.abs(total(plan.admissible) + excludedTotal +
  boundaryTotal + total(plan.unprocessed) - requestSpan) <= 1e-6` — uses
  `plan.unprocessed`, **not** the accumulated `unprocessed` that `unprocessedSec` reports.

So the reported figures double-count: a span that is admissible-but-never-examined is
counted in `admissibleSec` and again in `unprocessedSec`, while the flag that claims the
tiling holds quietly leaves it out.

**Reproduction (`exp/e1-budget.mjs`, sweep; `exp/e2.mjs` section A).** 2.000000-day request:

```
 budget | status           | admSec+excSec+bndSec+unpSec vs requestSec | coversRequestExactly
   5305 | budget-exhausted | 4.000000 vs 2.000000  MISMATCH            | true
   4000 | budget-exhausted | 3.568848 vs 2.000000  MISMATCH            | true
   2000 | budget-exhausted | 2.857422 vs 2.000000  MISMATCH            | true
```

and the span lists themselves overlap:

```
admissibleSpans        : -1.0000..-0.8315 -0.7891..-0.1304 -0.0879..0.5698 0.6143..1.0000
accounting.unprocessed : -1.0000..-0.8315 -0.7891..-0.1304 -0.0879..0.5698 0.6143..1.0000
                         -0.8315..-0.7891 -0.1304..-0.0879 0.5698..0.6143
admSec 1.8706  excSec 0  bndSec 0.1294  unpSec 2.0  requestSec 2.0
coversRequestExactly   : true
```

Every instant of the request is reported twice, and the flag says the classes tile
exactly. The same happens on cancellation at the subsearch stage (`exp/e2.mjs` section D:
`unpSec 1.83 d`, `admSec 1.87 d`, `covers = true`).

The plan itself is fine — `partitionDomain`'s four lists do tile at every budget I tried,
including cancellation (`exp/e2.mjs` section C). The defect is entirely in the search
result's `accounting`.

Affected claims elsewhere:
* `types/experimental.d.ts:216` — *"The four classes tile the request. Checked, not assumed."*
* `src/core/partitioned-search.mjs:509-513` — *"The four classes tile the request exactly.
  Checked here rather than trusted: a gap or an overlap would mean some instant was counted
  twice or not at all, and either makes every span figure below meaningless."* The overlap
  is exactly what happens, and the check does not see it.
* `tools/consumer/clean-consumer.mjs:318` asserts the flag and prints *"the four classes do
  not tile the request"* as its failure text — on a finished run only, so it never exercises this.
* `tools/measure/partition-evaluation.mjs:86-89` buckets cases with
  `row.partition.unprocessedSec > 0` ⇒ `conjunction-heavy`, using the inflated figure.

No completeness flag becomes wrongly true because of this (`overRequest`,
`exhaustiveOverAdmissible`, `isExactTotal*` are all false in every starved run in the
sweep), so it is a misreport of state and cost, not a wrong event answer.

### MAJOR-3 A published P-6 check in the evaluation harness can never fail.

`tools/measure/partition-evaluation.mjs:293`:

```js
claimsNoExhaustivenessWithLiveBoundary:
  !(part.completeness.exhaustiveOverAdmissible && part.completeness.mayHoldUnfoundSupportedEvents === undefined),
```

`mayHoldUnfoundSupportedEvents` is assigned a boolean on every path
(`partitioned-search.mjs:495-498`); I observed it as `true`/`false` in every run above and
never as `undefined`. So the inner conjunction is always `false` and the field is always
`true`. It is written into `report.cases[].p6` for every case, under a name that reads as
a P-6 criterion, and it cannot detect anything.

The aggregate that *is* scored (`:455`) is a different and genuine expression:
`!(exhaustiveOverAdmissible && boundarySec > 0 && mayHoldUnfoundSupportedEvents !== true)`.
So P-6's gate is sound; the per-case evidence field beside it is theatre. Severity MAJOR
because it ships in the evidence JSON as a check.

### MAJOR-4 P-7's pass is scored on the baseline's completeness score, not the partitioned path's.

`tools/measure/partition-evaluation.mjs:463-474`:

```js
const originalScore   = live.filter((r) => r.baseline.established).length;
const partitionScore  = live.filter((r) => r.partition.overRequest).length;
...
  agree: originalScore === partitionScore,
  pass: LABEL === 'regression' && !ONE ? originalScore === P7_ORIGINAL_SCORE : null,
```

`P7_ORIGINAL_SCORE` is 6. `r.baseline` comes from `searchDeflectedLongitude`
(`:176-177`), the unpartitioned rung. `partitionScore` and `agree` are computed, emitted, and
then **not used by `pass`**.

`PARTITION-EVALUATION.md` §6 P-7 reads: *"The full-window completeness score is recomputed
by the ORIGINAL rule, over the SAME twenty cases, and reported beside the new metric. If it
is not still 6 of 20, that is a regression and is reported as one."* The regression it is
guarding against is the partitioned path scoring worse by the original rule. As written,
the partitioned path could score 5 of 20 — `agree: false`, `disagreements` populated — and
`P7.pass` would still be `true`, and `verdict.summary` would still read `PASS`.

I did not run the full 20-case harness (a full run re-runs two 4,000,000-evaluation Moon
baselines plus the `repeated` block's 40 further baseline searches — tens of minutes), and
`--case` sets `P7.pass` to `null`, so I cannot show the flip empirically. The conclusion
is forced by the expression: `P7.pass` is a pure function of `rows[].baseline.established`,
and nothing the partitioned path does enters it.

### MAJOR-5 The README cites a results document that does not exist and quotes figures nothing in the repo supports.

`examples/precision-alpha/README.md:256-261`:

> *"Measured on twenty 300-day windows: the two Moon cases go from spending the whole
> four-million-evaluation budget without finishing to finishing inside it; Mercury costs
> 9.2× less; the conjunction-free controls cost about 3 per cent more. One repeated
> longitude query already pays for the plan on every conjunction case.
> `PARTITION-RESULTS.md` has the numbers, including the two targets it did not meet."*

```
$ find . -name 'PARTITION-RESULTS*'      # nothing
$ git log -S 'PARTITION-RESULTS.md' --oneline
09929f76 Check the two domain implementations against each other, and fix a bucketing
```

The reference is introduced by HEAD and the file has never existed. Nor is there any
recorded run to check the figures against: `docs/platform/evidence/precision-partition/`
holds `baseline/cost-baseline.json`, `knobs/knob-sweep.json`,
`consumer/clean-consumer.json` and the `cross-runtime/` set — no `partition-evaluation`
output and no `domain-agreement` output, although both tools were added on this branch and
`domain-agreement.mjs` exits non-zero on failure. Five quantitative claims ("9.2×", "about
3 per cent", "the two Moon cases … finishing inside it", "one repeated query pays for the
plan", "the two targets it did not meet") are unverifiable from the repository, and the
document a reader is sent to for them is absent.

(I did verify `consumer/clean-consumer.json` against a live run of
`tools/consumer/clean-consumer.mjs`: it reproduces — same `planEvaluations: 5305`,
`identityStrength: "structure-only"`, `admissible: 4`, `boundary: 3`, `passed: true`.)

### MAJOR-6 Mutation results: 9 of 12 mutations to the new code survive tier-A.

`exp/mutate.mjs` applies one edit, runs `npm test` (the full 400-test tier-A suite),
restores with `git checkout --`, and repeats.

| | mutation | result |
| --- | --- | --- |
| M1 | `partitionKey` drops `boundaryToleranceSec` | **CAUGHT** (`the key changes when the question changes`) |
| M2 | `assertPartitionUsable` takes `boundaryToleranceSec` from `plan.request` instead of the caller | **SURVIVED** |
| M3 | `boundary` verdict promoted to `admissible` in `classifyCell` | **CAUGHT** (2 tests) |
| M4 | in-flight cell dropped from `unprocessed` on abort | **CAUGHT** (`a cancelled run reports what it never examined…`) |
| M5 | `exhaustiveOverAdmissible` drops the `status === 'finished'` conjunct | **SURVIVED** |
| M6 | `completeOverRequest` drops `unprocessedTotal === 0` | **SURVIVED** |
| M7 | a budget-starved span pushed to `plan.excluded` instead of `unprocessed` | **SURVIVED** |
| M8 | partition `spend()` stops enforcing `maxEvaluations` | **SURVIVED** |
| M9 | `packFingerprint` drops `provenPosKm`/`provenVelKmS` | **SURVIVED** |
| M10 | boundary-span events claim `eligibility: 'established'` | **SURVIVED** |
| M11 | `meets()` → `() => false` (bracket/boundary overlap never fires) | **SURVIVED** |
| M12 | boundary spans searched with the DEFLECTED rung instead of rung 4 | **SURVIVED** |

M2 is the one worth singling out. `partitioned-search.mjs:110-120` describes that exact
circularity as a bug that was found and fixed — *"The first version of this function took
the boundary tolerance out of `plan.request` and then checked that the key matched — which
it always did… A caller asking for a 5-second tolerance and handed a 60-second plan was told
nothing."* Reintroducing it verbatim is caught by nothing.

M5/M6/M7 are the five-state guarantees this review is about: a run that did not finish can
claim exhaustiveness, a run with unprocessed time can claim completeness over the request,
and unexamined time can be reported as *excluded* — none detected.

M10/M11/M12 are the eligibility labelling: boundary-span crossings can claim established
eligibility, and the rung used to locate them can be swapped while `positionFrom` keeps
saying rung 4, with no test objecting.

(Caveat on M8: with the mutation the partition simply runs to completion inside the
default budget on the fixture, so a test would have to starve it deliberately. That is the
point — none does.)

---

## MINOR

* **m-1 `execution.evaluations` exceeds `maxEvaluations` by one.** `spend()` increments then
  tests (`domain-partition.mjs:525-531`). `exp/e1-budget.mjs`: budget 1 → 2 evaluations;
  budget 10 → 11; budget 5306 → 5307. Same for cells: budget 1 → 2 cells
  (`exp/e2.mjs` section B). The convention is visible in `PARTITION-EVALUATION.md` §1
  ("4,000,001 (exhausted)"), so it is house style rather than a surprise — but a consumer
  asserting `evaluations <= maxEvaluations` fails, and `P1.pass` in the harness asserts
  exactly that (it is saved only by also requiring `status === 'finished'`).
  `partitionEvaluations + searchEvaluations === evaluations` reconciled at every budget in
  the sweep.
* **m-2 `execution.finished` describes only the subsearch phase when a plan is supplied.**
  `exp/e4.mjs` section H: a run over a `budget-exhausted` plan reports
  `execution.status: 'finished'`, `finished: true`. The plan's own status is preserved at
  `result.plan.execution.status`, so the information is there, but the top-level field is
  the one a consumer branches on.
* **m-3 The result's `request.boundaryToleranceSec` is taken from the plan, not the caller.**
  `partitioned-search.mjs:445`. `exp/e3.mjs` section G: a plan with
  `request.boundaryToleranceSec` edited to `5` (key untouched) is accepted and the result
  reports `request.boundaryToleranceSec: 5`. This is the only value from the plan that still
  flows into the result's statement of what was asked — the key check itself is clean.
* **m-4 `eligibility: 'boundary-ambiguous'` is undeclared, and appears to be unreachable.**
  Emitted at `partitioned-search.mjs:388`. It is absent from the `.d.ts` union
  (`types/experimental.d.ts:164`, `'established' | 'not-established'`), from
  `EXPERIMENTAL.partitioned.migration.newPerEventFields`
  (`src/experimental.mjs:148`, *"eligibility: established | not-established"*) and from the
  README. It also never fired: `exp/e6.mjs` ran 360 longitudes, 1029 events, and found
  **0** admissible-span events whose bracket strictly overlaps a boundary span, and 0
  brackets outside their own span. That is structural, not luck — `plan.admissible` and
  `plan.boundary` are disjoint (they share only endpoints) and a subsearch over `[lo, hi]`
  returns brackets inside `[lo, hi]`, while `meets` (`:76`) requires strict overlap. So the
  downgrade is a safety net that cannot trigger for an honest plan, and its value is
  undocumented if it ever does. Report it, do not rely on it.
* **m-5 `.d.ts` vs runtime shape.** `PartitionedSearchResult.execution`
  (`types/experimental.d.ts:228-241`) has no index signature and omits `budgetNote`, which
  the runtime returns (`partitioned-search.mjs:545`). `accounting` and the other members do
  carry index signatures, so their extra `*Note` fields are fine. Otherwise the two agree:
  I checked every field of a live result against the interface.
* **m-6 A key element that cannot change the plan:** the literal `'tdb'`
  (`domain-partition.mjs:157`). Harmless forward-compatibility marker; named because you
  asked for it. Every other key element does change the plan.
* **m-7 Harness bucketing reads the inflated figure.** `partition-evaluation.mjs:86-89`
  classes a case `conjunction-heavy` when `unprocessedSec > 0`, which is MAJOR-2's
  double-counted total, so a case whose *subsearch* was starved is filed as
  conjunction-heavy and scored against P-4 rather than P-5. At a 4,000,000 budget this is
  unlikely to fire; it is a latent coupling, not an observed miscount.

---

## NOT-A-FINDING (checked, and clean)

* **Cancellation.** `signal` abort produces a RESULT, never a throw, at both stages
  (`exp/e2.mjs` sections C and D). Partition stage: `status: 'cancelled'`, whole 2 d
  request in `plan.unprocessed`, `excludedSec: 0`, `admissibleSec: 0`,
  `exhaustiveOverAdmissible: false`. Subsearch stage: `status: 'cancelled'`,
  `reason: 'the search was cancelled'`, unexamined spans in `unprocessed`,
  `excludedSec: 0`. The unexamined part is never reported as excluded on any path I could
  construct. (M4 and M7 show this is under-tested, not that it is wrong.)
* **Core purity.** `domain-partition.mjs`, `partitioned-search.mjs` and `instrument.mjs`
  contain no `process.`, `Date.now`, `new Date`, `require(`, `node:` import,
  `Math.random`, `fetch`, `performance.` or storage access outside comments — which
  `core-purity.nodetest.mjs` strips before testing anyway. `instrument.mjs` takes `now()`
  from the injected sink (`:63-72`) and is a no-op with no sink installed. No I/O, no
  network, no persistence, no clock.
* **`assertPartitionUsable` key check is not circular.** Every key component is taken from
  the caller's arguments or recomputed from the live `eph` (`:118-134`). The only plan-derived
  value used anywhere in the function is `plan.request.windowTdbSec`, and it is *compared to*
  the caller's window rather than substituted for it. (The circularity that remains is m-3,
  in the result's `request`, not in the check.)
* **`packFingerprint` is honest.** `domain-partition.mjs:178-201`: observer, EMRAT, and per
  body `initEt, intervalSec, nrec, ncoef, provenPosKm, provenVelKmS`. Its docstring states
  the limit plainly — two packs with the same layout and the same proven bounds but different
  coefficients collide — and `identityStrength: 'structure-only'` records it when no digest
  was supplied. `fingerprint()`'s docstring says outright that it is not cryptographic and
  is collidable. No over-claim. (It is untested: M9 survived.)
* **`spend()` really is one Chebyshev (series × record) evaluation.** `retarded.mjs:129`
  calls `spend()` once per weight-series per record sub-window and nowhere else; `charge()`
  mirrors it into the instrument sink. Frame rotation, nutation, aberration and the
  deflection arithmetic call neither, so they are budget-invisible, as claimed.
  **Is it a fair cost proxy?** Not a uniform one. Measured (`exp/e5.mjs`, 5 runs each,
  same fixture and window): the partition spends 5,305 evaluations in 23.35 ms
  (4,402 ns/evaluation); a warm subsearch spends 3,370 in 28.03 ms (8,318 ns/evaluation)
  — **1.89× more wall time per evaluation**. So a single `maxEvaluations` allowance buys
  roughly twice as much real work when spent on partitioning as when spent on searching,
  and `partitionEvaluations + searchEvaluations` adds two different units. The bias runs
  *against* the partitioned path in P-4/P-5 (its cheap evaluations are counted at the same
  rate as the baseline's expensive ones), so it does not flatter the result — which is why
  I am filing this as an observation rather than a finding. `PARTITION-EVALUATION.md` §5
  already says wall time is reported beside and is secondary.
* **Cell budget.** Shared the same way, with the same off-by-one (m-1). The
  `Math.max(1, maxCells - cellsUsed)` floor at `partitioned-search.mjs:289` does let a
  subsearch start with a nominal budget of 1 after the allowance is gone, but that
  subsearch throws `budget-exhausted` immediately, sets `status`, and every later span goes
  to `unprocessed`, so the overshoot is bounded at one cell (`exp/e2.mjs` section B:
  overshoot is exactly 1 at maxCells 1, 5, 50, 200, 1000).
* **No expensive work escapes the counter in the added code.** Every enclosure in
  `classifyCell` and `deriveLightTime` goes through `stateEnclosure(..., spend)` or
  `solveTau(..., spend)`. The interval arithmetic on top of them is O(1) per cell.
* **`...rest` pass-through is validated.** `exp/e4.mjs` section J: an unknown spec key is
  refused (`unknown retarded-search option thisOptionDoesNotExist`) once a subsearch runs.
* **The deflector-as-target shortcut.** `exp/e4.mjs` section L: a Sun plan returns the whole
  window admissible for 0 evaluations with `diagnostics.deflectorIsTarget: true` and a
  stated reason, and the search then reports `overRequest: true`. That is the profile's own
  documented exception (`DEFLECTION-PROFILE.md` via `domain-partition.mjs:457-478`), and
  the shortcut is about the domain only — coverage is still answered by the subsearch. Correct.
* **`domain-agreement.mjs`'s containment test is a real test, with a caveat.** Both relations
  are genuine interval arithmetic over `overlap()` (`:76-118`), with a 1 µs edge tolerance
  well below the 60 s knob, and `search.interval.decidedTdbSec` does exist
  (`retarded-search.mjs:1203`), so relation 1's "inside a span the search DECIDED" arm is
  not vacuous by construction. It *can* pass vacuously if `plan.excluded` and
  `search.accounting.excluded` are both empty on every case — the tool reports
  `casesWithSearchExclusions` and `casesWithPartitionExclusions` in its summary, which is the
  honest thing to do, but with no committed run (MAJOR-5) there is no way to check from the
  repo how many cases actually exercised it. I did not run it: it re-runs ten
  4,000,000-budget baseline searches.
* **Example 06 and the clean consumer print what the code returns.** Both run clean on the
  synthetic fixture. Every printed value I spot-checked against the live object matched,
  including the refusal path (`unsupported-option`) and `partitionEvaluations: 0` on a
  reused plan. Both exercise the happy path only: a finished run, no starvation, no
  cancellation, and `eligibilities: ['established']` — so neither would have caught
  MAJOR-2, and `clean-consumer.mjs:318` asserts the flag from MAJOR-2 rather than the sums.
* **The migration note's field mapping is accurate** apart from m-4:
  `completeness.established → completeness.overRequest` really is the same shape of claim
  (both require finished, nothing unresolved, nothing excluded), and
  `interval.decidedTdbSec → completeness.admissibleSpans` with boundary called out as
  neither decided nor excluded is right.
* **The profile floor is pinned to the profile id.** I suspected the key's use of
  `DEFLECTION_PROFILE.id` alone could let the 5-degree floor move without invalidating
  cached plans; `test/tier-a/deflection.nodetest.mjs:674-676` asserts the id and
  `minElongationDeg: 5` together, so that is covered. **Withdrawn.**

---

## Answers to the six questions, in one line each

1. **Cache identity.** Not complete: `maxEvaluations`/`maxCells`/completion status change
   the plan and are not in the key (MAJOR-1). One dead element (`'tdb'`, m-6). The key check
   is not circular; the result's `request.boundaryToleranceSec` still is (m-3). A hand-edited
   plan gets through completely (B-1). `packFingerprint` is honest about what it cannot see.
2. **Resource accounting.** One budget, never reset, reconciles
   (`partitionEvaluations + searchEvaluations === evaluations` at every budget tested), but
   overshoots by exactly one evaluation and one cell (m-1). `spend()` is one Chebyshev
   evaluation as claimed; frame/deflection/aberration are budget-invisible, and an
   evaluation costs 1.89× more inside a subsearch than inside the partition, so the counter
   is not a uniform cost unit — biased against the partitioned path, not for it.
3. **The five states.** They tile at the plan level at every budget and on cancellation;
   they do **not** tile in the search result's `accounting`, which double-counts by up to
   100 % of the request while `coversRequestExactly` reports true (MAJOR-2). I could not
   make `overRequest`, `exhaustiveOverAdmissible`, `mayHoldUnfoundSupportedEvents`,
   `isExactTotalOverRequest` or `isExactTotalOverAdmissible` wrongly true from an
   honest plan at any budget, under cancellation, or with a starved subsearch — only from a
   supplied plan (B-1, MAJOR-1).
4. **Consumer claims.** `PARTITION-RESULTS.md` does not exist and its figures are
   unsupported in-repo (MAJOR-5); the `.d.ts` eligibility union and the migration note omit
   `'boundary-ambiguous'` (m-4); `execution.budgetNote` is missing from the `.d.ts` (m-5);
   the "four classes tile the request, checked not assumed" claim appears in three places and
   is not true when starved (MAJOR-2). Everything example 06 and the clean consumer print
   matches what the code returns.
5. **The measurement harness.** P-1…P-5 implement the document faithfully, including the
   honest annotations about truncated baselines and the bucketing fix. Two defects: a P-6
   evidence field that cannot fail (MAJOR-3), and P-7 scored on the baseline's score rather
   than the partitioned path's, so the 6-of-20 regression it exists to catch cannot fail it
   (MAJOR-4). `domain-agreement.mjs`'s containment is real arithmetic, not vacuous by
   construction, but unverified by any committed run.
6. **Cancellation and hygiene.** Both clean. Result, not throw, at both stages; unexamined
   time is `unprocessed`, never `excluded`; no I/O, network, persistence or clock in
   `src/core/`.
