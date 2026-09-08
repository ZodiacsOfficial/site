# Moon lookup result ownership — author freeze 1

Implemented and locally tested; independent review pending. The source is frozen in `source-freeze1-identity.json` and `source-freeze1.patch`, based on site `30b41cd8f1a353cce0cee36bc76c1e9fa21b4c14`. Only `src/islands/MoonPhaseTool.tsx` changed and `tests/moon-result-ownership-drive.mjs` was added. All other 10,418 regular base files are byte-identical. The root checkout was never edited.

Editing the date, optional time or place now invalidates the displayed result and any pending lookup. Each submission captures its own revision. An obsolete completion cannot calculate, publish a result/error, clear a newer busy state or move focus. Current failures leave an alert and permit retry. Unmount revokes a pending lookup; normal remount starts fresh. Typed input is preserved. Existing markup, labels, styles and astronomical/date policy remain unchanged.

The exact original calculation try-body remains byte-identical after stripping the two added ownership guards (`calculation-preservation.json`). This includes noon/UTC assumptions, local resolver calls, the 00:00/23:59 endpoint policy, angle and illumination arithmetic, candidate handling and captions. The separately reproduced Toronto/Apia date-coverage defects remain unresolved. No interval API is imported or activated, no certainty guarantee is strengthened, and no chart/receipt/account/ownership SDK behavior is added.

## Executed checks

The same completed browser fixture against original source gave **18 failing ownership groups and two passing calculation controls**. Against frozen corrected source it gave **20/20 passing groups**, with no page errors. `native-baseline-final/result.json` and `native-final/result.json` retain all observations, original/candidate source hashes, runtime, requests and cleanup. The two successful calculation controls have byte-identical evidence before/after: known-time UTC result text/engine calls and unknown UTC/local engine call instants.

This is actual Chrome 152.0.7977.83 rendering the real Preact MoonPhaseTool and PlaceSearch, with the existing six locale payloads and actual rc.6 engine longitude calculations. The fixture controls only engine-loader promise settlement, synthetic place-search data and a deliberate calculation exception. It tests field edits, city selection/removal, delayed resolution after edits or empty date, older resolve/reject against a newer pending run, current loader/calculation failure and retry, normal unmount/remount, focus, all six catalogs, and unchanged known/unknown calculation controls. It serves only owned loopback resources, blocks remote requests, and closes each browser context/server. It is not a full Astro page, a live deployed-site test, or a visual accessibility certification. No product test hook or new runtime dependency was added.

Strict TypeScript validation of the island and its imports passed with the existing dependency installation. Reverse patch applicability passed. Native compilation also parsed the driver and actual TSX. No full-site build or full-suite pass is claimed; the integrator owns the normal release gates after independent review.

## Retained setup failures

These are harness/setup failures, not product defects:

1. The host Python rejected the optional `tarfile.extractall(filter=...)` argument before extracting any file. The owned git archive was extracted with the supported call; `base.json` records it.
2. The first browser-driver build lacked an output path for the island's imported CSS (`native-before.log`). The fixture now emits and serves that unchanged CSS.
3. Initial provenance collection tried to read esbuild's virtual `<define:import.meta.env>` input as a file (`native-before-rerun.log`). Virtual entries are now excluded from filesystem reads.
4. The first mounted fixture lacked the required client UI catalog (`native-before-executed.log`/result). Catalogs were then supplied exactly as the client expects.
5. The initial catalog fixture omitted the separate staged Russian runtime payload (`native-before-catalog` and `native-after`). Its other 19 corrected groups passed. The final fixture includes the existing Russian payload, and both original/corrected final runs have zero page errors. Earlier logs/results are retained with these qualifications.

The corrected complete fixture was rerun against the original committed source using `MOON_SOURCE`; this avoids conflating missing fixture payloads with the 18 reproducible product ownership failures. The original snapshot and final source are included in the sealed delivery. Independent review uses a separate scratch and remains a separate verdict. No publication, deployment, external review by a human or external adoption is claimed.
