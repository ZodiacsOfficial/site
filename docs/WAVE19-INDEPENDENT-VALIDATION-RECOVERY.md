# Wave 19 independent validation recovery

Prepared September 6, 2026 from the preserved advanced source archive, separately
from later lunar/aspect-pattern features. All 21 recovered file blobs match the
archived patch outputs exactly, including the Solar test merged with the already
recovered five external crossing vectors. No fixture, policy or limit was edited.

The only production change is the reviewed longitude-crossing endpoint repair:
the excluded lower endpoint is not returned five milliseconds later; an exact
internal or upper sample is emitted once. Direct, retrograde, between-sample,
360-degree wrap and antipodal cases have analytic regressions. No new planetary
model, precision claim, tolerance change or source acquisition is included.

The owning tests retain six independent node/polar cases and eight additional
epoch, conditioned station, progression and return cases. Engineering bounds,
nominal UT1 transport, lunar convention differences, station deadbands, and the
exact returned-chart clock applicability check remain as originally reviewed.
The existing five external Solar crossing vectors retain their 60/120-second
limits; they do not become full natal-return reference reports.

## Current evidence and limits

All 99 focused tests in six owning files pass under Node 22. The four immutable
policy/fixture hashes are asserted by those tests. Source-map extraction recipes
and provider receipts are recovered unchanged. The six-case raw oracle itself is
the committed byte-preserved fixture. The larger eight-case raw oracle and its
101,718-row evaluation journal have not been recovered into this workspace;
the previous checkpoint records their independent review and exact hashes.
This continuation validates the preserved compact expectations, and does not
claim a new raw-source extraction audit or a new provider acquisition.

Full build/postbuild passes with unchanged budgets and source fingerprint
750508811a4f3d90b5f32443c97709b8da5943a9f39cee37887453cd520c0e34.
Astro check passes: 939 files, zero errors/warnings and ten existing hints.
Full suite: 3,671 pass, two fail and one existing dist-dependent skip in 368
files (488.73s). Failures were the stale Phase 1 receipt and monthly transit
regeneration's unchanged 120-second limit while other builds were active.
The isolated monthly test passes all four cases, including both generations
of every one of 60 catalogs, in 105.06 seconds (103.25 for regeneration).
No committed event or timestamp changed. This is not a final full-suite pass.

Actual-main integration, scope acceptance, fresh browser and Phase 1 receipts,
release CI and production verification are pending. No
advanced feature is released here. Wave 24's separately preserved Uranus 2020
conditioning failure remains an unresolved gate; no fixture is dropped or retuned.
