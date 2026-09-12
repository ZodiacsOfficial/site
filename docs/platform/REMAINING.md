# Finite remaining platform checklist

Checkpoint:2026-09-12. This closes C-016; it does not start another audit or
implementation stream. [STATUS](STATUS.md) is the current release record;
[PLAN](PLAN.md) preserves the longer dependency history. Checked engineering
work is distinct from permission, public release and external adoption.

## Release blockers and integration work

- [ ] **R1 — Security and current-edition integration.** The accepted draft's
  audit now reports five vulnerable production packages. A preserved minimum-
  version lockfile proposal clears both audit gates, but its fresh build requires
  current paired daily/Registry publication data and exposes three existing
  Registry research test failures. Resolve this bounded integration without
  weakening freshness, approval, immutable-item or market-provenance assertions.
  The proposal is not integrated into[#438](https://github.com/ZodiacsOfficial/site/pull/438).
- [ ] **R2 — Close remaining hosted gates after R1.** Complete performance and
  the previously skipped foreign-origin/widget-performance checks on the corrected
  tree, plus the build/render checks and preview that its dependency/data changes
  invalidate. Retain valid unchanged-source evidence. Attempt1's two performance
  outliers and attempt2's advisory failure remain; no blind retry or lowered budget.
- [ ] **R3 — Final release-stack integration.** Reconcile the selected reviewed
  site/SDK branches against the then-current main branches in an isolated branch,
  preserve concurrent work, verify final artifact/pins/rollback, and run only
  invalidated checks. Candidate green checks do not certify an untested merged
  tree. Actual merges/publication require O1. Inspect the actual Astrofolio draft
  and changed paths before any shared integration; its release stays separate.

## Later corrections and features — not added to C-016

- [ ] **L1 — Full-result phase-name consistency.** Apply existing categories to
  retained full values, with exact boundary tests. Preparation is retained in
  scratch; no C-017 implementation is integrated or accepted. Do not change the
  retained angle through a second normalization or silently alter lite/live displays.
- [ ] **L2 — Unknown-time interpretation and date coverage.** Correct downstream
  reference-Sun context where needed. Activate the already-reviewed inactive
  interval prerequisite only after complete-provider/runtime and skipped/repeated
  date policies are accepted. Sampling is not proof of whole-date certainty.
- [ ] **L3 — Rich saved receipts.** Integrate inactive[#426](https://github.com/ZodiacsOfficial/site/pull/426)
  only with owner/access generations, legacy compatibility, discovery, export,
  deletion and failure recovery. Keep existing profile writes working.
- [ ] **L4 — Wider numerical/support hardening.** Resolve the recorded range,
  degenerate-angle, hostile-input and return-search limitations before claiming
  broader support or event completeness. Current finite evidence stays bounded.
- [ ] **L5 — Narrow hosted beta.** After reviewed contract readiness, implement the
  selected calculation routes/client with explicit privacy, retention, abuse,
  quota, cost, failure and rollback boundaries. No new paid service is assumed.
- [ ] **L6 — Diagnostics and adoption tooling.** Add the bounded discrepancy/
  agent workflow and remaining integration materials against actual available
  artifacts; verify a real supported client. Broader traditions, marketplaces
  and large content programs stay deferred rather than becoming release dependencies.

## Owner and external gates

- [ ] **O1 — Release authority.** Obtain approval for the exact merge/publication/
  production actions. SDK[#5](https://github.com/ZodiacsOfficial/sdk/pull/5) remains
  explicitly **do not merge / do not publish** atcced0116 on2026-09-12. No implicit
  approval follows from local tests, previews or this checklist.
- [ ] **O2 — Required human review.** Obtain the practitioner/numerical, legal/
  licensing and language review required for the chosen public scope. Model-assisted
  checks and finite reference comparisons are not those human signoffs.
- [ ] **O3 — Verify actual public release.** After O1, verify the public registry
  artifact from a clean external project, production version/behavior and rollback.
  A public candidate download or READY preview is not npm publication or production.
- [ ] **O4 — Verify adoption.** Arrange authorized unfamiliar-developer walkthroughs
  and outreach; record real integrations, feedback and retained use. No external
  adoption, paying pilot, endorsement or commercial agreement is established here.

This closeout starts no additional workstream and claims no background
continuation, spending, outreach or production change.
