# Consumer visual polish — 21 September 2026

Owner-approved follow-through on the live-site visual audit. The changes retain
the Cosmic Void design system and existing calculation, account, and transaction
behavior.

## Changes

- Simplify birth-chart entry: shorter introduction, readable labels and input
  text, optional house-system disclosure, and contextual unknown-time help.
- Align compatibility fields by placing the saved-chart suggestion above both
  people; provide inline calculator help on phone and tablet widths.
- Put horoscope readings before supporting sky information and sign-guide
  articles before collection promotions; add a compact twelve-sign picker.
- Prioritize consumer tools in mobile navigation, shorten Learn onboarding,
  and provide a direct saved-chart shortcut in Profile.
- Distinguish an unselected self chart from an empty saved-chart collection;
  put the self-chart chooser before the Sun-sign fallback.
- Explain Astrofolio's token-collection purpose in its introduction.
- Restore missing article spaces and keep Guide anchors on the current page.
- Shorten chart entry to 260 ms, preserve reduced-motion behavior, and anchor
  dropdown motion at the top of its panel. No new motion dependency.

## Browser verification

The production build was checked at 320, 360, 390, 768, and 1440 pixels. Synthetic local
charts exercised calculation, saving, self versus other-person selection, and
the saved-chart shortcut. The shortcut settles 110 pixels below the viewport
top, clear of navigation. Compatibility fields align across both columns at
768 pixels. Guide opens in place, including keyboard activation, without
navigating to `/ask/`. Optional chart settings expand and update normally.
At 320 pixels, the horoscope sign picker uses two columns; every label fits
inside its button. Wider layouts retain three or six columns.
The compatibility suggestion also retains a zero-minimum grid track, so long
saved-chart names truncate within the form instead of widening the page. The
hostile-length browser fixture was reproduced at 565 pixels on a 320-pixel
viewport; the corrected form stays inside the viewport and its tablet columns
remain aligned.

## Durable evidence

The Browser Evidence workflow captures the exact source head using pinned
Chromium 149.0.7827.55. Phase 1 covers nine templates at 360 and 1280 pixels;
visual baselines cover five routes at 390 and 1440 pixels and reduced motion.
Only reviewed captures are committed. Pixel tolerances and acceptance rules
remain unchanged.

- Final source reviewed: `0815172195fa1f0f5778b84f3aaa70b91dabc06e`.
- Comparison: https://github.com/ZodiacsOfficial/site/actions/runs/35588947480
- Final comparison, all 15 cases pass:
  https://github.com/ZodiacsOfficial/site/actions/runs/35594290554
- Pull request: https://github.com/ZodiacsOfficial/site/pull/547

- Reviewed candidates: https://github.com/ZodiacsOfficial/site/actions/runs/35589647454
- Updated baselines: birth-chart result and Aries, each at mobile, desktop,
  and desktop reduced motion. The other nine baselines remain unchanged;
  their measured differences were all below the existing 0.1% threshold.
- Production build, bundle budgets, and type checks pass. The full 5,549-test
  suite is covered by the 5,548 passing source tests and the refreshed
  screenshot-receipt validation.

The capture runs above were stopped after successful receipt and visual
comparison collection. The separate Site Check runs the complete browser and
performance gates before release; capture-only completion is not a substitute.

## Integration follow-up

Main advanced to `35532f17dd5b286484c041844590bc95e7d030a6` while the
release checks ran. Its developer preview and documentation changes are
preserved. Conflicts were limited to screenshot evidence; fresh captures of
the combined source are required before release.

The compact sign picker now uses the existing WebP derivatives (18,844 bytes
in total, versus 61,126 bytes for AVIF) at low fetch priority. Layout and icon
dimensions are unchanged. No performance threshold or visual tolerance changes.
