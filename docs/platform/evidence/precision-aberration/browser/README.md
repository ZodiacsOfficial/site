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
| wall time | 409 ms | 828 ms |
| light-time crossing, TDB s | −1319330.9422507882 | −1319330.9422507882 |
| aberrated crossing, TDB s | −1317628.0340060592 | −1317628.0340060592 |
| bracket, s | 8.046627044677734e−05 | 8.046627044677734e−05 |
| observer-motion shift, s | 1702.908244729042 | 1702.908244729042 |
| completeness established | both rungs | both rungs |
| refusal cases passing | 5 / 5 | 5 / 5 |
| off-origin requests | 0 | 0 |
| page errors | 0 | 0 |

Bit-identical between V8 and SpiderMonkey, and identical to the Node run in
`examples/04-experimental-aberrated.mjs`. That is not luck: the core is held
to `Math.sqrt` rather than `Math.hypot` precisely because the two engines
round `hypot` differently, and a bound that moves with the engine is not a
bound. See the note in `src/core/frames.mjs`.

## What this does not show

The fixture is synthetic — an Earth-like observer and a Mars-like target on
circles, described in `examples/precision-alpha/examples/synthetic-pack.mjs`.
Nothing here is a statement about the sky. Real coefficient packs are not
distributed while their licensing is unresolved, so the demonstration runs
on data that ships with the package and is openly fake.
