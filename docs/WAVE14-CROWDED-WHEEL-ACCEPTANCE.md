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

## First actual-main browser result and overlay correction

PR 392 head fe095ecaee966726cea0a4cda4c677072931fa7d on released
8ccf127ce4f8061db8a9569c1444a054723634e0 passed visual comparison,
Phase 1 capture/validation and Lighthouse. Explorer passed Kahlo natal
geometry and pointer/keyboard checks at 390px, then failed sky-overlay Rx
containment and timed out selecting a natal marker. Run 34036501819,
artifact 9990623075: 93,277,027 bytes, SHA-256
d6ea8587b275a53954d4bbf3c6e1a84008dca9fa9f965137031c17987b393826;
all 408 provenance hashes verified against this exact head/base/source.
Site Check 34036501810 passed 3,500 tests and failed only the old Phase 1
receipt. Neither failed run is acceptance.

The overlay's invisible chord hit strokes paint above natal markers. The
interactive wheel now reserves taps inside visible natal circles during
capture, using the actual SVG screen transform; other overlay targets retain
their own handlers. Rx baseline moves inward by 0.84 SVG units to allow for
font bounds at the smaller overlay scale. Static/share markup remains pinned.
A focused test covers transformed circle interiors and untouched outside
targets. The browser helper preserves overlay measurements/screenshots before
input checks so a later exception cannot discard diagnostic evidence.
Fresh full gates and browser review remain required.

## Corrected-source browser review and final receipt

Corrected head e33269f7d7b014a7b2960dca8954d5516a530d70, source
face1b7678b8384d539d845c889276c1b4185d6d584a3a1b8e49ac995e8a736d,
passed Browser Evidence 34038248906 in full. Artifact9991164334:
102,375,128 bytes, SHA-256
f99c64c1cfd582e9eb32bf11b5122bacffa1cdb235b7166c01c986f126a5afe6.
All462 ZIP entries pass CRC; all461 provenance files match their recorded
bytes/hashes, exact head/base/source and successful outcomes. All18 Phase1
PNGs are byte-identical to the existing committed captures; only the genuine
fresh manifest is imported. No baseline or tolerance changed.

All10 crowded geometry views pass at390/1440, including the sky ring.
Smallest actual stroked-marker gutter is1.7624 CSSpx (mobile sky); Rx/glyph
containment, true ticks/leaders/aspects, all center/interior-edge taps and
native keyboard/Inspector/URL/focus correspondence pass. All10 screenshots
were personally reviewed. Fixed navigation appears in some component crops;
a fresh full-viewport desktop review also confirmed the native Sun tap under
sky chords selects its matching Inspector and marker ring. An earlier manual
measurement page produced a Preact readonly-constructor error; it did not
recur on a fresh page without the DOM measurement calls or in independent CI.
Its cause remains unproven; the observation is retained.

All78 Lighthouse samples pass: minimum97, maximumTBT14.280425ms,
maximumLCP2496.4554ms, CLS0. Clean local build/postbuild/budgets pass;
check920 files, zero errors/warnings,10 hints. Complete serial units:
3501 pass plus the stale manifest failure,356 files,396.50s. Independent
Site34038248908 has the same sole receipt failure and13 supporting jobs pass.
The imported manifest resolves that specific pending gate; final complete
actual-head CI and production verification remain required before release.
