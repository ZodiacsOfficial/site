# Zodiacs Platform status

Checkpoint: 2026-09-07 UTC (2026-09-08 Asia/Bangkok). Stage A and bounded B03 implementation complete; final combined suite passed; review/preview delivery in progress. Owner mandate: `ZODIACS-PLATFORM-MASTER-BRIEF.md` v1.0.

## Current delivery

- Shared engine correction and input/search hardening: **implemented and tested**,
  [SDK draft PR #6](https://github.com/ZodiacsOfficial/sdk/pull/6), source
  `03bf77990f3014b9125eed4976d7a41200aac80d`, stacked on held expansion PR #5.
- Candidate `@zodiacs/engine@0.1.1-rc.1`: packed, installed in a clean external
  directory, public ESM/types/examples/notices and optional-dependency isolation
  passed. SHA-256 `f95c887deedb55f64b185ed4dd406b580b6d3287656ab5ec0557215fc02e5d17`.
- Site branch `codex/platform-stage-a` pins those exact bytes, removes its local
  polar correction, preserves legacy saved-chart migration, and regenerates
  TypeDoc with the approved footer. Original 0.1.0 and intermediate rc.0 artifacts
  remain immutable. See [vendor provenance](../../vendor/README.md).
- SDK: 295 tests / 26 files and required workspace gates passed. Independent
  site node/polar reference comparisons pass on Node 22 and 24; finite scope,
  unchanged references/tolerances, no human certification. Site: **4,410 tests / 403 files**, check and full build passed; 18 mobile/desktop
  acceptance captures and calculation/sharing browser flows passed.
  Details and limits are in [EVIDENCE](EVIDENCE.md).
- **Not release-ready for an unrestricted launch, not published to npm, not
  merged or deployed, and not externally adopted.** Source PRs and local
  previews are not releases. Required review and precise broader numerical
  support/range decisions remain open.

## Refreshed baseline and capability

- Site main/production: `7f953e3fca0e7d5009e5602a1dad69edff0f54cc`.
  This initially clean worktree began at older `95ccfc67`, then fetched current
  main before isolated branch work. Refreshed again before integration.
- SDK main: `b49e0f14f9f17bc84db39486f2c4bb075e0ae3ff`; expansion
  [PR #5](https://github.com/ZodiacsOfficial/sdk/pull/5) head
  `cced011659d48877b8b73b8a85796815234cf741`, draft, explicit **do not merge,
  do not publish**. No submitted review or later hold resolution found.
- Production: Vercel `dpl_BrntzbFYa2gzetKWgeq91GFeaM6W`, READY, alias
  `zodiacs.org`, ready `2026-09-07T15:59:50Z`, same site main SHA. Production
  project uses Node 24.x; site CI requires Node 22.
- GitHub/Vercel reads, isolated source writes, dependency installation, CLI
  branch pushes/draft PRs, tests and actual Chrome browser verification work.
  Sandboxed network fails; reviewed network access succeeds. GitHub connector
  writes return 403, but reviewed `gh` CLI authentication and PR creation work.
  Connector protection reads return 403; later CLI reads show enforced site
  PR protection, zero required approving reviews, force pushes disabled and no
  required status checks; SDK main reports unprotected. The explicit hold and
  owner-reviewed PR path still apply.
- Public npm engine and widgets lookups returned E404 on 2026-09-07. No npm
  publication capability or authorization is inferred from repository access.

## Preservation, overlaps and holds

- SDK PR #4 overlaps ownership SDK/root release docs. Ownership exports, root
  dependencies, read-only behavior and React-free core remain unchanged.
- Site PR #289 overlaps footer/developers/package manifest; PR #413 overlaps
  Vercel/routes/generated assistant context. Open branches do not prove active
  sessions. This work avoids protected persona, Registry facts, native apps,
  footer redesign and unrelated deployment settings.
- Existing main/PR #5 CI passed. Auxiliary SDK Vercel project `sdk-zodia-launch`
  fails for both old heads (missing `public` output); it is pre-existing. SDK
  app/example production dependency audit has 59 advisories, including 21 high;
  candidate engine consumer has none. See evidence for exact scope.
- External review, publication authority and explicit hold resolution block
  merge/publication. They do not block documentation, tests or a candidate.
  No outreach, new spending, access changes or destructive operations occurred.

## Runnable continuation

Read [PLAN](PLAN.md), [DECISIONS](DECISIONS.md) and [EVIDENCE](EVIDENCE.md).
Stage A checkpoint `40d3f9647a31afc20db007b7cd5269eb4ef73b6a` is committed.
B03 now has a runnable validated example, corrected generated documentation,
39 focused tests, successful live API execution and desktop/mobile page proof.
Combined suite: **4,431 tests / 404 files, no skips**, passed. Final keyboard-scroller browser check passed. Commit B03, then push the
companion draft PR and verify CI/preview while preserving the SDK hold.
Continue only dependency-ready work; hosted execution depends on the reviewed
contract, privacy and limits. No background execution after this session is implied.
