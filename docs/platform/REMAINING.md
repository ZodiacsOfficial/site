# Finite remaining platform checklist

Current checkpoint: 2026-09-16. L2a and L2b are released and production-verified; the L3b/c candidate and the usability fixes are on the branch, reviewed by automated adversarial review and inactive by flag.
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
- [ ] **L3 review and activation:** [#490](https://github.com/ZodiacsOfficial/site/pull/490).
  Three bounded AI reviewers ran against `ed585d3c`; their two release-blocking
  findings, the merge blocker and the product findings are closed, each with a
  test that reproduces the original gap
  ([REVIEW-2026-09-16](evidence/l3-saved-records/REVIEW-2026-09-16.md),
  [product](evidence/l3-saved-records/REVIEW-2026-09-16-product.md)). The
  off → on → off → on flag sequence is gated
  ([ROLLBACK](evidence/l3-saved-records/ROLLBACK.md)). Remaining: merge, deploy,
  verify, then activate `PUBLIC_SAVED_RECORDS_ENABLED=1` and verify again. Still
  open and recorded rather than claimed: no real assistive technology was used
  (the screen-reader findings are measured DOM and ARIA facts); WebKit and real
  iOS Safari were not available, so no Safari claim is made; a hosted preview
  remains blocked by the Vercel production-only build policy, which this branch
  does not change.

[Candidate record](evidence/l3-saved-records/L3BC-README.md),
[plan](evidence/l3-saved-records/L3BC-PLAN.md),
[historical dependencies](evidence/l3-saved-records/ACTIVATION-DEPENDENCIES.md).

## Forward backlog — one list (A–E), reconciled with the L-series

The original A–E acceptance letters and the later L-series checklist described
the same programme twice. They are reconciled here once, and this is now the
only forward list. The L numbers are kept as aliases so older evidence still
resolves.

- [ ] **A — Engine release and support contract** (subsumes L4 and the former
  SDK publication hold). Bounded numerical and support work for the advertised
  release: recorded ranges, degenerate angles, invalid inputs, timezone limits
  and bounded return/event searches, validated against independently sourced
  reference cases with matched conventions. Then the release version, exact
  artifact, retained notices and a clean external installation.
  **State:** `@zodiacs/engine@0.1.1-rc.6` is built, vendored and verified
  (artifact SHA-256 matches its record, and a clean external project installs
  the exact tarball and computes an ordinary natal chart through the documented
  public entry points). It is **not published**: `@zodiacs/engine` returns 404
  from the public registry and this environment holds no npm credentials.
  See [the engine release record](evidence/engine-release/README.md).
- [ ] **B — Developer onboarding and existing public data.** An ordinary
  successful chart first, advanced verification after; a working demonstration
  on the real engine; documented setup verified from a clean environment;
  freshness, schema, timestamp, coverage, caching, attribution and stale/error
  behaviour for the shared-sky API; the lightweight embed path kept private,
  isolated, keyboard-operable and attributed. Public data and local
  calculations stay useful with no wallet, token or account.
- [ ] **C — Narrow hosted beta** (alias L5). Natal-chart and transit-snapshot
  operations only, on the shared validated engine, behind explicit schemas,
  input/date/duration/concurrency limits, authentication or tightly bounded
  demonstrator access, quotas, cancellation and dependency-failure behaviour,
  no secrets in browser bundles, no birth details or credentials in logs, no
  personal responses in public caches, no automatic persistence, measured
  latency and bounded cost, health checks, release identity and tested rollback.
- [ ] **D — First diagnostic and real agent integration** (alias L6). The
  bounded chart-difference explainer over validated receipts, numbers before
  prose, every explanation classified as established from metadata, reproduced
  by controlled recalculation, hypothesis, or unresolved; false confident
  explanations measured, not just successes. Then a thin agent adapter over
  existing functions, verified against an actual supported client, with
  deterministic calculation never routed through a model.
- [ ] **E — Adoption and reference materials.** Source-backed reference and
  contribution materials prioritising chart differences, calculation
  assumptions, uncertainty and integration examples; AI-generated editorial work
  identified as such; an invitation for independent builders through an existing
  approved contact path; onboarding tasks, a feedback template and a prospect
  packet prepared but not sent; an adoption ledger separating prospect, trial,
  independently live, retained and paying.

Birth-time sensitivity, broad generated interpretation, new traditions,
marketplaces and large content programmes are later opportunities, not
dependencies of this release.

## Owner and external gates

- [x] **O1/O2/O3 for released site #471 and L1:** exact owner approval and production
  verification recorded; no pending L1 human-review or production gate remains.
- [x] **L2a owner release approval:** exact candidate `2e7b676d` approved and released.
- [x] **L2b release:** exact candidate `370fddf` approved and released through #481.
- [x] **Human engineering review:** superseded on 2026-09-16. The owner replaced
  it with evidence-based automated adversarial review for this programme
  ([D-2026-09-16](DECISIONS.md)). AI review is recorded as AI review; no human,
  practitioner, attorney, customer or independent-auditor signoff is claimed.
- [ ] **Engine npm publication:** authorized by the owner, blocked by the
  environment. `npm whoami` fails with `ENEEDAUTH`, there is no `~/.npmrc` and
  no token in the environment, so the publish step cannot run from here. The
  smallest missing action is an npm automation token with publish rights to the
  `@zodiacs` scope (or a maintainer running `npm publish` from the prepared
  artifact). Attaching `ZodiacsOfficial/sdk` for push was also denied by the
  session's permission layer; the repository can be read but not written.
- [ ] **Recommended external reviews:** practitioner, outside-counsel and
  native-speaker reviews remain unclaimed and are not release signatures.
- [ ] **O4 — External adoption:** real integrations, feedback and retained use
  remain unestablished. A model testing our own example is not a customer.
- [x] **O5 — Zodia exclusion:** owner-approved exclusion is complete. Astrofolio
  Verification & Provenance remains a separate workstream.
