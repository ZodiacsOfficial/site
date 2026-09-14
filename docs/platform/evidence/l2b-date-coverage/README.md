# L2b conditional local-date coverage

Starting main: `87f18e0a101b96abf847be58e8a0c31a691992f8`, refreshed from GitHub.
The preceding L2a release is production-verified with all 14 post-merge jobs passed;
its durable checkpoint is carried into this draft without another release audit.

## Verified draft identity

Draft [#481](https://github.com/ZodiacsOfficial/site/pull/481):
`370fddf7224053ca42d0942945d850ab5b8d608c`, tree
`8dc403a558a83fae15950fc54f8a5978c6da7b13`. Main remains `87f18e0a`.
GitHub's tested merge `585ab51d9a13e153e311cc1909662bd8efc7c4eb` has the same tree.
All 14 hosted jobs pass in [run 34768985284](https://github.com/ZodiacsOfficial/site/actions/runs/34768985284).
The exact-source preview `dpl_F1r75PYxU71coJhD133ge28uETuC` is READY;
[protected preview flows](PREVIEW.md) pass without changing protection.
No required check rerun, timeout change or performance/security waiver was used.
The optional Browser Evidence companion is skipped by its unchanged opt-in policy;
that is not counted as a passing required job.

This is implemented, tested, preview-verified and review-ready, not merged or
production-deployed. Final source identities and full hosted logs are retained here;
final closeout docs are local commits mirrored to the shared workspace, and the
remote draft stays at the exact verified source with updated results in its body.

## Hosted result

- All 5,211 tests in 424 files pass. `scripts/build-transits.test.mjs` passes all
  four tests in 84,169 ms (full suite 135.54 s), resolving the unchanged-source
  local timeout without a retry or timeout change.
- Native Chromium 149.0.7827.55, Playwright `chromium-1228`: 23/23 date fixtures,
  100 adjacent-boundary assertions and 4/4 signed fixed-offset controls pass.
  Includes two empty-date and four disconnected-date fixtures, with no page
  errors or import effects. Local native Chrome 152 remains independent evidence.
- Canonical browser groups: local-date reference 35/35, chart confidence 20/20,
  captions 34/34, chart ownership 17/17, prompt ownership 23/23.
- Visual regression: 15/15. Lighthouse: 30 routes, three samples each, all budgets pass.
- Both widget integration groups pass. Widget performance is 100 on all three;
  accessibility Moon 100, Sky 96, Chart 100, within unchanged thresholds.
- Full source-checked metadata: `hosted-run.json.gz`; complete logs:
  `hosted-run.log.gz`. The manifest records their SHA-256 hashes.

## Implemented guarantee

Unknown-time local chart/Moon requests now consult the retained exact interval
implementation through `assessLocalDateReference`. Complete native enumeration
admits the unchanged reference only within an actual half-open member segment.
Empty dates refuse; disconnected intervals remain separate; repeated dates retain
their entire modeled membership. Missing/failing completeness can still admit an
Intl-verified reference point, with coverage explicitly unresolved. Detected provider
violations or contradictory interval/point evidence refuse before numerical work.

An immutable trace records complete-provider calls in temporary memory. It is
conditional on the provider contract, not an authentication or historical-truth
proof. No sampled polyfill or dependency/service was added.
[Exact runtime/date policies and source references](CONTRACT.md).

Known-time and explicit no-city UTC Moon paths remain unchanged. Existing reference
instants, numerical inputs, ephemeris calls, calculation/receipt bytes, uncertainty
copy and design are preserved. No alternative reference instant, endpoint astrology
scan, or whole-date Sun/Moon certainty is introduced. Coverage is not persisted.

## Independent bounded review

Two real subagents supported root's integration: provider/specification review and
caller/policy review. The caller reviewer authored only the focused helper tests;
the provider reviewer remained read-only and independently reproduced an early
contradiction fallback defect. Root changed provider-violation to refuse; helper
and actual-caller regression tests now cover it, and the reviewer verified the
same reproduction returns unresolved. No remaining must-fix finding was reported
in that bounded review. This is not an invented owner or external signoff.

## Verification checkpoint

- Final build passes, including bundle and engine-isolation budgets.
- Final typecheck: zero errors, zero warnings, 11 existing hints.
- 48 focused helper tests include ordinary/DST/historical-second boundaries,
  repeated and skipped dates, disconnected hull exclusion, a nonempty date whose
  original reference is outside, unsupported/failed providers, contradictions,
  immutable evidence and a deliberately lying provider counterexample.
- Actual-source caller tests cover known-time bypass, unchanged bytes, no additional
  ephemeris calls and refusal before receipt/longitude calculation.
- Native Chrome 152: 23 date fixtures, exact transition traces and boundary checks pass; no import/storage/network API side effects. Actual chart-confidence browser drive passes all 20 groups against released main. A temporary cleanup diagnostic retains all 35 reference-driver assertion groups and passes; its only driver changes close live contexts and print cleanup progress, and it is recorded separately from canonical hosted evidence.
- Required 18 acceptance captures pass against final source; their evidence gate is checked before push.
- All 14 required hosted jobs and exact-source preview pass. No merged or
  production-deployed L2b candidate is claimed here.

Initial diagnostic failures are retained rather than rewritten as successes:
one test fixture needed an explicit TypeScript return type; independent review
found and corrected the contradiction fallback. A local caller comparison was
initially invoked with a current baseline where its optional historical mode
expects pre-C014 skipped-date behavior; the normal current-source mode is required.
Local broad checks also encountered cross-checkout dependency resolution errors
and cold-start/resource timeouts. Dependencies were isolated with the unchanged
lockfile; four affected suites then passed (including all 67 previously uncollected
numerical tests). The unchanged transit-generation subprocess test still timed out
locally. The exact-source hosted full test step subsequently passed, resolving that
local evidence gap without changing assertions, timeouts or performance budgets.
Canonical hosted reference and confidence drivers also passed; local cleanup
diagnostics are retained as diagnostics rather than relabeled as canonical successes.

SDK merge/npm publication remains held. L3–L6, Astrofolio, Zodia, merge and
production deployment remain outside this task. Broader runtime availability,
historical timezone truth and complete astronomical sign-range evidence remain
separate limitations, not guarantees supplied by this change.
