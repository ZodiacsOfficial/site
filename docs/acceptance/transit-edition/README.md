# Transit edition selection — September 5, 2026

The English, Spanish, French, Italian and Portuguese transit pages select their catalog from the committed daily edition. September 2026 therefore remains the current edition when a future December 2030 catalog is present. Headings and fallback copy identify the selected month honestly. All five locally built routes show September 2026 and its 19 committed events.

## Verified capture

[PR #374](https://github.com/ZodiacsOfficial/site/pull/374), capture head `4444b7b63040f222b3777b6baa6950297fd92176`, comparison base `3929bce28aef84f2079f433e2f5a43ab21181749`.

- [Browser Evidence attempt 1](https://github.com/ZodiacsOfficial/site/actions/runs/33958608840/attempts/1) passed 18 Phase 1 captures, 15 visual comparisons, 78 Lighthouse samples and the Explorer drive.
- Artifact `9967406797`; ZIP SHA-256 `a0340e1ac20b329bc69ca73dbed2ba6d51f7b353fcd6f0eff368f5729b005db6`.
- Node 22.23.2, Playwright 1.61.1, Chromium 149.0.7827.55; render-source fingerprint `dbc8c55942dc31cf16acb7ce1e21c0aee95c02264e4b932e2203810cd40fe3b6`.

Exact provenance, runtime, archive inventory and every file digest were verified before image review. All 18 Phase 1 PNGs match the previously reviewed committed images byte-for-byte; only the genuine generated manifest changes. Linux baselines are unchanged. The reviewed chart wave's legacy-polar identity, corrected ASC, matching synastry/share receipt and zero storage-write assertions also passed on this transit head. Its full-page gallery captures document functional states, including fixed navigation at the captured scroll position and unrevealed footer content.

## Raw worst-of-three focal measurements

| Route | Lowest performance | Maximum LCP, ms | Maximum TBT, ms | Maximum CLS |
| --- | ---: | ---: | ---: | ---: |
| Birth chart | 97 | 2409.4812 | 3.5 | 0 |
| Today | 99 | 1816.26525 | 10.5 | 0 |
| People | 99 | 2184.73485 | 0 | 0 |

These are independent raw maxima and minimum category scores across three samples, with decimal display rounding; maxima can come from different samples. Focal accessibility and SEO scores are 100. All existing thresholds passed. The Lighthouse matrix does not include `/transits/`; the five transit-edition routes are covered by the local build and selection assertions. These laboratory results do not establish production performance or deployment.

## Preserved T17 failure and diagnostic correction

[Initial Site Check](https://github.com/ZodiacsOfficial/site/actions/runs/33958608852/attempts/1) failed at the first fresh `/birth-chart/` hydration wait. The page returned HTTP 200 and displayed its server-rendered form, then did not complete hydration within the existing 45-second deadline. It had not begun chart calculation or sharing. The job discarded its in-memory console/page errors on that exception path and uploaded only the pre-existing chart-sheet PNG, leaving the cause unknown. The separate successful Browser Evidence visits cannot explain that failure.

The approved test-only correction retains sanitized console/page errors and same-origin failed asset paths/statuses and attempts a genuine failure screenshot before cleanup. It always rethrows the original failure, including when screenshot or filesystem diagnostics fail. Existing hydration predicates, timeouts and retry behavior are unchanged. Four focused tests verify error identity, redaction/filtering, diagnostic failures and quiet success. The correction does not change the render-source fingerprint or require recapturing the unchanged page source.

The cumulative local suite initially reported 3191 passing tests and one unsuppressed stale Phase 1 receipt failure. This verified import addresses the receipt; the full unchanged Site Check on the final evidence head remains the merge gate, including T17. The translated-route allowance stays limited to the same four existing paths and is pinned to the exact chart base.
