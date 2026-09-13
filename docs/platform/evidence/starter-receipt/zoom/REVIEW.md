# Starter rc.3 native Chrome receipt zoom verification

Executed finite browser verification passed **40/40 checks** at native Chrome 200% and 400% zoom. No shared source or archive was edited. This is internal verification of the new natal receipt controls, not external adoption or a complete accessibility audit.

## Identity and runtime

- Starter archive: `zodiacs-platform-starter-0.1.0-rc.3.tgz`.
- Archive SHA256: `facafd75a8366a69dfae7397c9c2c68ee636987fb25d479ef380533408bd8d8a`.
- All 21 archive members were compared byte-for-byte with the integrator's fresh installed consumer before launch; exact local paths are in `result.json`.
- Built consumer `dist/app.js` SHA256: `e1e2240c4acdfcf5c6606cdf84a1241860037e2dde69b0ecb13531143d00dcb4`.
- Bundled engine: `@zodiacs/engine` `0.1.1-rc.3`; engine artifact SHA256 `aeab68793129517abe7498c5f5a17197d387eed7cbdaa9614f3b8cd939b11a17`; SDK source `aaade67d0d49e8b10d1bc5c59cf345d6106dc270`; artifact carrier `2000377b1b537c1b08c873889059acc8edacc4fe`.
- Actual runtimes: Node `22.23.2`, headless Google Chrome `152.0.7977.83`.
- Harness SHA256: `7815c3700fd54b16b601668d1b9af516b26581e2019fdb356983b92f6916617c`.
- `result.json` SHA256: `19d6c1b9b042e6ec4e8e3e487b46c0ed47a9439db7c910d382c15ff46de54e59`.

## Executed method and observations

The harness uses a new, owned Chrome profile and the actual consumer's `scripts/server.mjs` with an ephemeral loopback port. Native zoom is set and read through Chrome's `chrome.settingsPrivate` API on `chrome://settings/appearance`. It does not use CSS zoom or a page-scale substitute. At a 1280×900 browser viewport, 200% produced a 640×450 CSS viewport and DPR 2; 400% produced 320×225 and DPR 4. Chrome reported the latter native factor as `3.9999999999999996`. The HTML and body computed CSS zoom remained `1`, and visual viewport scale remained `1`.

At each factor, the harness focuses the preceding house-system control, then uses Tab and Enter to calculate with the visible synthetic defaults, export, open the file chooser, import the exported JSON, and display the redacted diagnostic. Enter fired the browser's file-chooser event; Playwright supplied the synthetic file bytes to that chooser. This does not claim a manual operating-system file-dialog walkthrough. The export was an actual download stream with the generic filename and draft schema. Import displayed the stored result's unverified-claims notice, and the diagnostic had `redacted-not-anonymous` status.

All four new controls received visible keyboard focus with a solid 2px outline. Their hit centers were uncovered, and their bounds were within the viewport with a one-CSS-pixel fractional-layout tolerance. At 400%, the file input bottom was 225.0234375 CSS pixels in a 225-pixel viewport; its label, chooser button and visible focus sides remained readable and operable. Forward Tab reached all controls; reverse Tab returned to the import control. No horizontal overflow was observed before or after the actions or during reading. Reduced-motion media matched and no document animations were present; Chrome's own PageDown scrolling is not a document animation.

PageDown reached the diagnostic's end in one step at 200% and three steps at 400%. The final 400% reading capture contains the diagnostic's closing brace. Raw captures were inspected for the 200% export focus, 400% file focus and final diagnostic reading; these show reflow, readable text and visible focus. Other focus and reading states are retained for the integrator's inspection.

The twelve PNGs in this directory are direct 1280×900 CDP `Page.captureScreenshot` viewport captures (`captureBeyondViewport: false`, without a clip or full-page option), not stitched or cropped screenshots. Their dimensions and SHA256 values are recorded in `result.json`.

## Preserved harness history

Two earlier harness stops remain intact in the parent evidence directories:

1. `../result.json`: the first 400% case stopped on an overly exact equality assertion against Chrome's `3.9999999999999996` readback. The observed viewport was already 320×225 with DPR 4. The accepted harness uses a narrow `1e-9` readback tolerance and retains exact viewport/DPR checks.
2. `../final/result.json`: with the readback assertion corrected, all controls passed, but the second PageDown was sampled while the first native scroll was still settling. The final harness waits 400 ms per PageDown rather than 120 ms; no product code changed. The successful final reading measurements show each native PageDown advancing by 215 CSS pixels at 400%.

This directory contains the completed third run. No further browser matrix was run after it passed.

## Reproduction and cleanup

The executed command was:

```sh
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node /private/tmp/zodiacs-platform-starter-receipt-zoom/complete/verify.mjs
```

It requires the recorded local consumer, archive and existing site Playwright/browser helpers. A fresh execution should first copy the harness to a new evidence directory and change its `out` constant to avoid overwriting this record. The bounded localhost/browser invocation required the existing approved sandbox escalation; no new project dependency or authentication state was installed or copied.

The owned Chrome context and server were closed, and the new profile's original native zoom was restored to 1. The owned profile remains in scratch as evidence; it was never populated from a user's profile. Only synthetic data was used. Ordinary natal/transit/widget matrix coverage, adversarial import/privacy checks, screen readers, other browsers and numerical correctness are outside this finite zoom run.
