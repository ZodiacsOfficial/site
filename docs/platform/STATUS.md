# Zodiacs Platform status

Checkpoint: 2026-09-07 UTC (2026-09-08 Asia/Bangkok). Activated owner mandate:
`ZODIACS-PLATFORM-MASTER-BRIEF.md` v1.0. Stage A candidate and B01/B02/B03
are implemented and tested in draft PRs. The bounded C02 import/time
correction and a separate SDK GeoNames retry candidate are delivered. The overall program is open.

## Review deliveries

| Scope | Exact review source | Evidence / state |
| --- | --- | --- |
| A02/A03 engine correction | SDK [draft #6](https://github.com/ZodiacsOfficial/sdk/pull/6), `03bf77990f3014b9125eed4976d7a41200aac80d` | 295 tests/26 files; required workspace and clean package-consumer gates pass. Stacked on held SDK #5. |
| A02/A05 site parity + B03 shared sky | Site [draft #415](https://github.com/ZodiacsOfficial/site/pull/415), `4bb0d70eaaf21ea950a8fe708a0e1a91f8fb1f4f` | 4,447 tests/405 files; all 14 CI jobs passed in run 34156030961. Exact READY preview passed 59 Today checks. |
| B01/B02 developer entry/support/examples | Site [draft #417](https://github.com/ZodiacsOfficial/site/pull/417), `8343f173e4db2e8ab6628bd04590e41b056872ce` | 4,493 tests/407 files; fresh public starter, 185 browser checks and literal rendered setup pass. Exact READY preview passed all three developer-page journeys. All 14 CI jobs passed in run 34159295138. |
| C02 civil imports/timezones | Site [draft #418](https://github.com/ZodiacsOfficial/site/pull/418), `a4284d8d6289ed6abfe30d2da883ad07edcfc7bd` | 4,624 tests/408 files; all local gates, 18 captures, 12 share journeys, existing export and 962 compatibility checks pass. Exact READY preview passes all 12 journeys. All 14 jobs passed in exact-head CI 34161649806. |
| A02/A03 GeoNames recovery | SDK [draft #7](https://github.com/ZodiacsOfficial/sdk/pull/7), `4f8903415e95a60969e84f7eb91e72f2f61ad315` | Separate engine rc.2, 305 tests/27 files on Node 20/22, all workspace gates, two clean packed consumers and 96 chart parity cases pass. Immutable public artifact verified. Stacked SDK CI does not trigger; local evidence is explicit. |
| B02/C02 local receipt integration | Site [draft #419](https://github.com/ZodiacsOfficial/site/pull/419), delivery source `83bd8aad212e846815eebb07bd3b59fa1c28e1c1` | Starter rc.3: 21 files verified, 113 archive tests, 39 fresh-consumer checks, 231 actual Chrome assertions and literal public setup pass. Site: 4,699 tests/408 files, build/check/scope pass. Exact READY preview and 40 native 200%/400% zoom checks pass. Exact-source CI has 13 passing jobs; Build & Check is still running. |
| A04/C02 draft natal receipts | SDK [draft #8](https://github.com/ZodiacsOfficial/sdk/pull/8), runtime source `aaade67d0d49e8b10d1bc5c59cf345d6106dc270` | Separate engine rc.3, 429 tests/29 files on Node 20/22, required gates, two clean packed consumers, 96 parity cases and 23 actual offline Chrome codec checks pass. Immutable public artifact verified. Account v1/site integration is not completed by this codec. |

Site application engine `0.1.1-rc.1` SHA-256:
`f95c887deedb55f64b185ed4dd406b580b6d3287656ab5ec0557215fc02e5d17`.
Original 0.1.0, intermediate rc.0 and rc.1 bytes are immutable. The public
starter `0.1.0-rc.2` is anonymously downloadable at commit `80dff5f1`; its
SHA-256 is `d409a395966e78b3ddc0604d75d4a836477987d99814ff786f55aee9e464e420`.
The new standalone starter `0.1.0-rc.3` is publicly downloadable at distribution
commit `dd5d83cdf2a2a5d7096175f01ce985b47824a376`, SHA-256
`facafd75a8366a69dfae7397c9c2c68ee636987fb25d479ef380533408bd8d8a`.
It contains SDK engine rc.3 independently of the site pin.
[Artifact identity and provenance](../../vendor/README.md),
[all commands, receipts and limits](EVIDENCE.md).

**These are implemented/tested review candidates and previews. They are not
merged, npm-published, deployed to production, externally adopted, or approved
for an unrestricted launch.** The downloadable starter is publicly available;
that does not mean the engine is published to npm. Internal timing is not
external onboarding or adoption evidence. Finite numerical tests and actual
model-assisted reviews are not human expert certification.

## Release truth and preservation

- Refreshed again during receipt-starter delivery: site main remains
  `7f953e3fca0e7d5009e5602a1dad69edff0f54cc`; SDK main remains
  `b49e0f14f9f17bc84db39486f2c4bb075e0ae3ff`.
- Production remains READY deployment `dpl_BrntzbFYa2gzetKWgeq91GFeaM6W`,
  alias `zodiacs.org`, source `7f953e3f`; project runtime Node 24.x, CI Node 22.
- SDK [#5](https://github.com/ZodiacsOfficial/sdk/pull/5) remains draft at
  `cced011659d48877b8b73b8a85796815234cf741`, no submitted reviews, explicit
  **do not merge / do not publish** hold. Owner-reviewed release and package
  publication authorization remain missing. No merge/publication was attempted.
- Latest recorded public npm engine/widgets lookups returned 404; optional
  ownership `@zodiacs/sdk` remains 1.0.1. Ownership exports, dependencies,
  read-only behavior and React-free core are preserved.
- Approved Cosmic Void layout/fonts/footer, current functionality, persona,
  Registry facts and native apps are preserved. SDK #4 overlaps ownership/root
  release docs. Site #289 concerns footer work; #413's additive birthday
  inventory/sitemap entries must survive later integration. #416's Astrofolio
  status-only change has no overlap. No other contributor branch was modified.
- Existing SDK app/example audit: 59 advisories (21 high); isolated engine and
  starter consumers: zero at verification. Auxiliary `sdk-zodia-launch` preview
  failure is pre-existing missing `public` output. Neither is concealed by the
  passing primary SDK preview or local gates.
- Reviewed network access, branch pushes and draft PR creation work through CLI.
  Connector writes return 403. There was no outreach, spending, access change,
  destructive migration or production operation.

## Next dependency-ordered work

Read [PLAN](PLAN.md), [DECISIONS](DECISIONS.md) and [EVIDENCE](EVIDENCE.md).
C02 exact-head CI and preview evidence are complete for draft #418. Active site branch is
`codex/platform-receipt-contract`, based on delivered #418; its checkpoint
records the completed deliveries. A new optional SDK draft natal-envelope
codec is delivered in SDK draft #8 on its own `codex/platform-receipt-contract`
branch. Engine rc.3 SHA-256 is
`aeab68793129517abe7498c5f5a17197d387eed7cbdaa9614f3b8cd939b11a17`.
It does not change site pins, account sync or stored records. Standalone local
receipt export/import/redaction is now implemented and tested in site draft #419.
The immutable rc.3 archive and anonymous URL match; actual fresh installation,
all three examples, public setup failures and affected developer-page journeys
pass. Exact READY preview acceptance and all 40 native 200%/400% zoom checks pass.
The exact-source CI Build & Check job is still running; 13 other jobs pass. The next independent Stage A follow-up is testing
structurally invalid fulfilled GeoNames data and cache integrity in an isolated
SDK checkout; no new SDK artifact or delivery is claimed for that work yet.
Invalid civil
fields and missing timezones now fail before normalization; failed saved-chart
recomputation retains its old receipt without rewriting storage.

The next C02 contract slice must preserve requested versus actual houses through
save, rerun, export and sync. The tempting remote-label-only fix was withdrawn:
its synthetic round trip loses requested Placidus intent. Preserve that
[defect and counterexample](evidence/c02-remote-house-analysis.md). Do not infer
legacy intent or change canonical sync fingerprints without compatibility tests.
GeoNames rejected-request recovery is delivered as separate rc.2, SHA-256
`b5c0c63bddc8c1ccfc717551bdd57b1bfe7c439568851780575c8586456e0826`.
Its structurally invalid but parseable JSON/cache policy remains a follow-up;
site rc.1 adoption is a separate reviewed pin, not an automatic update; the standalone rc.3 starter now includes this recovery through SDK rc.3.

Hosted execution remains dependent on reviewed contracts and explicit
privacy/limits. Continue independent authorized work during review waits.
The outstanding B04 publisher-widget matrix now passes 74 actual Chrome checks,
native 200%/400% zoom and keyboard scrolling, reduced motion, real offline and
privacy/style-isolation controls. No source defect required a widget rewrite;
this is finite Chromium acceptance, not assistive-technology certification.
The current worktree contains the next receipt-contract checkpoint; no background execution after this session is implied.
