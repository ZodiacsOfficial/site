# Mobile Race link clearance — September 6 reconciliation

PR #380 preserves its original thirteen CSS additions in `RaceRamp.astro`:
the mobile link has a 44px minimum height, wraps long sign names and leaves
room for the fixed Guide launcher through 560px. No feature flag is changed.

The original September 5 head `5197f2d7` records successful standard and
Games-enabled builds, 3,381 tests, eighteen acceptance captures, and a reviewed
390px deployment. Those checks belong to that historical tree.

This reconciliation merges released main `8ccf127ce4f8061db8a9569c1444a054723634e0`
while retaining its source, published data, visual baselines and screenshots.
Only the original RaceRamp product change remains relative to that main.
The screenshot conflicts are resolved with current-main evidence pending a
genuine fresh capture; the old receipt is not represented as current acceptance.

Current-head build/type checks, fresh capture receipt, required CI and actual
Games-enabled preview review remain release gates. The PR stays draft until
these pass, with production verification after merge. The neighboring crowded
wheel PR #392 owns its release independently; merge order is coordinated so
an intervening release cannot be lost.

## Current preparation

Local merge `b7b45269` and published merge `f4c54c0c` have the identical tree
`ff10015a15c9c3825f1ea9924b5c56300c7db5ea`. Normal git push had no credential;
the connected GitHub API published the exact tree with both real parents and
a non-forced fast-forward ref update.

Node 22.23.2 complete build/postbuild and every unchanged bundle gate pass.
Source receipt: `7afb71e4c43297c994fdedd2b731af9bf2cd0217727c6d4e3416f9a7e8276d97`.
Astro check: 918 files, zero errors/warnings, ten existing hints. Exact-main
scope passes: two paths, no protected source changes. Required Site Check
34040012105 and Browser Evidence 34040012031 validate the published head.
The standard local full suite is not duplicated while required CI runs.

Upstream changes since the earlier reviewed fix leave RaceRamp, its horoscope
parent, Guide bootstrap/styles and navigation source unchanged. Base changes
defer/load the footer correctly and version a WebMCP search import. Historical
Games-enabled six-width checks remain supporting evidence, not a fresh mobile
browser claim for the merged source.

Exact-head Vercel deployment `dpl_5ArMmtmBXwWSLUbvfJ955mpR61o2` is READY for
`f4c54c0c`, with Games enabled in its existing preview configuration. The
authenticated 1363px Sagittarius page was visually reviewed: the Race band
is readable, Guide stays separate and the page has no horizontal overflow.
Guide opens; Escape returns the DOM's active state to Open Guide; the native
Race link reaches `/race/`. Some browser-control observations timed out even
though later DOM/screenshot state confirmed the completed action. Only
browser-extension metadata errors were observed. This is a fresh desktop
smoke check, not a new six-width or physical mobile review.

## Initial integrated browser evidence

Browser Evidence 34040012031 succeeds on `f4c54c0c` against main `8ccf127c`.
Artifact 9991658374 is 100,722,412 bytes, SHA-256
`16542872ef51c57454a9070bb418a48f46c85c0752b73682a9b324df0ef45c8a`.
All 451 ZIP CRCs and 450 provenance file hashes were verified. Exact head,
base and source match. All eighteen Phase 1 images are byte-identical to
committed main; the mobile daily page was also visually inspected. All visual
comparisons and complete Explorer checks pass. Across 78 raw Lighthouse
reports, minimum performance is 96, maximum TBT 22.5ms, maximum LCP 2712.34485ms
and CLS zero, within unchanged route budgets.

Site Check 34040012105 passes all thirteen supporting jobs; its main job
passes 3,467 tests and fails only the stale Phase 1 receipt. The failure is
preserved. Before receipt publication, crowded-wheel PR #392 merged as
`2738713a6787d84d05bd3b8e2f401adbc42d7ea7`; this new release must be integrated
and the changed combined source requires its own genuine capture. The initial
successful evidence does not claim acceptance of that newer combined source.

## Released crowded-wheel integration

Released PR #392 is now merged into this branch at actual main
`2738713a6787d84d05bd3b8e2f401adbc42d7ea7`. Its tested source and all baselines
are preserved. The resulting diff from main contains only the original
thirteen RaceRamp CSS additions and this acceptance record. A fresh combined
source Browser Evidence run is required before its receipt can be imported.
