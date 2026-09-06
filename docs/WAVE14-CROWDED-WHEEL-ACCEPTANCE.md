# Wave 14 — crowded interactive wheel recovery

This isolates the approved crowding repair from the recovered advanced source
archive. It is prepared on Wave 13; actual released main must be integrated
before publication and acceptance.

## Behavior and boundaries

Interactive scene markers use a 14-degree collision fan with stable body
identity at exact conjunctions. Short leaders join astronomical ticks to the
displaced marker rims. Retrograde labels fit inside their marker. Hit-testing,
selection and arrival rings use the same scene positions.

Astronomical longitude, speed, direction, houses, aspects and unknown-time
Moon alternatives remain unchanged. Static/share wheels retain their existing
layout; technical exports retain their 11-degree default. The closing circular
gap is corrected for coincident longitudes. No engine computation, profile
data, workflow, budget or baseline is modified by this source packet.

## Validation so far

Node 22 build and postbuild checks pass; Astro check passes. The focused
geometry, scene, static serialization and selection suite passes 56 tests in
five files. Fixtures cover Kahlo and four committed unknown-time reference
charts, exact conjunctions and the Aries boundary. Checks measure rendered
markers and leader geometry independently of the collision algorithm.

The initial full one-worker suite reports 3,461 passes, one stale Phase 1
receipt failure and an engine suite import failure while dependencies were
symlinked to the parent checkout. The dependency file exists; no numerical
assertion ran in that failed suite. Installing the unchanged lockfile directly
in this worktree resolves the import: all 39 engine tests pass. The original
failure is preserved; this diagnostic is not a full-suite pass.

Source fingerprint before released-main integration:
`32b12a65d8462cbe6ce5404ed5172ca42fffc6e05a9a77383c6f3b4fb9348c17`.

The new Explorer helper measures actual 390px and 1440px glyph, retrograde,
leader and marker bounds, pointer/keyboard correspondence, focus, true ticks,
aspects and unknown-time behavior. Its assertions are not yet browser evidence.
Fresh captures, personal review, matching receipt, final full local/CI gates,
merge and production verification remain pending. No live quality rating or
screen-reader approval is claimed.

## Integration after the released natal readings

Actual main `8ccf127ce4f8061db8a9569c1444a054723634e0` is merged into
this candidate. The two conflicts were historical Wave 13 documentation and
its old allowance; both now retain the released main versions. Product code
merged without conflict. The actual-main scope guard passes: twelve paths,
no protected scope changes. Integrated focused geometry/scene/browser-observer
coverage passes 47 tests in three files. Fresh complete build, type check,
serial unit suite, comparison captures, browser acceptance and personal review
are pending on this integrated source. This is a draft CI candidate.
