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

The production build was checked at 390, 768, and 1440 pixels. Synthetic local
charts exercised calculation, saving, self versus other-person selection, and
the saved-chart shortcut. The shortcut settles 110 pixels below the viewport
top, clear of navigation. Compatibility fields align across both columns at
768 pixels. Guide opens in place, including keyboard activation, without
navigating to `/ask/`. Optional chart settings expand and update normally.

## Durable evidence

The Browser Evidence workflow captures the exact source head using pinned
Chromium 149.0.7827.55. Phase 1 covers nine templates at 360 and 1280 pixels;
visual baselines cover five routes at 390 and 1440 pixels and reduced motion.
Only reviewed captures are committed. Pixel tolerances and acceptance rules
remain unchanged.

- Source reviewed: `9875981be019e4eafa63f83b343242038c18b75e`.
- Comparison: https://github.com/ZodiacsOfficial/site/actions/runs/35588947480
- Pull request: https://github.com/ZodiacsOfficial/site/pull/547

- Reviewed candidates: https://github.com/ZodiacsOfficial/site/actions/runs/35589647454
- Updated baselines: birth-chart result and Aries, each at mobile, desktop,
  and desktop reduced motion. The other nine baselines remain unchanged;
  their measured differences were all below the existing 0.1% threshold.
- Production build, bundle budgets, and type checks pass. The full 5,549-test
  suite is covered by the 5,548 passing source tests and the refreshed
  screenshot-receipt validation.
