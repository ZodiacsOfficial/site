# Navigation stability — September 5, 2026

The navigation reserves its shell and control tracks before streamed text and optional fonts arrive. English desktop uses 884 pixels; localized desktop uses 992 pixels. Shared-chart receiver pages reserve only their visible controls, eliminating the unused wing column. Compact search/menu targets remain 44 × 44 pixels.

Instrument Sans fallback uses the requested 103.5% size adjustment with compensated vertical metrics. People profiles discover the existing JetBrains Mono font earlier to resolve their measured LCP failure.

## Browser evidence

[PR #366](https://github.com/ZodiacsOfficial/site/pull/366), browser head `db58656ace25162404cce262d57f9613903876b6`, base `17c802964a1418e2f9f356f5180650870f9db58e`.

- [Comparison attempt 2](https://github.com/ZodiacsOfficial/site/actions/runs/33950244341/attempts/2): all 18 Phase 1 captures, 15 visual comparisons, 78 Lighthouse samples and 119 Explorer assertions passed.
- Comparison artifact: `9965079934`; ZIP SHA-256 `cf926fefcce960d120b499a1b53cdf8cf8ff142c362d723be4d033de66ee39f8`.
- [Baseline candidates](https://github.com/ZodiacsOfficial/site/actions/runs/33950563913): artifact `9964740379`; ZIP SHA-256 `47d4d089aa5f2fa29af56a43be93262a079b9e4241dcce8d9f22b04203d593f0`.
- Runtime: Node 22, Playwright 1.61.1, Chromium 149.0.7827.55. Both artifacts bind the same head and render-source hash `0b509f625e5b1e4e561e10e69105d0647175440d9d6d3691984f304f1fd2026a`.

All 78 raw CLS values are exactly zero. Maximum TBT is 113.63 ms. Worst of three primary-route measurements:

| Route | Lowest performance | Maximum LCP, ms | Maximum TBT, ms |
| --- | ---: | ---: | ---: |
| / | 97 | 2337.919725 | 0 |
| /today/ | 99 | 1962.1479 | 5.5 |
| /birth-chart/ | 96 | 2710.09515 | 0 |
| /horoscopes/ | 99 | 1882.6053 | 113.63 |

Existing route calibrations remain unchanged, including the birth-chart LCP limit of 2800 ms. The full standard Site Check on the evidence commit remains the merge gate; these measurements do not establish a production deployment.

## Visual review

All 15 Linux candidate images were opened against their originals. The 18 fresh Phase 1 PNGs are byte-identical to the previously inspected captures. The intended changes are a slightly wider compact pill, stable desktop spacing and balanced shared-chart navigation. No new clipping, overlap, paragraph reflow or footer regression was observed. Some arrow and uncommon-character glyphs differ with the fallback adjustment. The events hub also reflects the existing build-date rule: the August 31 event is now dimmed as past.

The two viewport images here are original native Chromium captures from the passing comparison, with their original coordinate receipts. Navigation remains at y=14 before and after capture. All ten tested English, Spanish and Russian receiver widths passed visibility, geometry and foreground-pixel assertions.

- [390 px phone](receiver-nav-en-390.png)
- [1440 px desktop](receiver-nav-en-1440.png)

The supplementary tour images were reviewed as interaction diagnostics. Some capture an entrance fade or only part of the wheel, so they are not imported as presentation screenshots. Existing follow-up items include the Guide button overlapping the mobile tour's Next button, a duplicated sign name in a chapter receipt, and an English Guide launcher on the Russian page.

## Preserved failure history

The first comparison exposed People LCP failures, fixed by earlier font discovery. Subsequent comparisons exposed an Explorer action-order race and displaced screenshot origins; the harness now waits for completed actions and captures one native viewport without a document clip. Existing interaction assertions and pixel thresholds remain.

[Comparison attempt 1](https://github.com/ZodiacsOfficial/site/actions/runs/33950244341/attempts/1) remains failed: tomorrow's Aries sample 3 had TBT 216.0294 ms; Marie Curie sample 1 had 242.3161 ms. Raw traces show native tasks spending 98.032/130.932/150.475 ms elapsed with only 0.469/0.704/7.885 ms of thread CPU. Identical resources and passing sibling samples support a transient runtime stall; its exact scheduling cause is unknown. The single allowed unchanged-head confirmation passed. No threshold, test or Site Check step was weakened, and no second rerun was used.
