# The Phase 1 pixel receipt needed a re-drive, and has had one

Status: **closed**, 2026-09-21, by `Browser Evidence` run
[35573682441](https://github.com/ZodiacsOfficial/site/actions/runs/35573682441)
in compare mode at head `9c2d433fbb7eb90cf26ccba28ba588f00ad14c87`.
Opened 2026-09-20. Not a defect; a consequence of a deliberately
conservative contract.

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
either file invalidated the committed Phase 1 screenshot manifest at
`docs/acceptance/phase1/screenshots/manifest.json`.

    manifest / HEAD 40eaf6d4  a495772c6eb1d501cb43f064d137aed8fc3810ade29dff741ea2dd0ff59d1dd6
    with these changes        8ab4c8432b417bbf359b7bd078c5ceee4e5a16fe0261b30f05b2e57325a3e02d

`scripts/phase1-acceptance-evidence.test.mjs` therefore failed, and kept
failing until the captures were re-driven and committed.

## Why it could not be cleared in the working environment

`npm run test:phase1:acceptance` is gated on the pinned capture runtime:
`PINNED_BROWSER_VERSION = '149.0.7827.55'` in
`scripts/browser-evidence-control.mjs`. The Chromium available in the
working environment is **141.0.7390.37**. Re-driving with the wrong browser
would produce captures that do not satisfy the contract they are filed
under. The designed path is the `Browser Evidence` workflow
(`.github/workflows/browser-evidence.yml`), which runs the capture on the
pinned runner. That is the path that was used; nothing here was captured
locally, no expected hash was edited, no screenshot was relabelled, and the
browser pin was not touched.

## What the re-drive found

The workflow ran in **compare** mode, which is the read-only half: it
captures Phase 1, validates the captured receipt, and compares the 390 and
1440 visual baselines without writing new ones. All three passed.

    Capture Phase 1 at 360 and 1280 pixels   success
    Validate captured Phase 1 receipt        success
    Compare 390 and 1440 pixel baselines     success   (no pixel regression)

The green visual comparison is the direct evidence for the prediction this
note made: the two chrome edits change no pixels on a page that sets
neither prop. The comment is not rendered, and the service-worker guard is
false-free without the attribute.

The **prediction that the re-drive would reproduce the committed Phase 1
pixels was only half right**, and the reason is worth recording rather than
glossing. Eighteen captures were re-driven. Measured against the committed
ones, pixel by pixel:

| capture | differing pixels | why |
| --- | --- | --- |
| `monthly-360`, `monthly-1280` | 0 | identical pixels; only the PNG encoder differs between Chromium 141 and 149 |
| `yearly-360`, `yearly-1280` | 0 | as above |
| `career-1280` | 1 489 (0.035 %) | dated copy |
| `love-1280` | 2 989 (0.072 %) | dated copy |
| `career-360` | 1 075 (0.075 %) | dated copy |
| `love-360` | 1 276 (0.087 %) | dated copy |
| `horoscopes-hub-1280` | 7 429 (0.203 %) | dated copy |
| `horoscopes-hub-360` | 8 276 (0.397 %) | dated copy |
| `weekly-1280` | 29 914 (0.605 %) | dated copy |
| `today-*`, `daily-*`, `tomorrow-*`, `weekly-360` | height changed | dated copy of a different length |

The four zero-difference captures are the clean measurement: a browser-major
change alone moves the PNG bytes and not one pixel. Every other difference
is the **daily edition rolling from 2026-09-20 to 2026-09-21** — the capture
is a day later than the one it replaces. Inspected directly rather than
assumed: the diffs are "September 20, 2026" → "September 21, 2026", the
Moon's phase ("first quarter" → "waxing gibbous") and degrees (15.4° →
27.4° Capricorn), and the horoscope copy that follows from them. Layout,
type, spacing and colour are unchanged throughout, and no capture lost or
gained a component.

That date roll is also why the previous version of this note was wrong to
say `publicationCanonicalSha256` and `renderPayloadSha256` "were not
touched". They are data receipts keyed to the daily edition, so they move
with the date like everything else above. They did not move because of the
chrome edits.

## What is not covered by this gate

The `Browser Evidence` job as a whole is still red at this head, on a later
and unrelated step: `Navigation and chart explorer browser drive`. That
failure is not this change's — see the note on the pull request. The four
steps this gate is about all passed.
