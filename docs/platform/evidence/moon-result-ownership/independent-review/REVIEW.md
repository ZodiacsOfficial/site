# Independent Moon result-ownership review

No unresolved defect found in the frozen bounded patch. Root may proceed with its integration gates; this is independent automated/source review, not human approval or deployment.

## Identity and scope

Base 30b41cd8f1a353cce0cee36bc76c1e9fa21b4c14; patch SHA-256 ecdc149e2115ee234828f3848b40cab4f6ba2b15074763b28bf936f0abac6858; frozen island SHA-256 0661eb17ee4bdcd32f2d7d0e4311691036bb5335c0ce14176b1e1234f3f976bb. Both frozen author files and all 32 physically copied source dependencies still match. Independently built baseline/candidate bundles consume only copied source and package files, with recorded input hashes. The original source is separately pinned by hash. No author/root product files were edited.

The revision counter fences each submitted request. Edits invalidate prior work and clear stale result, error, busy and focus ownership. The success, catch and finally paths check the current revision; unmount invalidates its retained ref. This leaves shared module loading intact while preventing superseded tasks from performing astronomy after their await or committing result/error/busy state.

Independent TypeScript AST comparison removes only the two new direct isCurrent guards from the try block, then proves every remaining calculation statement is unchanged. The pure disc and illumination functions and Lookup schema are byte-identical. Date/time resolution, 00:00/23:59 endpoints, noon assumptions, body calls, phase classification, captions and uncertainty semantics therefore remain outside this fix.

## Native counterexamples and verification

Actual Chrome 152.0.7977.83 executed the real MoonPhaseTool and PlaceSearch against copied rc.6 longitude calculations. The identical independent driver produced **13/13 passing candidate groups**, compared with **12 failing original ownership groups and one passing original prefetch control**. Original failures are retained as executed regressions.

Eleven groups use the real createModuleLoader implementation around a controlled importer. This exercises its shared pending promise, rejected-import cache reset and successful-import cache. Two additional groups use separately controlled per-run promises solely to challenge out-of-order settlement beyond the shared-loader case. Synthetic geo results permit real PlaceSearch query, selection and removal interaction without loading a dataset or contacting a service.

- Rejected date-focus prefetch is observed by the existing module loader: both original and candidate have zero unhandled rejections and successfully retry. The unchanged onFocus callback's returned promise was not misclassified as a new unhandled-error defect. A current real ModuleLoadError instead shows the existing load-error UI, focuses the alert, clears on edit and retries.
- Partial/replaced place text invalidates old output while remaining unselected. With query Tor and no selection, the current result retains the existing explicit UTC meaning; it does not invent Toronto. One shared import produces only the current Moon/Sun pair. Selecting Bangkok changes the instant to 05:00Z; removing the selected city restores the existing 12:00Z UTC meaning.
- Clearing date while pending leaves no result, no astronomy, an idle disabled submit button and focus on the date input. Clearing a known time produces exactly one current unknown-noon result with the unchanged four engine instants. A one-character place query also clears a displayed result immediately.
- An old rejection cannot clear the newer busy/error state. An old success after a newer result cannot overwrite it, perform a second body calculation or move focus away from the edited field.
- A current calculation failure removes the old result and focuses its alert; recovery reproduces the prior successful text/numerics.
- Unmount/remount with one still-pending shared import computes only for the new mount. The separate rapid mount/input/submit/unmount control permits only microtasks, with no intervening paint. It records one import attempt, then zero astronomy calls and an empty mount. No passive-effect cleanup gap was reproduced: the required input rerender makes this tested path's cleanup effective.

All candidate groups had zero observed page errors, unhandled rejections and page requests. Owned disposable contexts ran on blank pages and were closed; no server, website or user browser profile was used. These finite cases are not all-browser certification. Source/fixture distinctions and complete raw outputs are preserved.

## Remaining scope boundaries

This patch does not activate date intervals, correct Toronto/Apia endpoint behavior, prove whole-date Moon candidates, change approximate phase copy, or alter locales/styles/account/save/Registry paths. Those remain separate decisions from the compatibility report. No new provider or SDK export appears. Root owns full integration checks and release authority.

The author's 20-group browser and strict TypeScript runs are additional author evidence; they are not claimed as this reviewer's work. Two independent fixture setup errors are retained and classified in SUMMARY.json: virtual esbuild metadata handling and the initially missing owned mount element. The final complete original/candidate runs passed their expected differential verdict.
