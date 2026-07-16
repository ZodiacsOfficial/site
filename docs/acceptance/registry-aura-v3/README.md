# Registry Aura V3 — design proofs

Static, self-contained HTML **design proofs** for the V3 recommendation in
`docs/REGISTRY-AURA-FABLE-V3-AUDIT.md`. They are the design contract for the
implementation pass — not production code, not rendered from the app.

Open any file directly in a browser. Each page shows the design inside a
375 px (or desktop / card-scale) frame with numbered margin annotations that
cite the audit section justifying every decision.

## Stand-ins (deliberate)

- **Fonts:** files reference the site's families (EB Garamond, Instrument
  Sans, JetBrains Mono) with graceful fallbacks; the proofs load no font
  files, so a machine without the fonts installed renders the fallback stack.
- **Discs:** the pastel Zodiac artwork is approximated with CSS circles in the
  exact production hues plus the sign glyph. Production uses
  `/assets/zodiac-icons/…` webp discs.
- **Data:** fixtures match the existing V2 acceptance proofs (wallet checked
  2026-07-15, sky 2026-07-16 — Sun in Cancer, Moon in Leo; held sets of
  one/four/twelve; example chart from `src/lib/aura/example.ts`).

## Files

| Proof | File |
|---|---|
| First screen, 375 px (hero + inline example) | `first-screen-375.html` |
| Beginner path, 375 px (guide → boundaries → composer) | `beginner-path-375.html` |
| Composed result, 375 px, four held signs (full flow) | `result-375.html` |
| Desktop result (two registers) | `result-desktop.html` |
| One held sign | `held-one-375.html` |
| Four held signs | `held-four-375.html` |
| Twelve held signs | `held-twelve-375.html` |
| No saved chart | `no-chart-375.html` |
| Zero result | `zero-result-375.html` |
| Provider unavailable | `provider-error-375.html` |
| Share preview step | `social-card-preview-375.html` |
| Final 4:5 card (1080×1350 + 250 px feed test + crop zones) | `social-card-4x5.html` |

These proofs do not replace the production-rendered PNG acceptance set in
`docs/acceptance/registry-aura/`; after implementation, that set is
regenerated from the real app (audit §15 "Visual-proof requirements").
