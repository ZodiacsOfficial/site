# Finite remaining platform checklist

Current checkpoint: 2026-09-14. L2a and L2b are released and production-verified; the L3b/c candidate and the usability fixes are on the branch, unmerged and inactive by flag.
Historical source-specific evidence remains linked from [STATUS](STATUS.md).

## Completed release work

- [x] **R1/R2:** dependency/current-edition maintenance and hosted gates completed in
  [#469](https://github.com/ZodiacsOfficial/site/pull/469).
- [x] **R3:** accepted site/SDK integration drafts verified. Site-only
  [#471](https://github.com/ZodiacsOfficial/site/pull/471) released with pinned rc.6;
  SDK integration remains under its merge/npm hold.
- [x] **L1:** [#476](https://github.com/ZodiacsOfficial/site/pull/476) merged as
  `307c832e662e1996ee904f11fb1678e402808a03`; production verified, all 14 post-merge
  jobs passed. The subsequent L2a release preserves the L1 runtime.
  [Release evidence](evidence/l1-production/README.md).

## Current bounded L2 work

- [x] **L2a — Downstream unknown-time reference-Sun interpretation.** Withhold
  unverified automatic sign personalization, qualify reference readings and names,
  preserve known-time/manual choices and numerical/receipt bytes. Released [#480](https://github.com/ZodiacsOfficial/site/pull/480)
  at `2e7b676d`: all 14 hosted jobs and exact-source protected preview pass.
  Merged as `87f18e0a`; production flows verified. All 14 automatic post-merge jobs passed.
  [Release evidence](evidence/l2-production/README.md).
- [x] **L2b — Conditional complete-date interval activation (released).**
  [#481](https://github.com/ZodiacsOfficial/site/pull/481) at `370fddf7224053ca42d0942945d850ab5b8d608c`:
  native contract, explicit ordinary/skipped/repeated/disconnected-date policies and
  reference-only caller activation implemented. All 14 hosted jobs and the exact-source
  protected preview pass. No sampled completeness, replacement instant or Sun/Moon
  sign certification. Known-time behavior and numerical/receipt bytes are preserved.
  [Contract and limitations](evidence/l2b-date-coverage/CONTRACT.md),
  [release evidence](evidence/l2b-production/README.md). Owner-approved and merged as
  `dfeae5f9178a6d887209710083c2a74fae258236`; exact approved tree deployed and verified
  on apex/www, with all 14 automatic post-merge jobs passed.
  Runtime absence/failure remains uncertain; broader historical truth and complete
  astronomical sign-range evidence are not established by this date-coverage slice.

## Current L3 work — candidate on branch, inactive by flag

- [x] **L3a — Inactive durable receipt store:** draft #486 (`99d22482`) merged
  verbatim into the candidate branch; its native barriers are superseded by the
  admission-generation protocol below.
- [x] **L3b — Authoritative lifecycle integration (candidate):** durable admission
  generations with two-phase, target-bound erasure (`650768a9`); strict record
  capability derived from the existing lease/grant/marker coordinator across
  guest, account and retained scopes, content-free discovery before the empty-browser
  auto-bind, awaited erasure inside sign-out, hand-off and deletion transitions
  (`f1efe17f`); owner intents pinned to the device generation, store-enforced
  read-only, cross-tab scope announcements (`35da3485`).
- [x] **L3c — Complete user lifecycle (candidate):** explicit keep on the result,
  records panel under Profile (six locales), exact-byte download, per-record and
  listed-namespace removal, recovery of interrupted removals, explicit readmission,
  uncertain-keep reconciliation; 12-check browser journey and a flag-on CI job
  (`b5666134`). Legacy records are never migrated, relabeled or reconstructed.
- [x] **L3 deletion and activation hardening (2026-09-15):** module load
  failure blocks destructive cleanup; absence re-checked under the exclusive
  transition; single removals broadcast; feedback bound to its namespace; real
  bootstrap/panel browser journeys with intercepted auth and backend,
  unknown-time keep, 40-record refusal, Firefox native and lifecycle runs
  ([HARDENING-2026-09-15](evidence/l3-saved-records/HARDENING-2026-09-15.md)).
- [ ] **L3 review and activation:** draft
  [#490](https://github.com/ZodiacsOfficial/site/pull/490) is open; hosted
  checks on the hardened candidate and human review are pending. A bounded
  preview build needs an owner decision under the Vercel production-only
  policy. Activation (`PUBLIC_SAVED_RECORDS_ENABLED=1`) is a separate release
  decision. Still open: hydrated interaction tests for the records panel (its
  states are covered by the browser drives only); the account-coordinator
  drive has run in Chromium only.

[Candidate record](evidence/l3-saved-records/L3BC-README.md),
[plan](evidence/l3-saved-records/L3BC-PLAN.md),
[historical dependencies](evidence/l3-saved-records/ACTIVATION-DEPENDENCIES.md).

## Later features — outside this slice

- [ ] **L4 — Wider numerical/support hardening:** recorded range, degenerate-angle,
  hostile-input and return-search limitations remain before broader support claims.
- [ ] **L5 — Narrow hosted beta:** requires reviewed contracts and explicit privacy,
  retention, abuse, quota, cost, failure and rollback boundaries.
- [ ] **L6 — Diagnostics/adoption tooling:** bounded discrepancy workflow and actual
  supported client verification; wider traditions/marketplaces/content remain deferred.

## Owner and external gates

- [x] **O1/O2/O3 for released site #471 and L1:** exact owner approval and production
  verification recorded; no pending L1 human-review or production gate remains.
- [x] **L2a owner release approval:** exact candidate `2e7b676d` approved and released.
  Production and automatic post-merge CI closeout completed; no further L2a approval needed.
- [x] **L2b release:** exact candidate `370fddf` approved and released through #481.
  Production, rollback readiness and all 14 automatic post-merge jobs verified.
  No further L2b release approval or verification gate remains.
- [ ] **SDK merge/npm publication:** explicit hold remains; not required for the
  already-vendored site path. Any future publication requires separate authorization
  and external registry/artifact verification.
- [ ] **Recommended external reviews:** practitioner, outside-counsel and native-speaker
  reviews remain unclaimed; these were not universal mandatory site-release signatures.
- [ ] **O4 — External adoption:** authorized unfamiliar-developer walkthroughs/outreach
  and real integrations/feedback/retained use remain unestablished.
- [x] **O5 — Zodia exclusion:** owner-approved exclusion/archive is complete and has
  no gate in this session. Astrofolio remains a separate workstream.

L3b/c implementation and draft verification were authorized and are delivered on the branch. No merge, publication,
production deployment, flag activation, L4–L6, spending or outreach is authorized here.
