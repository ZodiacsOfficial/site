# Finite remaining platform checklist

Current checkpoint: 2026-09-13. L2a is released and production-verified; all 14 post-merge jobs passed.
Historical source-specific evidence remains linked from [STATUS](STATUS.md).

## Completed release work

- [x] **R1/R2:** dependency/current-edition maintenance and hosted gates completed in
  [#469](https://github.com/ZodiacsOfficial/site/pull/469).
- [x] **R3:** accepted site/SDK integration drafts verified. Site-only
  [#471](https://github.com/ZodiacsOfficial/site/pull/471) released with pinned rc.6;
  SDK integration remains under its merge/npm hold.
- [x] **L1:** [#476](https://github.com/ZodiacsOfficial/site/pull/476) merged as
  `307c832e662e1996ee904f11fb1678e402808a03`; production verified, all 14 post-merge
  jobs passed. Current main `0490c4f8` preserves the released runtime.
  [Release evidence](evidence/l1-production/README.md).

## Current bounded L2 work

- [x] **L2a — Downstream unknown-time reference-Sun interpretation.** Withhold
  unverified automatic sign personalization, qualify reference readings and names,
  preserve known-time/manual choices and numerical/receipt bytes. Released [#480](https://github.com/ZodiacsOfficial/site/pull/480)
  at `2e7b676d`: all 14 hosted jobs and exact-source protected preview pass.
  Merged as `87f18e0a`; production flows verified. All 14 automatic post-merge jobs passed.
  [Release evidence](evidence/l2-production/README.md).
- [ ] **L2b — Conditional complete-date interval activation (draft in progress).**
  Native contract, explicit date policies and reference-only caller activation are
  implemented; local/hosted checks and exact-source preview are being completed.
  No sampled completeness, replacement instant or Sun/Moon sign certification.
  [Contract](evidence/l2b-date-coverage/CONTRACT.md). No merge or production deployment.

## Later features — outside this slice

- [ ] **L3 — Rich saved receipts:** integrate inactive #426 only with owner/access
  generations, legacy compatibility, discovery, export, deletion and failure recovery.
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
- [ ] **SDK merge/npm publication:** explicit hold remains; not required for the
  already-vendored site path. Any future publication requires separate authorization
  and external registry/artifact verification.
- [ ] **Recommended external reviews:** practitioner, outside-counsel and native-speaker
  reviews remain unclaimed; these were not universal mandatory site-release signatures.
- [ ] **O4 — External adoption:** authorized unfamiliar-developer walkthroughs/outreach
  and real integrations/feedback/retained use remain unestablished.
- [x] **O5 — Zodia exclusion:** owner-approved exclusion/archive is complete and has
  no gate in this session. Astrofolio remains a separate workstream.

No L3–L6 work, merge, publication, production deployment, spending or outreach is authorized here.
