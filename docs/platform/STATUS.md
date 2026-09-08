# Zodiacs Platform status

Checkpoint: 2026-09-07 UTC (2026-09-08 Asia/Bangkok). Activated owner mandate:
`ZODIACS-PLATFORM-MASTER-BRIEF.md` v1.0. Stage A candidate and B01/B02/B03
are implemented and tested in draft PRs. The bounded C02 import/time
correction and a separate SDK GeoNames retry candidate are delivered. The overall program is open.


## Active site rc.5 integration — 2026-09-08 UTC

Branch `codex/platform-engine-rc5` adopts the immutable SDK rc.5 artifact
from `333369256af683c560603dd1e6411dd7a07adb1f`; artifact/evidence carrier
`d63773a3be2b4d40ff28a1075b9aaa9cb6c10793` is local. The ten-file source
slice and durable author logs are implemented; 247 focused checks passed
in the preceding session. Full release gates remain pending.

The preceding full test attempt reported 4,712 passed and five failures:
old daily engine provenance, stale Phase 1 captures, and three five-second
timeouts under parallel load. The unchanged event-horizon focused retry passed.
Those temporary full-run logs did not survive the environment reset, so this
is a carried checkpoint observation, not a newly available raw receipt. Durable
implementation logs under `evidence/site-engine-rc5/implementation/` survive.
No prior temporary reviewer or browser process remains running.

Fresh reads on 2026-09-08: site main is now
`d4d5717d132a28cd6d7cda3007e3b898bb74669f`, with the actual September 8
daily edition and Registry snapshot. Production is READY
`dpl_gqJJR8pNkD3jHFtTmChh55UNvyse`, alias `zodiacs.org`, that exact main
commit. SDK main and draft #5 head/hold remain unchanged; no reviews submitted.
Root is integrating upstream only into this isolated candidate, regenerating
provenance and captures through existing tools, and rerunning affected gates.
The historical delivery records below describe their recorded sources; they
do not establish rc.5 site acceptance or current production adoption.

## Review deliveries

| Scope | Exact review source | Evidence / state |
| --- | --- | --- |
| A02/A03 engine correction | SDK [draft #6](https://github.com/ZodiacsOfficial/sdk/pull/6), `03bf77990f3014b9125eed4976d7a41200aac80d` | 295 tests/26 files; required workspace and clean package-consumer gates pass. Stacked on held SDK #5. |
| A02/A05 site parity + B03 shared sky | Site [draft #415](https://github.com/ZodiacsOfficial/site/pull/415), `4bb0d70eaaf21ea950a8fe708a0e1a91f8fb1f4f` | 4,447 tests/405 files; all 14 CI jobs passed in run 34156030961. Exact READY preview passed 59 Today checks. |
| B01/B02 developer entry/support/examples | Site [draft #417](https://github.com/ZodiacsOfficial/site/pull/417), `8343f173e4db2e8ab6628bd04590e41b056872ce` | 4,493 tests/407 files; fresh public starter, 185 browser checks and literal rendered setup pass. Exact READY preview passed all three developer-page journeys. All 14 CI jobs passed in run 34159295138. |
| C02 civil imports/timezones | Site [draft #418](https://github.com/ZodiacsOfficial/site/pull/418), `a4284d8d6289ed6abfe30d2da883ad07edcfc7bd` | 4,624 tests/408 files; all local gates, 18 captures, 12 share journeys, existing export and 962 compatibility checks pass. Exact READY preview passes all 12 journeys. All 14 jobs passed in exact-head CI 34161649806. |
| A02/A03 GeoNames recovery | SDK [draft #7](https://github.com/ZodiacsOfficial/sdk/pull/7), `4f8903415e95a60969e84f7eb91e72f2f61ad315` | Separate engine rc.2, 305 tests/27 files on Node 20/22, all workspace gates, two clean packed consumers and 96 chart parity cases pass. Immutable public artifact verified. Stacked SDK CI does not trigger; local evidence is explicit. |
| A02/A03 public flags/civil settings | SDK [draft #10](https://github.com/ZodiacsOfficial/sdk/pull/10), source `97f5e8d01828f4b85ffa845825dee9acff4695e4` | Separate engine rc.5: 562 tests/31 files on Node 20/22, required gates, two clean consumers, 480 parity + 480 echo controls, 14 independent probes and 26 packed Chrome acceptance checks pass. Immutable public artifact verified. |
| A02/A03 GeoNames schema/cache integrity | SDK [draft #9](https://github.com/ZodiacsOfficial/sdk/pull/9), source `d190d97c981c7cacc6eb4ab6a49bdb8451ca3459` | Separate engine rc.4: 496 tests/30 files on Node 20/22, all workspace gates, two clean consumers, 96 chart parity cases, nine independent adversarial controls and 20 actual Chrome checks pass. Public artifact verified. |
| B02/C02 local receipt integration | Site [draft #419](https://github.com/ZodiacsOfficial/site/pull/419), delivery source `83bd8aad212e846815eebb07bd3b59fa1c28e1c1` | Starter rc.3: 21 files verified, 113 archive tests, 39 fresh-consumer checks, 231 actual Chrome assertions and literal public setup pass. Site: 4,699 tests/408 files, build/check/scope pass. Exact READY preview and 40 native 200%/400% zoom checks pass. All 14 jobs pass in exact-source CI 34167746529. |
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

Read [PLAN](PLAN.md), [DECISIONS](DECISIONS.md), [EVIDENCE](EVIDENCE.md) and the
[prepared review packet](REVIEW.md). The packet has not been sent to reviewers
and does not supply a missing sign-off or publication authority.
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
All 14 jobs pass in exact-source CI 34167746529. The GeoNames invalid-shape/cache-integrity follow-up is now delivered as separate
SDK draft #9/engine rc.4, with its site/starter pins unchanged. The next bounded
Stage A correction addresses public input flags and civil settings. Separate SDK
rc.5 is implemented, independently reviewed and packed from `97f5e8d0`;
562 tests on Node 20/22, required gates, two fresh consumers, 480 parity
cases and 480 echo controls pass. Its 23-file public artifact at `33336925`
has SHA-256 `1809c1686843a6be148eb185535e32059a20c35896e29ccfc7583a6b2738da65`.
Actual browser acceptance passes 26 checks; SDK draft #10 is delivered. A separate
isolated site artifact-adoption slice is active; no new site pin is claimed yet.
Invalid civil
fields and missing timezones now fail before normalization; failed saved-chart
recomputation retains its old receipt without rewriting storage.

Refreshed synthetic local C02 probes also show request loss before sync and
distinct requested systems merging on save. Old v1 writers can overwrite a
same-key richer record; [the captured failures](evidence/c02-next/README.md.log)
support a version-owned namespace with explicit legacy/downgrade behavior.
No new storage or account protocol is activated.

The next C02 contract slice must preserve requested versus actual houses through
save, rerun, export and sync. The tempting remote-label-only fix was withdrawn:
its synthetic round trip loses requested Placidus intent. Preserve that
[defect and counterexample](evidence/c02-remote-house-analysis.md). Do not infer
legacy intent or change canonical sync fingerprints without compatibility tests.
GeoNames rejected-request recovery is delivered as separate rc.2, SHA-256
`b5c0c63bddc8c1ccfc717551bdd57b1bfe7c439568851780575c8586456e0826`.
The standalone starter's engine rc.3 includes that transport/parsing recovery.
The further structurally invalid JSON/cache-integrity correction is delivered
in SDK draft #9/engine rc.4. Neither the site's engine rc.1 nor the starter's
engine rc.3 adopts rc.4; those are separate reviewed pin changes.

Hosted execution remains dependent on reviewed contracts and explicit
privacy/limits. Continue independent authorized work during review waits.
The outstanding B04 publisher-widget matrix now passes 74 actual Chrome checks,
native 200%/400% zoom and keyboard scrolling, reduced motion, real offline and
privacy/style-isolation controls. No source defect required a widget rewrite;
this is finite Chromium acceptance, not assistive-technology certification.
Active root worktree remains `codex/platform-receipt-contract`, with a docs-only
checkpoint for SDK #10 and C02 counterexamples. The next site artifact adoption
is being prepared in an isolated checkout. No background execution after this
session is implied.
