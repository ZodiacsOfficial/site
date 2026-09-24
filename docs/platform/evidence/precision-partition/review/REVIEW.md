# The two bounded reviews of the partition work

**Both reviewers were AI.** Two Claude subagents, run once each, in their
own git worktrees at `09929f76`, against the domain partition and the
search built on it. No human read this branch. That is what the brief
allowed — one integrator and at most two bounded reviewers — and it is
recorded plainly so nobody later reads "reviewed" as "reviewed by a
person".

**Isolation was the point.** The previous review on this project produced
false reports of flaky behaviour because two reviewers mutated the same
source. This time each had a worktree of its own and was told, in those
words, never to touch a sibling directory. Both left their trees clean,
and reviewer A recorded that it declined to run `git checkout --` on a file
the integrator had uncommitted work in.

**A test does not establish a theorem, and neither do these.** What the
two establish is that two independent readings, each with a bounded remit
and each running the code, found what is below and nothing worse. They
found the same most-serious defect from opposite ends — one from the
mathematics, one from the cache — which is the argument for having two.

The reports are here verbatim:
`reviewer-a-domain-mathematics.md` and `reviewer-b-implementation.md`. One
absolute scratch path in reviewer B's report was replaced with a
description; nothing else in either was edited.

## Scope, fixed before either ran

| | remit | explicitly out of scope |
| --- | --- | --- |
| **A** | domain mathematics, conservative boundaries, adversarial cases | implementation style, packaging, the consumer surface |
| **B** | implementation, cache identity, resource accounting, consumer claims | the mathematics of the domain test itself |

Both were told to demonstrate rather than argue, to report a mutation
count, and to withdraw a finding that did not survive closer inspection
rather than soften it. Both did withdraw findings; those withdrawals are
in the reports.

## What they found together

Reviewer A ran 16 mutations and caught 8. Reviewer B ran 12 and caught 3.
Neither reviewed the other's remit, and the overlap is one finding.

### The one that mattered

**A supplied plan was believed on the strength of its header.**
`assertPartitionUsable` carried a comment saying it caught "a hand-edited
or truncated import that kept the header". The only thing under that
comment was a window comparison; nothing looked at the span lists.

Reviewer B replaced `admissible` with the whole window, keeping `key`,
`contract` and `request` byte-for-byte, and got `overRequest: true`,
`mayHoldUnfoundSupportedEvents: false`, and three crossings labelled
`eligibility: 'established'`. Reviewer A did the same from the other
direction and drove it further: an event reported at **4.4958 degrees**
elongation — inside the five-degree floor — labelled `established`,
because `runOn` dispatches an admissible span to the search with
`domainProvedByCaller: true`, which disables the gate. Reviewer A's note
on why: the soundness argument for that flag is valid, and it fails at its
premise, because the span handed to the search was never proved.

**Fixed.** A plan this runtime derived is recognised by identity —
membership of a `WeakSet`, which does not survive serialization, which is
the point. Anything else is an import: refused unless the caller passes
`acceptImportedPlan`, and then checked for shape (well formed, inside the
request, pairwise disjoint, tiling it exactly) before its verdicts are
taken on the caller's authority. Shape is all that can be checked; a
structurally perfect plan with false verdicts still passes, and the result
therefore carries `completeness.restsOnImportedPlan` and a statement that
says CONDITIONAL. The comment that claimed a check it did not perform now
describes what is actually done, and says what it cannot do.

### What reviewer B found alone

2. **A stale plan could answer a fuller request.** `maxEvaluations` and
   `maxCells` change which spans end up `unprocessed`, and were not in the
   key — a plan built at 100 evaluations classified 3 per cent of a
   two-day window, carried the full plan's key, and returned zero
   crossings where the full plan returns three. **Fixed**, and not by
   keying on the budget: two *finished* plans built at different budgets
   are the same plan, and keying on the allowance would miss the cache on
   every call. What matters is completeness, which is a property of the
   plan, so an unfinished plan is refused unless the caller passes
   `acceptPartialPlan` — and a run over one inherits its status and
   reports `finished: false`.

3. **The four classes did not tile the request at any starved budget.**
   Unsearched admissible spans were pushed into `unprocessed` beside the
   plan's own, so the same second was counted in `admissibleSec` and again
   in `unprocessedSec`: on a starved two-day request the four figures
   summed to four days. `coversRequestExactly` summed a different list and
   reported `true`. **Fixed** by separating the two axes that had been
   collapsed: `unprocessed` is what the partition never classified,
   `notSearched` is what the search never reached, the tiling check reads
   the list it prints, and `mayHoldUnfoundSupportedEvents` covers both.

4. **A published P-6 check could never fail.** It compared
   `mayHoldUnfoundSupportedEvents` with `undefined`, which the runtime
   never returns, so the field was always `true` — and it shipped in the
   evidence JSON under a name that reads as a criterion. **Fixed**: it is
   the per-case form of the aggregate now, and the aggregate is computed
   from it.

5. **P-7's pass ignored the partitioned path.** It was a pure function of
   the unpartitioned rung's score, so the partitioned path could have
   scored five of twenty with `disagreements` populated and P-7 would
   still have passed — which is precisely the regression P-7 exists to
   catch. **Fixed**: the gate requires both. This is a strictly harder
   condition added after seeing the run, which can only turn a pass into a
   failure; both corpora have `agree: true`, so no verdict moved.

6. **Smaller:** the result's stated boundary tolerance came from the plan
   rather than the caller; `eligibility: 'boundary-ambiguous'` was emitted
   and declared nowhere; `execution.budgetNote` was missing from the
   `.d.ts`. All fixed. The off-by-one in `evaluations` (checked after
   incrementing, so an exhausted run reports 4,000,001) is house style,
   visible in the preregistration, and is now documented in the type
   rather than changed.

   Reviewer B also reported that the README cited `PARTITION-RESULTS.md`
   and quoted five figures with no committed run to check them against.
   That was true at `09929f76` and was resolved by `d38baf6b`, which
   landed the document and the three evaluation runs while the review was
   in flight. Recorded rather than dropped, because the reviewer was right
   about the commit it read.

### What reviewer A found alone

7. **A Sun-target request on a pack with no Sun was answered, not
   refused** — the deflector shortcut returned before anything looked, so
   the refusal arrived a layer later out of a subsearch whose caller does
   not catch it, contradicting the file's own header. **Fixed**: the Sun's
   weights are resolved before the shortcut and thrown away.

8. **The shortcut shipped a class description that was false of it.** The
   shared contract's `classes.admissible` reads "the elongation is at or
   above the floor at every instant"; for the deflector itself the
   elongation is identically zero. **Fixed**: that one class description
   is replaced for that one result, and says why the span is admissible.

9. **A request wholly outside the records burned the whole cell budget.**
   Out-of-coverage is reported as retryable, which is right where a window
   partly overlaps the records; where nothing is covered the retry is
   unconditional, and a 10^12-second window ran 34 levels of bisection and
   spent 400,000 cells having evaluated nothing. **Fixed**: answered once,
   as `boundary` with a reason and never as `excluded`, because outside
   the records is not outside the domain.

10. **The relight width recorded an inherited light-time interval as
    freshly derived** whenever the free tightening fell back, suppressing
    the next three relights. Reachable only if an enclosure is already
    unsound, so not a soundness finding — the comment was stronger than
    the code. **Fixed**: `classifyCell` returns whether it tightened, and
    the caller reads that instead of testing an always-truthy object.

## What reviewer A could not break, and what that is worth

Seven adversarial geometries with expectations derived independently:
roughly 700,000 sampled instants inside admitted spans and 400,000 inside
excluded spans, every one on the side its class claims. A tangency exactly
at the floor was neither admitted nor excluded; a 40-second dip below the
floor, shorter than the 60-second boundary tolerance, admitted no instant
inside it; a real conjunction with a moving observer and a moving Sun was
admitted to within **2.5 × 10⁻⁵ degrees** of the floor, correctly.

That is corroboration and it is not a proof, which the reviewer said in
those words. The soundness argument lives in `domain-partition.mjs`.

## The open gap, stated rather than closed

Reviewer A's eight surviving mutations are all in the CONSTRUCTION of the
enclosures the verdicts are applied to: the observer read at a midpoint
instead of over the span, the Sun likewise, the emission window built from
the wrong end of the light-time interval, the self-map check removed, the
subluminal check removed, the free tightening collapsed to a point. The
suite pins the two guard constants and the elongation expression; it did
not pin the enclosures.

The reviewer explained why its own cases missed them: its fixtures held
the observer and the Sun stationary and gave the target a constant range,
so the light-time was exactly `L/c` and never varied — and under those
conditions a midpoint and an interval agree, and a wrong light-time
interval still contains the right constant.

Two test files were written against that gap, in separate worktrees, each
verified by a second agent that wrote the file into a third worktree and
re-applied every mutation there:
`test/tier-a/partition-enclosure-intervals.nodetest.mjs` and
`test/tier-a/partition-enclosure-lighttime.nodetest.mjs`, eleven families
between them.

They close **seven of the eight**. The fixtures had to break the two
conditions that hid them: one file sweeps a moving observer, and separately
a moving Sun, through a conjunction so that a midpoint reading of the
opening cell says fifteen degrees while the same cell reaches zero 18,000
seconds away; the other runs a target at 0.9 c so the light-time interval a
200-second cell admits is about 1,800 seconds — nine times the cell — and
its two ends name stretches of trajectory 14.87 degrees of apparent place
apart. Both mutations that read a body at a midpoint now admit a whole
window that reaches conjunction, and the tests name the instant: *an
ADMITTED span reaches an elongation of 0 deg at 0 s TDB*.

The eighth, `dist.lo > 0` weakened to `dist.hi > 0` in `classifyCell`, is
**not caught, and appears to be unreachable**. An instrumented probe placed
immediately before the guard, over all 423 tests and both new fixtures,
never found the two predicates disagreeing; inverting the probe's own
condition made it fire three times, so the no-fire result is a measurement
and not dead code. `deriveLightTime` carries its own `dist.lo > 0` and
fires first on a freshly derived cell, and an inherited cell's enclosures
are subsets of its parent's, so `dist.lo` cannot fall below it. The guard
is pinned indirectly — by the ordering it depends on, and by the enclosure
monotonicity that ordering rests on — and neither pin would fail on that
mutation alone. It is a redundant backstop, recorded as one.

Both files were checked adversarially by an agent that had not written
them, which confirmed every claimed catch independently and found nine
comment inaccuracies between them: a parallax figure wrong by 11.5×, a
clearance stated as fifteen degrees that is ten, a cosine-to-degrees
conversion wrong by 5×, an assertion whose comment claimed a tightness the
number (3.22, outside the range of a cosine) does not have, a cell count
of two where the geometry gives one, a peak speed computed from the
construction rather than measured from the fixture, reception time called
emission time, and two margins quoted tighter than measured. All nine are
corrected, every figure re-measured against the geometry. Two families
were also strengthened: the plunge case now states that it decides nothing
and asserts that shape, so its ownership checks cannot pass silently while
inert, and the LURCH case now checks its verdicts against the reference
instead of working only on message text — it has a real below-floor
passage at 1165.72 to 1368.09 seconds and admits two spans whose minimum
elongations are 6.488 and 5.646 degrees.

## What was not done

No reviewer finding was declined. Nothing in either report was
reclassified downward. The two reviews between them changed the source in
ten places, the tests in three files and the harness in four, and none of
those changes moved a number in `PARTITION-RESULTS.md` — the evaluation
was re-run after them and the verdicts are unchanged.
