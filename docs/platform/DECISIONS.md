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

## A-006 — Use the existing bounded scope allowance

The initial CI comparison correctly flagged 86 regenerated engine-reference
paths under the older Phase 1 SDK-page freeze. The owner's activated platform
mandate explicitly authorizes this Stage A package/reference integration. Use
the repository's existing one-time allowance, naming exactly those 86 paths
and current base `7f953e3fca0e7d5009e5602a1dad69edff0f54cc`. Do not edit the
guard, broaden its patterns, disable CI or clear the SDK review/publication hold.
The allowance ceases to apply when it is not itself changed in a later diff.

## A-007 — Restore the lazy calculation boundary and the legacy test oracle

The flags-on CI build measured Today at 22,029 gzip bytes, 13 above its existing
22,016-byte limit. Keep the budget. Separate unchanged visit/profile helpers
from personalized contact arithmetic, and request arithmetic and transit phrasing
concurrently only after a saved chart is ready. Preserve the existing exports,
cancellation and failure states; do not duplicate engine formulas to save bytes.

The browser migration fixture must retain actual 0.1.0 output after the installed
engine advances. Freeze legacy data from the preserved artifact and identify its
digest; do not compute current results and relabel them old. Assertions about
fresh recomputation use the installed version, while unrecomputable imported
positions retain their original receipt.


## B-002 — Distinguish integration status and verify the downloadable project

Use one candidate identity for the front door, support matrix and package
checks. Add exact developer-to-SDK reference bridges to the existing boundary
list; do not exempt whole developer trees or permit promotional vocabulary.
Reuse the current layout, sky example, API and hosted widget.

The three starter paths share a small plain-JavaScript project. Bundle the
immutable engine candidate and pin public dependencies in npm-shrinkwrap.json.
A strict offline verifier checks archive/source equality, provenance, public
exports, dependency integrity and safe regular-file members. A separate CI
step installs/tests that exact archive with isolated npm configuration/cache.
No private workspace imports, install scripts, account or credential is needed.

The local demonstration server binds exact loopback Host, serves an allowlist,
rejects other methods/queries/traversal, sets restrictive CSP and performs no
request logging. Calculators do not load the hosted widget or write persistent
storage. Unknown birth time explicitly uses noon UTC with absent houses/angles;
it does not infer local noon. Example provenance is not yet a durable receipt
schema. The hosted iframe stays opt-in with permanent fallback/attribution and
has its own deployment/version and ordinary network privacy boundary.


## B-003 — Make the pasted setup fail closed and test what the page displays

Use an exact public archive commit and SHA-256. Put the POSIX setup in a
subshell with `set -eu`, so failed directory creation, download or checksum
cannot run later extraction/install steps and cannot change the caller's shell
options. Disable curl's personal configuration. Capture setup text from the
real rendered page and execute it in a fresh isolated environment; additionally
substitute contained command shims to prove failure stops before tar/npm.

The source-aware consumer guard distinguishes only the complete Node hashing
module specifier in the exact setup fragment. It continues checking all
surrounding text and destinations. This avoids a whole-page exemption while
retaining a reproducible checksum check on the already-documented Node runtime.

## C-001 — Validate civil inputs before resolving an instant

The legacy v1 birth-share decoder admitted impossible Gregorian dates. The
site resolver normalized those dates, then described the mismatch as a DST
gap. Passing the resulting Date to the strict engine could no longer recover
the invalid original input. Validate at both the imported-share boundary and
the shared civil-time resolver. Keep the parser import-free, preserve the
share format and 1800–2199 window, and reject clock rollover.

Use explicit Gregorian/Latin fields and astronomical year conversion for Intl
wall comparisons; Date.UTC's 1900 remapping is unsuitable for years 0000–0099.
Syntactic support for four-digit years does not enlarge the engine's numerical
accuracy claim. Preserve earlier-fold, forward-gap, historical sub-minute
offset and unknown-time behavior. Require an explicit supported timezone so
missing data cannot select the host zone. Reject untrusted timezone coercions
and keep errors free of submitted values.

Failed recomputation retains the original saved receipt; do not rewrite birth
inputs, pretend an old result was recalculated, or silently migrate storage.
Existing malformed records are not newly certified valid by this fallback.

## C-002 — Preserve requested settings before correcting remote receipts

The account restore adapter currently labels a computed polar whole-sign
result with requested Placidus in its single house-system field. Replacing
that field with the actual system alone was considered and rejected: the next
rerun/upload/restore requests whole-sign and loses the fallback flag. An
optional local requested-system field alone is also insufficient because the
current canonical sync wire omits it.

A subsequent contract change must represent requested and actual settings,
legacy unknown provenance, and backward-compatible export/sync behavior
together. Existing canonical mutation fingerprints and saved identities need
explicit compatibility handling. Preserve the synthetic defect and
counterexample in evidence; leave this adapter unchanged until that coherent
change is tested. This is an unresolved C02 requirement, not an owner-only
permission blocker or a reason to halt other authorized work.

## A-008 — Evict rejected requests and keep each candidate immutable

The optional GeoNames client must allow a later explicit retry after transport,
HTTP or JSON-parsing rejection. Evict only the matching failed promise and
rethrow the same reason. Successful and in-flight requests remain shared;
there is no automatic retry loop or implied per-caller cancellation.
Structurally invalid but fulfilled JSON requires a separate schema/cache policy;
clearing caches after arbitrary consumer errors can discard healthy data.

Create engine rc.2 for this change and verify its actual packed public exports.
Keep site/starter rc.1 fixed until a separately reviewed integration. Candidate
version, artifact digest and source provenance distinguish the change without
pretending a mathematical correction or npm publication occurred. The owner-only
release hold does not prevent this isolated reliability correction and review.

## C-003 — Start portable receipts as an additive, bounded local codec

First implement a one-natal-chart draft envelope at an optional engine subpath,
reusing the existing public Chart vocabulary. Keep calculation execution,
account sync v1 and stored profiles unchanged. A complete request/result envelope
can preserve requested versus actual houses and full precision without forcing
an unsafe change through old clients' one-field wire format.

Capture only known provenance at the calculation boundary; unknown time does not
establish a noon convention, and a supplied artifact hash does not authenticate
an import. The receipt must distinguish actual absent houses from a requested
setting, validate fixed flag codes and consistency, and preserve data-only
extensions under explicit size/depth/node limits. Unknown required features or
schema versions must fail explicitly. Redacted diagnostics are rebuilt from
fixed fields and omit imported metadata, dates, coordinates, results, arbitrary
strings and stable hashes. They are not described as anonymous.

This first codec is an additive Zodiacs draft, not an industry standard, complete
C02 acceptance or a replacement for account downgrade/migration handling. The
site stays on its verified rc.1 artifact while the separate candidate is built
and tested. Required release review and explicit SDK #5 hold still apply.

## C-004 — Connect receipts through the standalone example first

Engine rc.3 is a separately verified optional-codec candidate. Let the standalone
starter identify its own engine artifact/source instead of silently changing the
site application's verified rc.1 pin. Keep strict source/archive/hash/provenance
checks when decoupling the starter verifier; preserve existing immutable archives.

Import a receipt as an untrusted stored result. Do not refill the existing birth
form or recalculate automatically: that form's intentional UTC-noon convention
for new unknown-time calculations would destroy an imported 08:30 reference.
Retain the complete bounded envelope for re-export, display text safely, and
exclude extensions/provenance strings from redacted diagnostics. Guard async file
selection races and oversize files before reading. Full export includes private
birth inputs; no account migration, network upload or persistent identifier is
needed for this local integration.


## C-005 — Validate resolved build provenance before writing output

A dependency range does not identify the ephemeris that performed a calculation.
The standalone candidate records its resolved version, and build verifies the
lock, installed manifest and actual esbuild module input agree. This candidate
allows one flat Astronomy Engine installation; different nested resolution
fails explicitly instead of inheriting an unrelated version claim. Validation
precedes output writes so a failed build preserves previous valid output.
These checks support a verified install; they do not authenticate arbitrary
locally modified dependencies or imported provenance claims.

## A-007 — Preserve typed flag compatibility through checked assertions

Implemented, independently reviewed and delivered in SDK draft #10/rc.5;
packed consumer and browser acceptance pass. The public type accepts five
ChartFlag values. A correctly typed `no-time` or `polar-fallback` echo can be
duplicated by computation and then rejected by the receipt codec. Arbitrary
untyped strings and malformed iterables are also accepted too far into the API.

Narrowing the type to time-resolution flags would break correct typed callers.
Blindly dropping derived flags would hide contradictory claims. Keep the five
input values, validate derived echoes against the actual computation, and
represent each fact once in canonical input/result metadata. Canonical input is
a semantic representation; it does not promise to retain the raw submitted
flag array. Time-resolution flags remain caller assertions when local context
is unavailable; UTC alone cannot prove historical DST or LMT provenance.

For supplied Charts, check flag consistency against supplied time/house metadata
and preserve numerical arrays. This is not authentication or an ephemeris rerun.
Retain identity for already-canonical Charts and avoid mutating caller objects.
An explicit raw polar-fallback assertion on the Saturn-return path requires one
natal calculation to establish actual fallback; a latitude threshold alone
cannot establish iterative convergence. Ordinary Saturn inputs keep their
date-only path. Tests must establish those call counts and compatibility limits.

Snapshot scalar settings once, validate bounded data arrays without coercion or
custom array iteration, and reject contradictions explicitly. The shared helper
must keep the optional geo module independent of astronomy and ownership code.
Do not change the site's private internal engine entry or its existing pin.


## C-006 — Keep richer saved records outside old writers' namespace

The refreshed synthetic local probe confirms request loss before account sync:
polar Placidus is saved and rerun as Whole, and a subsequent explicit Whole
request updates that same record instead of retaining distinct intent. Existing
v1 wire bytes cannot distinguish those requests. An added field inside the v1
key is dropped by old full-record saves; changing its outer version causes old
readers to see an empty profile and then overwrite it. The reproduced cases and
[two-option comparison](evidence/c02-next/DESIGN.md.log) reject both as
an authoritative richer store.

Use the existing natal envelope semantics for newly recorded calculations,
with a separate version-owned saved namespace and an explicit legacy branch.
Do not infer original requested houses from legacy output or invent a complete
receipt from its abbreviated summary. A v1 view may be a disposable projection,
never the authoritative replay input. Distinct recorded requests must not be
automatically deduplicated through the actual fallback system. Richer records
must refuse silent downgrade to the current account wire format.

Before implementing active storage, integrate the verified SDK optional receipt
capability through a separate site artifact upgrade. Avoid copying a second
receipt validator or building inactive injection scaffolding around a module the
site cannot import yet. Subsequent storage work must include access, archive,
export, deletion, account switch, storage failure and legacy sync boundaries.
Future remote capability/CAS/idempotent-replay handling is a separate reviewed
contract. No new namespace, migration, account request or server change is
activated by this decision.

## A-008 — Adopt rc.5 with separate immutable provenance identities

The site now intentionally pins the verified SDK rc.5 archive instead of
rebuilding it locally or waiting for a held npm publication. Source commit,
artifact carrier/repository path, and numerical/consumer evidence commit are
distinct identifiers. A strict candidate schema and archive-member comparison
enforce their documented structure and installed bytes. These checks do not
authenticate arbitrary imported receipt provenance.

Keep the standalone starter and old archives immutable. The generated TypeDoc
remains an explicitly archived rc.1 reference; current integration instructions
link to the actual rc.5 public README and draft receipt specification. Rebuilding
an entire reference tree is unnecessary for this bounded adoption and would
expand its protected scope.

The September 8 edition advanced on main during acceptance. Merge its actual
daily and paired Registry snapshot into this candidate, preserve all upstream
content bytes, and regenerate only the active engine/generator provenance with
the existing daily builder. Never advance a stale edition's date or change the
freshness clock. Fresh Phase 1 captures must match the new package/lock fingerprint
and current edition. Their fixed rendering clock is the existing capture policy,
not an override of production freshness checks.

The stacked comparison with draft #419 includes twelve already-main Registry
sign pages. The one-time allowance names exactly those pages and the exact base;
the evidence records byte equality to main. The scope guard implementation and
future freeze are unchanged. A later retarget must refresh the allowance and
comparison evidence against its actual base before integration.

## C-007 — Retain the complete native calculation before projection

The site's existing body summary deliberately omits fields required by the SDK
receipt codec. Reconstructing a full receipt from that summary would invent
missing facts; running a second calculation would duplicate work and could
observe mutated caller inputs. Use one public `natalChart` result for both the
SDK envelope and the site's existing compact projection.

Share only the pure projection with `full.ts`. Keep the optional public/receipt
module outside the existing eager math and UI graphs, preserving synchronous
legacy input identity and numerical references. No account/storage wire change
or legacy migration is implied by the new callable boundary.

Derive the canonical replay input from validated receipt fields rather than
rereading raw getters. Freeze detached JSON recursively and represent its instant
as an ISO string: freezing a Date cannot prevent its setters. The presentation
chart retains the current mutable contract, detached from the receipt/snapshot.
Source spelling, timezone resolution and provenance require explicit context;
do not infer them from a resolved instant or label unknown time as noon.

SDK context validation happens after calculation and rejects context accessors.
This is deliberately not a claim of an atomic entry-time snapshot across
same-realm executable getters, nor authentication of provenance. Avoid a second
context validator merely to suggest such a guarantee. Errors expose one fixed
message/code, without inspecting or retaining raw exceptions or private input.

## C-008 — Make new saved calculations immutable and owner scoped

The next bounded implementation is a callable profile-domain saved-record
store, without a default browser instance or active save/account wiring.
Reuse the SDK receipt codec and the established IndexedDB transaction pattern;
use a separate `zodiacs-saved-natal-v1` database. Upgrading the existing Living
Chart database would break older clients that explicitly open database version 1.
An aggregate localStorage key loses concurrent saves, while per-record keys
still cannot atomically enforce capacity. A global new key also escapes the
existing fixed-key handoff/deletion inventory.

Each creation receives a fresh UUID and records an immutable validated envelope,
explicit owner and creation time, with an optional local label. Do not deduplicate
different requested calculations through their actual fallback houses. Omit
overwrite/import-by-ID/update operations, meaningless revision fields and automatic
legacy migration. Export the SDK envelope alone; keep local owner, record ID and
label outside that portable payload. A later editable-record contract requires
its own conflict/deletion semantics.

Enforce owner capacity and insertion in one real readwrite transaction. A bound
session checks its captured owner/access epoch before, inside and after async
work, and revocation aborts pending transactions; merely closing an IndexedDB
connection does not abort them. Distinguish missing records, invalid/future data,
unavailable storage and stale operations. A stale result after commit must not
claim that no write occurred or encourage an automatic duplicate retry.

This primitive is not authentication or complete user-data lifecycle coverage.
Before activation, integrate richer-record discovery/presence, guest ownership,
account switching/retention, access leases, archive/export and durable deletion/
retry generations through the existing app coordination. Keep old v1 bytes,
writers and remote wire behavior unchanged. Synthetic persistence acceptance
does not authorize migration or deletion of real user records.

## C-009 — Export the captured calculation and preserve deliberate input

A local download uses the exact immutable SDK JSON captured with the displayed
full chart. It never recalculates on click or reconstructs missing fields from a
positions-only summary. Input, run and profile-access fences apply both when
capturing and when clicking. Optional module loading may fall back before any
natal calculation; a calculation or serialization failure never retries through
the legacy path. Signed fixed-offset zones, inconsistent resolver context and
known exact poles preserve established chart behavior with explicit receipt
unavailability until their separate contracts support truthful export.

The file includes sensitive birth details and chart data. Say so in all six
locales, use a generic filename, release the local Blob URL and claim initiation
only. This activates neither account sync nor the optional saved-record store.

Russian shared-chart review reproduced the custom interaction directive replaying
untouched SSR blanks over initialized birth details. Keep the receipt fence and
correct replay: preserve explicit edits (including a return to blank/default) and
eventless native edits, while untouched fields accept component initialization.
Native reset semantics on a detached control determine defaults; selected values,
not old option indexes, survive hydration reordering. Existing lazy activation,
queued submit, takeover, retries and eagerHash:false behavior remain unchanged.

Receipt factoring moves ephemeris code into a shared static dependency. Count the
entire full-entry closure once under the existing 25 KB limit; do not raise any
budget or require all markers in the entry shim. Inspect actual decoded literal
module-loading syntax so inert provenance strings are permitted while concrete
vendor imports, escapes, transparent parentheses and CDN targets are rejected.
This is a bounded regression checker, not arbitrary JavaScript data-flow proof.


## C-010 — Adopt historical precision together with truthful receipt context

The site adopts exact engine rc.6 and the matching local resolver correction in
one separate slice. Match seconds and milliseconds against the requested minute;
convert fractional-minute offsets to integer milliseconds without losing IANA
seconds. Preserve the existing earlier-fold/forward-gap and offset-sampling
policies. This corrects missed seconds-sized gaps and adjacent false folds; it
is not complete transition discovery or first-existing-date coverage.

Keep the receipt boundary unchanged at runtime. Existing deliberately inconsistent
legacy flags must still be refused before calculation; corrected current flags
can now produce a receipt from the same calculation. Update the version pin,
checksum, scene version field and current developer/source metadata, retaining
all prior artifacts and evidence. Generate manifest identities with the existing
builder. Separate SDK source, immutable archive carrier and real site evidence
carrier; never publish a placeholder commit or relabel old-version reports.

No account format, unknown-time reference, ownership capability or published
schema is expanded. Precise date membership remains a separate prerequisite with
empty/disconnected/unresolved outcomes and explicit provider guarantees.


## C-011 — Represent local dates as exact interval sets before caller activation

A Gregorian local date is a membership set, which can be empty, disconnected or
longer than 24 hours. Use immutable half-open epoch-millisecond intervals and an
explicit unresolved outcome. Never collapse a disconnected date into a hull or
turn an empty date into a shifted representative instant. Keep astronomical
whole-date candidate completeness separate from civil-date membership.

For nominal midnight w and one day D, strict offset bounds (-D, D) place every
member in [w-D, w+2D). Partition that window using complete transitions and
intersect each constant-offset segment with [w-offset, w+D-offset). Merge only
touching intervals. Validate integer bounds, advancing transitions, observed
offset agreement and a maximum of 32 interior changes. Fail without partial
intervals on provider failure or exhaustion. The provider's completeness marker
is a trusted contract, not proof that arbitrary code discloses every transition.

The native Temporal adapter is optional and detected on call, with existing Intl
identifier semantics and observed offset agreement. Do not load a polyfill or
claim all-browser availability. Keep this additive primitive inactive until
missing capability, empty/complex dates and stale/unavailable product behavior
have a reviewed integration. Existing resolver and UI behavior remain unchanged
by this prerequisite; its tests are finite, not historical-data certification.


## C-012 — Tie a displayed result to its still-current input and run

Input edits, replacement runs and teardown revoke older asynchronous work.
Guard both success and failure after awaited module boundaries; an old completion
must not publish a chart, error, focus move or idle state over a newer operation.
Clear derived results on edits and new submissions while preserving typed fields.
Current failure leaves an actionable alert and a usable retry, without retaining
an unlabeled previous result as if it belonged to the failed request.

For MoonPhaseTool this is one local revision counter, synchronous invalidation
on date/time/place changes, and unmount revocation. Preserve the existing real
module-loader cache/retry behavior and selected-place semantics; an unselected
search query is not a confirmed timezone. The existing calculation body, labels,
markup, date endpoint rules and astronomical certainty remain unchanged.

ChartCalculator's separate boundary must also preserve run/profile authority,
positions-only import isolation, the same-calculation receipt, and its existing
pre-calculation optional import fallback. Derived signature/share/context work
must obey result ownership. Preventing stale UI completion does not cancel an
already committed persistence operation or authorize deletion/migration of data.
Date membership and truthful whole-date Sun/Moon coverage require a separate
reviewed product contract; these ownership corrections do not solve or conceal it.


## C-013 — Runtime support claims follow the exact candidate evidence

A declared runtime minimum is not a tested-runtime claim. When the current
candidate changes, the support row must point to its immutable evidence and
scope rather than carry earlier versions' Node results forward. Label manual
public-archive extraction/examples/declaration checks as a consumer check;
reserve an installation claim for a record of an actual package installation.
Retain the existing separate rc.6 clean-install evidence, Node 22/24 comparisons,
ESM setup, Intl/ICU and finite-coverage limits. This is two text edits in one
support page, with no package, API, navigation, style or Astrofolio change.

C-012 follow-up review requires access-generation ownership for optional
profile-derived secondary context and save-focus intent, even when a public or
anonymous primary remains valid. Cache completion is separate from focus intent.
An obsolete callback must not focus or clear a newer dialog's return target.
A save already committed remains committed; suppression of its stale UI is not
rollback or cancellation. Freeze 1 is explicitly correction-requested.


C-012 corrected integration uses one captured result owner across computation,
signature/share/context work and ancillary result actions. Input edits clear
derived state while retaining typed fields. Optional saved-mine provenance and
save UI additionally require their captured access generation; replacement save
prompts also advance a prompt generation. Cache completion is allowed to remain
useful, but old focus intent is discarded at both completion and frame time.
Do not advance prompt generation on ordinary close: that would incorrectly
suppress the legitimate completed-save install hint. The write call itself is
unchanged; the independent native storage observer proves exactly one write
for committed cases and zero for denied/prompt-only cases in its finite controls.

Root accepts the measured before/after chart rendering under the repository’s
existing threshold0.1 and maximum difference ratio0.001, without changing either.
Two cases are byte-identical; one has one scored pixel in1440×9502 pixels
(ratio7.30840290932903e-8) and unchanged dimensions. A same-source repeat matches
the candidate exactly. The original stricter exact-byte assertion and the three
pre-existing baseline-height failures remain recorded. The cause of this minor
raster difference is not established; no all-three-byte-identity claim is made.

## C-014 — Require a local-date witness for an unknown-time reference

Before calculating an unknown-time birth chart, or an unknown-time Moon lookup
with a selected city, verify that the chosen reference instant formats to the
requested local Gregorian date under the host's timezone data. Reuse the existing
era-aware formatter with canonical date, finite genuine Date and explicit-zone
validation. Never fall back to the machine zone or leak formatter/input details.
Known-time resolution, no-city UTC Moon and positions-only imports keep their
existing contracts. A successful witness does not establish complete date
coverage or Sun/Moon certainty.

Choose conservative refusal when the existing resolver's reference is outside
the date, or membership cannot be established. Use the dedicated localized
message: “We couldn’t establish a calculation time within this local date. Check
the date and place.” Preserve fields, clear prior output/actions/context and
offer the existing focused error/retry behavior. Do not call the numerical,
receipt or endpoint path after refusal. Module loading may precede the check.

This is deliberately weaker than proving the date empty. The retained complete
synthetic UTC+00 to UTC+15 transition yields a nonempty nine-hour local date but
the unchanged resolver chooses a reference outside it. Refusal is accepted for
that case; substituting another instant needs a separately reviewed contract.
Four actual skipped dates demonstrate the current wrong-date output. Ordinary,
repeated and disconnected positive witnesses retain their old output and known
endpoint limitations. The finite real-zone search found no nonempty wrong-noon
case; it is not a theorem that none exist.

The alternative of requiring native Temporal interval capability would disable
ordinary calculations in supported runtimes without that feature. Keep the
interval prerequisite inactive and add no polyfill, provider, dependency or
sampling-based completeness claim. Broader date coverage and astronomical
certainty remain a separate dependency after this safeguard.

C-012 downstream follow-up: deleting the global chart context is insufficient
when the daily-brief controller caches its own context and the email enhancement
retains personalized presentation. Emit a synchronous data-free clear signal.
Invalidate cached context/session/generation and hide only result-revealed capture
surfaces. Preserve typed email/sign fields and unrelated capture surfaces. Fence
late preference results, submit/reset presentation and frame-time focus against
replacement or clearing. Already-submitted subscription/resend operations still
complete once; no cancellation, retry, deletion or provider-state change is
introduced. Keep existing successful-operation analytics without adding data.

The first downstream freeze's full-page run exposes an unread/known-null cache
confusion. A profile-synced refresh can overtake the initial session lookup and
supply cleared null as authoritative signed-out state. Independent review
reproduces it against the unchanged base. Correct the state model: an unread
cache is distinct from an observed signed-out session. Prefer explicit undefined
for unread state and null for a confirmed absent session over re-reading every
null, preserving a current explicit signed-out callback across a later profile
refresh. Keep the same backend/client and submitted-operation boundaries. Add
the precise interleaving and known-null positive controls; do not increase a
timeout or weaken the expected daily-brief state to hide the regression.


C-014 root integration retains the original 12-file implementation. The full
suite exposes two stale exact catalog-count tests, so update only their 418→419
constants and matching title. Preserve every key-parity/interpolation assertion.
The exact-base allowance therefore names the six catalogs plus precisely those
two test files, with independent supplemental acceptance; the earlier six-path
review alone does not authorize this extension. The CI step and guard itself
remain unchanged from their separate reviews.

The actual-page harness must follow existing error behavior: Chart keeps its
prior error visible while fields are edited, then clears it on retry; Moon clears
its error on edit. Do not change product behavior merely to satisfy an invented
shared expectation. Preserve the original failed harness run and verify the
corrected chart-only recovery explicitly. No additional numerical, publication
or account authority is implied by these integration corrections.

## C-015 — Withhold unsupported whole-date chart confidence

Keep C-014's admitted unknown-time reference calculation and its numerical and
portable receipt bytes. Set the chart's verified Moon candidate list to the
existing empty/unverified state; do not infer completeness from endpoint samples.
Use a dedicated notice that the Moon sign across the date is unverified. Do not
reuse “changed signs / both neighbors” wording, which asserts an unproved event.
Preserve known-time calculations, ordinary actions, ownership fences and the
existing unverified-Moon consumer contract without a new schema or provider.

Actual member instants contradict the current singleton claims for Toronto
1919-03-31 (Pisces omitted) and Juneau1867-10-18 (Cancer omitted). Point membership
and reference positions are not disproved. Caption-only changes are insufficient:
the singleton currently becomes established context and Moon-specific advice.
An explicitly incomplete observed-sign model would require a wider migration.
Choose the smaller conservative policy, even for ordinary dates where the old
samples happen to agree. Denser samples, a date blacklist or corrected midnight
pair would not establish full coverage.

Also withhold the singular unknown-time Sun Registry bridge derived from those
endpoints. No false Sun sign is demonstrated; this is a conservative confidence
gate, not a numerical error claim. Change only the caller gate, leaving canonical
Registry data, ownership SDK and known-time linking intact. Correct misleading
completeness comments on the unused endpoint helper without changing its algorithm.

C-015 does not fix downstream reference-Sun context/saved callbacks, the literal
12:00 reference caption when resolution shifts, Chart's Moon-mode phase-at-birth
wording, MoonPhaseTool or its six tool-page date-alone claims. Those need a
coordinated next reference-label slice. Public positions may retain explicitly
labeled reference positions. Distinguish intentionally changed confidence from
unchanged numerical/envelope/token values in actual caller and consumer checks.
Root alone integrates shared catalogs, scope metadata, CI and canonical records;
independent reviewers must inspect the actual immutable candidate. No human
numerical/legal signoff, publication authority or Astrofolio integration follows.
