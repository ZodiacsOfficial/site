# validated-retarded-aberrated — isolated browser example

The experimental mode running in a real browser, on the package's own ES
modules, with no bundler and no build step.

```
node serve.mjs 8793 &
node drive.mjs http://127.0.0.1:8793/ --browsers chromium,firefox --out browser-run.json
```

`serve.mjs` serves this directory at `/` and `examples/precision-alpha/` at
`/pkg/`, localhost only. The page imports `/pkg/src/browser.mjs`,
`/pkg/src/experimental.mjs` and `/pkg/examples/synthetic-pack.mjs`
directly, so the bytes the browser runs are the bytes the package ships.
A bundle would be a fourth artifact to keep honest, and what is being shown
is that the shipped source is environment-neutral — which a build step
could hide rather than demonstrate.

`drive.mjs` reads `window.ABERRATED_EXAMPLE`, not the rendered HTML: the
page's own formatting must not be able to stand in for a measurement. It
reaches its own verdict and exits non-zero if the run completed while
proving nothing.

## Recorded run — 2026-09-21

`browser-run.json`, both engines, from the committed synthetic fixture.

| | Chromium 141.0.7390.37 | Firefox 151.0 |
| --- | --- | --- |
| aberrated crossing, TDB s | −1317628.0340060592 | −1317628.0340060592 |
| light-time crossing, TDB s | −1319330.9422507882 | −1319330.9422507882 |
| bracket, s | 8.046627044677734e−05 | 8.046627044677734e−05 |
| observer-motion shift, s | 1702.908244729042 | 1702.908244729042 |
| completeness established | both rungs | both rungs |
| refusal cases passing | 5 / 5 | 5 / 5 |
| off-origin requests | 0 | 0 |
| page errors | 0 | 0 |

The three published numbers are bit-identical across V8 and SpiderMonkey,
and identical to the Node run in
`examples/04-experimental-aberrated.mjs`.

### The pack is not the same pack, and that is the interesting part

Each engine BUILDS the fixture, and `fit()` reaches `Math.cos` and
`Math.acos`, which IEEE-754 does not require to be correctly rounded and
which engines therefore disagree about in the last bits. So the three runs
are not searching identical bytes:

| | pack digest | bytes | evaluations, 108-crossing case |
| --- | --- | --- | --- |
| Node 22 | `d11e17e1…` | 198 055 | 126 126 |
| Chromium 141 | `0d64d6ee…` | 198 055 | 126 184 |
| Firefox 151 | `9cb21bac…` | 198 055 | 126 159 |

Each engine is stable with itself — the long search run twice returns the
same count to the unit — and the spread between engines is 58 in 126 126,
or 0.05 %.

So the agreement in the first table is a statement about the SEARCH, not
about the data: three engines given three slightly different polynomials
report the same crossing to the last bit, because a transversal root is
insensitive to the last ulps of the coefficients around it. The
108-crossing case is not insensitive, and the subdivision count shows it.
Nothing about soundness changes — each engine establishes completeness
about the polynomial it actually holds.

Making the fixture byte-identical everywhere would mean shipping its
19 680 coefficients as literals instead of the geometry that generates
them, which is a 200 kB blob in place of a readable example. The page and
`browser-run.json` report the digest instead, so a reader always knows
which pack produced a number.

## Interrupting a running search

A search is one synchronous call, so a worker inside one never reaches its
own event loop and a `postMessage` saying "cancel" is not delivered until
the search has already finished — timing that would measure the search's
runtime and call it a cancellation. The page shares a flag through
`SharedArrayBuffer` instead, which the search's own `signal` reads on every
evaluation; `serve.mjs` sends COOP and COEP for it.

Playwright clicks Cancel through the real input path, so a blocked main
thread would swallow the click.

| | Chromium 141 | Firefox 151 |
| --- | --- | --- |
| complete run | 126 184 evaluations, 108 crossings | 126 159 evaluations, 108 crossings |
| same run again | 126 184 | 126 159 |
| cancelled run | 4 480 evaluations (3.6 %) | 32 875 evaluations (26.1 %) |
| click to the result reaching the page | 12.3 ms | 0.9 ms |
| animation frames while it ran | 4 | 5 |
| status | `cancelled` | `cancelled` |
| completeness established | false | false |
| exact total claimed | false | false |

The cancelled run keeps the crossings it had already isolated, as a lower
bound, and claims nothing else. The frame counter is there so "the page
stayed responsive" is a measurement rather than an impression: if the
search were on the main thread it would read zero.

One measurement was wrong before it was right. The first version subtracted
the worker's `performance.now()` from the page's, which are different time
origins, and reported a click-to-stop latency of **−259 ms**. Both ends are
on the page's clock now, and the worker's own elapsed time is reported
separately.

## What this does not show

The fixture is synthetic — an Earth-like observer and a Mars-like target on
circles, described in `examples/precision-alpha/examples/synthetic-pack.mjs`.
Nothing here is a statement about the sky. Real coefficient packs are not
distributed while their licensing is unresolved, so the demonstration runs
on data that ships with the package and is openly fake.
