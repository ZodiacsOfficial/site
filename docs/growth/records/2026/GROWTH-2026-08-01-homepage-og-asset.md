---
record_id: GROWTH-2026-08-01-homepage-og-asset
record_type: content-brief
status: superseded
owner: site owner
created: 2026-08-01
updated: 2026-08-06
decision_due: null
source_window: 2026-08-01..2026-08-01
source_locations:
  - https://ploy.ai/workspaces/eb1bfbad-72dc-41fe-8fca-7506c94d5172/ploys/7a347979-2df6-4573-ba48-106d4500605b
  - https://drive.google.com/file/d/1QpG7WQkxM2soRzyHJkuNmwSMr7EAJdFe/view
related_urls:
  - https://zodiacs.org/
related_records:
  - GROWTH-2026-08-01-ploybook-delta-audit
  - GROWTH-2026-08-01-answer-engine-readiness
evidence_quality: medium
privacy_class: aggregate-only
decision: approved 2026-08-01, then reverted by the site owner on 2026-08-06 — the cream card is off-system next to the dark Cosmic Void surfaces, so the homepage returns to the void fallback card
next_action: None. Any future homepage card must be rendered in the Cosmic Void system (void field, EB Garamond display, pastel sign hues, no gold) before it can replace the fallback.
---

# Content brief: Homepage Open Graph asset

## Deliverable

- Asset: [zodiacs-homepage-og.webp](https://drive.google.com/file/d/1QpG7WQkxM2soRzyHJkuNmwSMr7EAJdFe/view)
- Format: WebP.
- Dimensions: 1200 × 630 pixels.
- File size: 40,982 bytes.
- SHA-256: `5c23bd24a519c408a5f6eae48d7b6e02b020b79e739bbebe4c8ab6e8d960109b`.
- Ploy workspace asset ID: `db910950-dbaa-429e-902b-9a23bd70e6d8`.
- Ploy automatically converted the reviewed 319 KB source render to this smaller WebP.

## On-card copy

- Headline: “Your whole chart, not just your sign.”
- Supporting line: “Free birth charts, daily horoscopes, and clear astrology guidance.”
- Proof mark: “Chart calculation stays in your browser.”

## Visual review

The 1200 × 630 export was visually inspected at full size and thumbnail scale. It uses a cream celestial field, a circular set of twelve pastel zodiac symbols, restrained gold/terracotta accents, and a clear left-aligned editorial hierarchy. The headline remains dominant at preview size; the footer proof is intentionally secondary.

## Alt text

Zodiacs homepage preview with a cream celestial design, twelve pastel zodiac symbols, and the headline “Your whole chart, not just your sign.”

## Implementation notes

- Use an absolute public URL in `og:image` and `twitter:image`.
- Declare width `1200`, height `630`, MIME type `image/webp`, and the approved alt text.
- Verify the rendered card in at least one real preview tool after release; source metadata alone is not delivery proof.
- The asset was compared against the repository-defined consumer brand tokens during approval; recheck those tokens against the exact merge commit at the release gate.
- Keep the image off navigation. No renderer route is required.

## Approval and boundaries

- The site owner approved this reviewed asset for production on 2026-08-01.
- Approval does not substitute for the repository release gate or live delivery verification.
- No private chart, birth, account, or visitor data appears in the asset.

## Reversal (2026-08-06)

The site owner saw the cream card rendered as the zodiacs.org link preview on X
and rejected it: a light celestial field with gold/terracotta accents does not
belong to the dark Cosmic Void system the whole site wears, and Warm Gilt is
retired sitewide. The asset was removed from `public/assets/og/v2/` and the
explicit `image`/`imageAlt` props were dropped from `src/pages/index.astro`, so
the homepage falls back to `/assets/og/v2/share.png` — the void card every other
unlisted route shares. `scripts/verify-og-cards.mjs` now fails if a
`homepage.webp` reappears.

X caches link previews, so the old cream card can keep showing on already-posted
links until the crawler re-fetches; re-scraping the URL in the X Card Validator
after deploy clears it.
