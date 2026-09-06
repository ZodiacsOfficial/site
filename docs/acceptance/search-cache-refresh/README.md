# Search cache refresh acceptance

Returning visitors could receive the old Search ranking after release #371:
the stable `/assets/search-ui.js` URL was served with
`Cache-Control: public, max-age=31536000, immutable`. Direct public HTTP
confirmed the current deployed bundle matched the reviewed local bytes
(SHA-256 `ea0964eba25b21b18993706424cbd8eeeb0c75b86cea6f5bac3b108c859134dd`),
while an already-used production browser still returned the old plural-query
results. The search index itself revalidated and contained the calculator
entries.

The follow-up gives Search and WebMCP's shared ranking bundle the
`?v=search-ranking-2` URL revision and explicit revalidation headers. It uses
the existing Guide loader convention. Built-HTML checks and actual browser
request checks protect the revised cache keys; ranking and destination checks
remain unchanged.

## Genuine capture

- Capture head: `2277cbeca5620cdfd56181285b6a69eaf3aa2c21`.
- Exact Widget parent: `1c73ef23ff2c7f2e07dda4df9442162f48015563`.
- Source fingerprint: `83b3d6e5b29f1760a2c537516b587c16a6378bc602073f247b91bd20c8e1bc4d`.
- [Browser Evidence 34005718885](https://github.com/ZodiacsOfficial/site/actions/runs/34005718885),
  attempt 1, passed every required step.
- Artifact `9981110440`: 94,369,109 bytes; SHA-256
  `3fab89f44074c1611ca6f227e307d5c255a7698b1f5270932ff465011688afe4`.
  All 392 ZIP entries passed CRC validation; all 391 provenance inventory
  entries matched their size and SHA-256. Head, base, runtime, source and
  capture outcomes matched the requested run.
- All 18 Phase 1 screenshots and the manifest were imported unchanged from
  that artifact. Six screenshots matched previously approved bytes. Root
  personally inspected and approved the other twelve at 360 and 1280 pixels;
  they reflect September 6 readings and September 7 tomorrow content, with
  readable text and intact geometry.
- All 15 visual comparisons reported exactly 0.0000% difference.
- All 78 raw Lighthouse reports across 26 routes passed the existing budgets:
  accessibility 100, CLS exactly 0, minimum performance 97, maximum LCP
  2484.4146 ms, maximum TBT 19.2873 ms. No missing/duplicate/invalid reports,
  runtime errors, audit errors or run warnings were found; trace and devtools
  companions were present.
- All eight Search browser checks at 390 and 1440 pixels requested
  `/assets/search-ui.js?v=search-ranking-2`. Plural/case variants, Big Three
  and Solar Return exposed their Tool results and opened the expected pages.

## Release reconciliation

Actual Widget main `788661951d63f0a79c90cb6494dacae8a355ca25` has exactly the
tested Widget tree `fa63ce68b51e50e7a64ddc1037d51a8a53e9843a`. Its integration
preserved the cache candidate's complete tree before receipt import and kept
the source fingerprint above unchanged. No protected source path changed.

The fresh Node 22 build, typecheck, dist integrity, footer, consumer boundary
and bundle gates passed. The initial unit run's dependency-symlink collection
error was resolved by an isolated dependency copy; a complete rerun then had
3,435 passing tests and only the expected stale screenshot-receipt failure.
After this genuine receipt import, all 3,436 tests across 352 files passed.
Final Site Check on actual main remains the merge gate.

Root also verified the exact preview in the browser: both revised loader URLs
were present, `birth charts` showed the Birth Chart and Solar Return tools,
and clicking the calculator result opened `/birth-chart/`. Vercel's fetch tool
returned SSO responses instead of preview delivery headers; those responses
are not cache-policy evidence. Public production response headers and the
original returning browser must be verified after the automatic deployment.
This record makes no manual screen-reader or native WebMCP acceptance claim.
