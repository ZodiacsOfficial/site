# Platform decisions

## A-001 — Integrate from refreshed sources in isolated branches

Use current site main and a separate SDK checkout based on the still-held
expansion PR. Do not modify that PR's branch, ownership SDK, protected persona,
or concurrent design work. Site remains pinned to an immutable local artifact
until an authorized publication is separately verified.

## A-002 — Verify the polar repair before moving it

The package's atan2 selects an ecliptic/horizon intersection without checking
east versus west. The site swaps ASC/DSC when normalized ASC−MC is at least
180 degrees. Independent Cartesian reasoning confirms that this selects the
eastern branch for nondegenerate physical inputs away from the geographic
poles. Move the correction before house assembly, with geometric property
tests and public package/site parity. Duplicating the repair in both layers
would retain drift risk; changing house conventions is outside this slice.
Exact poles and tangent configurations need explicit limits in release scope.

Retain existing site reference data in place; do not import Swiss-derived
fixtures into the package or revise its license policy without review.

## A-003 — Issue an immutable candidate, preserve rollback

Use `0.1.1-rc.1` as an unpublished review candidate. `rc.0` remains unchanged:
final review clarified the return search's one-sided endpoint limitation in
packaged documentation, so it needed new bytes and a new identifier. The site
pins the exact archive and SHA-256 rather than an unavailable registry version.
Generate TypeDoc from SDK source with the current approved site footer CSS;
never repair generated CSS only in the site. Preserve both archives and the old
0.1.0 archive. Rollback must revert dependency/lock and adapter changes together.

Legacy saved-chart fixtures were frozen from 0.1.0 before replacement. They
prove migration behavior, not accuracy. Old repaired receipts are readable but
are not relabeled current; calculations with sufficient birth inputs refresh
under the new engine. Identity, original birth input and saved timestamps stay
intact. Unknown-time results retain their restrictions.

## A-004 — Reject malformed instants and bound iterative work

Use one strict resolved-date parser for the high-level public entry points.
Validate calendar components before constructing `Date`: native coercion can
silently normalize February 30. Date-only means UTC midnight; a date-time must
have an explicit offset; excessive precision and unresolvable fields fail.
A supplied `Date` cannot reveal whether a caller previously normalized bad text.

Historical local time uses explicit Gregorian/Latin Intl fields and year/era
handling, avoiding JavaScript's 0–99 to 1900–1999 remapping. Preserve existing
fold-earlier, gap-forward, historical offset and unknown-time-noon policies.
Require a timezone instead of silently selecting the host default. Host IANA/
ICU provenance remains material; accepted date syntax is not an accuracy range.

Require Placidus iteration convergence and bound return search to 10,000 total
samples, including refinements. Reject nonprogressing sub-millisecond steps,
invalid endpoints, nonfinite callbacks and overflowing derived Saturn windows.
Reuse the solver with explicit limits rather than adding a scheduler or service.
Endpoint roots are emitted once using adjacent direction evidence; interior
zero plateaus/tangencies and zero-length intervals produce no crossing. Coarse
sampling can miss events; one-sided endpoint evidence cannot distinguish a
boundary touch from a crossing outside the interval. These are documented limits,
not completeness guarantees.

## A-005 — Preserve independent evidence and scope review claims

Keep frozen Swiss node/polar fixtures and predeclared comparison policies in
the site. Do not copy restricted implementation code or relabel generated
legacy migration data as independent reference data. Report observed residuals,
reference conventions, artifact digest and runtime/ICU/tzdata for each run.
Cartesian geometry and independent bisection add mathematical regression
checks; package/site equality alone does not establish astronomical accuracy.

The two real tool-backed agents performed bounded implementation and adversarial
review with one accountable integrator. Their review is model-assisted internal
review, not practitioner, legal or external expert approval. The explicit SDK
PR #5 merge/publication hold persists. Unrelated app/example dependency findings
and the pre-existing auxiliary Vercel failure remain separately reported.

## B-001 — Validate the consumed edition, keep the example executable

A live response showed that planet/upcoming files cache for 24 hours while the
index caches for one hour and today JSON for five minutes. Documentation that
checks only a current index can still present a separately stale payload as
today. Validate the consumed edition and computed snapshot before rendering.
`generatedAt` is build provenance, not a substitute for the edition. Midnight
is the scheduled publication boundary, not an availability guarantee.

Keep one standalone example as a raw-imported source module with executable
HTTP/shape/UTC boundary regressions. Reusing the private site helper would make
the copyable example depend on undocumented imports; duplicating its displayed
text would allow drift. Actual cache-policy changes remain a separate coordinated
slice because Vercel configuration overlaps existing work.
