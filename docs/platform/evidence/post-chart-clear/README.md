# Downstream chart-context invalidation

Chart draft #434's CI exposed one obsolete context-retention assertion. Source
inspection also found that clearing the calculator's global context leaves a
cached context and visible personalized panel in PostChartDailyBrief. The email
enhancement has delayed presentation/reset/focus work requiring the same owner
boundary. C-012's follow-up is scoped to explicit invalidation, those listeners,
and their tests. No backend, schema or provider operation is changed.

`author-freeze1/` records six exact proposed files from isolated c7b9eb4. Root
verified all six source hashes and clean patch applicability without applying
them. The author passes 52 focused tests, strict types, check and 17 native cases.
The fixture-enabled full-page gate exposes a real cache regression, independently
reproduced: profile-synced refresh overtakes an unread session and treats cleared
null as signed out. Freeze 1 is rejected; its exact bytes remain
retained. Corrected Freeze 2 explicitly distinguishes unread from observed null. The separate C-014
12-file freeze has independent acceptance and remains untouched.

`normal-build-baseline/` contains root's original four unsuccessful capture-
presence assumptions plus four correctly scoped feature-off preservation checks
on the unmodified c7b9eb4 normal build. That build omits result-driven capture
markup. The successful EN/RU desktop/mobile checks assert its absence, ordinary
chart clearing/context removal, focus on the edited field and successful recomputation.
They do not test active prompt invalidation or managed daily-brief behavior.
All non-GET and external requests are blocked, and all inputs are synthetic.
Raw served-file hashes, request observations, screenshots and exact driver bytes
are retained. The Russian mobile edited-form image was visually inspected.

`author/` retains the final six-file source freeze, 21 passing native groups,
294 full-page assertions, six paused-state repeats and all original failures.
Root verifies eight inert records and all 355 compressed members. The original
failed full-page build's source and requested asset URLs are retained, but its
complete original compiled output was not archived before rebuild. Final compiled
fixture bytes are retained; do not substitute them for the original failure build.

`review-freeze2/` independently accepts 25 controller criteria, including the
rejected cache interleave and authoritative signed-out null controls. The email
source is unchanged from its 20/20 review; that result is reused by exact-source
parity, not represented as a fresh execution. Final driver/CI compatibility is
reviewed separately from Linux execution. Root verifies 71 inert records and all
51 ordinary compressed members. The six files and reviewed four-line workflow
insertion are now integrated locally; the root fixture build/gate passes 294/294.
Normal-build and remote release checks follow separately.

The fix owns chart generations. Successful submission on the same still-current
chart can still reset email/sign edits made while that submission is pending;
this pre-existing behavior is retained and is not claimed solved. Already-started
writes complete once, with no cancellation or provider enforcement claim.

`root-integration/` now records the successful normal build/check,4969tests,
21native cases,294full-page assertions,17existing chart cases and four feature-off
controls. All18 fresh approved captures are byte-identical. All58 compressed
ordinary raw members and17 top-level records are verified. `release-start/`
retains actual public main/SDK/production/Astrofolio/hold reads before integration.
Remote source, CI and preview for this follow-up still require fresh acceptance.
