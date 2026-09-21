# Acceptance checklist — precision developer preview

Frozen 2026-09-20, before the public search contract changed, from
`claude/eager-ramanujan-razak3` at `542c0e72`. Sixteen items. Each is met or
not; none is marked met because another passed. `ACCEPTANCE.md` (the alpha's
twenty) stays as it is and is not re-litigated here.

## The two counterexamples this starts from

Reproduced against the alpha at `542c0e72`, before any change:

| case | truth | alpha returned |
| --- | --- | --- |
| an angle making 96 turns across the 96 default sampling intervals, target 137° | 96 crossings | **`no-crossing`, certified, count 0** |
| the same at 95 turns | 95 crossings | **`crossing`, certified, count 1** |

Identical sampled phases supported an exhaustive zero-event conclusion. That
is the defect this milestone exists to fix, and every item below is written
against it.

## S · The result contract

| # | condition | decided by |
| --- | --- | --- |
| S1 | No result object can carry an unconditional completeness or certification claim that rests on sampled bounds. The claim is structural, not a sentence | a test that greps the emitted JSON of every mode for a true completeness flag whose support is empirical |
| S2 | Execution finishing and completeness being established are separate fields, and a finished run says so | the result type, and a case that finishes without establishing completeness |
| S3 | Events found, interval requested, interval processed, and unresolved intervals are each reported separately | the result type |
| S4 | Conditional reasoning stays conditional: every unverified assumption is enumerated on the result, with what it would take to verify it | the result type |
| S5 | An exact total-event count appears only where its support is established; elsewhere the count is reported as found-so-far with an explicit bound status | a test that an empirical result exposes no exact total |
| S6 | Useful output survives: candidates, brackets and diagnostics are still returned on an unresolved result | a test that the aliasing counterexamples still return every event the method can find |
| S7 | Archived evidence and earlier outcomes are unchanged; the contract is versioned and the alpha-to-preview field mapping is documented | a diff, and a migration table |

## V · The validated mode

| # | condition | decided by |
| --- | --- | --- |
| V1 | One narrowly defined operation establishes completeness from true bounds on the pack's own polynomial, not from sampled maxima | the implementation, and the bound derivation written down |
| V2 | Its name, frame, and conventions are distinct from the apparent-place operation, and neither borrows the other's claims | the API, and a test that the two cannot be confused |
| V3 | The aliasing counterexamples, the close pair, tangency, near miss, boundary roots, multiple segment boundaries and the empty interval all return the truth, or refuse — never a wrong certified answer | the counterexample suite |
| V4 | Floating-point rounding, pack fit error and the geometric-versus-apparent gap are stated as separate, quantified limits on what the validated result means | the result, and the write-up |
| V5 | Partitioning an interval preserves the event set under a declared boundary convention | a test over the regression cases |

## P · Product and packaging

| # | condition | decided by |
| --- | --- | --- |
| P1 | The Moon 100°/2019 and Uranus D cases stay as regressions and their recorded outcomes are unchanged | a test, and a diff |
| P2 | A holdout set, written down before it is run, is reported separately from the cases used during development | the holdout record |
| P3 | Missed events, extra events, unresolved cases, evaluations and latency are measured separately, and a mode that refuses everything is reported as a failure of usefulness | the measurement |
| P4 | `npm pack` produces an archive that installs and runs from a clean directory with no repository checkout, no `/tmp` path, no network, and no hidden credential | a test that installs the tarball into a fresh directory and runs it |
| P5 | Type declarations, typed errors, and runnable examples for initialisation, calculation, search, cancellation and disposal ship in the archive | the archive's file list |
| P6 | The compiler's unsupported public-domain metadata is corrected under a new compiler identity, old artifacts preserved, and the coefficient payload demonstrated unchanged | a dated correction, and a digest comparison |
| P7 | An isolated, explicitly experimental preview route exists, does not load on any consumer page, and does not change the production engine or the consumer bundle | the route, the bundle report, and a test |
| P8 | The preview's scoped tests pass on Chromium and Firefox; WebKit is attempted and, if unavailable, an exact handoff is written | the driver output |

## What is out of scope here

Another compression competition; more astrology traditions; topocentric
features; natal-chart parity; a hosted API; directory submission; a consumer
redesign; changing the production calculation backend.
