# Independent C015 Freeze2 consumer review

Accepted within the reviewed consumer, finite historical-control, and copy scope. No blocker found. This is separate from the main reviewer's actual ChartCalculator browser/save/receipt/ownership review and from the root metadata proposal review.

## Exact source

Base f803d2543ad81343b22d49326b8b46d0e2ea03a0. Author identity SHA256 54cd5acbc7f69c7b3935943a9380be10bb18e8ca2b5a90c1d1766625d8bca55c; patch b13527901ee962d462b0ddd2bdbc16f82763ffa8ad7486d797358b46f76fd0a4. All 16 author files were copied and verified in an independent checkout. Candidate ChartCalculator SHA256 188ccf4759f5586d832751be1de888d8f2d204a267bd5eaa1cf1823dd6c73475.

The executable probe uses an exact contiguous TypeScript-AST-bounded span from candidate ChartCalculator lines 1201–1212 and baseline lines 1202–1220. Inside that span no statement is rewritten. The wrapper supplies the existing real engine/helper functions, records endpoint calls, and fixes runIsCurrent to true. It exercises the actual confidence decision; it does not execute the whole component or its asynchronous ownership checks. Extraction boundaries, source/span/wrapper hashes and both source versions are retained.

## Executed checks

Node 22.23.2 / ICU 78.2 / tz 2026a and Node 24.19.0 / ICU 78.3 / tz 2026b both passed four unknown-time controls (Toronto, Juneau, ordinary Bangkok and the old two-candidate London date) plus two supplied-time positive controls. Every unknown-time candidate produced empty Moon candidates, uncertainty true, a null Registry slug, and zero endpoint/body-sampling calls within the extracted confidence span. The baseline used three calls (one endpoint helper and two body samples). Known-time controls leave the full chart object unchanged, keep the reference Sun slug, and do not perform endpoint work.

Actual unchanged consumer helpers produce unresolved Moon chart context with no sign, house or dignities; approach and communication withhold Moon advice; communication and signature omit Moon aspects; share-card models omit the definite Moon slug. No numerical longitude is moved. Existing numerical JSON, portable envelope string, positions token and saved-schema-shaped projection comparisons also pass, but these are direct calls/projections, not a persisted-save claim.

Four actual Preact components were server-rendered from the frozen-branch results: Inspector (Moon selected), ChartShareDialog (Moon mode), ReadingPath, and PositionsOnlyResult. The 32 distinct baseline/candidate HTML artifacts reproduce with identical hashes on both runtimes. Candidate Inspector and share dialog show Needs a birth time and omit the definite Moon interpretation/glyph. ReadingPath offers no Moon-sign reading links and omits the supplied Moon-aspect and unverified ten-body totals. The positions receiver remains uncertain, including baseline controls; its existing protocol does not transport Moon-candidate metadata. Baseline singleton controls really render Moon interpretation and glyphs, establishing meaningful positive controls rather than only searching candidate omissions.

Twenty-four additional source/artifact checks passed; eight signature/context checks passed. All 102 compiled input hashes were rechecked. Of these, 85 are site sources; all consumed executable consumer sources match base byte-for-byte except the exact new catalog entries and the endpoint helper's comments. Its executable AST is unchanged. The source/build/input manifests and raw logs are retained.

## Finite historical counterexamples

| Local date and zone | Old endpoint candidates | Actual member omitted by those candidates |
| --- | --- | --- |
| 1919-03-31, America/Toronto | Aries | 1919-03-31T04:30:00.000Z = local 00:30:00.000; Moon 359.7145003582242°, Pisces |
| 1867-10-18, America/Juneau | Gemini | 1867-10-19T00:31:13.000Z = local Oct 18 15:33:32.000; Moon 97.12696569323725°, Cancer |

Both runtimes agree on those inputs. The actual local-date membership helper admits each witness and rejects the immediately preceding millisecond (Toronto's prior date; Juneau's next date). These prove particular omissions, not a complete civil-date interval or an independent ephemeris accuracy oracle. The reference instants are still members. The Toronto signature changes from Moon trine Neptune to Mercury trine Saturn when its unverified Moon is withheld; Juneau's Mercury trine Uranus signature remains. Ordinary Bangkok changes from Sun sextile Moon to Sun trine Saturn. That conservative loss of a reading on an ordinary date is intentional policy, not a discovered crossing. No incorrect Sun was demonstrated; suppressing the singular unknown-time Registry bridge is conservative.

The prior preparation delivery remains immutable (manifest 8c8ad6a933a5774494286c54341fecccf6f1cfaffdb49e4a3d18a4b0f161a309). This review advances from its in-memory policy model to the actual frozen confidence branch and actual consumer rendering.

## Copy and consumer boundaries

All six actual catalog objects contain exactly 420 keys. Each source adds only moonUnverifiedNotice; every earlier property text remains identical to base. English, Spanish, French, Italian, Portuguese and Russian consistently say the Moon's possible signs across the birth date are unverified and invite a birth time for a result at a particular moment. They do not assert a crossing, a complete candidate set, a skipped date, or a resolved interval. This is a reviewer semantic check, not an independent human-language certification. The two count tests change the expected count to 420 (and the matching title); source copies and patch retain the exact scope.

Source-backed propagation: moon-certainty.ts:12 honors explicit []; chart-context.ts:83 makes it unresolved; approach.ts:120, communication.ts:129 and chart-signature.ts:275 gate interpretation. ReadingPath.tsx:150, Inspector.tsx:188, scene/build.ts and ChartTour's existing uncertainty handling preserve that state. share-card.ts:213,317,357,400,1213,1299 gate Moon identity/readings. The unchanged public positions protocol reconstructs uncertainty from absent angles. The exact numerical data remains available as a reference receipt.

The saved-input path still stores birth fields and numeric summary; profile re-entry recalculates from those inputs. No candidate metadata migration or old-cache rewrite is claimed. Its full persistence/ownership behavior belongs to the main browser review.

Root explicitly scoped these existing surfaces separately: ChartCalculator Moon-mode phase-at-birth wording (candidate line 2057), MoonPhaseTool and its page captions, fixed 12:00 reference/OG wording, and reference-Sun downstream email/profile context. Their numerical/reference wording is not fixed by this slice. The review does not expand candidate withholding into those policies or treat their unchanged behavior as newly resolved.

## Limits and retained setup details

No product or shared source was edited, no network/provider work or publication occurred, and the author native driver was not rerun. The own checkout uses local shared Git objects; consumed files and frozen sources are separately captured. Existing dependencies were read from a prior owned scratch; no runtime/dependency install occurred.

The focused esbuild probes passed on their first execution but emitted retained setup warnings: the isolated checkout has no local node_modules to resolve Astro's strict tsconfig, and an unused AstroTerm development-only import.meta access was noted in the CommonJS bundle. The actual tested paths execute successfully; this is not a full TypeScript or production build claim. Catalog compilation retains the same tsconfig warning. Main/root full build/type/CI results must be attributed separately. No setup failure was omitted or reclassified as a product defect.
