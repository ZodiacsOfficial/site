# Platform evidence ledger

Checkpoint: **2026-09-07 18:39 UTC** (2026-09-08 Asia/Bangkok). Stage A.
This records observed results, including intermediate failures. Final full-site tests and browser acceptance passed below. No merge, npm publication,
manual preview deployment, or production deployment has been performed.
GitHub created automatic SDK example previews for draft PR #6, recorded below;
these are not a deployment of the changed Zodiacs.org site.

## Reproduction context

- Site: `/Users/chiburashka/.codex/worktrees/4806/site`, branch
  `codex/platform-stage-a`, based on
  `7f953e3fca0e7d5009e5602a1dad69edff0f54cc`. Stage A source/evidence checkpoint:
  `40d3f9647a31afc20db007b7cd5269eb4ef73b6a`. Tests describe the source in
  that commit; it has not been merged or released. B03 changes follow separately.
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

## B03 — Shared-sky freshness slice

The next dependency-ready slice reuses the current static API. A single literal
`src/lib/sky-api/examples/today.mjs` is both executable and rendered on the
developer page via a raw import, avoiding example/source drift. It checks HTTP
success, the payload kind and fields it consumes, the current UTC edition and
canonical noon snapshot before any display. A current-day noon snapshot remains
valid before noon. Fetch has a ten-second deadline. This is narrow validation
of consumed fields, not a general JSON Schema validator.

The same source templates now distinguish edition date, computed snapshot, build
time and scheduled publication. Existing deployment headers remain unchanged:
300-second today JSON, 3,600-second index, 86,400-second remaining API files.
Separately cached payloads can differ from the index; successful HTTP and a fresh
build timestamp do not prove current astronomical data. Live reads confirmed
the documentation mismatch, with no current stale-data incident.

At 18:42 UTC, Node 22 / site Vitest 3.2.6 passed **39/39** focused tests:
`npm test -- scripts/sky-api-quickstart.test.mjs scripts/sky-api.test.mjs src/lib/edition-freshness.test.ts`.
The literal example has 21 cases covering error HTTP, wrong/empty/malformed
payloads, UTC midnight, stale dates with recent build times and valid pre-noon
snapshots. Final generated build/check/browser results follow when complete.

### Refreshed integration requirements

Working `gh` CLI protection reads supersede the connector's earlier access gap.
Site main requires the PR path, enforces administrators, disallows force pushes,
dismisses stale reviews and records zero required approving reviews; required
status checks are null. SDK main responds **Branch not protected (404)**. These
settings do not remove the owner's reviewed-PR requirement or the explicit SDK
PR #5 do-not-merge/do-not-publish hold. No setting was changed.

Fresh PR #289 head `de9bb3b58240286923f3437d32c7b5590490a78a` is open; its
current file list does not include the developer page or sky-api sources. The
B03 slice avoids its footer/Base/package edits and PR #413's Vercel changes.

B03 final build/check passed: zero errors/warnings (11 hints), normal full build
gates and unchanged engine bundle budget. Build receipt
`90a74dfcc3017c8020a16013091abaa2182f7fe248bfd983d5cbf136ca0f10b6`.
[Build](evidence/site-b03-build.log), [check](evidence/site-b03-check.log).
The mandatory Phase 1 capture refresh passed **18/18** against that receipt;
[log](evidence/site-b03-phase1.log) and the current [manifest](../acceptance/phase1/screenshots/manifest.json)
replace the earlier source fingerprint with actual captures, not invented hashes.

The exact standalone example also passed against the live public API at
approximately 18:43 UTC ([output](evidence/b03-live-quickstart.log)). Refreshed
HTTP/cache/CORS/edition fields and payload hashes are recorded in the
[live API receipt](evidence/b03-live-api.json). All four endpoints returned 200
and the September 7 edition; this demonstrates an internal run, not an external
onboarding session or adoption.

Browser CLI checked `/developers/` at 1280 and 390 pixels. The
[displayed-source/overflow receipt](evidence/developers-dom.json) matches the
source example byte for byte, page width equals viewport width (390), and the
code area scrolls internally (617 pixels inside 348 pixels). No error overlay
or browser errors. Actual [desktop](evidence/developers-desktop.png) and
[mobile](evidence/developers-mobile-code.png) captures preserve the approved
site design. Combined suite passed: **4,431 tests / 404 files, no skips**, 73.34 seconds
(18:46–18:48 UTC); [final combined log](evidence/site-b03-test.log).
The final page adds a labeled focusable code region. An initial keyboard probe
used an incorrect link URL and later lost its active tab; those probe results
do not establish a pre-change accessibility defect. The corrected isolated
harness targets the actual accessible link name and passes below.

At **18:56:20 UTC**, `node tests/platform-developers-drive.mjs` passed using
isolated Chromium **152.0.7977.83** contexts at 1280 and 390 pixels with reduced
motion. The exact rendered source matches, Tab focuses the named code region,
ArrowRight scrolls it on mobile, page width stays within the viewport and no
page errors/overlay occur. [Machine receipt](evidence/developers-browser.json),
[log](evidence/b03-browser.log), [desktop](evidence/developers-1280.png),
[mobile](evidence/developers-390.png). Build and check passed again after the
attribute-only accessibility refinement; source fingerprint remains unchanged.
The earlier full 4,431-test suite remains applicable to unchanged calculation,
example and guide sources; this final page refinement has its own browser proof.

## Review delivery and remote follow-up

Both source increments are committed and pushed in
[site draft PR #415](https://github.com/ZodiacsOfficial/site/pull/415):
Stage A `40d3f9647a31afc20db007b7cd5269eb4ef73b6a`, B03
`73e253e924428aabb0e1c62ca635f5ea68ce5546`. SDK draft PR #6 links the
companion and remains held. No merge or production release occurred.

The exact candidate was downloaded **without credentials** from the public
[immutable site commit](https://raw.githubusercontent.com/ZodiacsOfficial/site/40d3f9647a31afc20db007b7cd5269eb4ef73b6a/vendor/zodiacs-engine-0.1.1-rc.1.tgz),
SHA-256 verified, then installed in another new consumer on Node 20.20.2.
Public ESM/type/examples/invalid-input/notices/isolation checks passed again
([receipt](evidence/public-candidate-consumer.log)). This is publicly retrievable
review-candidate distribution through GitHub, **not npm publication** or adoption.

Initial remote [Site Check run 34153727971](https://github.com/ZodiacsOfficial/site/actions/runs/34153727971)
compared PR head `73e253e9` with main `7f953e3f`. Build & Check stopped before
installation at the Phase 1 protected-scope guard: 86 generated engine-reference
paths. Other SQL/legacy checks had passed; browser jobs were still running.
The existing base-pinned exact-file allowance records authorization from the
activated Stage A mandate; the guard and release hold remain unchanged. The
local guard and its tests passed ([receipt](evidence/platform-scope-guard.log)).
This is a diagnosed CI integration omission, not a calculation-test failure or
authority to waive review.

Automatic preview `dpl_HbtEtWm3z3VceuCagn2rn3id4NCw` for `73e253e9` was
building at the first check, URL
`https://zodiacs-nm6pslv5v-zodiacsofficial.vercel.app`. Production lookup still
identified `dpl_BrntzbFYa2gzetKWgeq91GFeaM6W` / `7f953e3f` with the
`zodiacs.org` alias. Follow-up scope-correction CI and preview verification
are linked in the [draft PR's validation record](https://github.com/ZodiacsOfficial/site/pull/415).
Inspect that exact commit/run before any integration; this checkpoint does not
presume their success.

### Remote preview and diagnosed CI corrections

Preview `dpl_HbtEtWm3z3VceuCagn2rn3id4NCw` reached READY for `73e253e9`.
At 19:07:45 UTC the actual isolated Chrome 152.0.7977.83 developer-page drive
passed at 1280/390 pixels with temporary protected-preview access: literal
example equality, keyboard focus/scroll, reduced motion, no page overflow or
page errors. [Receipt](evidence/preview-developers-browser.json),
[desktop](evidence/preview-developers-1280.png),
[mobile](evidence/preview-developers-390.png),
[log](evidence/remote-preview-browser.log). Access tokens/cookies are excluded.
The later scope/docs-only head `2cd8c088` also reached READY as preview
`dpl_E2T28FXaoopSGYo3UJug4Sw2cd4R`; the browser evidence above identifies the
earlier app-identical source rather than claiming a second browser run.
These are preview deployments, not production release.

[Site Check 34154096120](https://github.com/ZodiacsOfficial/site/actions/runs/34154096120)
at `2cd8c088` passed the corrected scope guard, install/zero-advisory gate,
default build/check, full unit suite, reference vectors, acceptance evidence,
SQL/legacy checks and several real browser jobs. Two integration failures
remain in that historical run:

- Push-enabled Today initial JavaScript: **22,029 bytes**, existing limit
  **22,016**. Reproduced locally with Node 22 and fixture-only flags
  `PUBLIC_WEB_PUSH_ENABLED=1 PUSH_ENABLED=1 PUBLIC_VAPID_KEY=AQIDBA npm run build`.
  [Before closure](evidence/today-bundle-before.json).
- Ask browser migration fixture imported the current engine while asserting
  it was 0.1.0. [Exact failed job output](evidence/site-ci-build-check-failed.log).
  The browser test stopped at fixture construction, before the legacy journey.

The bounded correction defers unchanged contact arithmetic alongside the
existing transit import. Its red baseline failed two eager-load assertions;
focused loading/arithmetic/state tests then passed **25/25**, including either
dependency failing and concurrent request start. The full fixture-flags build
now passes all budgets; Today measures **21,480 bytes**, 536 below the unchanged
limit. Final browser/default-build and capture verification are recorded below.

The legacy browser corpus contains 96 synthetic quarter-hour results from the
SHA-256-verified archived 0.1.0 package. All 24 overlapping north-polar hourly
records exactly match the earlier corpus. Fixture SHA-256:
`eedff84d838cea3b56164b6c848eddfea704baad5e99847bf2d143b723194c0f`.
[Generator and provenance](../../tests/fixtures/generate-legacy-polar-browser.mjs),
[reproduction log](evidence/legacy-browser-reproduce.log). Browser drives read
the frozen JSON and retain the full original quarter-hour selection coverage.
Already-rising inputs remain unchanged; supplied positions-only receipts stay
0.1.0, while recomputed results identify the installed public engine version.

Final correction verification on Node 22.23.2, September 7 UTC:

- Full suite **4,447 tests / 405 files, no skips**, passed in 82.98 seconds
  at 19:30–19:31 UTC: `npm test -- --maxWorkers=2`
  ([log](evidence/site-ci-correction-test.log)).
- Normal build and required check passed: 0 errors/warnings, 11 hints,
  all route/chunk budgets retained. [Build](evidence/site-ci-correction-build.log),
  [check](evidence/site-ci-correction-check.log),
  [push-enabled build](evidence/site-push-flags-after.log),
  [measured Today closure](evidence/today-bundle-after.json).
- Actual Chrome normal/flags-on journeys: Today **59 checks**, fixture-only
  push **25**, Guide **45**, compatibility/legacy/composite **962**, solar
  return **46**, all passed. No real push enrollment or outgoing message.
  [Today](evidence/today-flags-browser.log), [push](evidence/push-flags-browser.log),
  [Guide](evidence/site-ci-correction-ask.log),
  [compatibility](evidence/site-ci-correction-compatibility.log),
  [solar return](evidence/site-ci-correction-solar.log).
- Phase 1 **18/18** captures and evidence checks passed against normal-build
  source fingerprint `1d5c7568a8219b906b3c39565fbd817974179a61fec3fa851d67ae4f4c32a486`.
  [Captures](evidence/site-ci-correction-phase1.log),
  [receipt validation](evidence/site-ci-correction-evidence.log).

One local compatibility invocation could not connect because its fixed-port
preview conflicted with this task's existing Astro daemon. Stopping only that
daemon and setting `ASTRO_PREVIEW_BACKGROUND=0` let the unchanged driver own
its port; the actual journey then passed. This was a local harness setup issue.
The next exact-head CI result belongs in the linked PR validation record;
historical failed runs above are not relabeled successful.


## Developer entry and frozen starter checkpoint — September 7, 20:03 UTC

B01 replaces the top of the existing developer page with four explicit paths
and adds a ten-row support matrix, immutable candidate/source/evidence links,
and a privacy-aware discrepancy report path. The existing sky example and
canonical layout/footer remain. Public data/widgets are available; local engine
is an unpublished candidate; personalized hosted computation remains planned.
The optional read-only ownership SDK stays separate.

- Node 22 build and check passed (0 errors/warnings, 11 hints):
  [build](evidence/site-b01-build.log), [check](evidence/site-b01-check.log).
- Candidate/archive/boundary focused suites: **62/62**, passed
  ([log](evidence/b01-boundary-candidate-tests.log)). Narrow developer SDK links
  use the existing exact source/destination bridge list; vocabulary, external
  venues, consumer pages and other wing routes remain guarded.
- Actual Chrome 152 desktop/mobile checks passed: four destinations, literal
  sky example, Tab/ArrowRight scrolling, support table keyboard focus, canonical
  footer, no horizontal overflow/page errors, reduced motion. Support matrix
  also passes CSS zoom 2 at 1280 pixels; this does not certify native browser
  zoom controls. [Receipt](evidence/b01-developers-browser.json),
  [desktop](evidence/b01-developer-entry-1280.png),
  [mobile](evidence/b01-developer-entry-390.png),
  [support mobile](evidence/b01-developer-support-390-zoom1.png).
- The Phase 1 source fingerprint is unchanged from `1d5c7568…a486`; previous
  18 acceptance captures continue to describe that protected render boundary.
- Exact Stage A head `4bb0d70eaaf21ea950a8fe708a0e1a91f8fb1f4f` preview
  `dpl_E98V1wNWvdVq6TT4H5z8DiSCpZY9` is READY. Actual remote Today drive
  passed **59 checks** ([log](evidence/correction-remote-today.log)).
  CI run 34156030961 had reached Lighthouse at this checkpoint; its final
  conclusion must be recorded separately. Production remains the earlier head.

B02 source and private example archive are prepared at `examples/platform/`
and `public/examples/`. Three pages use only public engine exports, synthetic
inputs and no account; natal/transit calculation stays in the loaded browser,
while the publisher widget makes an explicit optional hosted request.

Starter **0.1.0-rc.2**, SHA-256
`d409a395966e78b3ddc0604d75d4a836477987d99814ff786f55aee9e464e420`, contains
engine **0.1.1-rc.1** unchanged. Fresh isolated Node 22 extraction/install/build
and **24 tests** passed in **7.79 seconds**, with zero npm advisories
([receipt](evidence/b02-fresh-consumer-rc2.log)). This is internal machine timing,
not a builder study or complete onboarding time. [Pack inventory](evidence/b02-pack-rc2.json).

The first unshipped example rc.1 (SHA-256 `49683fa954927e63905d8cbd5933ce9fd90b78c31407b71d60b127d5d80e6e99`)
failed the real 390px browser check because fieldset intrinsic sizing overflowed.
Explicit minimum inline sizing fixes the layout in rc.2. That earlier example
was never pushed/published. Browser rerun, anonymous public-archive installation,
and the public onboarding page remain pending at this checkpoint. Neither
archive distribution nor internal tests resolve npm, production or external
review/adoption gates.


### Stage A final CI and refreshed release state

[Site Check 34156030961](https://github.com/ZodiacsOfficial/site/actions/runs/34156030961)
at exact `4bb0d70eaaf21ea950a8fe708a0e1a91f8fb1f4f` completed successfully:
**all 14 jobs**, including visual regression, Lighthouse, widgets, browser
journeys, SQL and advisory gates. [Machine receipt](evidence/site-stage-a-ci-success.json).
Draft PR #415 validation now identifies this final result and the matching
READY preview's 59 passed remote Today checks. Earlier failed runs remain
historical failed runs.

[Release refresh at 20:05 UTC](evidence/b01-release-refresh.json) confirms the
same site/SDK main heads and explicit PR #5 hold with no submitted reviews.
Public unauthenticated npm reads still return 404 for engine/widgets and
`1.0.1` for the separate ownership SDK. PR #289 remains at `de9bb3b5`;
PR #413 currently `bf8268d2` has no developer-page overlap, with an additive
sitemap entry that must be retained during later integration. No main merge,
production release, package publication, external review or adoption occurred.

The complete starter is publicly downloadable without credentials from
https://raw.githubusercontent.com/ZodiacsOfficial/site/80dff5f16ec17045bcb52110a8105a9ad3492a99/public/examples/zodiacs-platform-starter-0.1.0-rc.2.tgz .
Anonymous HTTP 200, 40,481 bytes and SHA-256 `d409a395966e78b3ddc0604d75d4a836477987d99814ff786f55aee9e464e420`
match all 20 local source/archive files. Fresh isolated configuration/cache
installation, build and 24 tests passed in **7.21 seconds including download**.
[Receipt](evidence/b02-public-consumer.json). This internal automated check is
not the complete timed page walkthrough, population usability evidence or npm
publication. The browser and literal displayed-command checks follow below.


### B01/B02 final local and public-archive acceptance — 20:22 UTC

The final developer front door links to `/developers/examples/`, with one
rendered setup block and three complete success/failure/privacy paths. The
block runs in a POSIX subshell with `set -eu`; failed mkdir/download/checksum
cannot continue into extraction or npm. It neither enables an npm release nor
promises a complete portable receipt schema.

- Full Node 22 suite: **4,493 tests / 407 files, no skips**, passed in 96.21s.
  [Tests](evidence/site-b02-final-tests.log),
  [build](evidence/site-b02-final-build.log),
  [check](evidence/site-b02-final-check.log), 0 errors/warnings, 11 hints.
  Two earlier full-suite failures identified the generated route inventory's
  old 690/51 counts; the new routes require 692 consumer routes/53 static pages.
  The mandated generator changed only three developer inventory lines in
  `api/_assistant/context.ts`; persona is untouched. PR #413's nearby birthday
  inventory/sitemap addition must be retained in later integration.
- Source/metadata/pack drift and adversarial archive checks pass, including
  exact starter commit, digest, public exports, all source bytes and lockfile
  integrity. The displayed Node hashing import is narrowly recognized by the
  consumer boundary; surrounding promotional vocabulary and destinations stay
  checked. No directory-wide exemption was added.
- Final actual developer-page browser checks passed at 1280/390 with reduced
  motion and CSS zoom 2 at 1280: navigation, canonical footer, Tab/ArrowRight
  scrollers, exact setup identity, no overflow/page errors.
  [Receipt](evidence/b02-developers-browser.json),
  [front door](evidence/b02-developer-entry-1280.png),
  [examples desktop](evidence/b02-developer-examples-1280-zoom1.png),
  [examples mobile](evidence/b02-developer-examples-390-zoom1.png).
- Fresh rc.2 starter browser: **185/185** checks passed in actual Chrome
  152.0.7977.83 at 1280/390. Calculators made zero requests/API calls during
  recalculation, retained no local/session/IndexedDB/CacheStorage/service-worker
  state or cookies, rejected malformed/empty/offset-free inputs, preserved
  offset-equivalent instants and unknown-time qualification, and recalculated
  offline after load. Widget dark/light requests returned HTTP 200, showing
  the current UTC date `2026-09-07` at 20:01 UTC; contrast ≥4.5, attribution
  and fallback remained keyboard-reachable. The blocked-frame scenario uses
  an explicitly synthetic response. [Receipt](evidence/b02-starter-browser.json),
  [setup timing](evidence/b02-starter-setup.json),
  [widget mobile](evidence/b02-starter-widget-390-light.png),
  [initial rejected rc.1 mobile](evidence/b02-rc1-rejected-mobile.png).
- The exact setup text extracted from the rendered page was executed unchanged
  in a new folder with isolated empty npm/curl configuration and empty npm
  cache. Public download/hash/install, **24/24 tests**, build and the local
  server passed; each of three served pages was HTTP 200 and byte-equal to
  that consumer's build. **2.841 seconds** for those automated steps, including
  startup and HTTP verification. [Receipt](evidence/b02-literal-onboarding.json),
  [literal text](evidence/b02-literal-rendered-setup.sh),
  [success log](evidence/b02-literal-success.log).
  Separate existing-directory, simulated HTTP-failure and genuine checksum
  rejection checks all stopped before tar/npm. Only owned temporary process
  groups were stopped, with disappearance verified. This timing does not
  include a human reading the page or interacting with the charts, and is not
  evidence about unfamiliar developers or external adoption.

The first B01/archive commit `80dff5f16ec17045bcb52110a8105a9ad3492a99`
was pushed without merge, making the exact example bytes publicly available.
Its automatic review preview `dpl_HMB36sGh7emiAFHFTvb6tmEYW9g3` is READY.
The final onboarding-page commit, its separate draft PR, exact-head CI and
remote preview verification remain the next release-evidence steps.


### B01/B02 review delivery and actual remote preview

[Draft PR #417](https://github.com/ZodiacsOfficial/site/pull/417) is stacked on
#415; final source is `8343f173e4db2e8ab6628bd04590e41b056872ce`.
Exact preview `dpl_6okY3r99rF7qVw5Emkaod8XLh31V` is READY at
https://zodiacs-bxcsjv13g-zodiacsofficial.vercel.app . At 20:29 UTC actual
Chrome ran all three developer-page journeys at 1280/390, with canonical
footer, correct public starter link/setup, reduced motion, focus/scroll and
CSS zoom checks passing. [Receipt](evidence/b02-preview-developers-browser.json),
[front door](evidence/b02-preview-developer-entry-1280.png),
[mobile examples](evidence/b02-preview-developer-examples-390-zoom1.png).
Temporary access file and browser wrapper were deleted; no bearer URL or
cookie was saved in repository evidence. Exact-head CI [34159295138](https://github.com/ZodiacsOfficial/site/actions/runs/34159295138) passed all 14 jobs; [result](evidence/b02-ci-success.json).
Production remains `7f953e3f` / `dpl_BrntzbFYa2gzetKWgeq91GFeaM6W`.
New concurrent PR #416 (`f1293bbb`, Astrofolio verification status only)
has no file overlap; no other contributor branch was changed.

### C02 civil imports and explicit timezone boundary — final local gates

Base source `8343f173e4db2e8ab6628bd04590e41b056872ce`, branch
`codex/platform-civil-inputs`. A synthetic v1 birth-share token containing
`2001-02-29` was accepted and calculated as March 1 with a false DST-gap flag.
The public engine rejects the original invalid ISO string, but cannot recover
it after an adapter has normalized it to a valid Date. The
[original reproduction](evidence/c02-civil-input-analysis.md) preserves source
hashes, exact synthetic input and failed-before/passed-after evidence.
Trailing-newline inputs already failed on the baseline; they are controls.

The import-free Gregorian parser now rejects impossible dates and clock
rollover at both share decoding and local-time resolution. Share v1 shape,
1800–2199 window, unknown-time behavior, labels and house settings stay intact.
The resolver preserves astronomical years 0000–0099 using setUTCFullYear and
explicit Gregorian/Latin/era fields; this is syntax/time handling, not an
extension of numerical accuracy claims. Missing/coerced/unsupported timezones
cannot select the host zone. Errors do not echo submitted values or invoke
untrusted coercion hooks. Invalid stored inputs keep their original cached
receipt without recalculation, re-versioning or storage mutation.

Reproduction commands from the site root with installed Node 22 toolchain:

```sh
TZ=Asia/Bangkok node node_modules/vitest/vitest.mjs run src/lib/time/civil-date.test.ts src/lib/time/localToUtc.test.ts src/lib/share.test.ts src/lib/profile/polar-repair.test.ts
npm run build
npm run check
ASTRO_PREVIEW_BACKGROUND=0 npm run test:phase1:acceptance
ASTRO_PREVIEW_BACKGROUND=0 node tests/platform-share-boundary-drive.mjs
npm test
PUBLIC_WEB_PUSH_ENABLED=1 PUSH_ENABLED=1 npm run build
T17_SHARE_EVIDENCE=1 ASTRO_PREVIEW_BACKGROUND=0 node tests/t17-positions-share.mjs
ASTRO_PREVIEW_BACKGROUND=0 npm run test:compatibility:browser
node docs/platform/evidence/c02-civil-review-probe.mjs
TZ=UTC node docs/platform/evidence/c02-timezone-review-probe.mjs
TZ=America/Los_Angeles node docs/platform/evidence/c02-timezone-review-probe.mjs
```

- Final focused suite: **201/201** on Node 22.23.2 with Bangkok host and Node
  24.19.0 with UTC host. [Node 22](evidence/c02-final-focused-node22.log),
  [Node 24](evidence/c02-final-focused-node24.log).
- Full suite: **4,624 tests / 408 files, no skips**, 66.91s.
  [Tests](evidence/c02-final-tests.log). Full
  [normal build](evidence/c02-final-build.log),
  [push-enabled build](evidence/c02-final-push-build.log) and
  [check](evidence/c02-final-check.log) pass, 0 errors/warnings, 11 hints;
  existing bundle limits unchanged and passing.
- **18/18** exact-width Phase 1 captures pass. Final images are byte-identical
  to the base; the manifest records the new source fingerprint
  `3998a3896d8408b2dc0b73d29c85f0822cd294c228be679c83bc08e400282cf1`.
  [Capture log](evidence/c02-final-phase1.log). An intermediate capture had
  slight yearly-image raster differences; the final run returned the base bytes.
- **12/12** actual Chrome 152.0.7977.83 journeys at 1280/390: impossible dates
  and 24:00 produce no result, form population or calculation event; valid
  leap-day known/unknown inputs still calculate. No overflow/page errors or
  saved-profile writes. [Receipt](evidence/c02-share-boundary-browser.json),
  [rejected import](evidence/c02-share-rejected-390.png),
  [unknown-time control](evidence/c02-share-unknown-390.png).
  The same driver is now a required Site Check step and its output falls
  within the existing browser-artifact upload path.
- Existing birth-chart export/sharing passed, including native-share and
  zoom controls: [log](evidence/c02-final-t17.log),
  [current 33% chart-sheet capture](evidence/c02-chart-sheet-33-percent.png).
  The driver regenerated the older general T17 capture; its current rendering
  is archived here while the pre-existing historical capture remains unchanged.
  No chart-renderer source was modified in this slice.
- Existing compatibility/composite browser drive: **962 checks, ALL PASS**.
  [Log](evidence/c02-final-compatibility.log).
- A second tool-backed reviewer found and then verified the explicit timezone
  guard. The portable probes were rerun against final source by the integrator:
  **148,800 calendar cases, 3,344 known-instant checks across 418 runtime zones**,
  plus Lord Howe half-hour fold/gap, Apia day gap and Mexico City LMT controls.
  [Final corpus](evidence/c02-civil-review-node22.json). Each separate UTC and
  Los Angeles host run passed **26 rejection cases and 9 valid controls**, with
  zero coercion hooks: [UTC](evidence/c02-timezone-review-utc.json),
  [Los Angeles](evidence/c02-timezone-review-los-angeles.json). Runtime ICU 78.2,
  tzdata 2026a. These finite same-runtime checks are not independent historical
  tzdb verification or human review. Normalized terminal log hashes and the
  exact normalization are [recorded](evidence/c02-log-normalization.json).

The shared candidate archive and ownership SDK bytes are unchanged. The
[separate remote receipt defect and withdrawn fix](evidence/c02-remote-house-analysis.md)
remain explicit: actual whole-sign results can retain a Placidus summary label,
but changing that single field discards the requested setting through rerun/sync.
Its two original synthetic JSON records are preserved; no account operation or
migration was performed. C02 is partially implemented, not a completed portable
receipt contract. Review PR/CI/preview delivery follows these local gates.

### C02 review delivery and remote boundary proof

[Draft site #418](https://github.com/ZodiacsOfficial/site/pull/418) is stacked
on #417 at exact source `a4284d8d6289ed6abfe30d2da883ad07edcfc7bd`.
The unchanged scope guard passes all 42 paths against its exact base, with
protected scope untouched. Preview `dpl_8SPSZP4ETeK4qdzpYiSsW7r9QrKD` is READY,
source a4284d8d, at https://zodiacs-c03uosfvw-zodiacsofficial.vercel.app .
At 21:08 UTC actual Chrome passed all twelve imported-share journeys at
1280/390, including invalid input rejection, valid known/unknown calculations,
no overflow/page errors and no saved-profile writes.
[Remote receipt](evidence/c02-preview-share-boundary-browser.json),
[rejected mobile import](evidence/c02-preview-share-rejected-390.png).
Temporary access file and browser wrapper were removed; no bearer URL/cookie
is saved in repository evidence. Exact-head Site Check [34161649806](https://github.com/ZodiacsOfficial/site/actions/runs/34161649806) passed all 14 jobs, including visual, Lighthouse and widget gates.
[Final result](evidence/c02-ci-success.json).

### A02/A03 separate GeoNames recovery candidate

A rejected optional GeoNames index/shard request previously prevented a later
explicit call from retrying. Eight expected baseline failures cover rejected
transport, HTTP 503, JSON parsing and caller-bound injected aborts. Matching
rejected cache entries are now evicted while retaining shared pending work,
successful/unrelated entries and the original rejection reason. No automatic
retry loop, timer, new cancellation API or live GeoNames request was added.

[SDK draft #7](https://github.com/ZodiacsOfficial/sdk/pull/7) is stacked on #6.
Source commit `0da0941e23035df3be95e5aa40f4f270222b57dd`; artifact/evidence
commit `abefc7c347ed22708a6743713d58c843d7166d8e`. This separate engine
`0.1.1-rc.2` archive has **18 files / 21,946 packed bytes / 72,108 unpacked
bytes**, SHA-256 `b5c0c63bddc8c1ccfc717551bdd57b1bfe7c439568851780575c8586456e0826`.
[Immutable archive](https://raw.githubusercontent.com/ZodiacsOfficial/sdk/abefc7c347ed22708a6743713d58c843d7166d8e/artifacts/zodiacs-engine-0.1.1-rc.2.tgz)
was anonymously downloaded with matching bytes/digest at 21:15 UTC:
[receipt](evidence/geo-public-artifact.json). Site and public starter retain rc.1;
no existing package version's bytes were changed.

All required SDK lint/typecheck/format/checksum/test/build/export/pack/contents/
neutrality and TypeDoc gates passed. Full suite **305 tests / 27 files** on
Node 20.20.2 and 22.23.2. Clean isolated Node 20/22 consumers installed the exact
archive, compiled public TypeScript 5.9.3 imports, and passed examples, notices,
optional-dependency isolation and retry through the packed geo export. Isolated
consumer audit: zero advisories. A second real reviewer passed eleven additional
strict-unhandled-rejection probes, including immediate concurrent retry waves,
non-Error reasons and stale-eviction protection. Ninety-six synthetic public
chart combinations exactly match rc.1 mathematical output after excluding
engineVersion. This is parity, not independent astronomical accuracy evidence.

[Durable SDK commands/logs/receipts](https://github.com/ZodiacsOfficial/sdk/blob/abefc7c347ed22708a6743713d58c843d7166d8e/docs/platform/EVIDENCE.md)
include actual failures and finite review limits. SDK CI currently triggers only
for main-targeting PRs, so no passing CI run is claimed for stacked #7. The
known auxiliary SDK preview failure and broader app dependency findings remain
separate. Structurally invalid but parseable GeoNames JSON remains cached in
both versions; a deliberate validation/cache-policy follow-up is still needed.
SDK #5's explicit release hold remains. No npm publication, main merge,
production operation, external review, outreach, spending or adoption occurred.

### A04/C02 additive natal codec delivery

[SDK draft #8](https://github.com/ZodiacsOfficial/sdk/pull/8) delivers engine
`0.1.1-rc.3` separately from the site's rc.1 pin. Runtime source:
`aaade67d0d49e8b10d1bc5c59cf345d6106dc270`; frozen artifact/evidence commit:
`2000377b1b537c1b08c873889059acc8edacc4fe`; final browser/delivery checkpoint:
`b0d7f02549187a9c4a0ca5baa97cf3342fc60707`. The optional `/receipt` entry
preserves full natal results, requested and actual houses, explicit absent-house
reasons, original ISO spelling when captured, unknown-time references and
optional local-resolution assertions without consulting current timezone data.

The Zodiacs draft validates a 64 KiB/depth 12/4,096-value envelope, rejects
duplicate decoded JSON keys and unsupported versions/features, and emits fixed
errors/redacted diagnostics without birth details, arbitrary metadata or stable
hashes. Captured provenance remains an unauthenticated claim. It does not migrate
account sync v1 or infer legacy intent. [Draft and two synthetic fixtures](https://github.com/ZodiacsOfficial/sdk/blob/2000377b1b537c1b08c873889059acc8edacc4fe/docs/platform/receipt-draft-v1.md).

**429 tests / 29 files** pass on Node 20/22, with all required SDK gates and
TypeDoc. Two actual clean packed consumers pass public TypeScript 5.9.3 imports,
core examples, package isolation, GeoNames retry, receipt replay and privacy.
The isolated consumer has zero reported advisories; broader SDK app findings
remain. Ninety-six synthetic chart cases match rc.1 exactly after excluding
engineVersion; replay normalizes absent optional input.flags to an empty list.
No numerical rounding or broader accuracy claim is involved.

Separate tool-backed review and final integrator reruns cover 60 codec controls,
21,500 JSON differential cases and three corrected counterexamples. Actual
Chrome 152 passes 23 offline codec assertions with Intl/storage blocked, no
network/capability attempts, no cookies and only lightweight receipt chunks.
This browser probe recreates synthetic Chart values without ephemeris execution.
[All SDK logs, source hashes, corrections and limits](https://github.com/ZodiacsOfficial/sdk/blob/b0d7f02549187a9c4a0ca5baa97cf3342fc60707/docs/platform/EVIDENCE.md).

The [immutable rc.3 archive](https://raw.githubusercontent.com/ZodiacsOfficial/sdk/2000377b1b537c1b08c873889059acc8edacc4fe/artifacts/zodiacs-engine-0.1.1-rc.3.tgz)
was anonymously downloaded at 22:05 UTC, **32,079 bytes / 22 files**, SHA-256
`aeab68793129517abe7498c5f5a17197d387eed7cbdaa9614f3b8cd939b11a17`.
[Download receipt](evidence/receipt-public-artifact.json). No successful stacked
SDK CI is claimed: its workflow targets main PRs only. The explicit #5 hold,
required human/external review and release/publication authority remain.
No merge, npm publish, production operation, account migration, outreach,
spending or external adoption occurred. The active subsequent slice integrates
this candidate into a new standalone natal starter; acceptance is pending.

### B04 publisher widget accessibility and privacy completion

The existing immutable starter rc.2 was tested in actual isolated Chrome
152.0.7977.83; all 20 archive files match source. **74 browser matrix assertions**,
three focused native-zoom/scroll cases and four privacy controls pass. Native
200%/400% Chrome zoom is independently confirmed by CSS viewport/DPR, rather
than CSS zoom. Keyboard reaches attribution and fallback, Page Down exposes
remaining iframe content, and no horizontal overflow occurs. Reduced-motion
documents have no active animation; conflicting host CSS does not penetrate
the frame. Real offline failure leaves a reachable fallback and honestly reports
only that the widget was requested, without promising offline navigation.

No request occurs before activation, no submitted birth data is involved, and
post-activation requests contain no synthetic parent query/fragment. Referrer
exposes only origin; parent/frame storage and cookies are empty. The observed
hosted dark document returned HTTP 200 with SHA-256
`809285f1b6bb071465a6d2f5c56dc896e41aa495ad9e5a863cba3fa5b0bc8169` and the then-current
2026-09-07 UTC date. It has its own existing deployment, not a new widget release.

[Independent review and exact scope](evidence/b04/REVIEW.md),
[results](evidence/b04/summary.json),
[native 400% dark keyboard focus](evidence/b04/nativeZoom4-dark-attribution-viewport.png),
[native 400% light scrolled content](evidence/b04/nativeZoom4-light-pagedown-viewport.png).
The integrator visually inspected both captures. Earlier clipped full-page
screenshots were harness artifacts and excluded; raw viewport captures are the
accepted evidence. Browser/server cleanup is recorded. No source defect was
reproduced and no immutable archive was rewritten. This finite Chromium corpus
is not all-browser or assistive-technology certification. A changed starter will
receive affected functional/browser checks again.


## Standalone natal receipt source — September 7, 22:38 UTC

The next starter is `0.1.0-rc.3`, containing the immutable SDK engine
`0.1.1-rc.3` from distribution commit `2000377b1b537c1b08c873889059acc8edacc4fe`
and runtime source `aaade67d0d49e8b10d1bc5c59cf345d6106dc270`. The site application's
rc.1 pin, account records and existing starter archives remain unchanged.

The natal example exports actual local JSON files, imports bounded strict UTF-8
files as unverified stored results, retains exact unknown-time references and
full numeric precision, and emits an allowlisted redacted diagnostic. Imported
records never refill the birth form or trigger recalculation. Generation guards
prevent older asynchronous reads replacing a newer calculation, selection,
cancellation or import. Imported extensions survive export but are not rendered;
errors do not include filenames or file content. Explicit full exports contain
birth details; redaction is not described as anonymity.

- All **39 Node checks** pass with the actual loopback server. The initial
  restricted invocation had one `listen EPERM` failure; it is retained separately
  from the successful authorized local-server run.
- All **231 actual Chrome assertions** pass in the final pre-pack source run:
  ordinary natal/transit flows, 320/1280 receipt controls, actual downloaded
  bytes, 08:30 unknown-time import/re-export, mixed-version unverified claims,
  malformed/oversized files, overlap races, revoked Blob URLs, offline operation,
  no automatic storage/URL disclosure, and widget branding/fallback keyboard use.
  The two raw receipt-control viewport captures were visually inspected.
- The first browser run reported **222/223** checks, missing mobile dark widget
  focus. The original cause did not recur in focused comparisons; it is not
  labeled a proven product or timing defect. The harness now waits a bounded
  interval for exact iframe/credit focus after the first Tab, then for fallback
  focus after the second Tab, and records focus samples. It does not press extra
  Tabs or programmatically focus the credit. Initial evidence is preserved.
- **113 synthetic archive-fixture tests** pass for the decoupled verifier. The
  authoritative candidate belongs to the starter; exact archive/source bytes,
  provenance, repository paths, dependency lock, public exports, notices and
  tar/path limits remain checked. This is not yet a real rc.3 archive check.
- Independent build review caught a rejected nested ephemeris bundle being
  written before provenance validation. Build now uses `write: false`, checks
  the actual bundled module path against the locked installation, then writes.
  All six good/bad controls pass; all eight pre-existing output files remain
  byte-identical on rejection. Receipt ephemeris facts identify actual locked
  version 2.1.19, separately from the engine's dependency range.

[Evidence inputs and original hashes](evidence/starter-receipt/checkpoint-inputs.json),
[39 tests](evidence/starter-receipt/tests-local-final.log),
[final source browser](evidence/starter-receipt/browser-final-source.json),
[initial browser](evidence/starter-receipt/browser-prepack-initial.json),
[build correction review](evidence/starter-receipt/build-review-final.md),
[all-output preservation](evidence/starter-receipt/build-rejection-output-stability.json).
All chart data is synthetic. These are finite local/source checks, not fresh
archive acceptance, external developer adoption, human expert review, npm
publication or production deployment.

Fresh repository reads at this checkpoint still show site main `7f953e3f` and
SDK main `b49e0f14`. SDK #5 remains OPEN/draft at `cced0116`, zero submitted
reviews and an explicit merge/publication hold.


## Immutable receipt starter and draft #419 — September 7, 22:47 UTC

Runtime/source commit **`7da2bdb3a5bc6d65921997ba1cb79609f330c765`** was
frozen before packing. Distribution commit
**`dd5d83cdf2a2a5d7096175f01ce985b47824a376`** contains the new archive;
**`83bd8aad212e846815eebb07bd3b59fa1c28e1c1`** points setup metadata to it.
Site [draft #419](https://github.com/ZodiacsOfficial/site/pull/419) is stacked
on delivered #418. No existing artifact was replaced.

`zodiacs-platform-starter-0.1.0-rc.3.tgz` has **21 files, 56,135 packed bytes,
113,407 unpacked bytes**, SHA-256
`facafd75a8366a69dfae7397c9c2c68ee636987fb25d479ef380533408bd8d8a`.
The [immutable anonymous download](https://raw.githubusercontent.com/ZodiacsOfficial/site/dd5d83cdf2a2a5d7096175f01ce985b47824a376/public/examples/zodiacs-platform-starter-0.1.0-rc.3.tgz)
was fetched at 22:41:50 UTC and matches local bytes exactly. This supersedes
`publicDownloadVerified: false` in the earlier pack-time identity record.
[Pack inventory](evidence/starter-receipt/pack-rc3.json),
[source identity](evidence/starter-receipt/artifact-rc3.json),
[public verification](evidence/starter-receipt/public-artifact.json).

| Gate | Exact result |
| --- | --- |
| Archive verifier | Offline CLI and **113/113 tests** pass on the real rc.3 archive, including adversarial synthetic mutations of these bytes. |
| Fresh consumer | Isolated Node 22.23.2/npm 11.17.0 install, all **39 tests** and build pass; npm reports zero vulnerabilities. 3.127 seconds is internal automated timing only. |
| Packed browser | All **231 assertions** pass in actual Chrome against that fresh consumer and the exact archive hash. No fatal errors. |
| Developer pages | Actual Chrome passes all three journeys at 1280/390, keyboard focus, responsive sizing and explicitly labeled CSS zoom. Root inspected the mobile example capture; Cosmic Void styling remains intact. |
| Literal public setup | Download/checksum/install/test/build and all three own-server pages pass; **39 tests**. Existing-directory, simulated HTTP failure and deliberate expected-hash mismatch stop before tar/npm. Success took 2.2 seconds internally. Owned process group is closed. |
| Full site | **4,699 tests / 408 files** pass. Build, bundle budgets and check pass; **0 errors, 0 warnings, 11 hints**. Assistant context regenerated with no resulting source drift. |
| Preservation | Scope guard against #418 passes; protected scope untouched. Phase 1 build fingerprint remains `3998a3896d8408b2dc0b73d29c85f0822cd294c228be679c83bc08e400282cf1`. Site engine/ownership pins and account storage are unchanged. |

[All source-to-evidence paths and hashes](evidence/starter-receipt/archive-checkpoint-inputs.json),
[packed browser receipt](evidence/starter-receipt/browser-archive.json),
[literal setup receipt](evidence/starter-receipt/onboarding/onboarding.json),
[site tests](evidence/starter-receipt/starter-rc3-site-tests.log),
[site build](evidence/starter-receipt/starter-rc3-site-build.log),
[site check](evidence/starter-receipt/starter-rc3-site-check.log).

The widget focus investigation's fixed corpus did not reproduce the original
failure. Its strict positive control passes; an intentionally untabbable credit
correctly fails even when fallback focus succeeds. This validates the stronger
assertion without establishing a cause for the historical failure.
[Review](evidence/starter-receipt/focus/REVIEW.md),
[positive/negative control](evidence/starter-receipt/focus/strict-focus-control.json).

Production was read again and remains READY `dpl_BrntzbFYa2gzetKWgeq91GFeaM6W`,
`zodiacs.org`, source `7f953e3fca0e7d5009e5602a1dad69edff0f54cc`. These gates
do not represent npm publication, production release, human expert approval or
external adoption. Remote CI/preview and native-zoom checks are recorded next.


### Exact review preview and native zoom — 2026-09-07 22:53 UTC

Automatic preview **`dpl_9VqGRZZm9sXhvHe86ZjfUaaCCKQt`** is explicitly READY
for delivery source `83bd8aad212e846815eebb07bd3b59fa1c28e1c1`:
[open review preview](https://zodiacs-8ok1gtu0v-zodiacsofficial.vercel.app/developers/examples/).
Actual Chrome passes all three developer-page journeys at desktop/mobile widths
and CSS zoom. The preview's rendered setup is byte-identical to the literal
public setup already executed. Root inspected the actual desktop preview capture.
Temporary access was held in memory; the private access file was removed after
the browser closed. No access URL, cookie or browser profile is archived.
[Deployment identity](evidence/starter-receipt/preview-deployment.json),
[browser receipt](evidence/starter-receipt/preview-browser.json),
[setup equality](evidence/starter-receipt/preview-setup-equality.json).

A separate actual Chrome native-zoom run passes **40 checks** on the exact
21-file installed archive at 200% and 400%. Native settings readback, CSS viewport
and DPR establish zoom; CSS zoom remains 1. Keyboard actions reach and activate
the new export, file chooser, import and diagnostic controls, with visible focus
and no horizontal overflow. PageDown reaches the diagnostic's end; reduced-motion
preference is active. Root inspected raw 400% file-focus and final-reading
captures. The file chooser was triggered by keyboard and supplied synthetic
bytes by Playwright; this is not a manual OS-dialog test.

Both earlier harness stops are preserved: strict floating-point equality against
Chrome's 3.9999999999999996 readback, and sampling native PageDown before scroll
settled. The accepted probe uses a narrow numeric tolerance plus exact viewport/
DPR controls and 400 ms scroll settling. No product edit or extra matrix run
followed the passing result. The report records fractional layout tolerance,
exact raw captures, source/archive hashes and owned-browser/server cleanup.
[40-check receipt](evidence/starter-receipt/zoom/result.json),
[method and limits](evidence/starter-receipt/zoom/REVIEW.md),
[original input mapping](evidence/starter-receipt/zoom/normalization.json).

CI run **34167746529** targets `83bd8aad`: 13 jobs currently pass and Build &
Check remains running. A passing whole-run result is not claimed at this
checkpoint. Browser Evidence is conditionally skipped, distinct from the actual
local and remote browser checks recorded above.


## GeoNames schema/cache candidate delivery — September 7, 23:13 UTC

The next independent A02/A03 correction is delivered in SDK
[draft #9](https://github.com/ZodiacsOfficial/sdk/pull/9), stacked on #8. Source
`d190d97c981c7cacc6eb4ab6a49bdb8451ca3459` validates compact v1 JSON before cache
fulfillment and returns metadata array snapshots. Malformed successful responses
can be retried explicitly, while valid/in-flight caches and original transport
errors are preserved. The root/ownership code and site's engine rc.1 and starter
engine rc.3 pins remain unchanged.

Separate engine **0.1.1-rc.4**, **22 files / 33,669 packed / 112,949 unpacked
bytes**, SHA-256
`0146fdff7abb6b937cf4d66b4cdaf0c80ecf238ea71f1f4f9fb27eae687a0d20`, is distributed
at `9ad6a73984e69b897a6422429fab1970a7c89450`. The
[immutable public artifact](https://raw.githubusercontent.com/ZodiacsOfficial/sdk/9ad6a73984e69b897a6422429fab1970a7c89450/artifacts/zodiacs-engine-0.1.1-rc.4.tgz)
was anonymously verified at 23:08 UTC.

All **496 workspace tests / 30 files** pass on Node 20/22. Required build,
typecheck/lint, format, checksum, neutrality, TypeDoc, exports/contents/dry-pack
gates pass. Two clean packed consumers pass public TypeScript, ordinary engine/
receipt behavior and new HTTP-200 recovery/mutation controls; isolated audit is
zero. The 96 exact chart comparisons match rc.3 apart from version. All 33,934
checked-in rows validate, with baseline results/metadata/request order retained
in 27 sampled queries. Nine independent strict-unhandled-rejection probes and
20 actual Chrome packed-consumer controls pass.

[Complete SDK evidence at its browser checkpoint](https://github.com/ZodiacsOfficial/sdk/blob/ef846c82dd284559f1574f69ee901a221a7a722a/docs/platform/EVIDENCE.md#geonames-schema-and-cache-integrity-candidate)
retains pre-fix failures, exact hashes, commands, model review and harness
corrections. All browser responses are synthetic. Fixed GET resource paths omit
full query/birth data but reveal the normalized initial through shard selection.
Validation cannot authenticate geographic facts or detect in-range table indices
from another dataset generation; a concrete mismatch is tested/documented.
No host-dependent timezone rejection, automatic retry, eager requests, new
response-size budget or custom-fetch sandbox is claimed.

Fresh 23:08 UTC reads retain site main `7f953e3f`, SDK main `b49e0f14` and SDK
#5's OPEN/draft/zero-review merge-publication hold at `cced0116`. Npm engine/
widgets return 404; optional ownership remains 1.0.1. No merge, npm publication,
production operation, external outreach or adoption occurred. Stacked SDK CI
does not trigger; passing local evidence is not called CI success.


### Receipt starter exact-source CI complete — 2026-09-07 23:21 UTC

Site Check run [34167746529](https://github.com/ZodiacsOfficial/site/actions/runs/34167746529)
completed successfully for delivery source
**`83bd8aad212e846815eebb07bd3b59fa1c28e1c1`**: **all 14 jobs pass**. This
supersedes the running-job snapshots above. The long Build & Check job completed
its existing source, numerical, fresh-consumer, cross-page, visual, performance
and widget acceptance steps; it was not cancelled to push evidence updates.
[Exact source/job outcomes](evidence/starter-receipt/ci-final.json).

Subsequent site commits only record verification and the separately delivered
SDK candidate. They do not change this tested runtime, archive or metadata.
The exact READY preview already tested uses the same `83bd8aad` delivery source.
The conditionally skipped Browser Evidence workflow is not counted as a passing
browser run. No merge or production deployment is implied by all-green CI.


## Stage A public flags and civil settings — SDK rc.5

Delivered [SDK draft #10](https://github.com/ZodiacsOfficial/sdk/pull/10), stacked
on #9, from `codex/platform-input-flags`. Source
`97f5e8d01828f4b85ffa845825dee9acff4695e4`; archive carrier
`333369256af683c560603dd1e6411dd7a07adb1f`; final acceptance evidence
`785e3ea154c28e890ecc97ce2284ee3e9f48a4a7`. The
[anonymous immutable artifact](https://raw.githubusercontent.com/ZodiacsOfficial/sdk/333369256af683c560603dd1e6411dd7a07adb1f/artifacts/zodiacs-engine-0.1.1-rc.5.tgz)
was verified at 23:49:36 UTC: 23 files, 36,065 packed / 121,212 unpacked bytes,
SHA-256 `1809c1686843a6be148eb185535e32059a20c35896e29ccfc7583a6b2738da65`, integrity
`sha512-XUmtZ+mOwMJxElr6hbhQ59cPatvsPa8/XrLfihZfdsQnMZgptlTZSV6YBRVr+Nqps0No64HUpYLXNhUoeCVzNA==`.

Correct typed no-time/polar-fallback echoes previously duplicated result flags
and failed receipt creation. Malformed/private/contradictory flags could enter
result metadata, and civil/public settings were not consistently captured after
validation. The original-source final regression suite reproduced 61 failures
with 5 valid controls. The implemented compatibility policy preserves the five
public values, bounds raw arrays at 64 data entries, deduplicates valid claims,
checks derived assertions, and records canonical semantic metadata once.
Public/civil settings are captured once; invalid civil settings reject before
Intl. Supplied Charts receive flag consistency checks and optional shallow
normalization, retaining canonical identity and numerical references.

Root executed all required SDK gates; build/typecheck ran sequentially. **562
workspace tests / 31 files pass on Node 20.20.2 and 22.23.2**. Two actual fresh
packed consumers pass TypeScript 5.9.3, exports/notices, optional isolation,
existing GeoNames/receipt examples and the new flags/settings/identity controls.
Isolated audit is zero. Installed rc.4→rc.5 matches **480** synthetic numerical
cases excluding only engineVersion; **480** extra duplicate/result echo cases
and receipt replay pass with ephemeris 2.1.19 on both.

An independent tool-backed reviewer passed 14 frozen-source adversarial controls,
including Saturn costs: ordinary inputs add zero natal calculations, explicit
raw polar assertions add one to verify actual fallback, and supplied Charts add
none. Actual Chrome 152 passes **26 aggregate packed-browser acceptance checks**,
including 14 API groups. All 23 installed archive members match. Optional geo/
receipt graphs exclude ephemeris/ownership; root excludes optional code. Four
static GET resources load, then all API cases run offline with zero observed
fetch/storage attempts, cookies or browser/console/CSP errors. Privacy observers
are proven with negative controls. Valid civil cases intentionally use Intl.
Owned browser/server resources are closed.

[Exact source, commands, raw logs, controls, graphs, captures and limits](https://github.com/ZodiacsOfficial/sdk/blob/785e3ea154c28e890ecc97ce2284ee3e9f48a4a7/docs/platform/EVIDENCE.md#public-flags-and-civil-settings-candidate).
Original harness errors are retained: baseline Intl spy corrected before the
final red suite; first real pack failed inherited npm cache EPERM before an
archive existed and succeeded with isolated configs/cache; first browser session
name exceeded macOS's socket limit and was shortened before candidate execution.
No source or test tolerance was changed to hide those environment/harness errors.

Time flags remain historical claims; precomputed numerical values are not
authenticated. Same-realm executable getters/proxies are not sandboxed. Finite
parity is not an astronomical accuracy guarantee. Dependency lock, receipt schema, numerical formulas, older archives and
ownership behavior are unchanged by the new wrapper validation. The site retains engine rc.1 and starter
rc.3 retains engine rc.3 at this checkpoint. A new site pin is being prepared
separately; no account storage/wire migration is active.

Remote refresh at 23:41 UTC still shows site main `7f953e3f`, SDK main `b49e0f14`,
SDK #5 draft at `cced0116`, zero submitted reviews, explicit merge/publication
hold, engine/widgets npm 404, ownership 1.0.1 and unchanged READY production
`dpl_BrntzbFYa2gzetKWgeq91GFeaM6W`. No merge, npm publication, production release,
external adoption, outreach, spending, access change or destructive action.

## C02 local request loss and old-writer counterexamples

An independent synthetic in-memory probe at site `921cd0d1` imports the actual
engine/profile store/read/handoff and account wire/fingerprint functions. Its
save projection mirrors and checks the current calculator source mapping; it
does not claim to drive the calculator UI. **Two expected assertions fail**:
polar requested Placidus saves/reruns as Whole, and a subsequent explicit Whole
request updates the same record instead of retaining two distinct requests.
**Three controls pass**, proving old writers hide/overwrite a same-key version
bump, discard additive metadata on ordinary re-save, and produce identical v1
wire bytes/fingerprints for the different requests. Zero account/network calls,
real browser storage writes or shared source edits occurred.

[Probe command and exact qualification](evidence/c02-next/README.md.log),
[observations/source hashes](evidence/c02-next/observations.json.log),
[executed synthetic probe](evidence/c02-next/probe.test.ts.log),
[versioning comparison](evidence/c02-next/DESIGN.md.log).
Decision C-006 chooses a version-owned source with explicit legacy/downgrade
behavior. First integrate the existing SDK receipt capability through a tested
site artifact adoption; do not duplicate its schema or infer missing legacy
intent. Active storage/access/export/delete/sync wiring remains engineering work,
with future server capability/CAS/idempotent-replay handling separately reviewed.


## Site rc.5 adoption and current-edition integration

Site `codex/platform-engine-rc5` starts at delivered #419 `ba65375a`. Source
`4c93a104` adopts the exact SDK archive; `7266b131` merges main `d4d5717d`.
[Artifact identities and finite numerical evidence](evidence/site-engine-rc5/README.md),
[247-check author acceptance](evidence/site-engine-rc5/implementation/REVIEW.md.log),
[fresh independent review](evidence/site-engine-rc5/independent-review/REVIEW.md.log).

The independent reviewer executed 291 bounded checks on each Node 22.23.2 and
24.19.0, including 133 site chart comparisons, 192 scanner value comparisons,
72 house configurations, graph/export isolation and 85 hostile metadata cases.
All 23 installed members, four immutable evidence files and 265 preservation
files match. The anonymous SDK archive and immutable source documentation were
fetched again. This does not independently rebuild SDK source or authenticate
imported receipt claims. The twelve frozen reviewed source hashes remain equal.

Root regenerated current September 8 provenance with `npm run editorial:daily:build`.
Only the engine version and generator hash changed; publication and astronomy
bytes are preserved. All other upstream content files are byte-identical to
main; [hash record](evidence/site-engine-rc5/release/upstream-integration.json).
The exact one-time protected-scope allowance covers twelve inherited Registry
pages against stacked base `ba65375a`; no scope-guard logic was changed.

Node 22: **4,717 tests / 408 files pass** with file parallelism disabled;
`npm run build`, `npm run check` (zero errors/warnings, 11 hints), and exact-base
scope pass. The unchanged capture driver produced 18 current-edition images at
360/1280. Six are byte-identical to the prior edition; one image's height changes
with daily content. No baseline threshold, fixture or numerical policy changed.
[Commands/timing/logs](evidence/site-engine-rc5/release/gates.json),
[image comparison](evidence/site-engine-rc5/release/phase1-image-comparison.json).
The carried preceding full attempt (4,712 passes, five stale-evidence/timeouts)
is retained as a qualified observation in git history; its unarchived temporary
log was lost with the environment reset and is not represented as a raw receipt.

Desktop/mobile developer pages and all 12 share journeys pass. New native zoom
acceptance found an actual 320px overflow from the long inline terminal URL.
A single `.dev-note code { overflow-wrap: anywhere; }` rule corrects it without
changing shared design or code-panel scrolling. The rebuilt candidate passes
30 actual Chrome 200%/400% checks, with eight captures, zero page errors and owned
profile/preview cleanup. Native viewport widths are 640/320, DPR 2/4, and CSS
zoom remains 1. The regular developer driver now covers 320px as well.
[Native result](evidence/site-engine-rc5/release/native-zoom/result.json).

Preserved harness failures: the new archived-reference link invalidated an old
Tab predecessor; the driver now follows the real final link. The new native
harness assumed a 2px outline for both regions, whereas the unchanged shared
CSS specifies 1.5px and support specifies 2px; it now checks both exact values.
A diagnostic launched alongside another owned Astro preview failed its shared
preview lock before page execution, then ran sequentially. Original results,
captures and harnesses remain under the release evidence directory.

The whole-site macOS visual command reports 15 mismatches against existing
baselines. It is **failed, not passed**; a separate prior-candidate control is
in progress. No baseline update or blanket release-ready claim is made. CI and
preview verification remain pending. Production/source/package states were
refreshed through read-only operations in
[release-refresh.json](evidence/site-engine-rc5/release/release-refresh.json).


### Independent classification of macOS visual failures

The control starts from exact delivered #419 `ba65375a`, installs rc.1 from its
unchanged archive with separately copied dependencies, inherits the same 22-file
September 8 upstream update, and regenerates its own rc.1 manifest. Its full
build passes. The original visual suite reproduces **all 15 failures**, with
exactly the same dimensions as the rc.5 candidate. **13 PNG pairs are byte-identical**;
all **15 pairs score zero differing pixels at the unchanged pixelmatch 0.1
perceptual threshold**. The original 0.1% maximum-difference gate was retained.
The two home desktop pairs have raw channel differences, mostly 1/255 and at
most 20; no cause is invented. Four corresponding images and raw distributions
are included, alongside hashes/results for every case.

[Control source, commands and qualification](evidence/site-engine-rc5/visual-control/REVIEW.md.log),
[copy manifest](evidence/site-engine-rc5/visual-control/manifest.json).
No baseline is replaced or represented as passing. This finite comparison shows
no new scored drift on those routes; it does not approve new baselines or certify
unexamined routes. The actual developer-note overflow is separately corrected
and passes 320px and native 400% acceptance.

Draft [#422](https://github.com/ZodiacsOfficial/site/pull/422) is delivered at
`8ee0e0183a3c4437af902858b1d76678d3e961a3`. CI run 34186236252 is active;
13 jobs currently pass and Build & Check is still running. Exact-source preview
verification is active. All four newly public site evidence URLs were downloaded
without credentials and matched the immutable carrier bytes; see
[public evidence verification](evidence/site-engine-rc5/release/public-evidence-verification.json).


### Exact-source #422 preview acceptance

Vercel deployment `dpl_BsA6EAM83MD2vyAHiSAsVNzTwPm9` is **READY** for exact
runtime source `8ee0e0183a3c4437af902858b1d76678d3e961a3` at
https://zodiacs-kanwjkp9y-zodiacsofficial.vercel.app. Actual Chrome 152 passes
**13 checks**: all three developer routes at 1280/390/320, support keyboard
focus/current artifact/version/archived links, synthetic birth-chart results
identifying rc.5 with no saved profile, and the September 8 shared-sky endpoint.
[Deployment receipt](evidence/site-engine-rc5/preview/deployment.json),
[browser result](evidence/site-engine-rc5/preview/result.json).

The initial unauthenticated browser received Vercel's login page and failed
its site-footer expectation. It is retained as an access failure, not product
acceptance. Temporary Vercel access was used in an isolated browser; auth URLs
and cookie values are excluded from evidence, the browser closed, and the
mode-600 credential file was deleted. No production/account operation occurred.

A later read at 04:20 UTC finds site main `75d036ae`: the scheduled updater
refreshed 18 Registry files after #422 was pushed. No daily/calculation code
changed; this candidate leaves all 18 paths unchanged relative to common
ancestor `d4d5717d`, so they must retain the newer main version on integration.
This is a separate upstream evolution, not a candidate deployment or permission
to overwrite Registry records. The next slice stays on the reviewed stack.


## C02 optional portable calculation boundary

Owner coordination refresh: separate Astrofolio draft
[#416](https://github.com/ZodiacsOfficial/site/pull/416) is at `b17d6804960b6b30bb48208aff0f783b03768152`.
Its actual changed paths are confined to the isolated view, local verification
modules, scoped tests and `docs/astrofolio-trust/`. Shared-file proposals are
stored as unapplied patches in that documentation directory. This is a path
inspection, not a content approval or integration. Root keeps the platform and
shared-file role; no direct communication with the other session is assumed.
[Exact draft/path checkpoint](evidence/coordination/astrofolio-20260908.json).
Its verification release remains reviewable independently of the SDK hold.

Branch `codex/platform-portable-calculation` starts at delivered #422 evidence
head `6ab85278bea708337e20947966a54a5072ad0627`. The exact four-file source
patch SHA-256 is `69a5fa55efbf961bb2760bffec4edfdc16ee6df575a84045961fe4e9ee5bbb45`.
`computePortableChart` executes public `natalChart` once, supplies that complete
Chart to the existing SDK codec, and uses the shared pure mapper for the legacy
compact shape. Full.ts preserves original input identity and angle/house/aspect
references. The optional module is outside existing eager math/UI/account graphs.

The validated receipt supplies canonical requested settings and an ISO-string
instant, so replay input does not lose Placidus intent on Whole fallback or an
explicit unknown-time 08:30 instant. Receipt/snapshot JSON is recursively frozen
and detached from mutable chart/Date/flag/context branches. Explicit source/time
context is validated after calculation; it is not an atomic entry-time snapshot
across executable caller getters or authenticated historical provenance. Errors
have fixed message/code without inspecting or retaining private raw exceptions.
No active store, export UI, account protocol, migration or hosted route is added.

[Author source and exact commands](evidence/portable-calculation/implementation/README.md.log),
[independent review](evidence/portable-calculation/independent-review/REVIEW.md.log),
[raw copy manifest](evidence/portable-calculation/copy-manifest.json).
Author: 80 focused checks and strict TypeScript pass. Independent bundled Node
review: 11 actual probe groups pass, no fake engine/receipt results. Root repeats
80 focused checks on the actual installed package. Earlier scratch dependency
symlink resolution failure and the byte-identical local dependency copy are
retained; no implementation or tolerance was changed to hide that failure.

Root full suite: **4,738 tests / 409 files pass** on Node 22.23.2. Full production
build passes, including budgets and engine isolation. Regenerating daily evidence
produces no changed data/provenance bytes. The original acceptance driver refreshes
the source fingerprint to `fae58360fb1dcb1c320061c0705580637359fbc3ac5ab9fc44677dd750a7c7e7`;
all 18 captured PNGs are byte-identical to base `6ab85278`.
[Release commands/results](evidence/portable-calculation/release/gates.json),
[exact capture equality](evidence/portable-calculation/release/capture-parity.json).
Root check passes with zero errors/warnings and 11 hints; exact stacked scope
protection and all 12 chart-share browser cases pass. The affected three chart
visual cases reproduce their pre-existing dimension failures. Two images are
byte-identical to rc.5 source `8ee0e018`; all three have zero scored differences
at original threshold 0.1. The ordinary desktop pair has 53,050 raw differing
pixels (maximum channel delta 24), with both images retained. No new masks,
tolerances or baseline replacement were used.
[Chart comparison](evidence/portable-calculation/release/chart-visual-parity.json),
[original failing gate](evidence/portable-calculation/release/visual.log).
Actual Chrome 152 acceptance passes **12 browser groups and 42 observer negative
controls**. Native precise coverage measures exactly one `computePortableChart`,
public `natalChart`, internal `computeChart` and `createNatalEnvelope` call for
the measured calculation, without replacing their implementations. All 23
installed package members match rc.5; the real 11-module bundle excludes geo
and ownership code. Three static local GETs load the harness, then all cases
run offline with zero observed runtime network/storage/cookie/Intl activity
and no page/console errors. Empty storage/cookies and owned cleanup are verified.
These are synthetic isolated-module cases, not active save/account acceptance.

[Browser scope and exact source identities](evidence/portable-calculation/browser/README.md.log),
[30-file raw copy manifest](evidence/portable-calculation/browser/copy-manifest.json),
manifest SHA-256 `8bdcc73e9544c58727bb2e1a884e89fe25b673e95b36894e6b18408b6e2de464`.
The first successful narrower-observer run, final strengthened run and
post-interruption cleanup verification are retained. The tested four source
files still match the independent frozen patch. Draft [#425](https://github.com/ZodiacsOfficial/site/pull/425)
is delivered at `dcc4e437a99f812666cd19dc85e6d781dbb3bedc`. Its exact-source
CI run 34187725308 is in progress. Exact-source Vercel preview
`dpl_5X7uR9haSVZFWS8aNqYt9MtJBJ8z` is **READY** at
https://zodiacs-qi1su4rwh-zodiacsofficial.vercel.app and passes **13 browser/API
checks**: developer paths at 1280/390/320, keyboard/current artifact/archived
reference checks, synthetic chart output on rc.5 without saving a profile, and
the actual September 8 sky endpoint. The changed compact adapter executes in
those actual chart journeys; the optional receipt module's actual browser
acceptance is the separate synthetic offline harness above.
[Preview receipt](evidence/portable-calculation/preview/deployment.json),
[actual results](evidence/portable-calculation/preview/result.json).
Temporary protected-preview access was isolated; cookies/auth values were not
archived, the browser closed and its credential file was deleted. Publication,
production deployment and external adoption are not claimed.

## C02 saved-record dependency and implementation direction

The refreshed independent investigation runs **nine Node controls and four
native Chrome controls** against twelve unchanged boundary-source files. It
reproduces an allowed old-writer interleaving where both saves report success
but one chart is lost; an invented global key escapes actual account handoff,
isolation and deletion. Native IndexedDB demonstrates atomic transaction/cap
behavior, the incompatibility of upgrading the existing Living Chart database
for old version-1 readers, and that closing a database inside an active
transaction still allows that transaction to commit.

[Exact contract and activation dependencies](evidence/saved-record-design/DESIGN.md.log),
[reproductions and native evidence](evidence/saved-record-design/EVIDENCE.md.log),
[34-record manifest](evidence/saved-record-design/manifest.json), SHA-256
`63f1401aa3a940208f8caf89ab5d1321f5e5bd45495abc8e8d504343c82096ee`.
These are synthetic counterexamples and a bounded architecture decision, not
implemented account lifecycle coverage. A separate author is implementing
Decision C-008's optional immutable profile store on source `dcc4e437`, without
UI/account activation or changing existing databases. The next review must
exercise actual transaction aborts, capacity, corruption, owner/epoch changes
and stale completion behavior before integration.


### Completed rc.5 adoption CI

Exact-source run [34186236252](https://github.com/ZodiacsOfficial/site/actions/runs/34186236252)
completed successfully: **all 14 jobs pass** at runtime source
`8ee0e0183a3c4437af902858b1d76678d3e961a3`, including the full build/browser/visual/
performance gates on the hosted runner. This does not relabel the separately
recorded local macOS baseline failures as passed, or transfer source CI to later
documentation-only heads without qualification.
[Final job/step receipt](evidence/site-engine-rc5/release/ci-34186236252-final.json).

### Saved-record draft review, before integration

Root captured the unfrozen first record implementation at SHA-256
`4538cb6400bdb6059e257cd8c8680f77cdbd9d8e1fe4b1f277c8170748c16074` and executed
it with the real installed engine/receipt functions. Unlabeled creation succeeds
but reread fails because the parser counts one too many required keys; labelled
control succeeds. A future `v10` record is misclassified as corrupt while `v2`
is recognized as unsupported. Both findings were sent to the author for fixes
and regression tests before source integration.

Root's static suspicion about a trailing newline in IDs was **disproved**: the
existing JavaScript expressions reject it without multiline mode. The initial
probe wrongly expected acceptance, failed that assertion, and is preserved as
a harness/reviewer mistake. The corrected probe records both negative controls;
there is no claimed pre-existing UUID vulnerability.
[Actual draft probe](evidence/saved-records/root-review/result.json),
[raw evidence manifest](evidence/saved-records/root-review/manifest.json).
This early review is not final saved-store acceptance or active lifecycle coverage.


### Completed portable-calculation CI

All 14 jobs pass in exact-source [CI run 34187725308](https://github.com/ZodiacsOfficial/site/actions/runs/34187725308)
at `dcc4e437a99f812666cd19dc85e6d781dbb3bedc`, alongside its previously verified
READY preview. [Final job receipt](evidence/portable-calculation/release/ci-34187725308-final.json).
Later documentation heads are distinct from this tested runtime source.

### Frozen saved-record store acceptance

Root integrates the exact four-file patch
`5d61510dec09e42ad2196c173da5a88f206a85af5809a27562b1daf0cc2f83a5`
onto `c761a49c55d125bca48ff38d81b0a9ff6fd5adcf`. The optional profile store
uses its own owner-indexed IndexedDB database, immutable validated SDK receipt
strings, fresh UUIDs and a 40-record limit enforced with insertion in one
transaction. It exports the stored envelope without local record/owner metadata.
There is no eager database open, v1 write, legacy projection, UI/account
activation, remote sync or shared-file/Astrofolio change.

It passes **74 focused tests** (49 new / 25 existing), strict TypeScript and
**22 independent actual Chrome cases**. Native review proves transaction abort
before commit, honest `mayHaveCommitted: true` after a real commit, prompt
revoked-open settlement while another deletion stays blocked, late connection
cleanup, native concurrent capacity, owner partition, future/corrupt rows and
controlled quota rollback. The quota override is limited to one disposable
origin and verified restored; no disk filling or user data is involved.

[Author evidence](evidence/saved-records/implementation/EVIDENCE.md.log),
[27-file manifest](evidence/saved-records/implementation/copy-manifest.json), SHA-256
`1b7e7cee56516cd13510b6cfa5b3134643cfced1abae716fb14ce07b64761ef2`.
[Independent review](evidence/saved-records/independent-review/REVIEW.md.log),
[45-file manifest](evidence/saved-records/independent-review/manifest.json), SHA-256
`8d6e5fdb5fffb5907b434fc3057f9a486f632a3b577836b89a7f5defc4a9c4ec`.
Initial parser failures, type-invocation omission, logical-open hang and the
disproved newline suspicion remain preserved and correctly attributed.

Root full acceptance: **4,787 tests / 411 files**, production build, check of
1,038 files (zero errors/warnings, 11 hints), exact-base protected-scope guard,
and 18 fresh captures. All PNGs are byte-identical to the base. Fingerprint
`8adaac8fafb4b52174722e0da00854ae23c5eaa1ef9132de377fccc85eb5d435`.
The first full run was ordered before the required capture refresh and correctly
failed one stale-fingerprint assertion (4,786 other tests passed). Root preserved
it, ran the original build/capture driver, and repeated the full suite to a clean
pass. No assertion, capture policy, tolerance or baseline was changed.
[Commands and exits](evidence/saved-records/release/gates.json),
[exact capture equality](evidence/saved-records/release/capture-parity.json).

A clear consumes only its own handle; another handle may create afterward.
Application authority callbacks are not authentication. Asynchronous inventory,
verified owner/access leases, guest/retained scopes, account handoff/export and
durable deletion/retry must be integrated before active saving. The explicit
local receipt-export UI is a separate next prerequisite, independent of this
store's implementation. This entry does not claim draft delivery, CI or preview
for the saved store, account lifecycle completion, publication or adoption.


### Saved-record draft delivery

Draft [#426](https://github.com/ZodiacsOfficial/site/pull/426), source `a0bf55176dd4df4d27763bfeb2cf97e36abe4d15`,
is pushed on `codex/platform-saved-records`, stacked on #425 at `c761a49c`.
The actual created draft and changed-file list are verified in
[the PR receipt](evidence/saved-records/release/draft-pr.json). Exact-source
CI run 34190846700 and automatic preview are running; neither is yet claimed
passed in this entry. No active saving, production, publication or merge occurred.


### Saved-record CI and exact preview accepted

All14 jobs pass in [exact-source CI34190846700](https://github.com/ZodiacsOfficial/site/actions/runs/34190846700)
at `a0bf55176dd4df4d27763bfeb2cf97e36abe4d15`.
[Final receipt](evidence/saved-records/release/ci-34190846700-final.json).
READY preview `dpl_bhx76pgozg4Djw3mbBayzay7VrxS`,
https://zodiacs-9wi4nsxk8-zodiacsofficial.vercel.app, matches that exact source and
passes13 actual browser/API checks across developer routes at1280/390/320px,
keyboard matrix navigation, synthetic chart/version/no-save and September8 sky.
[Deployment](evidence/saved-records/preview/deployment.json),
[results](evidence/saved-records/preview/result.json),
[driver](evidence/saved-records/preview/verify.mjs.log).
The metadata-only first write failed on JSON null in a Python literal and was
corrected with json.loads; no product or browser acceptance changed. Temporary
preview access was isolated, browser closed and auth file removed.

### Historical time correction delivered in the SDK

Separate [SDK draft #11](https://github.com/ZodiacsOfficial/sdk/pull/11) delivers
engine rc.6, source `fb57af7a2cd7c30983cc8fb655183d5a11f9cf30`, carrier
`51129a197cd3f2a2a8c966fb797ea4da1e147b3d`, evidence head `ac27761e`.
Actual SDK/site baseline minute-only matching missed historical seconds-sized
gaps and reported false folds nearby. The SDK correction keeps Gregorian
formatting and matches seconds/milliseconds, retaining historical offset seconds,
strict guards and existing sampled-offset policies. Root579 tests on Node22/24
and required workspace gates pass; two fresh consumers use the exact23-file
archive, SHA-256 `09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e`.
Anonymous public archive bytes match. Independent copied-source review passes
278 Node/37 actual Chrome cases,140/15 expected flag corrections, zero tested
instant/offset/numerical changes and seven receipt/replay controls per runtime.
[SDK raw evidence and limitations](https://github.com/ZodiacsOfficial/sdk/blob/ac27761e6dea138842e6ef5c2c69129ead7af636/docs/platform/EVIDENCE.md#historical-local-time-precision-candidate).
The site remains on rc.5; artifact availability is not npm publication, site
adoption, deployment or human expert review. Existing SDK#5 hold remains.

The independent search separately reproduced incorrect local-date endpoints:
Toronto1919-03-31 starts30minutes too late, Apia2011-12-30 is empty, and the
library's year0000 rollover remaps to1900. These are distinct next engineering
requirements, not fixed by precise birth-time matching. Evidence and the
bounded follow-up plan are retained with the SDK review packet.

## 2026-09-08 — receipt export integration, release gates pending

Source base is #425 documentation head `c761a49c55d125bca48ff38d81b0a9ff6fd5adcf`.
Receipt Freeze 2 patch is `d6639f7bd46ed9adce30c1d1f374394356350593234dacdcc82baa20086fa425`;
Interaction Freeze 1 is `b44a9b79db41a48ededa2e172f44f11512e59b177c4ecb110ab5883e5ad28110`.
Root verifies all 18 frozen source/test bytes after integration; only the exact-base
eight-path localization scope allowance is additional implementation metadata.

Copied payloads are byte-verified against the original sealed deliveries:

- [Author manifest](evidence/receipt-export/author/manifest.json): 153 records;
  SHA-256 `5918aeed0df8514d9bed705d216f5e664210e3353355c42c5be4ecedeb954f7a`.
  126 focused tests, 2,136 same-host zone/extreme compatibility cases, 16 native
  interaction controls, 12 receipt flows and existing Russian route drive pass.
- [Independent browser review](evidence/receipt-export/independent-review/REVIEW.md.log):
  253 records, manifest SHA-256 `7963d05c842b7715a86662ea01cd611216143ee10b25027c1f3ea442b23dd2c7`.
  31 full-site groups plus two native select controls pass, including native 400%
  zoom, all six locales, stale retained clicks, delayed module/revocation, no
  duplicate calculation after serialization failure and actual parsed downloads.
- [Independent bundle review](evidence/receipt-export/bundle-review/REVIEW.md.log):
  28 records, manifest SHA-256 `166f82317e649196e54715445c9d5a03a8a7ecb3b9a54f9458e16cad5355dc0c`.
  All 23 expected outcomes pass: 17 rejections, four positive controls and two
  documented data-flow limits. All 56 archived fixture budget files retain the
  original bytes. [Root iterations](evidence/receipt-export/bundle-author/) retain
  initial failures, 26 final passing fixtures and real-site measurements.

Russian initialization, draft select reordering, escaped/parenthesized/CDN
imports and source whitespace failures were found and corrected. Failed harness
assumptions and raw-build preparation failures remain separately identified.
No tolerance, visual baseline, numerical result or size budget was loosened.
Root production-build/capture/test/check/scope results and draft/preview status
remain pending; independent local source acceptance does not establish them.


Root integrated acceptance now passes: normal build; 4,816 tests / 412 files;
check across 1,038 files with zero errors/warnings and 11 hints; exact #425-base
scope with the eight named locale paths; 18 captures byte-identical to #425;
16 native interaction controls; 12 receipt download groups; 12 existing share
cases; and the full Russian drive (26 public routes plus noindex 404, 360/1280).
The original affected macOS chart visual gate retains three pre-existing
height failures. All three current image hashes match the preceding #425 record;
comparison with the retained rc.5 control scores zero at threshold 0.1, with no
new masks, baseline updates or tolerance changes. The first local browser launch
failed under the filesystem sandbox; the identical driver passed with the normal
isolated Chrome launch permission. No automatic approval rejection occurred.

[Root acceptance](evidence/receipt-export/integration/result.json) and its linked
[raw manifest](evidence/receipt-export/integration/manifest.json) retain exact
source/build/capture identities, scripts, logs, synthetic parsed downloads and
images. Full engine static closure is five chunks, 23.3 KB under the unchanged
25 KB limit. The root reviewed Russian and native 400% screenshots: the receipt
control and sensitive-file note remain visible and keyboard accessible.

Fresh remote reads retain site main `75d036ae365a4c469e234046b0592a80f0dbc311`,
Astrofolio #416 draft head `b17d6804960b6b30bb48208aff0f783b03768152` with only
its assigned isolated paths and unapplied documentation proposals, and SDK #5's
explicit hold at `cced011659d48877b8b73b8a85796815234cf741`. No Astrofolio integration
or shared-source expansion occurs. Production still serves that main release.


Draft [site #427](https://github.com/ZodiacsOfficial/site/pull/427) is delivered
at source `804c70309d2508e67e8462df526b5f9e71a112e9`, base #425 `c761a49c`.
The actual paginated 621-file list matches the local diff exactly, including
19 implementation/test/scope paths. The initial summary API returned only the
first 100 evidence files; the full paginated record is retained in
[release](evidence/receipt-export/release/). Site Check run 34195946291 is in
progress. Preview `dpl_CdGmdz6nP8HhCm4TX8WQ7epja2JH` is building from that exact
source. Neither pending state is a passing hosted acceptance result.


The exact-source #427 [READY preview](https://zodiacs-c3afqubvj-zodiacsofficial.vercel.app)
now passes all 12 receipt groups, including six localized keyboard downloads,
fresh polar fallback, repeated calculation, stale retained click, fixed private
allocation failure/retry, explicit unknown local noon, fixed-offset/history/pole
unavailability and positions-only isolation. Downloaded files pass the actual
rc.5 codec. Observed storage and calculation counts do not change on download;
Blob URLs are revoked. [Preview records](evidence/receipt-export/preview/) retain
synthetic files, screenshots, exact driver/results and source deployment identity.
Remote served-file hashes are explicitly unavailable; the provider's commit
identity is recorded rather than inferred from local build bytes. Contexts closed
and temporary preview credentials were deleted. Hosted CI has 13 passing jobs;
Build & Check remains in progress. No production/account/publication action.


Preview privacy qualification: the hosted site's existing Plausible loader was
requested and blocked by the isolated test harness in each of the 12 contexts;
there were no other recorded external requests or page errors, and no observed
non-GET requests. This is not a claim that the entire hosted site makes zero
external requests or that existing analytics ran in the test. Receipt download
itself adds no analytics or remote endpoint; local and independent observer
checks, with their scope and negative controls, remain the privacy evidence.


The separate [date-coverage review](evidence/local-date-endpoints/review/REVIEW.md.log)
is preserved as 71 byte-verified records; manifest SHA-256
`f3a9c0b7a4fc73d4f32ed0bd3af2754e79f38e241306b4f266aae1f08d146cb8`.
Seventeen actual controls each on Node 22 and Chrome find nine helper mismatches.
Native Chrome Temporal transition enumeration agrees with all 17 interval sets;
this shares host timezone data and is not independent historical evidence.
Two synthetic hidden-transition schedules disprove unconditional completeness
and empty-date claims for hourly Intl sampling. This evidence led to an inactive,
separately authored complete-provider API prerequisite, not a change to #427 or
an activation of unreviewed unknown-time behavior.
