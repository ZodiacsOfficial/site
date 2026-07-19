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
- `npm run test:lighthouse` runs mobile Lighthouse three times across Today,
  the horoscope hub, and all seven Phase 1 sign-period templates. Every run
  must pass: the gate uses the weakest category score and the worst metric,
  enforcing performance, accessibility, and SEO ≥ 95; LCP ≤ 2.5 s; CLS ≤
  0.05; and TBT ≤ 200 ms. Set `LIGHTHOUSE_RUNS=1` for a faster local smoke
  test. Reports are written to `tests/visual/artifacts/lighthouse/`.

Both commands start and stop a preferred fixed-port preview server, falling
back to a free local port when another test already owns it. An already-running
preview can be reused with `ZODIACS_TEST_BASE_URL`. CI should run the build
first and install the Chromium revision pinned by `playwright-core`.

Baselines live below `baselines/<process.platform>/`. The pinned Chromium is
the same on macOS and Linux, but their font rasterizers and metrics are not;
platform-specific pixels keep the regression threshold strict instead of
masking real layout changes with a cross-platform tolerance.
