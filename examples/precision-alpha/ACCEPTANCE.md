# Acceptance checklist — precision alpha

Frozen 2026-09-20 before implementation, from branch
`claude/eager-ramanujan-razak3` at `d817be0e` merged with `origin/main`
`a6056de1`. Finite: twenty items, each either met or not, with the evidence
that decides it. Nothing here is marked met because a different item passed.

## A · One runtime, two environments

| # | condition | decided by |
| --- | --- | --- |
| A1 | The numerical core imports nothing from `node:*`, references no `Buffer`, and no `require` | a test that greps the built core and a browser run that never shims |
| A2 | Integrity uses WebCrypto (`crypto.subtle`), which Node 22 and browsers both provide, so one code path serves both | the same module passing in both consumers |
| A3 | Loading/verification is async and separate; every calculation after a pack is ready is synchronous and deterministic | API shape, plus identical output from two consumers |
| A4 | A Node consumer and a browser consumer produce **identical** longitudes for the same pack and instants, to the last bit | a committed cross-environment comparison |
| A5 | Node file-backed low-memory mode exists and returns bit-identical numbers to the resident path | test |

## B · Pack loading treated as untrusted input

| # | condition | decided by |
| --- | --- | --- |
| B1 | Magic, format version, header size cap, and total size cap are checked before any header-derived allocation | tests with tiny hostile fixtures; no real huge allocation is ever performed |
| B2 | Every header number is finite, non-negative, a safe integer, and every offset/extent computation is overflow-checked | tests |
| B3 | Record extents are bounds-checked, non-overlapping, and trailing data is refused or explicitly allowed by policy | tests |
| B4 | Coefficients, constants, intervals and scales are checked finite and in range — not only payload bytes | tests that mutate `intervalSec`, `emrat`, coverage and body ids, not just payload bits |
| B5 | Integrity covers the **header as well as the payload** | a whole-artifact digest; a header edit must fail |
| B6 | Structural validity, integrity against an expected digest, and authenticity of the source are three distinct, separately reported things | API and README say so; a self-stored hash is never called authenticity |
| B7 | No convenient public "skip verification". Any research bypass is isolated, marked unverified, and its results carry that mark | API shape + test that a bypassed pack cannot produce a verified-quality result |
| B8 | Verified in-memory bytes cannot be silently mutated after validation | the pack copies or freezes what it validated; test |
| B9 | Every failure returns a typed error with a code, closes handles, and leaks no absolute private path | tests |

## C · The integrated measurement

| # | condition | decided by |
| --- | --- | --- |
| C1 | Four configurations measured on identical instants, bodies, time policy and conventions: **A** prototype+old reduction, **B** prototype+corrected, **C** pack+old, **D** pack+corrected | committed raw JSON |
| C2 | Whether compression and the corrected reduction **compose** is stated from C1, not assumed from separate headlines | the write-up |
| C3 | The 0.05″ incremental-compression target stays separately measurable | reported against the uncompressed prototype |
| C4 | The 0.5″ matched-convention target is checked against the integrated build | reported |
| C5 | Whether the 0.0107″ result survives the broader test is reported as a measurement, not a guarantee | reported with its denominator and domain |
| C6 | Position and derivative results are reported separately | two tables |
| C7 | Full effective coverage stated exactly, never as rounded calendar years | every table header |
| C8 | Barycentric Moon: either the 0.2 km target is met, or barycentric output is **excluded from the alpha's contract**, with the original failed target preserved | the contract document |
| C9 | Bodies that are system barycentres rather than physical centres are labelled as such everywhere they appear | API output + README |

## D · Search semantics

| # | condition | decided by |
| --- | --- | --- |
| D1 | Results separate: candidates found · interval processed · model-relative isolation established · empirical robustness · unresolved intervals · external model uncertainty | the result type |
| D2 | No empirical result is labelled mathematically complete. The enclosure method is named and its assumptions listed | the result carries `support: 'proven' \| 'empirical' \| 'unknown'` |
| D3 | Adversarial analytic cases pass: close pairs, tangency, high-frequency, flat regions, boundary roots, no roots, missing coverage | test |
| D4 | The original Uranus D contract is unchanged and still failed-incomplete | diff |
| D5 | The reported Moon "2 vs 13" concern is re-examined with exact inputs if recoverable, and neither promoted nor dismissed without an exact comparison | recorded finding |

## E · The browser demonstration

| # | condition | decided by |
| --- | --- | --- |
| E1 | `demo/precision-runtime.mjs` is the real runtime, not a throwing seam | a successful precision calculation in a browser |
| E2 | Each failure is exercised **for its own reason**, with a valid pack loaded first | driver output naming each distinct code |
| E3 | Cancellation, unload/reload and pack replacement work; a late result from a superseded request never updates the interface | driver output |
| E4 | Chromium and Firefox both run it; WebKit attempted; environments recorded honestly | driver output |
| E5 | No off-origin request, no persistence, during load, calculate, compare, fail and cancel | driver network capture |

## F · Tests from a clean checkout

| # | condition | decided by |
| --- | --- | --- |
| F1 | Tier A runs with no kernel and no committed pack, from synthetic packs built from known polynomials | `npm test` in the package |
| F2 | Tier B requires an explicit kernel path and fails loudly when absent — never silently green | exit code with the path unset |
