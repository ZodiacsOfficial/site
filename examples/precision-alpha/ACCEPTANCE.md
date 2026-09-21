# Acceptance checklist — precision alpha

**Verdicts added 2026-09-20 after implementation. The conditions themselves
are unchanged from the frozen version** — compare against the commit that
introduced this file. Nothing is marked met because a different item passed,
and the one item this environment cannot fully decide says so.

Frozen 2026-09-20 before implementation, from branch
`claude/eager-ramanujan-razak3` at `d817be0e` merged with `origin/main`
`a6056de1`. Finite: twenty items, each either met or not, with the evidence
that decides it. Nothing here is marked met because a different item passed.

## A · One runtime, two environments

| # | condition | decided by | verdict |
| --- | --- | --- | --- |
| A1 | The numerical core imports nothing from `node:*`, references no `Buffer`, and no `require` | a test that greps the built core and a browser run that never shims | **met** — tier A `core-purity` greps every core module for `node:`, `require`, `Buffer`, `process.`, `import.meta`, a clock, randomness and `fetch`, and the browser bundle build fails if any survives. 85 kB bundle, browser-clean. |
| A2 | Integrity uses WebCrypto (`crypto.subtle`), which Node 22 and browsers both provide, so one code path serves both | the same module passing in both consumers | **met** — one `sha256HexOf` over `crypto.subtle`, reached only from `source.mjs`, asserted by test. The low-memory Node path streams `node:crypto` instead but reaches the verdict through the same `applyIntegrityPolicy`, and the two digests are asserted equal on the real pack. |
| A3 | Loading/verification is async and separate; every calculation after a pack is ready is synchronous and deterministic | API shape, plus identical output from two consumers | **met** — `openPack*` is async; `apparent` and `search` are synchronous and deterministic. Asserted in tier A, and identical output from two consumers in A4. |
| A4 | A Node consumer and a browser consumer produce **identical** longitudes for the same pack and instants, to the last bit | a committed cross-environment comparison | **met** — 70 of 70 rows -- longitude, latitude and distance for ten bodies at seven instants -- bit-identical between Node, Chromium 141 and Firefox 151. `raw/demo-alpha-run.json`. The first Firefox run failed on latitude by up to 3 ulps; `Math.hypot` was the cause and is now banned from the core. |
| A5 | Node file-backed low-memory mode exists and returns bit-identical numbers to the resident path | test | **met** — tier A `loaders` and tier B `real-pack` both assert the resident and file-backed loaders agree bit for bit, on points and on a whole search. |

## B · Pack loading treated as untrusted input

| # | condition | decided by | verdict |
| --- | --- | --- | --- |
| B1 | Magic, format version, header size cap, and total size cap are checked before any header-derived allocation | tests with tiny hostile fixtures; no real huge allocation is ever performed | **met** — tier A `container`: magic, v1 refusal by name, header cap, zero-length header, header past the file, and a source that reports a size past the cap and throws if read -- proving the cap is checked before any byte is touched. No fixture exceeds 8 kB. |
| B2 | Every header number is finite, non-negative, a safe integer, and every offset/extent computation is overflow-checked | tests | **met** — 18 header mutations, each refused: floats, negatives, NaN, past-cap counts, and an extent that overflows exact integer range. Heap growth during the refusal is asserted under 64 MB. |
| B3 | Record extents are bounds-checked, non-overlapping, and trailing data is refused or explicitly allowed by policy | tests | **met** — records past the payload, a body before the payload, overlapping bodies, a field past its stride, a bad width, a short widths array, a mid-point table running into the records, and trailing bytes counted and reported rather than ignored. |
| B4 | Coefficients, constants, intervals and scales are checked finite and in range — not only payload bytes | tests that mutate `intervalSec`, `emrat`, coverage and body ids, not just payload bits | **met** — implausible EMRAT, a dependency on an absent body, non-monotonic and non-finite coverage, a body that does not span its declared coverage, duplicate and unusable names, unsupported frame and encoding, a non-positive quantum, malformed JSON and a non-object header. |
| B5 | Integrity covers the **header as well as the payload** | a whole-artifact digest; a header edit must fail | **met** — ZODEPH02 digests the whole artifact. The `intervalSec` edit that verified clean under v1 now fails, and `openPackFromBytes` rejects it with `corrupt`. |
| B6 | Structural validity, integrity against an expected digest, and authenticity of the source are three distinct, separately reported things | API and README say so; a self-stored hash is never called authenticity | **met** — three separate answers on every open: `parseContainer` for validity, `verifyIntegrity` for integrity, and `authenticity` as the sentence "not established". Asserted that nothing is ever called authentic. |
| B7 | No convenient public "skip verification". Any research bypass is isolated, marked unverified, and its results carry that mark | API shape + test that a bypassed pack cannot produce a verified-quality result | **met, and stronger** — there is no bypass at all. A test greps the whole package for one. |
| B8 | Verified in-memory bytes cannot be silently mutated after validation | the pack copies or freezes what it validated; test | **met** — `memorySource` copies the bytes it verified; the file-backed source re-checks a stat fingerprint on every read and fails `mutated`. Both tested, including a file swapped underneath a live runtime. |
| B9 | Every failure returns a typed error with a code, closes handles, and leaks no absolute private path | tests | **met** — every refusal is a `PrecisionError` with a code; a missing file names no path; twenty failed opens leak no descriptor; a disposed runtime throws `disposed` rather than reading released state. |

## C · The integrated measurement

| # | condition | decided by | verdict |
| --- | --- | --- | --- |
| C1 | Four configurations measured on identical instants, bodies, time policy and conventions: **A** prototype+old reduction, **B** prototype+corrected, **C** pack+old, **D** pack+corrected | committed raw JSON | **met** — `FOUR-CONFIGURATIONS.md` and `raw/four-configurations/report.json`. One reduction module over two backends, Swiss's own Delta-T on both sides. |
| C2 | Whether compression and the corrected reduction **compose** is stated from C1, not assumed from separate headlines | the write-up | **met** — stated from the measurement. The composition residual is at most 2.7e-8 arcsec on the corpus and 7.6e-6 over the whole sweep, against effects of 0.134 and 0.0012, so the separate sizes may be added. |
| C3 | The 0.05″ incremental-compression target stays separately measurable | reported against the uncompressed prototype | **met** — compression alone, same reduction: 0.001164 arcsec on the corpus, 0.004946 over the whole sweep, against 0.05. |
| C4 | The 0.5″ matched-convention target is checked against the integrated build | reported | **met** — configuration D on the four true centres: 0.010666 arcsec on the corpus, 0.167757 over the whole sweep, against 0.5. |
| C5 | Whether the 0.0107″ result survives the broader test is reported as a measurement, not a guarantee | reported with its denominator and domain | **met, and the answer is no** — it does not survive. 0.010666 arcsec on 64 body-epochs becomes 0.167757 on 11,784 across the full effective coverage, about 16x. Reported with its denominator and domain. |
| C6 | Position and derivative results are reported separately | two tables | **met** — separate tables; the derivative is reported per body in km/s and never combined with position. |
| C7 | Full effective coverage stated exactly, never as rounded calendar years | every table header | **met** — exact TDB seconds and ISO instants, with the 28,800 s inset and its reason, in the report and in every table header. |
| C8 | Barycentric Moon: either the 0.2 km target is met, or barycentric output is **excluded from the alpha's contract**, with the original failed target preserved | the contract document | **met** — barycentric position is excluded from the contract, in `CONTRACT.barycentricPositionExcluded` and the README, with the failed target preserved: sampled 0.165 km, proven 0.449 km, target 0.2 km. This run re-measures the sample at 0.164 km and says plainly that sampling establishes no bound. |
| C9 | Bodies that are system barycentres rather than physical centres are labelled as such everywhere they appear | API output + README | **met** — `isSystemBarycentre` on every result, `BARYCENTRE_NOT_CENTRE` in the API, the demo's pack panel, the README, and a separate table in every measurement set. |

## D · Search semantics

| # | condition | decided by | verdict |
| --- | --- | --- | --- |
| D1 | Results separate: candidates found · interval processed · model-relative isolation established · empirical robustness · unresolved intervals · external model uncertainty | the result type | **met** — six fields, never merged: `candidates`, `interval`, `isolation`, `robustness`, `unresolved`, `externalUncertainty`. A certified result with a non-empty `unresolved` cannot be produced, and that is asserted. |
| D2 | No empirical result is labelled mathematically complete. The enclosure method is named and its assumptions listed | the result carries `support: 'proven' \| 'empirical' \| 'unknown'` | **met** — `support: "empirical"` on anything ephemeris-backed, `exactArithmetic` never set, and the sampled maxima, grid and inflation factor carried on `declaredBounds`. |
| D3 | Adversarial analytic cases pass: close pairs, tangency, high-frequency, flat regions, boundary roots, no roots, missing coverage | test | **met** — the thirteen closed-form analytic cases run against this package's copy of the search, in tier A, with their expected verdicts: close pairs, tangency, near-tangency, boundary roots, no roots, budget refusal, and the paired cases where the same function is certified at one allowance and correctly refused at another. |
| D4 | The original Uranus D contract is unchanged and still failed-incomplete | diff | **met** — no tracked file under `search/` changed, and `node search/reproduce.mjs` still concludes it remains failed-incomplete. |
| D5 | The reported Moon "2 vs 13" concern is re-examined with exact inputs if recoverable, and neither promoted nor dismissed without an exact comparison | recorded finding | **met, and it reproduces** — with the exact case and the harness's own defaults the search returns certified, complete, rootCount 2 where the truth is 13, at every allowance from 1e-9 to 0.5. The mechanism is reproduced at cell level. Promoted from "not reproduced" to an established defect of the harness, and the README corrected. `search/MOON-2-VS-13.md`. |

## E · The browser demonstration

| # | condition | decided by | verdict |
| --- | --- | --- | --- |
| E1 | `demo/precision-runtime.mjs` is the real runtime, not a throwing seam | a successful precision calculation in a browser | **met** — `precision-runtime.mjs` is an esbuild bundle of the real core, and the build refuses an output containing anything environment-specific. |
| E2 | Each failure is exercised **for its own reason**, with a valid pack loaded first | driver output naming each distinct code | **met** — a valid pack is loaded and shown to answer BEFORE any failure is tried. Seven request failures each with their own code, and five broken packs each refused for its own reason with none leaving the previous pack in use. |
| E3 | Cancellation, unload/reload and pack replacement work; a late result from a superseded request never updates the interface | driver output | **met** — cancel accepted mid-run in 37 ms (Chromium) and 66 ms (Firefox); pack replacement, recovery after a bad pack, and a reload all work; a superseded reply is dropped, measured by counting DOM writes with both clicks issued in one synchronous task. |
| E4 | Chromium and Firefox both run it; WebKit attempted; environments recorded honestly | driver output | **met as written; WebKit is absent here** — Chromium 141.0.7390.37 and Firefox 151.0 both pass. WebKit was attempted and is recorded as not run: playwright-core is installed but no WebKit build is in this environment. That is the one part of E4 this environment cannot decide. |
| E5 | No off-origin request, no persistence, during load, calculate, compare, fail and cancel | driver network capture | **met** — zero off-origin requests and nothing in localStorage, sessionStorage, cookies or IndexedDB after load, calculate, compare, fail and cancel, in both browsers. |

## F · Tests from a clean checkout

| # | condition | decided by | verdict |
| --- | --- | --- | --- |
| F1 | Tier A runs with no kernel and no committed pack, from synthetic packs built from known polynomials | `npm test` in the package | **met** — 125 tests, `npm test` in the package, no kernel and no committed pack. Synthetic packs built from polynomials the fixtures write down. |
| F2 | Tier B requires an explicit kernel path and fails loudly when absent — never silently green | exit code with the path unset | **met** — exit code 1 with `PRECISION_PACK` unset, and exit code 1 with a pack but no `PRECISION_KERNEL`, each saying what was not tested. 8 of 8 pass with both set. |
