# The Phase 1 pixel receipt needs a re-drive, and cannot get one here

Status: **open gate**, recorded 2026-09-20. Not a defect; a consequence of a
deliberately conservative contract.

## What happened

The isolated developer preview needs two things the shared chrome did not
offer: a route that does not register the PWA service worker, and a route
that does not load the Guide assistant. Both are same-origin inherited
components, and §8 of the mandate requires same-origin surfaces to be
inspected rather than assumed harmless. The service worker precaches the
app shell into Cache Storage, which is storage on a page whose whole claim
is that it stores nothing; the assistant mounts a widget that can send typed
text to the server.

Both switches live in shared chrome:

- `src/layouts/Base.astro` — the `noServiceWorker` and `noAssistant` props.
- `src/components/SiteFooter.astro` — the loader and Guide button, now
  conditional on `noAssistant`.

`tests/visual/phase1-evidence-contract.mjs` hashes the whole of
`src/layouts` and `src/components` into `templateSourceSha256`, so editing
either file invalidates the committed Phase 1 screenshot manifest at
`docs/acceptance/phase1/screenshots/manifest.json`.

    manifest / HEAD 40eaf6d4  a495772c6eb1d501cb43f064d137aed8fc3810ade29dff741ea2dd0ff59d1dd6
    with these changes        b8944e6ac36f46b9c470c71a75d95d0d65132d30aaa09e8beb2dbfe7bc07da04

`scripts/phase1-acceptance-evidence.test.mjs` therefore fails, and will keep
failing until the captures are re-driven and a reviewer commits them.

## Why it cannot be cleared in this environment

`npm run test:phase1:acceptance` is gated on the pinned capture runtime:
`PINNED_BROWSER_VERSION = '149.0.7827.55'` in
`scripts/browser-evidence-control.mjs`. The Chromium available here is
**141.0.7390.37**. Re-driving with the wrong browser would produce captures
that do not satisfy the contract they are filed under. The designed path is
the `Browser Evidence` workflow (`.github/workflows/browser-evidence.yml`),
which runs the capture on the pinned runner behind the reviewer's
`<!-- browser-evidence-candidates head=… -->` marker.

## What the re-drive should find

The captured Phase 1 routes are nine consumer templates. None of them passes
`noServiceWorker` or `noAssistant`, so the rendered difference on every one
of them is exactly two things, measured by building the same tree with and
without the two chrome edits:

1. An HTML **comment** in the footer gains a sentence.
2. The inline service-worker registration gains one guard:
   `` `serviceWorker` in navigator && !document.documentElement.hasAttribute(`data-no-service-worker`) && … ``

A comment is not rendered, and the guard is false-free on a page that does
not set the attribute — the registration still happens, on the same timer.
So the re-drive is expected to reproduce the committed pixels and restamp
the hash. **Expected is not verified**: that is what the pinned-runner
capture is for, and this note does not stand in for it.

Everything else in the build is unchanged — `publicationCanonicalSha256`
and `renderPayloadSha256` are data receipts and were not touched.
