# Platform evidence ledger

Checkpoint: **2026-09-07 18:39 UTC** (2026-09-08 Asia/Bangkok). Stage A.
This records observed results, including intermediate failures. Final full-site tests and browser acceptance passed below. No merge, npm publication,
manual preview deployment, or production deployment has been performed.
GitHub created automatic SDK example previews for draft PR #6, recorded below;
these are not a deployment of the changed Zodiacs.org site.

## Reproduction context

- Site: `/Users/chiburashka/.codex/worktrees/4806/site`, branch
  `codex/platform-stage-a`, based on
  `7f953e3fca0e7d5009e5602a1dad69edff0f54cc`. Site changes are uncommitted at
  this checkpoint; site logs describe a working tree, not a released SHA.
- SDK: `/private/tmp/zodiacs-platform-sdk`, branch `codex/platform-stage-a`,
  based on PR #5 head `cced011659d48877b8b73b8a85796815234cf741`.
  Final candidate source: `03bf77990f3014b9125eed4976d7a41200aac80d`.
  [Draft SDK PR #6](https://github.com/ZodiacsOfficial/sdk/pull/6) is a review
  artifact; it does not close PR #5's hold or establish release approval.
- Main runtime: macOS arm64, Node **22.23.2**, ICU **78.2**, tzdata **2026a**,
  TypeScript **5.9.3**, pnpm **9.15.0**. SDK uses Vitest **2.1.9**; site uses
  **3.2.6**. Node 24.19.0 / ICU 78.3 / tzdata 2026b also ran the independent
  numeric report. Initial default Node 26.4.0 is not the site CI runtime.
- Shell commands used the isolated Node 22 runtime on `PATH` and
  `COREPACK_HOME=/private/tmp/zodiacs-platform-corepack`. SDK npm subprocesses
  use a writable scratch cache after an inherited-cache permission failure.
- Durable selected receipts are under [evidence/](evidence/). Copied logs have
  terminal controls/trailing whitespace removed; [raw/stored digests](evidence/log-normalization.json)
  record this presentation-only normalization. Other raw logs
  remain in `/private/tmp/zodiacs-platform-evidence`; these temporary paths
  are session diagnostics, not a guarantee of future availability. UTC JSON
  gate timestamps are authoritative; printed Vitest start times depend on `TZ`.

## A01 — Refreshed baseline and release state

Repository and connector reads occurred approximately 17:47–17:52 UTC:

| Operation | Observed result |
| --- | --- |
| Initial site `git status --short`, current-main fetch and isolated branch | Clean at initial `95ccfc67`; refreshed to `7f953e3fca0e7d5009e5602a1dad69edff0f54cc`. |
| SDK main reference read | `b49e0f14f9f17bc84db39486f2c4bb075e0ae3ff`. |
| PR #5 description, comments, reviews and review threads | Open/draft, head `cced011659d48877b8b73b8a85796815234cf741`; **do not merge, do not publish**. No submitted reviews or subsequent hold resolution found. |
| GitHub CLI and connector access | Initial sandboxed `gh auth status`/network access failed. **Escalated `gh` authentication and API access subsequently worked**, enabling draft PR creation. Connector writes returned 403; connector repository/PR/CI reads worked. This is not a blanket missing-credentials condition. |
| Branch-protection reads, both repositories | Connector 403 `Resource not accessible by integration`; ruleset collections returned `[]`. Empty collections do not prove absent protections. No protection change was made. |
| Vercel deployment read for `zodiacs.org` | READY production `dpl_BrntzbFYa2gzetKWgeq91GFeaM6W`, source site `7f953e3fca0e7d5009e5602a1dad69edff0f54cc`, ready `2026-09-07T15:59:50Z`; project `prj_nRTO3q3aNYLfaM3dotAowOc028fO`, Node 24.x. |
| `shasum -a 256 vendor/zodiacs-engine-0.1.0.tgz` | Matches `8da3e0f2eb3818fe2c5833e05331be61da9b605ffa118a8462182821412e7cbe`. Old artifact retained unchanged. |
| `npm view @zodiacs/engine version dist.integrity --json` | Public registry E404 at lookup. This does not establish publication authority or a public installation. A separate widgets lookup also returned E404; no engine/widgets publication occurred. |

Historical remote checks were read, not rerun by this session:
[site main Site Check](https://github.com/ZodiacsOfficial/site/actions/runs/34140792853),
[SDK PR #5 CI](https://github.com/ZodiacsOfficial/sdk/actions/runs/29404837473),
[SDK PR #5 App CI](https://github.com/ZodiacsOfficial/sdk/actions/runs/29404837548),
[SDK main CI](https://github.com/ZodiacsOfficial/sdk/actions/runs/27708704771), and
[SDK main App CI](https://github.com/ZodiacsOfficial/sdk/actions/runs/27708706831)
were successful. They are not CI receipts for PR #6 or the site candidate.

Later CLI inspection of SDK PR #6 found primary Vercel preview success
[`8EEqL6pQp2bULUAHWiA68exxzgaw`](https://vercel.com/zodiacsofficial/sdk-zodia/8EEqL6pQp2bULUAHWiA68exxzgaw)
and auxiliary Vercel failure
[`9z1JhGiczbtfenBWWgd1AMxgRYBz`](https://vercel.com/zodiacsofficial/sdk-zodia-launch/9z1JhGiczbtfenBWWgd1AMxgRYBz).
SDK/App GitHub Actions did **not run** for PR #6: their PR trigger targets
`main`, while this draft is based on `codex/engine-expansion`. Final package
gate evidence is local; the successful Vercel example build does not replace it.

Latest SDK GitHub release read was
[`v1.0.1`](https://github.com/ZodiacsOfficial/sdk/releases/tag/v1.0.1), whose
annotated tag resolves to `ec0ea3a7f4a2e48c3feccdfb8de9b377f34bf17a`: the
optional ownership SDK, not an engine release. No engine/widgets GitHub
release was found; site GitHub releases were empty.

Concurrent inventory included SDK #4 (ownership disclosure/shared release
docs), site #289 (footer/developer surfaces), and site #413 (birthday/routes/
sitemap/assistant context), plus unrelated Guide, markets, Registry, games,
content and dependency branches. These branches were not overwritten; their
existence does not imply another session is running.

## A02 — Baselines, reproductions and repairs

Focused runs used the baseline or evolving candidate tree, before the final
commit. They are not substitutes for the final gates below.

| UTC time / source | Command or operation | Observed result and receipt |
| --- | --- | --- |
| 17:54, SDK `cced0116` | Vitest focused run of `engine.test.ts` and `geo.test.ts` | **Passed: 27 tests / 2 files.** [SDK baseline](evidence/sdk-baseline.log). |
| 17:54, site `7f953e3f` | `npm run test -- src/lib/engine/engine.test.ts src/lib/engine/package-integration.test.ts` | **Passed: 56 tests / 2 files.** Raw `site-baseline.log`. |
| 17:55, old engine plus new polar regression | Vitest `packages/engine/src/houses-regression.test.ts` | **Failed as intended: 6/6.** [Polar reproduction](evidence/sdk-polar-red.log): the site correction had not reached shared source. |
| 17:56, old artifact plus new public/site parity assertion | Site `package-integration.test.ts` | **Failed as intended: 1 failed / 3 passed.** Raw `site-public-parity-red.log`. |
| 17:56, after shared axis correction | Focused engine, geo and house regression run | **Passed: 33 tests / 3 files.** [Polar repair](evidence/sdk-polar-green.log). Correction now precedes house assembly. |
| 17:56, before strict input fix | `corepack pnpm exec vitest run packages/engine/src/public-input.test.ts` | **Failed as intended: 42 failed / 31 passed.** [Input reproduction](evidence/public-input-red.log). |
| 17:59, after input fix | Same public-input run under `TZ=UTC` and `TZ=America/New_York` | **Passed: 77/77 in each timezone.** [UTC result](evidence/public-input-green-utc.log); raw `public-input-green-new-york.log`. |
| 18:02, before historical-year fix | `corepack pnpm exec vitest run packages/engine/src/geo.test.ts` | **Failed as intended: 9 failed / 7 passed.** [Year reproduction](evidence/geo-years-red.log): 0000–0099 rejected; 0100/0999 mislabeled as DST gaps. |
| 18:05, before required-timezone guard | Geo run under `TZ=America/New_York` | **Failed as intended: 16 failed / 24 passed.** Raw `geo-required-input-red.log`: missing zone could select host timezone; wrong types were coerced or failed inconsistently. |
| 18:06, after geo fixes | Geo run under `TZ=UTC` and `TZ=America/Los_Angeles` | **Passed: 40/40 in each timezone.** [UTC result](evidence/geo-required-input-green-utc.log); raw `geo-required-input-green-los-angeles.log`. |

The input suite covers Date/epoch milliseconds, strict explicit-offset strings,
Gregorian leap years and early/expanded years, invalid calendar fields, excess
string precision, runtime settings and reused chart inputs. Geo cases cover
UTC year 0000's leap day, 0099/0100 and offset year boundaries, Mexico City LMT,
New York gap-forward/fold-earlier behavior, explicit zones, and unknown-time
local noon. These are defined cases against host ICU, not universal historical
tzdb verification. `/geo` settings/provenance limitations remain in the
candidate README; no new DST-choice policy was added.

The final SDK suite also passes **15 return-bound and 14 crossing tests**:
nonadvancing steps, overflow, a 10,000-sample work cap, exact roots, direction,
interior touches and zero plateaus. Endpoint roots use only one-sided evidence;
they do not establish crossing rather than tangency outside the window.
Finite-step scans are not exhaustive event searches.

Legacy saved-chart tests now use frozen summaries from the unchanged 0.1.0
artifact instead of asking the new package to produce legacy output. That
fixture labels itself migration evidence, not an independent numerical oracle.
Birth data, identity, timestamps and storage remain preserved; stale known-input
calculations recompute instead of relabeling old receipts. An intermediate
focused run had **1 failed / 274 passed** because its test still assumed an old
unknown-time receipt was current; final site verification is recorded below.

## A03 — Candidate bytes and clean consumer

| Field | Final candidate |
| --- | --- |
| Package | `@zodiacs/engine@0.1.1-rc.1` |
| Source | SDK `03bf77990f3014b9125eed4976d7a41200aac80d` |
| Artifact | `vendor/zodiacs-engine-0.1.1-rc.1.tgz` |
| SHA-256 | `f95c887deedb55f64b185ed4dd406b580b6d3287656ab5ec0557215fc02e5d17` |
| npm integrity | `sha512-WX6wQmnvNvfxSdyWL/YaiGm+fZTNl8GMUGY8Ir8j3I8CvrXHD24Qjc3AMn9MjOt2lrjiPL2IRIoVEPV1Htm4Kg==` |
| Pack contents | 18 files; 21,374 packed bytes; 70,343 unpacked bytes; no bundled dependencies. [Exact inventory](evidence/engine-rc1-pack.json). |

`rc.0` remains a distinct immutable candidate, SHA-256
`4b16eeac2e8c82e5fb3a5b3756b2ed31f8fec93a37728a722b9ef81ce8f5c20d`.
After footer-source and documentation corrections, `rc.1` was cut rather than
overwriting those bytes. Site manifest, lockfile, checksum and tests pin the
final artifact; no dependency on an unavailable public npm version is added.
See [vendored provenance](../../vendor/README.md).

At approximately 18:21 UTC,
`corepack pnpm --filter @zodiacs/engine consumer:smoke /private/tmp/zodiacs-platform-evidence/zodiacs-engine-0.1.1-rc.1.tgz`
**passed** in a newly created consumer directory: actual npm tarball install,
strict NodeNext type resolution (TypeScript 5.9.3), public root and `/geo`
examples, input-error cases, notices, no workspace symlink, and absence of
optional React/ownership dependencies. The executable example replaces `fetch`
with a throwing function to detect calculation-time network calls.
[Exact consumer receipt](evidence/packed-consumer-rc1.log). This is clean local
artifact use, not a public-registry installation.

## Required SDK checks

The [final gate receipt](evidence/sdk-final-gates.json) records commands,
start/end timestamps, exit statuses and raw log paths. Runs at
**18:18:46–18:20:00 UTC** used the final candidate working tree subsequently
committed as `03bf7799`:

| Command | Result |
| --- | --- |
| `corepack pnpm typecheck` | **Passed**, including examples. |
| `corepack pnpm test` | **Passed: 295 tests / 26 files.** [Full test log](evidence/sdk-final-test.log). |
| `corepack pnpm pack:dry-run` | **Passed**, engine/widgets/ownership sequence; package prepack builds executed. |
| `corepack pnpm package:contents` | **Passed.** |
| `corepack pnpm exports:smoke` | **Passed**, including Node16, NodeNext and Bundler resolution. |
| `corepack pnpm docs:engine` | **Passed**, TypeDoc regenerated. |
| `corepack pnpm format:check` | **Passed.** |

Earlier implementation-tree checks passed `corepack pnpm lint`,
`corepack pnpm registry:checksum`, `corepack pnpm neutrality:guard`, and
`corepack pnpm build` (full workspace and examples). That full build predates
final documentation/version edits and is not represented as a repeated full
workspace build of `rc.1`. [Build log](evidence/sdk-build.log),
[registry checksum](evidence/sdk-registry-checksum.log),
[neutrality guard](evidence/sdk-neutrality-guard.log).

The initial aggregate run overlapped intentional red geo tests and unformatted
edits; those test/format failures were intermediate. Initial pack/content
checks failed with `EPERM` against the inherited npm cache. A writable scratch
cache resolved that environment failure; the final receipt records passing
reruns. No failed result is silently relabeled as successful.

## A04 — Independent numeric evidence and limits

`node scripts/platform-engine-report.mjs` ran against the installed final
`rc.1` bytes on Node 22.23.2 and Node 24.19.0 at approximately **18:29 UTC**.
Both reports **passed**, pinning candidate/reference/policy hashes:
[Node 22](evidence/independent-node-polar-node22.json),
[Node 24](evidence/independent-node-polar-node24.json).

| Observed maximum over the recorded corpus | Value |
| --- | --- |
| True-node longitude residual | 0.001685456325 degrees |
| True-node speed residual | 0.000350604032 degrees/day |
| Polar ASC/MC residual | 0.000434824069 degrees |
| Whole-house cusp residual | 0 degrees in these cases |

The corpus contains **three node epochs and three polar locations**, with both
requested house systems. Existing predeclared tolerances and the direction
deadband are preserved. Product Placidus fallback is compared with independent
whole-house output, not the provider's different fallback. References and
conventions remain in the existing
[Swiss node/polar record](../engine-validation/swiss-node-polar/README.md).
Reference SHA-256 `022fbc030185b84aa0954411aab266577cd75f50a1947dc4717e92d8a9db9260`
and policy SHA-256 `7742cb2bc7cd0932a344ddcb708e45dad07b91cb653ea1f55538c2d73fa18e96`
are unchanged. No provider library/ephemeris binary was added to the package,
and reference acquisition/generation was not rerun in this session.

These are finite-corpus observations, not a global error bound, licensing
opinion, proof at exact poles/tangencies, or validation of all accepted
historical dates. Earlier `rc.0` reports on Node 22/24/26 remain raw diagnostics;
they are not substituted for final-artifact reports. Package/site parity uses
shared code and is compatibility evidence, not an independent numerical oracle.

## Site gates — intermediate results and final acceptance

The first full `npm run test` returned **11 failed / 4,386 passed / 13 skipped**
(3 failed, 399 passed, 1 skipped files), in raw `site-test.log` and
`site-gates.json`. Nine failures read missing `dist` HTML because tests ran
before a successful build. The other two were a Phase 1 evidence fingerprint
mismatch and the Kahlo scene snapshot mismatch. Record final disposition after
the final build/test sequence; this ledger does not assume all are pre-existing
or all fixed.

`npm run check` initially detected overwritten engine-documentation footer CSS.
The upstream TypeDoc stylesheet and site output were repaired in SDK
`5f78aea64ea698fad6b415efeea5774321645419`; review confirmed the custom CSS diff
returned to empty. Initial `npm run build` failed the daily publication
provenance-manifest hash after the dependency change. These are intermediate
failures (`site-check.log`, `site-build.log`), not reasons to weaken gates.

`npm run build` against `rc.1` then **passed** (`site-build-rc1.log`, completed
approximately **18:24:58 UTC**): **4,318 HTML files**, 1,134 search entries,
intact Registry, **1,192 JSON-LD documents / 4,531 graph nodes / zero schema
errors**, and bundle budgets passed. Engine lazy chunk: **21.1 KB / 25 KB**;
package/homepage isolation clear. Build receipt:
`bac22f2c6c15d496a354543eb2434afe20dad8e07ba5cf9d4f281c4a293beff4`.
This is local build evidence, not a deployed commit.

The subsequent final build including the saved-calculation type fix and
corrected public reference copy also **passed** (`site-build-rc1-final.log`),
with build receipt
`fd5c1f252fe4d9e538378261d704122b3d106c4dc8cd14139c982386d2f589d0`.
The earlier TS2367 literal-version comparison error was fixed without treating
legacy receipts as current; final `site-check-final.log` reports **zero errors,
zero warnings, 11 hints** over 1,024 files.

| Final operation at this checkpoint | Status |
| --- | --- |
| `npm run check` after `currentSavedCalculation` fix | **Passed.** Raw `site-check-final.log`: zero errors, zero warnings, 11 hints. |
| Final `npm run build` including that fix and corrected public reference copy | **Passed.** Raw `site-build-rc1-final.log`; final receipt above. |
| `npm test -- --maxWorkers=2` after build | **Passed: 4,410 tests / 403 files, no skips**, 73.53 seconds; 18:37–18:39 UTC. [Final log](evidence/site-test-final.log). |
| Browser acceptance of changed calculation/sharing journeys | **Passed**: `node tests/t17-positions-share.mjs` against the existing preview. Desktop/mobile known-time and unknown-time calculations, keyboard/modal focus, reduced motion, positions-only versus opt-in detail/preview links, prepared image/native-share paths and encoder-failure handling. [Transcript](evidence/site-t17-rc1.log). Separate high-zoom/widget privacy review remains open. |
| Phase 1 acceptance harness | **Passed 18/18** at 360 and 1280 pixels using Chromium 152.0.7977.76. [Capture manifest](../acceptance/phase1/screenshots/manifest.json), [log](evidence/site-phase1-rc1.log). Existing preview selected through `ZODIACS_TEST_BASE_URL` after a single-preview conflict. Actual captures inspected; no numerical reference or design baseline was loosened. |
| Changed-site preview/production endpoint and deployed-artifact verification | **Not performed.** Automatic SDK example preview is separately identified above. |

## Security, review and release holds — A05

`corepack pnpm audit --prod --json` on the unchanged SDK dependency lock found
**21 high, 37 moderate, 1 low, zero critical** vulnerability counts across the
broader workspace. The
[dependency audit summary](evidence/sdk-dependency-audit-summary.json) maps
advisories to existing app/example and ownership-SDK paths. This is not a new
engine dependency finding or a claim that the workspace is secure; those
pre-existing issues need separately scoped remediation. The earlier `rc.0`
clean engine consumer's `npm audit --omit=dev --json` reported zero known
vulnerabilities ([receipt](evidence/packed-consumer-audit.json)). A fresh audit
of the exact **`rc.1` clean consumer also passed with zero known vulnerabilities**
([final receipt](evidence/packed-consumer-rc1-audit.json)). An advisory-free audit
is not a complete source/security review.

Auxiliary Vercel `sdk-zodia-launch` fails on SDK main and PR #5 with the same
freshly read build-log error: no `public` output directory. Main deployment
`B4ShFKehyN5pf5FEhdaYfCrMVL6y` and PR deployment
`BtViat59CX9UNMqaJEncqTiAUw4t` establish the pre-existing configuration failure.
Primary `sdk-zodia` deployments succeed. No auxiliary configuration or unrelated
application was changed to make this slice appear green.

Real separately delegated agents supplied numerical/security/input and release
reviews, alongside the integrator's adversarial review. These independent model
workstreams found upstream polar drift, time coercion/year/host-zone issues,
search bounds, endpoint wording and footer drift. They are **agent review**,
not human practitioner review, legal review, external adoption, or approval
that closes an explicit hold. Independent numeric references are a different
kind of evidence from another agent's opinion.

PR #5's merge/publication hold remains open. Draft PR #6 and packed bytes make
the candidate reviewable; they do not establish authority to merge or publish.
No package was published, no production deployment made, no outreach sent,
and no independent adoption claimed. Stage A has implemented/tested source
and a clean-installable candidate; release readiness remains conditional on
the remaining numerical-scope and applicable review/authority gates. Keep
**implemented, tested, release-ready, published, deployed, verified in
production, and adopted externally** distinct in later receipts.

### Final-check corrections and additional runtime evidence

- `corepack pnpm test` on Node **20.20.2**, the SDK CI major, passed
  **295 tests / 26 files** at approximately 18:35 UTC.
  [Node 20 log](evidence/sdk-node20-test.log).
- First final site run: 4,408 passed / two failed. One daily-manifest test still
  hard-coded 0.1.0; it now checks the installed public `ENGINE_VERSION`. The
  catalog byte-regeneration test timed out at five seconds while full tests
  and browser checks ran concurrently. The final rerun uses two workers after
  browser completion; no catalog fixture or timeout was changed.
- T17's initial 250 ms delayed signature-encoding test could finish before
  its pending-state assertion. An explicit release latch keeps the old render
  pending until the privacy toggle changes. The same existing functional
  assertions then passed; production sharing code was not changed.
- Manual browser CLI verified the homepage and birth-chart form without page
  errors. [Birth form capture](evidence/birth-form-desktop.png). Browser images
  are UI evidence, not numerical or privacy oracles.
