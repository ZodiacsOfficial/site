# Review A — domain mathematics, conservative boundaries, adversarial cases

Worktree: `scratchpad/partition-review-a` @ `09929f76`. Left clean (`git status` empty
after every mutation). Scripts referenced below live in `scratchpad/rev-a/`:
`adv.mjs` (cases A1–A7), `advB.mjs` (case B), `advC.mjs` (case C), `sun.mjs`,
`plan-attack.mjs`, `plan-attack2.mjs`, `mutate.sh`.

Baseline: `npm test` — 400 pass, 0 fail. Tier-A only; I did **not** run Tier-B
against `D.v2.zeph`. That is a gap in my coverage, stated rather than glossed.

---

## Summary

I found **no false `admissible` and no false `excluded` produced by
`partitionDomain` itself.** Across seven adversarial geometries, ~700,000 sampled
instants inside admitted spans and ~400,000 inside excluded spans, every one was
on the side the class claims. Case C admitted right up to **5.000025030°** —
2.5e-5 degrees above the floor — and was correct there. That is corroboration,
not proof, and I say so.

The findings are one MAJOR (a soundness claim made in a comment that the code
does not implement, with a working exploit) and four MINOR.

| # | Severity | What |
|---|---|---|
| 1 | **MAJOR** | `assertPartitionUsable` accepts a plan whose span lists were edited; the gate-skipped search then applies the deflection inside the 5° floor and reports it `established` |
| 2 | MINOR | The Sun-as-target early return contradicts the function's stated throwing contract and ships a class description that is false for it |
| 3 | MINOR | `twc` records an inherited light-time interval as freshly derived in the fallback branch; the comment claims an intersection the code did not do |
| 4 | MINOR | A wholly out-of-coverage request burns the entire 400,000-cell budget instead of refusing once |
| 5 | MINOR | 8 of 16 mutations survived the repo suite **and** my adversarial oracle — including every enclosure-construction step the proof rests on |

---

## Finding 1 — MAJOR

**Where:** `examples/precision-alpha/src/core/partitioned-search.mjs:130-141`
(the only span-level check) and `:375-376` (where the plan's spans are consumed).

**The claim, at `partitioned-search.mjs:130-134`:**

> A plan whose spans do not match its own key is not a plan this runtime
> produced, whatever key it carries. Cheap, and it catches a hand-edited or
> truncated import that kept the header.

**The code, `:137-141`:**

```js
const [lo, hi] = plan.request.windowTdbSec ?? [NaN, NaN];
if (!(lo === fromTdbSec && hi === toTdbSec)) { fail(...); }
```

That is the only statement made about spans. `partitionKey`
(`domain-partition.mjs:143-162`) covers the pack, observer, body, window,
profile and tolerances — **not** `admissible`, `excluded`, `boundary` or
`unprocessed`. So a hand-edit that changes only the span lists keeps the header,
passes both checks, and is accepted.

**Reproduction** — `scratchpad/rev-a/plan-attack2.mjs`, run it as-is:

```
targetDeg 175.869988 is crossed near t=1500, where the true elongation is 4.5000 deg (inside the 5 deg floor)
forged plan ACCEPTED. events: [{"t":1495.788917541504,"elong":4.4958,"eligibility":"established"}]
eventCount: {"found":1,"eligibilityEstablished":1,"eligibilityAmbiguous":0,"isExactTotalOverRequest":false,"isExactTotalOverAdmissible":true}
```

The forgery is one line:

```js
const plan   = partitionDomain(eph, { body: 'Mars', fromTdbSec: 3000, toTdbSec: 5000 });
const forged = { ...plan, admissible: [[1000, 2000]] };   // key and windowTdbSec untouched
searchDeflectedOverPartition(eph, { body:'Mars', targetDeg, fromTdbSec:3000, toTdbSec:5000, plan: forged });
```

**Why it is wrong, mathematically.** `runOn(lo, hi, 'admissible')` dispatches to
`searchDeflectedLongitudeOnProvedDomain`, which sets
`control: { domainProvedByCaller: true }` (`retarded-search.mjs:1559-1569`),
which disables the gate at `deflection.mjs:612`. The soundness argument for that
flag is stated at `deflection.mjs:582-586`: domain membership is a property of
instants, so a proved span proves every sub-span. That argument is valid, and I
could not break it from inside the search — see "What I tried and could not
break", Q3. It fails here at its **premise**: the span handed to the search was
never proved. `eraLd` is then evaluated at an elongation of 4.4958°, where
`DEFLECTION-PROFILE.md` §7 measures the omitted second-order term at ~2e-3
arcsec, and the event is labelled `eligibility: "established"` —
`partitioned-search.mjs:325` assigns that label from `domain === 'admissible'`
alone. `isExactTotalOverAdmissible` comes back `true`.

Note also, from the earlier `plan-attack.mjs` run: the forged span reached
outside the requested window entirely, and the search ran over `[[1000,5000]]`
for a request of `[3000,5000]`, with no complaint.

**Why MAJOR and not BLOCKING.** `partitionDomain`'s own output can never do
this: its seeds tile `[a, b]` exactly (`domain-partition.mjs:548-563`, edges
filtered by `e > a && e < b`), and I confirmed exact tiling in every one of my
cases. The defect is that a validator written specifically to make an imported
plan trustworthy asserts, in its own comment, a property it does not check.
`packFingerprint`'s docstring (`domain-partition.mjs:191-200`) is careful to say
the fingerprint "is not a security boundary"; this check is careless in the
opposite direction.

---

## Finding 2 — MINOR

**Where:** `domain-partition.mjs:480-515`, against the function's own docstring
at `:404-407`:

> It DOES throw for a malformed request — an unknown body, a backwards window,
> **a pack with no Sun** — because those are not answers.

**Reproduction** — `scratchpad/rev-a/sun.mjs`:

```
Sun, window inside coverage       -> {"adm":[[1000,2000]],...,"evals":0}
Sun, window ENTIRELY outside pack -> {"adm":[[1000000000000,2000000000000]],...,"evals":0}
Sun, backwards window             -> THROW unsupported-option ...           <- correct
Sun target, pack with NO Sun      -> {"adm":[[1000,2000]],...,"evals":0}    <- no throw
Mars target, pack with NO Sun     -> THROW unknown-body this pack does not contain sun
unknown body                      -> THROW unknown-body Xyzzy is not in the retarded contract
```

Three parts:

1. **A pack with no Sun, body `'Sun'`, does not throw.** The early return at
   `:480` precedes `targetWeights(eph, 'Sun')` at `:521`. The refusal arrives one
   layer later from the subsearch — and `runOn`'s catch
   (`partitioned-search.mjs:299-306`) takes only `budget-exhausted` and
   `cancelled`, so `unknown-body` escapes `searchDeflectedOverPartition`
   entirely. The docstring says this case throws here; it does not.
2. **A backwards window is correctly refused** — the `b > a` check at `:425`
   precedes the early return. That half of the docstring holds.
3. **The result's own contract text is false for this result.** The returned
   object spreads `...PARTITION_CONTRACT` (`:492`), whose
   `classes.admissible` reads *"PROVED: the elongation is at or above the floor
   at every instant of this span"*. For the Sun as target the elongation is
   identically **zero**. Only `diagnostics.deflectorIsTargetWhy` says otherwise.
   For the out-of-coverage window the same string asserts a proof over instants
   the pack cannot evaluate at all.

**Is the early return itself sound?** Yes, as a domain claim. The profile applies
no deflection to a deflector (`DEFLECTION_PROFILE.deflectors = ['Sun']`), so the
elongation floor restricts nothing, and `:479` states deliberately that coverage
is a separate question the subsearch answers. Mutation M12 (removing the early
return) is caught by the existing suite. What is wrong is the words, in two
places, not the arithmetic.

---

## Finding 3 — MINOR

**Where:** `domain-partition.mjs:286-291` and `:642-651`.

```js
const usable = tightened.hi >= tightened.lo ? tightened : T;      // :290
return { verdict: ..., cosElongation, T: usable };                // :291
...
const Tc  = out.T ?? T;                                            // :642
const twc = out.T ? hi - lo : tw;                                  // :650
```

`out.T` is an object and therefore always truthy whenever `classifyCell` reached
line 291, including the branch where `usable === T` — the **inherited** interval,
not one derived on this span. `twc = hi - lo` then records it as fresh, and the
relight test at `:596` (`hi - lo < tw / relightWidthRatio`) will not fire for
another three subdivisions. The comment at `:644-649` justifies `twc` on the
ground that

> `classifyCell` proved `[dist.lo/c, dist.hi/c]` over this span and intersected
> it with what was inherited

which in the fallback branch it did not.

**Not a soundness finding.** Inheriting is sound at any ratio, as the header
argues at `:37-45`. And I could not construct a case that takes the fallback: with
sound enclosures both `T` and `[dist.lo/c, dist.hi/c]` contain `tau(t)` over the
span, so the intersection is non-empty. It is reachable only if an enclosure is
already unsound. The comment is stronger than the code; that is all.

---

## Finding 4 — MINOR

**Where:** `domain-partition.mjs:598-617`.

**Reproduction** — `sun.mjs`, line `Mars, window ENTIRELY outside pack`: a pack
covering `[0, 8000]` s, asked for `[1e12, 2e12]`:

```
evaluations: 0   cells: 400001   status: budget-exhausted
boundary:    [[1e12, 1.0000116408e12]]   (slivers)     unprocessed: the rest
```

`deriveLightTime` returns `retry: true` for out-of-coverage (`:325`, `:349`,
`:392`), so `:604` bisects a 1e12-second window toward the 60-second tolerance —
34 levels — and the **evaluation** budget never fires, because `stateEnclosure`
throws before it calls `spend`. Only the cell budget stops it.

The header at `:305-313` defends the retry ("the caller subdivides and tries
again, which is what the search does with the same condition"), and for a window
that *partially* overlaps coverage that is right. For a window wholly outside it,
there is nothing to find and the retry is unconditional. **The answer is still
conservative** — boundary plus unprocessed, never a verdict — so this is cost and
a claim about cost, not correctness.

Related observation, not a finding: case C (`advC.mjs`, a conjunction over ±35
days with 1-day seeds and a moving observer and Sun) also exhausted the default
400,000-cell budget, returning 15.49 admitted days and 54.51 unprocessed. It
failed in the right direction.

---

## Finding 5 — MINOR (test gap)

**16 semantic mutations run, 8 caught, 8 survived.** Survivors passed the repo's
`domain-partition` + `deflection` + `deflected-search` tier-A files (73 tests)
**and** my own oracle (cases A1–A7, B, C). Baselines `M0`, `M0b`, `M0c` confirm
the harness detects a clean tree; `M0b` is discarded because two batches
overlapped on disk, and `M0c` re-ran it clean.

Caught:

| Mutation | Result |
|---|---|
| M1 `classifyElongationCos`: swap GUARD ↔ EXCLUDE | suite 1 fail (adversarial cases could **not** see it — the window is 4e-15 of cosine) |
| M2 admissible on `cosPhi.lo` instead of `.hi` | suite 10 fail, adv 9 fail |
| M3 excluded on `cosPhi.hi` instead of `.lo` | suite 11 fail, adv 7 fail |
| M4 drop `I.neg` in `elongationCosInterval` | suite 29 fail, adv 9 fail |
| M9 route `indeterminate` into `excluded` (`:630`) | suite 1 fail, adv 2 fail |
| M12 remove the Sun-as-target early return | suite 1 fail |
| M13 drop `inFlight` from `unprocessed` (`:669`) | suite 1 fail |
| M14 `coalesce` merges across gaps (`:219`) | suite 9 fail, adv 10 fail |

Survived — and these are precisely the steps the file's header calls its proof:

| Mutation | What it breaks |
|---|---|
| M5 `classifyCell:244` emission window `lo - T.hi` → `lo - T.lo` | `R` no longer encloses `r_T(t−tau(t))` for `t` near `lo`. Unsound. |
| M17 `deriveLightTime:346`, same change | The self-map check is then performed against a window that is not the emission window. Unsound. |
| M6 `:286-289` tightening replaced by the `dist` midpoint for both ends | `T` becomes a point that need not contain `tau(t)`; children inherit it. Unsound. |
| M7 `:367` `I.contains(T, phi)` → `true` | The self-mapping half of Banach is gone; `T` is an unverified guess. |
| M8 `:354` subluminal check → `false` | The contraction half of Banach is gone. |
| M10 `:245` Sun read at `(lo+hi)/2, (lo+hi)/2` instead of over `[lo,hi]` | `e` becomes a point evaluation. Exactly the "evaluates at a point where it needs an interval" failure. |
| M11 `:243` observer read at the midpoint | Same, on the observer. |
| M15 `:258` `dist.lo > 0` → `dist.hi > 0` | Redundant in practice: `deriveLightTime:359` carries its own `dist.lo > 0` and fires first, so `classifyCell`'s is unreachable on the geometries I built. |

M10 and M11 survive on my cases because my closed-form fixtures hold the observer
and Sun stationary; they survive the repo's cases for a different reason — the
verdict-deciding cells there are narrow enough that a midpoint and an interval
agree. M5/M6/M7/M8/M17 survive because the fixtures whose verdicts are close to
the floor have a light-time that barely varies. Case B (tau swinging 400→1401 s
inside the window) and case C (1-day seeds, moving observer) did not catch them
either.

**This is not a defect in the shipped code.** The checks are all present and I
believe them correct. It is a statement about what the suite establishes: the two
constants and the elongation expression are pinned; the construction of the
enclosures they are applied to is not.

---

## What I tried and could not break

Everything below is corroboration. "I could not find a counterexample" is what it
is, and it is not proof.

### Q1 — is `admissible` actually proved?

I traced the chain: `stateEnclosure` for the observer over `[lo,hi]` (`:243`),
the target over `[lo − T.hi, hi − T.lo]` (`:244`), the Sun at **reception** over
`[lo,hi]` (`:245`) → `I.vSub` → `I.norm` → `I.div` for `ê` → `elongationCosInterval`
→ `classifyElongationCos`. Every step is an interval operation over the **closed**
span. The verdict text says half-open; the code proves closed, which is the safe
direction.

The one point evaluation in the chain is deliberate and harmless: `oPoint` and
`solveTau` at the midpoint (`:321-322`) feed only the **initial candidate** `T`,
which is then re-verified by the self-map check at `:367`. A wrong starting point
cannot survive it.

*A finding I withdrew.* `solveTau` is called with a hardcoded `k = 0.5` (`:322`),
and `solveTau`'s own docstring (`retarded.mjs:214`) says `k` is "the contraction
factor the caller verified from the pack's own derivative bound" — here nothing
verified it, so for a target faster than `c/2` the returned
`errorSec = k/(1−k)·step` understates Banach's a-posteriori bound. I initially
called this MAJOR. It is not a finding: nothing is proved from `rough.errorSec`;
it only sizes the first candidate, and `:367` re-establishes the interval
independently. `retardedCell:308` passes the same hardcoded `0.5`.

*A second finding I withdrew.* I expected the emission window
`[lo − T.hi, hi − T.lo]` to invert — and `stateEnclosure` to throw
`unsupported-option`, which `classifyCell`'s catch (`:248`) does not handle —
when a span becomes narrower than `T`'s width. It cannot: the window's width is
`(hi − lo) + (T.hi − T.lo) ≥ 0` always. The window widens with `T`, it does not
narrow.

**The free tightening at `:286-289` is sound.** `dist = I.norm(R.pos − O.pos)`
with `norm` (`interval.mjs:118-123`) taking `lo = sqrt(Σ mig²)` and
`hi = sqrt(Σ mag²)`, so `dist.lo ≤ min_t |d(t)|` and `dist.hi ≥ max_t |d(t)|` over
the span. `tau(t) = |d(t)|/c` exactly, so `[dist.lo/c, dist.hi/c]` contains
`tau(t)` throughout; intersecting with a `T` that also contains it keeps a valid
interval. The enclosure is a *decoupled box* — it contains
`{R(s) − O(t)}` for independent `s`, `t`, a strict superset of the true pairs —
which is conservative.

**The light-time interval is genuinely proved**, subject to one caveat that is
not new. `Φ(t, tau) = |r_T(t−tau) − r_O(t)|/c` maps `T` into `phi ⊆ T` (checked,
`:366-367`) on the *window actually used*, and `|∂Φ/∂tau| ≤ vMax/c < 1` is checked
on the same window (`:353-356`). Banach gives one fixed point per reception time,
inside `T`. The caveat: the contraction is established only on the emission window
`T` implies, so uniqueness is local to `T`; the claim that this fixed point is
*the* physical light time rests on `|v| < c` globally, which is argued rather than
checked. `retardedCell` makes the identical argument, so this is inherited, not
introduced.

**Adversarial cases, all with expectations independent of `partitionDomain`.**
Closed-form geometry: stationary observer at the origin, stationary Sun on −x
(so `ê = +x̂` exactly), target at constant radius `L` so `tau = L/c` exactly, and
`cos(elongation at reception t) = cos θ(t − L/c)` with `θ` chosen. Cases B and C
drop the closed form and use a numerically-solved `tauExact` reference.

| Case | Geometry | Result |
|---|---|---|
| A1 | tangency **exactly at 5.000000°** from above at t=3000 | 3880 s admissible, **0 s excluded**, 120 s boundary. Tangency instant not admitted. Min elongation over admitted samples 5.014400000°. |
| A2 | tangency exactly at the floor from below | 2980 s excluded, 260 s boundary; tangency instant not excluded; max elongation over excluded 4.985600000°. |
| A3 | elongation identically **5.000000°** | 1000 s boundary, nothing admitted, nothing excluded. Correct: `cos.hi ≥ cos5 > GUARD` forbids admission, `cos.lo ≤ cos5 < EXCLUDE` forbids exclusion. |
| A4 | `cos(elongation)` identically `COS_MIN_ELONGATION_GUARD`, then identically `COS_MIN_ELONGATION_EXCLUDE` (5.000000000003° / 4.999999999997°) | both wholly boundary; neither decided |
| A5 | a 40 s dip from 6° to 4° — **shorter than the 60 s boundary tolerance** | 3920 s admissible, 80 s boundary, **no admitted instant inside the dip**; min elongation over 200,000 admitted samples 5.999999775° |
| A6 | request edge exactly on a floor crossing, both directions | no admitted instant below 5°, no excluded instant at or above it |
| A7a | target exactly on the observer | 100% boundary, 15 reasons, nothing admitted, nothing excluded |
| A7b | observer at the centre of the Sun | 100% boundary, nothing admitted, nothing excluded |
| B | varying light-time, `tau` swinging 400→1401 s, target at 0.63c | 1220 s admissible / 180 s excluded / 4600 s boundary; min over 24,403 admitted samples **5.958744427°**, max over 3601 excluded samples 4.082377204° |
| C | real conjunction, **moving observer and moving Sun**, 1-day seeds | min over 88,520 admitted samples **5.000025030°** — admitted to within 2.5e-5 degrees of the floor, correctly |

Every case tiled its request exactly, and `admissible ∩ excluded` was empty in
every case.

### Q2 — are the two bounds pointed the right way?

`classifyElongationCos` (`deflection.mjs:192-196`) is the single site, and a
caller cannot pick the wrong one because a caller does not pick. `GUARD =
cos5 − ABS_ERR` (a lower bound, admitting needs `cos.hi ≤ GUARD` ⟹
elongation ≥ 5° everywhere) and `EXCLUDE = cos5 + ABS_ERR` (an upper bound,
excluding needs `cos.lo > EXCLUDE` ⟹ elongation < 5° everywhere). Both correct.
Since `GUARD < EXCLUDE`, the two tests are mutually exclusive on one enclosure, so
no span can be both; across adjacent spans, one being admissible and its
neighbour excluded at a shared instant would require an unsound enclosure, and I
saw no overlap in any case. A4 pins the exact-constant behaviour. M1 (swapping
them) is caught by the suite and **not** by any realizable geometry — the 4e-15
window is below what any fixture can resolve, which is the file's own argument at
`deflection.mjs:145-149` and is correct.

### Q3 — is `domainProvedByCaller` sound?

The argument at `deflection.mjs:582-586` — domain membership is a property of
instants, so a proved span proves every sub-span — is valid, and the search does
not violate its premise from the inside:

- **The search never widens a cell beyond the span it is handed.** `runSearch`
  seeds tile `[a,b]` with edges filtered by `e > a && e < b`
  (`retarded-search.mjs:941-952`); the point evaluations are at `lo`, `m`, `hi`
  and inside the bracket (`:926`, `:1021`, `:1043-1044`, `:1069`); the bracket
  refinement keeps `[a2,b2] ⊆ [lo,hi]` (`:1061-1067`) and the half-plane cell is
  built on `[a2,b2]` (`:1081`).
- **Light-time reach-back does not widen the reception set.** `emitLo/emitHi`
  (`:387-388`) and `sunEm` (`:463`) move the *emission* window; the elongation is
  a function of the reception instant, and `e` is taken from `sunRec` over
  `[t0,t1]` (`:462`). Reaching back in emission time cannot move an instant into
  or out of the domain.
- **Skipping the gate does not skip a non-gate guard.** I checked each one named
  in the comment: the limiter `g.lo > dlimHi` (`deflection.mjs:643`), the
  denominator positivity (`:648`), the deflected-length positivity (`:669`), the
  `dist.lo > 0` and `en.lo > 0` refusals (`:546`, `:550`) and `qn.lo > 0`
  (`:562`) all sit outside the `if (!domainProvedByCaller …)` block and all still
  fire. The comment's "what it does NOT skip" list is accurate.
- The flag is unreachable from public entry points:
  `searchDeflectedLongitudeWithControl` rejects it by name
  (`retarded-search.mjs:1575-1583`) and `partitioned-search.mjs` is the only
  setter.

**The claim in the comment is the claim the code implements — inside the search.**
Where it is not is Finding 1: the *span* the search is handed comes from a plan
the validator does not check.

### Q5 — conservatism direction

`admissible.push` and `excluded.push` occur at exactly two sites each (`:625`,
`:630`), both guarded by an explicit verdict string produced by
`classifyElongationCos`. `indeterminate` (`:249`, `:260`, `:266`) falls through
to bisect-or-boundary. Every other exit — light-time derivation failure (`:612`),
superluminal target (`:331`, `:355`), coverage gap, a width that no longer halves
(`:635`, `:608`) — lands in `boundary`. A7a/A7b confirm the degenerate geometries
come back 100% boundary with reasons. `unprocessed` includes the in-flight cell
(`:669`); M13, which drops it, is caught. **I found no branch where an uncertain
result lands in a decided class.**

### Q6 — the Sun-as-target early return

See Finding 2. The domain shortcut is sound; the surrounding claims are not.
Backwards windows are correctly refused before it. A pack with no Sun and a
window outside coverage are both admitted whole, the first contradicting the
docstring and both carrying a `classes.admissible` string that is false for them.
