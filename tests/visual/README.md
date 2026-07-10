# Visual and performance regression harness

The harness tests the built site through `astro preview` with a locally
installed Chrome or Chromium. `playwright-core` does not download a browser.
Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` or `CHROME_PATH` when the browser is
not in a standard macOS, Linux, Windows, or `PATH` location.

After `npm run build`:

- `npm run test:visual` compares nine full-page screenshots: `/`, the Frida
  Kahlo result on `/birth-chart/`, and `/aries/`, each at 1440 px, 390 px, and
  a 1440 px reduced-motion variant. A run fails when more than 0.1% of pixels
  differ. Failure images are written to `tests/visual/artifacts/visual/`.
- `npm run test:visual:update` regenerates the committed baselines. The harness
  fixes the clock, locale, time zone, device scale, media playback, animation
  duration, and font-rendering flags for stable captures.
- `npm run test:lighthouse` takes the median of three desktop Lighthouse runs
  per route and enforces LCP ≤ 2.0 s, CLS ≤ 0.05, and TBT ≤ 150 ms. Set
  `LIGHTHOUSE_RUNS=1` for a faster local smoke test. Reports are written to
  `tests/visual/artifacts/lighthouse/`.

Both commands start and stop a preferred fixed-port preview server, falling
back to a free local port when another test already owns it. An already-running
preview can be reused with `ZODIACS_TEST_BASE_URL`. CI should run the build
first and install the Chromium revision pinned by `playwright-core`.
