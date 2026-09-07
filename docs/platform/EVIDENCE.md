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
