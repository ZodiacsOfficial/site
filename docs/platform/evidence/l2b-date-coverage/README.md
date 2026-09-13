# L2b conditional local-date coverage

Starting main: `87f18e0a101b96abf847be58e8a0c31a691992f8`, refreshed from GitHub.
The preceding L2a release is production-verified with all 14 post-merge jobs passed;
its durable checkpoint is carried into this draft without another release audit.

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
- Full hosted workflow and exact-source preview remain pending. No merged or
  production-deployed L2b candidate is claimed here.

Initial diagnostic failures are retained rather than rewritten as successes:
one test fixture needed an explicit TypeScript return type; independent review
found and corrected the contradiction fallback. A local caller comparison was
initially invoked with a current baseline where its optional historical mode
expects pre-C014 skipped-date behavior; the normal current-source mode is required.
Local broad checks also encountered cross-checkout dependency resolution errors
and cold-start/resource timeouts. Dependencies were isolated with the unchanged
lockfile; four affected suites now pass (including all 67 previously uncollected numerical tests); the unchanged transit-generation subprocess test still times out locally. Canonical hosted gates remain required and are being completed without
changing assertions, timeouts or performance budgets.

SDK merge/npm publication remains held. L3–L6, Astrofolio, Zodia, merge and
production deployment remain outside this task. Broader runtime availability,
historical timezone truth and complete astronomical sign-range evidence remain
separate limitations, not guarantees supplied by this change.
