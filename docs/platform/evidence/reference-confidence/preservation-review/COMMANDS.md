# Independent execution and artifact record

The preparation source was copied from immutable Git objects at `f803d2543ad81343b22d49326b8b46d0e2ea03a0`, restricted to src, package files, tsconfig, repository instructions and the existing browser helper. `base-source.json` records all 1,835 copied file identities. Existing installed dependencies were reused through an owned scratch symlink; there was no install, package change or new runtime. All 211 baseline and 210 candidate build inputs were read and hashed, and exact byte copies accompany the compressed evidence.

Executed in `/private/tmp/zodiacs-platform-chart-reference-confidence-review` with pinned Node 22.23.2:

```sh
node build.mjs baseline > build-baseline.log 2>&1
REVIEW_KIND=baseline node drive.mjs > native-baseline.log 2>&1
node secure-origin-probe.mjs > secure-origin-probe.log 2>&1
REVIEW_KIND=baseline REVIEW_CASE_PREFIX=actual-local-save REVIEW_OUT=baseline-save-corrected.json node drive.mjs > native-baseline-save-corrected.log 2>&1
node build.mjs candidate > build-candidate.log 2>&1
REVIEW_KIND=candidate node drive.mjs > native-candidate.log 2>&1
REVIEW_KIND=baseline REVIEW_CASE_PREFIX=extra- REVIEW_OUT=baseline-extra.json node drive.mjs > native-baseline-extra.log 2>&1
REVIEW_KIND=candidate REVIEW_CASE_PREFIX=extra- REVIEW_OUT=candidate-extra.json node drive.mjs > native-candidate-extra.log 2>&1
node source-review.mjs > source-review.log 2>&1
python3 verify-freeze2.py > verify-freeze2.log 2>&1
```

In these commands, `node` was `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node`. The source syntax checks and full old/current driver snapshots are retained. The first seventeen candidate controls use `drive.freeze2-first17.mjs.log`; `drive.mjs` adds only two separate ownership controls for the affected-prefix executions. Browser execution used the existing browser helper and actual Chrome 152.0.7977.83, through approved disposable-browser sandbox escalation. Each case used a fresh context. All network requests were locally fulfilled only for the owned fixture navigation or blocked; no external request was executed. Native local storage and Blob downloads stayed inside those contexts and scratch files.

The candidate overlay contains exactly the sixteen verified Freeze2 files. It does not change the private baseline copy. Both the review copy and author's frozen copy were rehashed after browser execution. `source-review.mjs` performs whole-component reconstruction, named-function/run-span comparison, comment-only helper AST comparison, catalog restoration and import-specifier comparison. `verify-freeze2.py` reconciles individual controls, numerical/envelope/save comparisons, dependency inputs, exact freeze and source results without rerunning browser cases.

The initial baseline had fifteen passes and two save failures; its records stay immutable. The secure-origin probe confirms the missing native UUID method at the old insecure fixture origin, and only those two saves were rerun successfully on trusted loopback. Candidate source did not need a correction. The author's separately attributed Freeze1 comparator failure records retain its two unit failures, original/corrected test bytes and the identity comparison establishing that only the test changed.

Preparation delivery remains separately sealed at manifest `62b33ce255b500c2143c257cd255169f3c10249f90260e8dab8481281e7764c2`. The final raw archive uses explicit neutral regular TarInfo entries and is reopened to verify every member, excluding AppleDouble and inherited filesystem metadata. Root and author files were never edited. This record does not claim root full-suite/build/capture/CI success, real account behavior, remote preview, production or publication.
