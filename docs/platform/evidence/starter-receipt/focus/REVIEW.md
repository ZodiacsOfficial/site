# Widget keyboard focus investigation

The original `widget-390-dark` failure remains unexplained. No widget defect or timing race was reproduced. The original failure record is retained at `/private/tmp/zodiacs-platform-starter-receipt-browser-prepack/browser.json`; its failure screenshot visibly contains the frame attribution and shows the eventual fallback focus.

The copied rc.2 and current rc.3 pre-pack `widget.html` and `widget.js` have identical bytes (`source-hashes.json`). The only copied stylesheet changes are file-input sizing and a focus-visible outline for buttons, inputs, and selects. No runtime or repository source was changed during this investigation.

## Fixed diagnostic comparisons

- `trace-focus.mjs` / `focus-trace.json`: 16 cases selected before execution, including six immediate mobile contexts for each version, desktop controls, and one settled-focus mobile control for each version. All observed the attribution on the first Tab and the fallback on the second. Event logs record parent and child focus changes.
- `direct-focus.mjs` / `direct-focus.json`: eight fixed browser contexts (16 dark/light sequences), using the root driver's actual Chromium executable, launch arguments, and extracted `driveWidget` implementation. Only retained focus samples were added to the immediate keyboard loop; all contexts and 120 recorded checks passed. This comparison also did not reproduce the original failure.
- Each comparison has adjacent Playwright trace archives and screenshots. These are diagnostic runs, not a retry-until-green replacement for the original evidence.

## Smallest justified harness change

The existing loop issues Tab, immediately samples parent focus, and conditionally samples frame focus before issuing the next Tab. It does not wait for the intended focus assertion to settle and does not retain the failed focus states. Use exactly two Tab actions, with a bounded assertion between them: require both the parent's active element to be the exact iframe and the frame's `document.hasFocus()` plus exact attribution active-element identity. Only after these pass, issue the second Tab and require fallback focus. Keep the failure samples. This strengthens the assertion without changing widget behavior or retrying Tab until it succeeds.

`strict-focus-control.mjs` implements the proposed two-step check with correct 2.5-second bounds for the cross-frame assertion. Its positive control passed. The synthetic negative control sets only the disposable frame attribution's `tabIndex` to `-1`; the first Tab goes straight to the fallback and the attribution assertion correctly fails with `TimeoutError`. Thus fallback focus alone cannot pass. Exact results are in `strict-focus-control.json`, with positive/negative trace ZIPs and screenshots alongside it.

All probes used Chromium 152.0.7977.83. This finite corpus does not explain the original cause, cover other browser engines or assistive technology, establish human review, or change release status. Parent owns the final driver change and integrated verification.
