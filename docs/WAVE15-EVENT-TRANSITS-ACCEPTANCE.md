# Wave 15 — event readings and personal transit handoff

This is a new reconstruction from the recovered approved brief. The original
standalone Wave 15 source was absent from the emergency archive. It is prepared
on local Wave 13 and must integrate actually released main before publication.

## Scope

Five existing non-anchor pages have distinct authored readings: Neptune–Pluto
sextile (September 16), Virgo new moon (September 11), Venus retrograde cycle
(October 3–November 14), Jupiter entering Leo (June 30), and the partial lunar
eclipse in Pisces (August 28), all 2026. Their dates, bodies, signs, angles and
other catalog facts are unchanged. The seven original bespoke anchors remain.

A plain event article link carries only the exact event UTC instant, including
milliseconds, to the existing TransitTracker saved-chart selector/birth form.
The parser accepts real UTC instants in 1800–2199, rejects normalized invalid
dates, offsets, local times and duplicate parameters, and explains invalid links.
Event date and actual Now each reset the result, scrub and search selection.
Recomputing the same event uses a fresh result identity. Input edits and saved
profile changes invalidate old results and pending computations; late completions
cannot clear the busy state or publish data over a newer request.

Unknown birth time keeps the explicitly approximate Moon drawing but excludes
precise natal Moon contacts, houses, angles and calendar export. Form and saved
summary paths have the same guards; six-locale notices explain this limitation.
Existing lazy engine, ring and search boundaries remain.

The owning publication generator changes exactly five page and four timeline
revision dates to the actual reconstruction date, September 6, 2026. Other
revision dates and factual descriptors remain. Optional publishedAt is absent
without evidence; Article metadata no longer presents lastModified as a known
first publication date. No undocumented old publication date is invented.

## Validation and outstanding acceptance

Node 22 compilation passes. The completed first postbuild failed because the
old schema validator required an undocumented first-publication date for every
event Article. The revised event-specific gate requires exact receipt dates,
rejects invented dates, and preserves the existing horoscope date requirements.
Full postbuild is running again; bundle/receipt completion is not yet claimed.
Type check passes: 921 files, zero errors/warnings and ten existing hints. Focused editorial,
UTC parser, actual component ownership/recovery and ring tests pass. Tests cover
same-event recalculation, Event date/Now, stale input completion, saved-profile
changes, invalid links and unknown-time guards.

Initial complete one-worker suite: 3,476 passes and three failures / 355 files.
One failure is the intentionally stale Phase 1 source receipt, one was the old
catalog test's blanket July 20 modification date, and one is an unchanged SQL
readiness test's five-second timeout. The catalog assertion now requires exact
agreement with the publication receipt; a separate fixed five-ID/four-row check
strictly bounds the revision. A focused diagnostic passes all 36 catalog,
publication and SQL-readiness tests under unchanged limits. This is not a full
suite pass, and original failed logs are retained.

The new Explorer helper checks all five articles without JavaScript, truthful
metadata, plain exact-time links, and 390/1440px saved-chart handoff, Event date,
Now, keyboard scrub, same-event reset and unknown-time behavior. It has not yet
run in a browser and is not visual evidence.

Actual-main integration, matching Phase 1 capture/receipt, personal review of
article/transit screenshots, final full local and CI gates, separate PR, merge
and production verification remain pending. No score or screen-reader approval
is claimed.
