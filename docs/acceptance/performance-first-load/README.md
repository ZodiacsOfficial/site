# First-load performance — September 5, 2026

The homepage sky strip is complete server-rendered content. Today requests personal transit interpretation only after a usable saved chart is available. Sun-sign selection remains available without a chart, and saving a chart in the same window starts personalization. Pending imports ignore cleared profiles, revoked access and unmounted components; selected-chart changes use the current chart.

## Verified browser capture

[PR #368](https://github.com/ZodiacsOfficial/site/pull/368), capture head `aa98704c223407d5f45b197f47c607655991b111`, comparison base `3e84fc59aa8ba0a999081cc1a5ee3f3830487434`.

- [Comparison attempt 1](https://github.com/ZodiacsOfficial/site/actions/runs/33956539343/attempts/1) passed all 18 Phase 1 captures, 15 visual comparisons, 78 Lighthouse samples and the Explorer drive.
- Artifact `9966771530`; ZIP SHA-256 `5d65e1431928512e024c47b93f1b48e798184005672248485c3ec26ee2af3dd0`.
- Node 22.23.2, Playwright 1.61.1, Chromium 149.0.7827.55.
- Render-source fingerprint `0ef601d7d0a0ac9a2eabdab07b243c7df269bd6507189eb696cd3a7b74828ae2`.

Provenance, runtime, archive paths and every inventoried file hash were verified before review. Today and representative horoscope captures were opened. All 18 Phase 1 PNGs are byte-identical to the previously reviewed committed captures; only the genuine generated manifest changes. Existing Linux baselines remain untouched. No clipping, overlap or layout regression was observed.

## Observed script transfers

These results hold in each of three cold-browser samples. The baseline is the verified navigation capture `db58656ace25162404cce262d57f9613903876b6`, run `33950244341`, attempt 2. Counts use DevTools Network Script requests and completed `encodedDataLength`, including response overhead.

| Route | Scripts before | Scripts after | Bytes before | Bytes after |
| --- | ---: | ---: | ---: | ---: |
| Home | 17 | 6 | 34,047 | 9,697 |
| Today, no saved chart | 20 | 17 | 34,645 | 31,892 |

These are script-transfer reductions, not overall page-speed percentages. The homepage removes the SkyTicker hydration dependency chain. Today defers transit and compatibility dependencies until personalization needs them.

All 78 raw CLS values are exactly zero; maximum TBT is 10.5 ms. Performance scores are at least 96 and accessibility scores are 100. Raw SEO remains 69 on the two deliberately noindex routes; the unchanged gate excludes only their intentional crawlability finding.

| Route | Lowest performance | Maximum LCP, ms | Maximum TBT, ms |
| --- | ---: | ---: | ---: |
| Home | 99 | 1655.9644 | 0 |
| Today | 99 | 1809.82485 | 7.5 |
| Birth chart | 96 | 2562.94005 | 10.5 |
| Horoscopes | 100 | 1879.7 | 0 |

These are worst-of-three laboratory results with the existing route calibrations, including the 2800 ms birth-chart LCP limit. They do not establish production performance or deployment. The full unchanged Site Check on the final evidence commit remains the merge gate, including the new Today request and same-window-save assertions.

## Preserved failure history

[Earlier capture on 10d4082](https://github.com/ZodiacsOfficial/site/actions/runs/33955173998) failed one People-directory Lighthouse sample: TBT 438.09925 ms. The other two samples had zero TBT and identical two-script transfers. A native context-setup task spent 184.490 ms elapsed with 0.050 ms thread CPU, supporting a wait or scheduling stall without identifying its cause. No product change or threshold relaxation was made to hide that failure. Its artifact was retained for diagnosis and was not imported.

The passing capture above includes the subsequently landed, unrelated archival updates on actual main. No unchanged-head retry was used for either performance capture.
