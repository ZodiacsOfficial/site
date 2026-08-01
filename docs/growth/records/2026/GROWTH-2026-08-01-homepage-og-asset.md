---
record_id: GROWTH-2026-08-01-homepage-og-asset
record_type: content-brief
status: proposed
owner: unassigned
created: 2026-08-01
updated: 2026-08-01
decision_due: null
source_window: 2026-08-01..2026-08-01
source_locations:
  - https://ploy.ai/workspaces/eb1bfbad-72dc-41fe-8fca-7506c94d5172/ploys/7a347979-2df6-4573-ba48-106d4500605b
  - https://drive.google.com/file/d/1QpG7WQkxM2soRzyHJkuNmwSMr7EAJdFe/view
related_urls:
  - https://zodiacs.org/
related_records:
  - GROWTH-2026-08-01-ploybook-delta-audit
evidence_quality: medium
privacy_class: aggregate-only
decision: design review required; not approved for production
next_action: Compare with the current live homepage card, approve or reject the visual, then implement through a current-main branch and Release & Trust Gate.
---

# Content brief: Homepage Open Graph asset

## Deliverable

- Asset: [zodiacs-homepage-og.webp](https://drive.google.com/file/d/1QpG7WQkxM2soRzyHJkuNmwSMr7EAJdFe/view)
- Format: WebP.
- Dimensions: 1200 × 630 pixels.
- File size: 40,982 bytes.
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
- Compare against the current repository-defined consumer brand tokens before approval because the inspected working branch is older than production.
- Keep the image off navigation. No renderer route is required.

## Boundaries

- This is a review asset, not a released site change.
- No production file, route, metadata, domain, hosting, or deployment was changed.
- No private chart, birth, account, or visitor data appears in the asset.
