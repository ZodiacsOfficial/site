# Finite remaining platform checklist

Current checkpoint: 2026-09-14. L2a and L2b are released and production-verified; all post-merge gates passed.
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

## Current L3 work — first dependent slice

- [ ] **L3a — Inactive durable receipt store:** integrate reviewed #426 record
  codec/transaction guards, persist owner/device erasure intent before purge,
  fence all normal transactions, preserve failures for explicit recovery, and
  refuse incompatible old/future storage intact. Complete local/native/hosted
  checks and exact-source preview; no product storage activation.
- [ ] **L3b — Authoritative lifecycle integration:** existing lease/auth/access
  coordinator across guest, account and retained scopes; asynchronous receipt
  discovery before owner handoff; awaited owner/device deletion and retry;
  explicit readmission/generation policy after terminal erasure.
- [ ] **L3c — Complete user lifecycle:** explicit save, receipt inventory,
  byte-preserving local export, per-record/owner/device deletion, recoverable
  error states and uncertain-create reconciliation. Prove actual synthetic user
  flows and account races together before activating storage. Do not migrate,
  downgrade, relabel or reconstruct legacy records.

[Concrete dependencies](evidence/l3-saved-records/ACTIVATION-DEPENDENCIES.md).
L3b/L3c are dependencies for a future bounded implementation, not claims of work
completed in L3a. This draft stops after L3a verification.

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

L3a implementation and draft verification are authorized. No merge, publication,
production deployment, L4–L6, spending or outreach is authorized here.
