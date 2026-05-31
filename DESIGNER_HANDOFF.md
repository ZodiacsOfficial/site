# Zodiacs.org Designer Handoff

## Current State

Zodiacs.org is live at:

- https://zodiacs.org
- https://zodiacs.org/sdk/

Repository:

- https://github.com/ZodiacsOfficial/site

Production is deployed through Vercel from the `main` branch.

The site is a premium mobile-first landing experience for the official Zodiacs.org registry. It should feel like a cultural registry, symbolic identity surface, and public home for the Zodiacs SDK. It should not feel like a dashboard, SaaS page, or generic crypto site.

## Core Purpose

Visitors should leave understanding four things:

1. Zodiacs.org is the official source of truth for the twelve Zodiacs.
2. Each sign has one canonical identity with native Solana origin and official Base representation.
3. Zodiacs ownership can become symbolic identity context: shelves, wheels, receipts, profiles, seasonal context, and public identity surfaces.
4. The SDK lets builders integrate that registry and identity context into downstream apps.

## Preserve

Do not redesign the site from scratch.

Preserve:

- Dark museum-like background
- Warm gold / bronze palette
- Editorial serif typography
- Quiet monospace labels
- Mobile-first framed layout
- Scroll reveal pacing
- Premium, restrained tone
- Sculptural Zodiac artwork as the visual center
- Registry/verifier as the trust anchor

The desired polish direction is refinement, not replacement.

## Brand Tone

Use language like:

- official registry
- cultural asset
- symbolic identity
- public ownership
- verified representation
- onchain access
- identity surface
- seasonal context
- wheel coverage
- Cosmic Receipt
- Zodiac Shelf

Avoid:

- hype language
- financial promises
- urgent CTAs
- casino language
- overbroad claims about astrology or zodiac symbols
- language implying custody, transaction execution, or recommendations

## Current Page Structure

Main page:

1. Hero
2. Registry
3. Verify
4. Museum label / detail panel
5. Thesis
6. Identity Context
7. Onchain Access
8. For Builders
9. Built With Zodiacs
10. The Twelve
11. SDK
12. Read-only by design
13. Questions
14. Closing
15. Footer

The visible section numbering currently runs:

```txt
№ 01 Registry
№ 02 Verify
№ 03 Museum label
№ 04 Thesis
№ 05 Identity Context
№ 06 Onchain access
№ 07 For Builders
№ 08 Built With Zodiacs
№ 09 The Twelve
№ 10 SDK
№ 11 Read-only by design
№ 12 Questions
```

Dedicated SDK page:

- `/sdk/`
- Product-oriented SDK page, not traditional documentation.
- It should visually feel like an extension of the main site.

## Important Interactions

Keep these working:

- Zodiac selector rail
- Featured sign card
- Address verifier
- Copy chips for addresses
- Market Context panel
- Onchain Access horizontal rail
- SDK page links
- Registry JSON link

Verifier states to preserve:

- Base address resolves as `Bridged Zodiac · Base`
- Solana mint resolves as `Native Zodiac · Solana`
- Unknown address resolves as `Not among the Twelve.`

## Visual System

Primary file:

- `index.html`

The site currently uses:

- `Cormorant Garamond` for editorial serif text
- `JetBrains Mono` for labels and system text
- Dark background around `#050609`
- Gold accent around `#c9a961` / `#dec07a`
- Hairline borders through rgba gold values

Keep cards sharp and restrained. Avoid rounded SaaS cards, bright gradients, oversized decorative blobs, or heavy chart-like UI.

## Assets

Primary asset documentation:

- `assets/README.md`
- `assets/manifest.json`

Important folders:

- `assets/icons/` - compact sign glyph assets
- `assets/nuggets/` - primary sculptural Zodiac figures
- `assets/nuggets/thumb/` - smaller catalog figures
- `assets/venues/` - quiet SVG marks for onchain venues
- `assets/og/share.png` - social preview image

Run asset validation after touching PNGs:

```bash
node scripts/validate-assets.mjs
```

Venue SVGs are intentionally quiet single-color marks. If replacing them with official brand assets, confirm usage permissions and keep them visually subordinate to the Zodiacs artwork.

## Data And Registry

Canonical registry artifact:

- `registry/zodiacs.registry.json`

The main page embeds the SDK-shaped registry inline so the site can render without a runtime fetch. The registry shape should remain aligned with the SDK.

Do not edit registry facts casually. Address changes should be treated as product/source-of-truth changes, not design polish.

## Market Context

Market Context is intentionally secondary.

It should remain:

- small
- factual
- quiet
- source-labeled
- unavailable-safe

It should not become a hero feature or chart-heavy area.

Current missing Dex Screener pair IDs:

- Cancer
- Sagittarius

Those signs correctly show a quiet unavailable state.

## Onchain Access

The Onchain Access section is meant to show that Zodiacs can be found across familiar onchain app surfaces.

Keep its language as access/verification, not action-pushing.

Current venue cards:

- Coinbase DEX
- Jupiter
- fomo
- OKX Wallet
- Binance Wallet
- Bybit Web3
- Phantom
- Solflare
- Raydium
- Orca

The horizontal rail must remain touch-scrollable on mobile.

## Polish Opportunities

Good next refinements:

- Improve vertical rhythm between long editorial sections.
- Make Onchain Access feel slightly more integrated with the registry story.
- Tune venue logo scale and spacing after final official marks are chosen.
- Refine FAQ ordering after user feedback.
- Tighten the Market Context panel so it stays useful but not dominant.
- Add subtle states for unavailable market data.
- Check iPhone Safari rendering for text balance and sticky header behavior.
- Review all screenshots and social preview assets after final copy settles.

Avoid:

- More sections for the sake of density.
- More technical copy on the homepage.
- Making `/sdk/` feel like API docs.
- Any UI that implies custody, signing, transaction submission, or recommendations.

## QA Checklist

Before handoff changes ship:

```bash
node scripts/validate-assets.mjs
```

Then verify:

- `https://zodiacs.org` loads
- `https://zodiacs.org/sdk/` loads
- Mobile width around 390 px has no horizontal page overflow
- Verifier works for Base, Solana, and unknown addresses
- Onchain Access rail scrolls horizontally
- Missing venue SVGs do not break the page
- Market Context can be unavailable without breaking layout
- No stale org/repo references appear
- No hype or financial-promise language appears in visible copy

## Suggested Designer Brief

Polish the current Zodiacs.org site without redesigning it. Preserve the dark luxury registry aesthetic, serif editorial tone, bronze-gold palette, mobile-first framed layout, and sculptural Zodiac artwork. Focus on making the site feel more coherent, more premium, and easier to understand as a broader ecosystem: official registry, symbolic identity context, onchain access, builder infrastructure, and SDK. Keep technical detail secondary. Keep all verifier, registry, market context, and SDK links functional. Do not add transaction CTAs, hype language, or a SaaS-like layout.
