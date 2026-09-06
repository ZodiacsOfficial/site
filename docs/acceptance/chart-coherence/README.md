# Restored chart coherence — September 5, 2026

Restored legacy polar charts now resolve the corrected rising position consistently across Profile, natal handoff, Today, Guide and synastry. Reading a record preserves its original saved bytes. Positions-only records retain their supplied angles, and comparison links carry the same positions, angles and calculation receipt as the displayed chart.

## Verified capture

[PR #373](https://github.com/ZodiacsOfficial/site/pull/373), capture head `3929bce28aef84f2079f433e2f5a43ab21181749`, comparison base `553be23941dce0a82add4c9ed75a38f2665fe5f9`.

- [Browser Evidence attempt 1](https://github.com/ZodiacsOfficial/site/actions/runs/33958392530/attempts/1) passed 18 Phase 1 captures, 15 visual comparisons, 78 Lighthouse samples and the Explorer drive.
- Artifact `9967349752`; ZIP SHA-256 `872c9b37a865aa36406e215ec16635ca0c33e6ac2a8b92d89d5ad5d78258a908`.
- Node 22.23.2, Playwright 1.61.1, Chromium 149.0.7827.55; render-source fingerprint `6dae9c4c58c661ed5de8aece9e7e8ab38cfe6b9bd4371390f3b79a47a4d6b094`.

Exact provenance, runtime, archive inventory and every file digest were verified before image review. The 18 Phase 1 PNGs are byte-identical to the previously reviewed committed images; only the genuine generated manifest changes. Linux baselines are unchanged. Later inheritance of the thesis evidence drawer and these acceptance notes leaves the render-source fingerprint unchanged.

Explorer restored the exact vendored legacy fixture and passed identity, corrected ASC, Today contact, synastry/share-receipt and zero read-time storage-write assertions. The positions-only record retained its original Libra angle while the restored record showed Aries. Four legacy-polar screenshots and Today captures were personally reviewed. The gallery images preserve fixed navigation at the captured scroll position and unrevealed footer content; they document functional states rather than polished presentation layouts.

## Raw worst-of-three focal measurements

| Route | Lowest performance | Maximum LCP, ms | Maximum TBT, ms | Maximum CLS |
| --- | ---: | ---: | ---: | ---: |
| Birth chart | 96 | 2584.9668 | 2 | 0 |
| Today | 99 | 1816.7250 | 9.3275 | 0 |
| People | 100 | 1657.2038 | 0 | 0 |

These are independent raw maxima and minimum category scores across three samples, with decimal display rounding; maxima can come from different samples. Focal accessibility and SEO scores are 100. The natal result passes its existing 2800 ms LCP calibration while exceeding the default 2500 ms ceiling. No threshold or retry behavior changed.

The initial Site Check passed T17 sharing acceptance and reported 3181 passing unit tests with only the unsuppressed stale Phase 1 receipt failure. This evidence import addresses that receipt. The full unchanged Site Check on the final evidence head remains the merge gate. These CI captures do not establish production deployment or performance.
