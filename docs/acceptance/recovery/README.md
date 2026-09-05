# Calculator recovery — September 5, 2026

Failed calculation or place-data downloads now produce accurate errors and explicit retry or reload controls. Valid results and entered details remain usable when an independent surface fails. Application promise caches evict rejections; a browser-retained module rejection can still require the warned, deliberate page reload.

## Verified capture

[PR #375](https://github.com/ZodiacsOfficial/site/pull/375), captured head `df967845aad5385c75e2f9661335ea37ecfe942e`, comparison base `1191b9bef5bf4e046f327b39b187047fb7f519f5`.

- [Browser Evidence attempt 1](https://github.com/ZodiacsOfficial/site/actions/runs/33961772595/attempts/1) passed 18 Phase 1 captures, 15 visual comparisons, all 78 Lighthouse samples and Explorer.
- Artifact `9968392309`; ZIP SHA-256 `d023f53640b44964e5221244d856108099fa7c86ceb4e1ce4b8605a7b2be1a0b`.
- Node 22.23.2, Playwright 1.61.1, Chromium 149.0.7827.55; render-source fingerprint `04138ab06c6ae3b66dac1808be4c619ab7a2103e1fbbf129ba031dac17122051`.

Exact provenance, runtime, archive inventory and every digest were verified before personal image review. The reviewer inspected all seven new recovery screenshots. All 18 Phase 1 PNGs are byte-identical to the previously reviewed committed images; only the genuine manifest changes. No Linux baseline was imported. The same render-source fingerprint remains after inheriting the final chart/transit archive integration.

The real-browser drive passed 31 recovery assertions: engine/index/shard request failures, keyboard recovery, the same query after a partial JSON body exceeded its real deadline (15,387 ms observed), an independently failed exact-date scanner with an interactive retained ring, explicit warned reload after retained native module rejection, and actual result scrolling with reduced motion. Unexpected page and console errors remain fatal; the only permitted console errors correspond to the exact deliberately failed requests and their caught module errors.

Big Three optional-card recovery, Saturn warm-up, return-calculator access/unmount races, Profile year-scan/access races, relationship-depth recovery, and invitation/sharing lifecycle races have focused component coverage. This capture does not establish browser acceptance for those paths. Recovery screenshots document functional states rather than serving as presentation baselines.

## Raw worst-of-three focal measurements

| Route | Lowest performance | Maximum LCP, ms | Maximum TBT, ms | Maximum CLS |
| --- | ---: | ---: | ---: | ---: |
| Birth chart | 97 | 2563.6404 | 4.5 | 0 |
| Today | 99 | 1819.56075 | 21.043925 | 0 |
| People | 100 | 1658.1371 | 0 | 0 |
| Thesis | 97 | 2493.83265 | 0 | 0 |

These are independent raw maxima and minimum scores across three samples; maxima can come from different samples. Focal accessibility and SEO scores are 100. All existing thresholds passed, including the documented 2,800 ms natal LCP calibration. Thesis LCP was only 6.16735 ms below its 2,500 ms cap. No thresholds changed. Laboratory evidence does not establish production performance or deployment.

The initial Site Check reported 3,313 passing tests and the sole unsuppressed stale Phase 1 receipt failure. This verified import addresses that receipt. The full unchanged Site Check on the final evidence head remains the merge gate. The exact protected allowance remains limited to the same eight catalogue/test paths and is repinned to the actual transit base.

## SQL harness startup repair

The later final Site Check `33963716418` on `a99c8fc2aceff74ef6ef5bbab1280a53cf1d82fa` failed its Games SQL job `101299975112` before any SQL assertion. At 2026-09-05T11:35:22.653Z, the first bootstrap connection reported that the database was shutting down. The image had just initialized; the harness's readiness query and bootstrap both used a Unix socket.

The [official PostgreSQL image entrypoint](https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh) starts a socket-only initialization server and stops it before launching the final TCP server. The harness now probes and executes against the same loopback TCP endpoint with its existing test-only password. The 60-attempt bound, fatal SQL errors, migration sequence, replay checks and container cleanup are unchanged. No application SQL, database permissions or workflow is edited.

Four regression checks execute the actual Bash harness with a simulated Docker lifecycle: initialization cannot advance bootstrap, restoring the old socket behavior reproduces the premature failure, readiness exhaustion remains fatal, and a SQL-stage failure stops subsequent files without retry. This verifies harness behavior; it does not replace the real PostgreSQL SQL suite. Docker is unavailable in the local runtime, so the actual database gate must pass in CI before merge. The captured product evidence above retains its original provenance; a final passing Site Check is still required.
