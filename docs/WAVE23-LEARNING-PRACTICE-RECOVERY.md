# Wave 23 — saved-chart learning practice reconstruction

Preparation base: Wave 22 `d771c64c`. The original implementation and complete
original plan were not recoverable. This candidate uses the recovered audit
row and complete approved September 5 amendment, including its final section
4 decision. It is not released and must integrate each preceding release.

The five original lesson texts, destinations, v2 shape and read-only legacy
fallback remain intact. One document owner coordinates start/complete/restart
under the existing-key exclusive Web Lock. It rereads current storage inside
one synchronous commit, requires latest-state start before completion and
writes empty v2 on restart. Missing/denied/1500ms-timed-out locks or storage
failure select explicit page-only state; queued callbacks cannot write later.
Same-document reset invalidation is not a cross-tab reset-epoch guarantee.

Learn offers a guarded opaque saved-chart handoff and starts only big-three.
The lazy English ReadingPath adds three deliberate exercises using its supplied
placements and aspects. Correct answers do not automatically complete lessons;
reflection and a separate completion action are required. Unknown-time Moon
supports only a valid single-candidate sign exercise, never Moon aspects;
no-time/no-place houses and rising remain unavailable. Effective house system
and recorded fallback are explicit; an earlier request is not reconstructed.

Read-only saved-source validation rejects malformed IDs/dates/clocks/places/
timezones/house systems/nested records and positions-only inputs. Profile and
access events, relevant storage events including clear, and pageshow perform
fresh guarded reads. Attempt lifetime uses saved ID, meaningful input, run,
Wave 22 input revision and access generation. Cosmetic labels are excluded;
input/source/access changes, exercise changes, answer edits, reset and unmount
invalidate retained or queued handlers. No answers or birth inputs are added
to progress storage, analytics or URL parameters. No profile schema, codec,
engine, reading corpus, budget or global locale catalog is changed.

Focused coverage: 70 tests in six files pass, including existing lesson and
ReadingPath tests, two-document transaction ordering and its documented reset
limit, truthful fallback, malformed sources, Moon certainty and native handler
lifetime. Initial check found an Array.map locale-argument error and a sign
union annotation; fixed via the existing helper contract. Check before final
interaction additions: 990 files, zero errors/warnings, eleven hints.

Frozen final build/check/full serial unit sequence is running in session16760,
logs wave23-frozen-{focused,build,check,full-tests}.log. Genuine 390/1440
browser coverage is authored in tests/learning-practice-checks.mjs and hooked
into Explorer, but has NOT RUN. Actual layout/keyboard/PNG review, fresh
Phase 1 receipt, actual-main scope and final CI/production remain required.
No full-suite, browser or release acceptance is claimed yet.

## Bundle-boundary correction

The initial frozen build and the first separation attempt both fail the
unchanged Today budget: 22,058 bytes versus 22,016 allowed. The prior cumulative
candidate used 21,915 bytes. The measured difference is a newly separate shared
display-locale core (620 bytes) and corresponding sign/Today chunk changes,
not additional Today features. These failed logs are retained.

Input comparison now has its own type-only helper. The optional saved-chart
chooser loads only on explicit intent, with a bounded 15-second load and
honest reload recovery; the five ordinary lessons remain immediately usable.
To remove the actual accidental dependency, the two unchanged technical locale
constants move into a small time-owned module. `i18n/dates.ts` reexports them
under the original names; values, consumers and display formatting stay intact.
This adds that exact protected helper path to the eventual release allowance;
no translation catalog, budget, timezone computation or codec is edited.

The expanded timezone/codec/focused suite passes 109 tests in eight files.
Current complete build/check/full serial sequence: session98594, logs
wave23-constants-{focused,build,check,full-tests}.log. Earlier session16760 and
75471 stopped at the real bundle failure before check/full units. New browser
helper opens the optional saved chooser before exercising its exact handoff.

The reexport-only attempt also retained the extra display-locale dependency.
Compiled imports identified the two required direct consumers: the existing
timezone resolver and share codec now import only the technical constant leaf.
Their executable logic is unchanged. All 64 timezone/codec/source tests pass;
fresh Astro compilation and bundle reporting restore Today to 21.4 KB and all
unchanged budgets pass. The original Today/sign chunks are restored. This
diagnostic used the prior output directory, so a clean complete build/check/
serial-suite sequence is required next; no clean-build claim is made here.

## Clean preparation result — September 6

Commit 1b5ad853 completed a clean build with every unchanged bundle gate passing
and source receipt f69432c5f317e998a2bec5b97fc7a453fb8de49fa2b612dbaf5f52c03b67ae62.
Check: 994 files, zero errors/warnings, eleven hints. Full serial suite:
4,165 passed, one failed across 394 files in 429.16 seconds. The sole failure
is the stale Phase 1 screenshot receipt (old 7dc482dc); a genuine later browser
capture remains required. Logs: wave23-clean-{build,check,full-tests}.log.

The browser helper now additionally exercises a real second-tab Web Lock,
bounded page-only fallback, queue drainage proving no late write, absent or
denied locks and blocked storage writes. Syntax passes; browser execution and
visual review are still pending. These are preparation results on the old
Wave 22 base, not final release approval.

## Native preview check on the preserved candidate

Remote recovery head b1b614c4ede803ba43d5d41455697fa51f79faa4 has a READY
private preview. At the browser's1363px viewport, the empty saved-chart state
was truthful. A synthetic1999-08-11UTC12:00,51.5/0 chart was computed and
saved through native controls. Learn's saved chooser opened that chart;
Begin -> Leo -> Check showed the correct explanation with completion disabled
until reflection. Separate completion then returned to1 of5 complete on Learn.
These are manual desktop checks, not the pending390/1440 browser/fault suite.

The unknown-source browser case now enters from Learn before navigating to
its different saved-chart fragment. The calculator consumes handoff fragments
on mount, so a same-page hash change does not test a fresh source. An explicit
empty birth-time assertion ensures the unknown fixture was actually loaded.
No product code or acceptance assertion was relaxed.
