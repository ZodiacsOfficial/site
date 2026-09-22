# The two bounded reviews of the deflection branch

**Both reviewers were AI.** Two Claude subagents, run once each, on
`bc84c102..22f3259d` — the whole deflection deliverable, seven commits.
No human read this branch. That is what the brief allowed (one integrator
and at most two bounded reviewers) and it is recorded here plainly so
nobody later reads "reviewed" as "reviewed by a person".

**Tests do not establish a theorem, and neither do these.** What the
reviews establish is that two independent readings, each with a bounded
remit and each running the code, found the defects below and nothing
worse. Both missed things the other caught, which is the argument for
having two.

## Scope, fixed before either ran

| | remit | explicitly out of scope |
| --- | --- | --- |
| **A** | does every written claim match what the committed artifacts contain? | code style, design, features |
| **B** | soundness of the code and tests: a test that cannot fail, a declaration that is still wrong, a predicate that does not do what its comment says | style, naming, performance opinions |

Reviewer B was told to mutate the source and confirm each new test fails,
and to leave the tree clean. It ran 21 mutations. Reviewer A was read-only
and re-derived figures independently where it could.

## What they found, and what was done

Every item below was reproduced before it was acted on. Nothing was taken
on the reviewer's word.

### Blocking

1. **A committed evidence file carried an absolute scratchpad path**
   (`replay.json`'s `replayedFrom`), and the guard that compares it deep-
   equals the whole object. It passed only on the machine that wrote it and
   would have failed in CI and on every other checkout. Reproduced from a
   differently-rooted tree. **Fixed**: the path is repo-relative, and the
   guard now asserts it is not absolute. The test's own comment had
   congratulated itself for having no timestamp while the path sat two
   lines above; that comment says so now.
2. **The Moon section of `DEFLECTION-RESULTS.md` explained the run with a
   mechanism the run's own record refutes.** It read
   `closestElongationDeg: 5.000010` as the geometry's minimum elongation
   and concluded the Moon "skims the floor without crossing it". That
   field is an enclosure bound over *accepted* cells — this repository says
   so in three other places, including on the result
   (`closestElongationIsAReport: true`) — and the row's own
   `excludedCells: 1536` proves the floor is crossed. Measured
   independently (`holdout/moon-window-elongation.mjs`, astronomy-engine,
   10-minute steps): **ten passages below five degrees, 118.7 hours,
   closest 0.381°**. **Fixed**, and the section now says what it got wrong
   and why, because the correction is the more useful of the two.

### Wrong numbers and overstatements, all corrected

- `holdout-attempt1-harness-fault.json` → the file is `attempt0-…`.
- "most expensive by a factor of eight over the next" → **3.7×** in
  evaluations, 2.0× as a multiple of the of-date rung.
- Mars and Venus cost figures were swapped (418× and 318×, not 318× and
  418×).
- "three of eleven roots" for both Moon cases → F2 found 2, A2 found 3.
- §11.1's heading said "1020 of 1020" where its own body, `claims.json`
  and the contract all say **1074**.
- `deflectionAngleOf`'s doc comment carried pre-refresh figures — 264
  cases, 6.6e-7, "a tenth" — against the regenerated 358 / 2.96e-6 /
  "a fifteenth" / 3.95e-9. It now points at `claims.json` rather than
  restating it.
- The chart contract's Mercury example used the distant-source column:
  Mercury at 1° of elongation gets **0.110–0.148 arcsec**, not 0.46, and
  the clamp is **eleven** orders away, not eight.
- "18.7× the largest apparent solar radius" is the 1 au ratio; against the
  largest (975.53″, at perihelion) it is **18.45×**.
- "`--check` reports both bundles unchanged" reads as "this work did not
  change them". It did (+3 lines in the worker). The sentence now
  distinguishes drift from change.
- `DEFLECTED_CONTRACT.comparableTo` promised an almanac difference "well
  under 0.01 arcsec". **Nothing here has been compared with an almanac**,
  and it is false for the Moon anyway, whose omitted topocentric parallax
  reaches about a degree. The bound is gone.
- The opening line "Nothing below amends it" was contradicted three
  sections later by a disclosed amendment. Narrowed to what is true.
- Smaller: 102.2033→102.2035, "two bodies"→"two or more", "four
  rotations"→three, "the two experimental modes"→four.

### Soundness defects, all fixed and mutation-checked

3. **The Sun as target claimed a deflection it did not apply.**
   `request.operation` said "CORRECTED FOR … SOLAR GRAVITATIONAL LIGHT
   DEFLECTION" and `request.applied` listed it, beside
   `appliedToThisBody: false` and a widest deflection of exactly zero —
   and `request.operation` is the field the consumer documentation tells
   readers to check. Exactly the defect the `corrected` noun was
   introduced to prevent, one field over. Fixed: the deflector-as-target
   path carries the of-date rung's description plus a
   `deflectionNotApplied` field, and keeps the mode name and the profile
   so a reader can still tell which call answered.
4. **Three tests did not test what they were named for.** "needs a Sun in
   the pack" built a pack that had one (the fixture helper always emitted
   a Sun; it takes `omitSun` now). The epoch split and the `(1 − dτ/dt)`
   chain rule on `q` — two of the profile's own named claims — survived
   every mutation at search level, because the enclosure is two orders
   wider than either error. Fixed by extracting the rule into
   `deflectorGeometry` and checking it against a finite-difference
   reference on an analytic moving-Sun geometry, where both **are**
   separable. Both of B's surviving mutations now fail.
5. **`closestElongationCos` had no test with a side.** Taking
   `cosElongation.lo` instead of `.hi` publishes a wrong number in the
   flattering direction and passed everything, including the cross-runtime
   comparison — an inverted bound inverts identically in every engine. Now
   checked against a sampled maximum, which an enclosure's upper bound
   cannot sit below.
6. **The exclusion verdict used a lower-bound guard where it needs an
   upper bound.** `COS_MIN_ELONGATION_GUARD` is built as a rigorous lower
   bound on cos 5°, which is right for admitting a cell and wrong for
   declaring one wholly outside the domain. The window is 4e-15 wide, far
   below any test's resolution, so this is an argument rather than a
   measurement — and it is the argument the new
   `COS_MIN_ELONGATION_EXCLUDE` exists to make.
7. **Three of four sites filing a failed cell ignored `excluded`**, so a
   domain refusal arriving through the bracket or endpoint evaluations
   would have been recorded as a numerical shortfall — the one merge the
   whole contract forbids. Not reachable on any fixture, which is why it
   is worth closing rather than commenting. One `file` helper now.

### Reported, investigated, not a defect

Reviewer A hit `T9` failing twice and then passing six times, and flagged
it as possible non-determinism — which would have undermined the
cross-runtime evidence's premise. It is not. The search is
**bit-deterministic**: 48 runs across 6 processes returned one distinct
result, evaluations, cells, roots and all. The failing value,
`2.7055093584753414e-6`, reproduces exactly under
`widestDeflectionArcsec` taking `tanDeflection.lo` — which is one of the
21 mutations Reviewer B was running concurrently, and which B's own report
lists T9 as catching. Two reviewers sharing a worktree, not a flake.

### Declined

Reviewer B's finding 8 notes that `interval.requestedTtDays` and
`UnresolvedInterval.fromTtDays`/`toTtDays` carry unconverted TDB seconds
under a TT name on experimental results. That is true and predates this
branch; renaming fields in the released result contract is outside a
review remit and belongs to a contract revision. Recorded here rather than
changed quietly.

Finding 12 — that the replay's `subset` claim is true by construction while
both predicates sit inside one guard — is right, and the tool says so now
rather than dropping the claim: it is the condition the word "relaxation"
depends on, and a future edit moving a branch outside that guard is exactly
what it is there to catch.

## After the fixes

| | |
| --- | --- |
| tier-A | 378/378 |
| tier-B, against a real pack | 73/73 |
| cross-runtime, three engines | 224 events, identical, spread 0, answers unchanged from before these fixes |
| clean-consumer, through the packed archive | passes |
| type fixtures | 4/4 |
| preview bundles | no drift; one mode string, `validated-geometric` |

Seven mutations were run against the new tests. Each is caught by the test
written for it, and none by a neighbour.

**The verdict on the deflection layer is unchanged by any of this.** It
still fails its preregistered usefulness rule: six of twenty holdout cases
establish completeness where the rule required at least ten. The reviews
corrected how that failure is explained; they did not move it.
