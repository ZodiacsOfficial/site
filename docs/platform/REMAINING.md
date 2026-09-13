# Finite remaining platform checklist

Current checkpoint: 2026-09-13. This replaces the stale L1 draft/outage status.
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

- [ ] **L2a — Downstream unknown-time reference-Sun interpretation.** Withhold
  unverified automatic sign personalization, qualify reference readings and names,
  preserve known-time/manual choices and numerical/receipt bytes. Implementation
  complete locally; required checks, draft and exact-source preview in progress.
  [Evidence](evidence/l2-reference-sun/README.md). No merge/deployment authorized.
- [ ] **L2b — Complete-date interval activation (separate, not begun).** Establish
  provider completeness, runtime support and skipped/repeated-date policies before
  activating the retained inactive prerequisite. Sampling is not proof of whole-date
  certainty. No whole-date Sun sign certification is introduced by L2a.

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
- [ ] **Future L2 release:** owner review/approval of the final exact candidate before
  merge and resulting production deployment. This task delivers a draft only.
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
