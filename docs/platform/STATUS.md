# Zodiacs Platform status

## Current bounded work — L3a inactive receipt lifecycle prerequisite

The owner now authorizes L3, beginning from refreshed main
`693c2ac90b5be78c0f0885c22763dcafff53c00e` and actual inactive #426 head
`46b36e2c887405efc70762297e1087f6d14195f9`. Only its four reviewed
source/test files are selectively integrated; no stacked branch merge.

The first independently reviewable slice adds durable owner/device erasure
barriers and retry of committed deletion intent to the immutable local store.
Normal authority remains caller-supplied and is not authentication. All product
storage entry points remain inactive: the full account/guest authority,
discovery, explicit save/export/delete/recovery UI must land together later.
Existing profile writes, receipt calculations and SDK packages are unchanged.

Local verification passes: 5,271 tests, 20 native groups, build/typecheck/budgets
and 18 required captures. Draft hosted CI and exact-source preview are pending.
Nothing is merged,
published, production-deployed or externally adopted by this slice. SDK merge/npm
publication stays held; L4–L6, Astrofolio and Zodia stay excluded.
[Scope and evidence](evidence/l3-saved-records/README.md),
[activation dependencies](evidence/l3-saved-records/ACTIVATION-DEPENDENCIES.md).


## Previous release checkpoint — L2b released and production-verified

Owner approved PR #481 at `370fddf7224053ca42d0942945d850ab5b8d608c`.
Candidate/main identities were unchanged; all 14 candidate jobs, exact-source preview
and current-edition freshness remained valid. Marked ready and merged as
`dfeae5f9178a6d887209710083c2a74fae258236`, whose tree
`8dc403a558a83fae15950fc54f8a5978c6da7b13` exactly equals the approved tree.

Pre-release production `dpl_44tNRbymWxhKRRhUwg92gv945paY` is the recorded,
owner-authorized rollback baseline. Production deployment
`dpl_QmGqNQr8KuWEQYkaRfe34c6MMg6x` is READY on apex and www at the exact merge
source. Live chart/Moon date policies, reference values, Today/Profile uncertainty,
current editions and bounded runtime-error checks pass. No regression found.
Automatic post-merge [CI 34773522987](https://github.com/ZodiacsOfficial/site/actions/runs/34773522987)
passed all 14 jobs on the exact production source, including 5,211 tests in 424 files,
required native/date/caller checks and all performance/widget gates. Final main and
production still identify the approved tree. Rollback baseline remains READY; no
rollback, manual rerun or budget waiver was needed. Release verification is complete.
[Production evidence](evidence/l2b-production/README.md).
SDK merge/npm publication remains held; L3–L6, Astrofolio and Zodia remain excluded.
The [pre-release checkpoint](STATUS-2026-09-14-pre-l2b-release.md) retains the earlier draft state.

## Historical L2b draft — superseded by release above

The owner authorizes one bounded L2b draft from current main
`87f18e0a101b96abf847be58e8a0c31a691992f8`. The retained interval algebra is now
consumed only to adjudicate unknown-time local reference membership when the
native complete-transition contract is available. An immutable enumeration trace
stays temporary; no coverage metadata enters calculations, receipts or storage.
Missing/failed completeness retains a qualified Intl-verified reference. Detected
provider contradictions refuse it. Known-time and no-city UTC Moon paths remain
unchanged; no alternative reference or Sun/Moon sign certainty is inferred.

Draft [#481](https://github.com/ZodiacsOfficial/site/pull/481) is delivered at
`370fddf7224053ca42d0942945d850ab5b8d608c`, tree
`8dc403a558a83fae15950fc54f8a5978c6da7b13`. Final main remains `87f18e0a`;
GitHub's tested merge tree equals the candidate tree. All 14 jobs pass in
[Site Check 34768985284](https://github.com/ZodiacsOfficial/site/actions/runs/34768985284).
The [exact-source protected preview](https://zodiacs-oz3qdp29g-zodiacsofficial.vercel.app/birth-chart/)
is READY and verified for known/unknown reference replacement, skipped-date refusal
and recovery, repeated/disconnected dates and retained uncertainty. Existing
preview authentication/protection is unchanged. No retry or gate waiver was needed.

L2b is implemented, tested, preview-verified and ready for draft review. It is not
merged or production-deployed; external adoption is unclaimed. The remote source
stays fixed while final closeout records are committed locally and mirrored to the
shared checkpoint, with final results in the PR description.
[Runtime/date policy contract](evidence/l2b-date-coverage/CONTRACT.md),
[verification record](evidence/l2b-date-coverage/README.md),
[preview observations](evidence/l2b-date-coverage/PREVIEW.md).

Native completeness is conditional on the host transition contract and timezone
model. Missing/failed coverage remains unresolved; detected provider contradictions
refuse. Whole-date Sun/Moon certification remains unimplemented. There is no
remaining draft-delivery blocker. SDK merge/npm publication remains held;
L3–L6, Astrofolio and Zodia remain excluded.

## Previous release — L2a production-verified

The owner approved site-only PR #480 at `2e7b676d5026aaeaa78fc9b541b01972a7c81424`.
Head and main were unchanged, all 14 candidate jobs passed, and the exact-source
preview evidence remained valid. Marked ready and merged as
`87f18e0a101b96abf847be58e8a0c31a691992f8`; tree
`0305b08b378d6c9ae470e0f621a9ce1ecb532f98` equals the approved tree exactly.

Production `dpl_44tNRbymWxhKRRhUwg92gv945paY` is READY on zodiacs.org and www.
Live known/unknown-time chart replacement, neutral automatic naming, Today, Profile,
uncertainty copy and exact current-edition publication checks pass. Numerical and
receipt comparisons reuse valid unchanged-source evidence. No release regression
found; rollback baseline `dpl_DRnrXu34g9od11bzmgoYCb368QYr` was recorded before merge.
Automatic [post-merge CI](https://github.com/ZodiacsOfficial/site/actions/runs/34765077240)
passed all 14 jobs. Production verification and release closeout are complete.

[Release evidence](evidence/l2-production/README.md).
SDK merge/npm publication remains held. Complete-date intervals stay inactive in production;
L3–L6, Astrofolio and Zodia remain excluded. L1 remains released and verified.
The [pre-release checkpoint](STATUS-2026-09-13-pre-l2-release.md) retains the earlier draft status.

## Historical L2a draft delivery — superseded by release above

Draft [#480](https://github.com/ZodiacsOfficial/site/pull/480) is delivered at
`2e7b676d5026aaeaa78fc9b541b01972a7c81424`, tree
`0305b08b378d6c9ae470e0f621a9ce1ecb532f98`, against unchanged main
`0490c4f8a92f045417d7f81ed502f0789e8ecdc2`. GitHub's tested merge tree equals the
candidate tree. All 14 hosted jobs pass in
[Site Check 34759307903](https://github.com/ZodiacsOfficial/site/actions/runs/34759307903),
including 5,145 tests, 15 visual cases, 30 Lighthouse routes and both widget gates.
No hosted retry or budget waiver was needed. The exact-source
[protected preview](https://zodiacs-5btqxmpa6-zodiacsofficial.vercel.app/birth-chart/)
is READY and verified for known/unknown chart replacement, neutral automatic naming,
Today, Profile and Russian Profile. Existing authorization/protection was preserved.

L2a is implemented, tested, preview-verified and review-ready. It remains a draft,
unmerged and not production-deployed. Calculation receipts and contact receipt strings
are unchanged; newly saved forecast text intentionally gains uncertainty wording.
Complete-date interval activation remains separate. SDK merge/npm publication remains
held; no L3–L6, Astrofolio or Zodia work is included. Two inherited moderate development-only
Vitest/mocker advisories remain below the unchanged gates; production audit is clean.

[Evidence](evidence/l2-reference-sun/README.md),
[preview observations](evidence/l2-reference-sun/PREVIEW.md), [remaining work](REMAINING.md).
Final closeout records are committed locally and mirrored to the shared checkpoint;
the remote PR stays on the exact verified source with final results in its description.

## Current delivery state

- **L1:** merged and production-verified, all post-merge jobs passed.
- **L2a:** owner-approved, merged and production-verified; all 14 post-merge jobs passed.
- **L2b:** owner-approved, merged and production-verified; all 14 post-merge jobs passed.
- **Complete-date coverage:** conditionally active under the native provider contract; no whole-date Sun/Moon certainty claim.
- **SDK:** vendored rc.6 engine and optional read-only ownership SDK preserved;
  merge/npm publication held. External adoption is unclaimed.

[Finite remaining checklist](REMAINING.md), [PLAN](PLAN.md),
[DECISIONS](DECISIONS.md), [EVIDENCE](EVIDENCE.md).
The [pre-L2 checkpoint archive](STATUS-2026-09-13-pre-l2.md) preserves earlier
pending-release/outage states as historical evidence, superseded by this checkpoint.
