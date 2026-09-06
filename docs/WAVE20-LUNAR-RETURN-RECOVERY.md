# Wave 20 lunar return recovery

Recovered separately from the preserved source archive, on the prepared Wave 19
validation candidate. This is not a production release or a claim of completed
browser acceptance. The first release is English-only, uses complete known birth
input, rejects ambiguous/skipped local times, and captures one reference instant
for a strict next return. Failed calculations retry that reference; input/profile
changes revoke old results and exports. Cached Moon positions never substitute
for the original timed birth input. Relocation changes angles/houses, not the
geocentric return instant. No profile schema or saved-chart write is introduced.

The reading, details, chart, private image and calendar stay separate. Image
preparation is deliberate and bounded to 15 seconds; native share happens from
the user's click after preparation. Cancellation is neutral, download fallback
is explicit, stale work cannot paint into a new result, and failed image work
leaves the calendar available. Files omit names, birth details and coordinates.
The calendar's one transparent minute is a display marker, not event duration.

## Recovered reference integrity

The original lunar acquisition ZIP is 740,831 bytes, SHA-256
ea6e003c39507b8743aea4be96624eac3b36d00fa325a1e8dc70886b4c215ac5.
All 19 ZIP CRCs and 18 manifest hashes were verified. Its raw oracle remains
599fdf9d1655e1677c144f74927d573a0073e8dae85d3ea3f2514dc1d98032c4.
The unchanged extraction recipe, raw oracle, policy v2 and preserved applicability
amendment reproduce the committed 69,305-byte main fixture exactly: SHA-256
22e4a55652e12541d01cbd46c7efad018a06e60169fb399e2d02a6ab2ab6d5d5,
229 mapped fields. This was a pure recorded-data projection, not a new provider
acquisition. Original broad engineering time bands and fixed-target applicability
limits are unchanged. Historical/future nominal UT1 is not exact civil UTC.
The later returned-chart supplement remains a preserved compact fixture; this
session has not recovered or re-extracted its original raw supplement.

## Discovery integration

The recovered draft omitted sitemap membership for the new tool. Added exactly
one English lunar-return entry and its September 6 source revision, plus the
revised English Tools hub date. The output gate increases the exact URL total
by one and requires precisely the lunar route, with no translated counterparts.
The existing Guide context generator now adds one tool line; route counts are
updated for that exact addition and generation remains deterministic. No other
Guide behavior changes. A new shared breadcrumb label was removed after it
unnecessarily demanded translations for this English-only route; existing
segment humanization supplies the label. WebApplication validation is enabled.

The new route has the approved 30 KB initial-JS budget; existing limits stay
unchanged. It joins Lighthouse's standard three-run route set without a route
calibration, increasing the release sweep from 26 to 27 routes. The recovered
mobile/desktop browser helper is wired into Explorer and additionally checks
canonical, WebApplication and exact sitemap membership. It has not run yet.

## Validation status

- 158 focused tests in 13 files pass, including independent calculations,
  ownership, copy, image/calendar boundaries and discovery helpers.
- Initial Astro check: 958 files, zero errors/warnings, eleven hints.
- Initial compilation passed; postbuild caught the missing one-route sitemap
  count update. After the exact route gate was added, full postbuild passed.
- Initial full suite: 3,807 pass, six fail in 378 files: five stale generated
  context/locale inventory assertions plus the stale Phase 1 receipt. The five
  inventory failures were corrected through their owners, with all 13 focused
  context/catalog tests passing. No final full-suite pass is claimed.
- Final complete build/postbuild after inventory integration passes, with
  unchanged existing bundle limits. Phase 1 source receipt:
  `022099344e7d151d009a1d7fa32b009053c0242a087d789f6c084311df66b119`.
  Final Astro check passes: 958 files, zero errors/warnings, eleven hints.
- Actual-main scope, fresh screenshot receipts, browser review, release CI
  and production remain pending.
- Wave 24's independent Uranus 2020 conditioning failure is still preserved.
