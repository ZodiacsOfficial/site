# Zodiacs.org Design Contract

This file is the brand contract for Open Design / Claude visual polish work on
the new Astro surfaces: homepage, learn, sign guides, calculators, horoscopes,
profile, and tools. The legacy Collect wing has its own handoff in
`DESIGNER_HANDOFF.md` and should not be restyled from this file.

## Core Feeling

Zodiacs.org should feel like a precise celestial tool with editorial restraint:
quiet, dark, literate, trustworthy, and slightly cinematic. It is not a crypto
landing page, not a generic astrology app, and not a loud SaaS funnel.

The approved homepage opening now follows the Ploy-style pattern:
one rounded cinematic video surface, a very large headline over the footage, a
short caption, and two clear buttons.

## Visual System

- Background: cool near-black void, not blue-slate, purple, beige, brown, or
  gold.
- Chroma: the twelve pastel zodiac sign discs are the accent system. Avoid
  adding new accent families.
- Typography: Instrument Sans for UI and large sans hero display, EB Garamond
  for editorial section headings, JetBrains Mono only for computed data.
- Surfaces: use thin hairlines and restrained depth. Avoid nested cards,
  decorative blobs, aurora gradients, and ornamental status dots.
- Motion: slow, functional, and behind `prefers-reduced-motion`. Motion should
  never become the message.
- Imagery: real zodiac/celestial artifacts, chart surfaces, sign icons, and
  computed-result previews. No vague stock mysticism.

## Brand Nameplate

One mark, one nameplate, everywhere the brand speaks:

- The mark: twelve dots in a ring, one per sign hue, drawn inline
  (`src/components/BrandMark.astro`) — the same mark as the favicon and
  the share cards. On hover of its parent link it makes one slow
  revolution; reduced motion stills it.
- The nameplate: "Zodiacs" set in EB Garamond 500 (the masthead voice),
  with ".org" as a small JetBrains Mono tag seated on the baseline.
- Used identically in the nav pill and the footer. Never a plain sans
  wordmark; never a new logo per surface.

## Voice

Plain, calm, warm, and specific.

Use:
- "Get your free birth chart"
- "See your forecasts"
- "private in your browser"
- "birth date, time, and place"
- "what it means"

Avoid:
- "whole chart" as the emotional lead
- technical sky phrasing on consumer pages
- insider profile terminology in visible product copy
- crypto or market language outside `/registry/`
- hype, urgency, scarcity, financial framing
- "vibes", "mush", "like a human", "done properly", "shows its work"
- decorative mono-caps eyebrow labels on every section

## Homepage Polish Direction

Preserve the approved top hero structure:

1. Fixed nav pill above the hero.
2. Large rounded video frame using `/assets/hero/zodiacs-hero.mp4`.
3. Poster fallback at `/assets/hero/zodiacs-hero-poster.jpg`.
4. H1: "Explore the stars behind your story."
5. Caption: "Free birth charts, moon signs, compatibility, and horoscopes —
   accurate, private, and easy to understand."
6. Primary button to `/birth-chart/`.
7. Secondary button to `/horoscopes/`.
8. The sky ticker remains visible immediately after the hero.

Polish may refine spacing, type scale, contrast, crop, responsive rhythm,
button treatment, and section-to-section flow. Do not replace the hero concept
with a split layout or a generic marketing section.

## Guardrails

- Keep `src/lib/engine/full.ts` as the only direct `astronomy-engine` importer.
  The homepage must not load the ephemeris bundle.
- Do not edit generated output directly.
- Do not pull legacy Collect styling into new Astro pages.
- Do not introduce a third-party visual framework for this polish pass.
- Preserve accessibility: one H1, keyboard-visible buttons, readable contrast,
  reduced-motion behavior, and no content trapped inside decorative media.

## Verification

Run these before handoff:

```bash
npm run check
npm run build
npm test
node scripts/check-dist.mjs
node scripts/report-bundles.mjs
```

Also visually inspect:

- Desktop: 1280 x 720 and 1440 x 900.
- Mobile: 390 x 844 and 430 x 932.
- Reduced motion enabled.
- Homepage first viewport with the next section peeking below.
