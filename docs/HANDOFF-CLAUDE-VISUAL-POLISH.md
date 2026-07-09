# Handoff - Claude Visual Polish with Open Design

## Objective

Polish the new Zodiacs.org Astro website visually, starting from the approved
landing hero that now uses the supplied zodiac video in a Ploy-style opening.
Use Open Design as the design workflow and reference system, but implement final
changes directly in this repo.

Open Design reference:
- Repo: https://github.com/nexu-io/open-design
- It supports Claude Code and project design systems via `DESIGN.md`.
- If Open Design is installed, wire it to Claude with `od mcp install claude`.

## Current Approved State

The homepage top is approved by the owner:

- Large rounded video hero.
- Headline over video: "Explore the stars behind your story."
- Caption below headline inside the same video frame.
- Two buttons:
  - "Get your free birth chart" -> `/birth-chart/`
  - "See your forecasts" -> `/horoscopes/`
- The sky ticker remains immediately after the hero.

Changed files/assets from the Codex pass:

- `src/pages/index.astro`
- `public/assets/hero/zodiacs-hero.mp4` - web-sized MP4, about 6 MB
- `public/assets/hero/zodiacs-hero-poster.jpg` - poster fallback, about 409 KB
- `DESIGN.md` - Open Design brand contract for the new Astro surfaces

Local preview was checked at desktop and mobile sizes. Final gates were green:

```bash
npm run check
npm run build
npm test
node scripts/check-dist.mjs
node scripts/report-bundles.mjs
```

## Scope for Claude

Focus on visual polish, not product restructuring.

Good targets:

- Improve the hero crop, headline scale, contrast, and button finish.
- Refine the transition from hero into the sky ticker.
- Make the calculator/tool cards feel more premium and less stock-card-like.
- Tighten mobile spacing and button rhythm.
- Audit section rhythm down the homepage for visual consistency.
- Consider small details from Open Design generated prototypes, but only merge
  patterns that fit the Zodiacs.org `DESIGN.md` contract.

Out of scope:

- Backend, Supabase, auth, or sync changes.
- Rewriting content strategy.
- Replacing the approved video hero concept.
- Redesigning the Collect wing.
- Adding a new dependency-heavy animation or component system.
- Touching generated legacy output unless a generator source changed.

## Hard Boundaries

Read `CLAUDE.md` before editing.

The two wings are separate:

- New Astro site: `src/`, `src/styles/`, `src/pages/`, `src/islands/`.
- Legacy Collect wing: `public/registry/`, `public/thesis/`, `public/archive/`,
  `public/sdk/`, discovery pages.

Do not mix their design systems. No crypto, market, token, or registry language
on the new consumer astrology surfaces except the existing sanctioned Collect
links.

## Suggested Open Design Prompt

Use this as the prompt inside Open Design or Claude Code:

```text
You are polishing Zodiacs.org, a dark editorial astrology tool. Read CLAUDE.md
and DESIGN.md first. Preserve the approved homepage hero structure: rounded
video frame, overlaid uppercase headline, caption, and two buttons. Use the
existing `/assets/hero/zodiacs-hero.mp4` and poster. Do not redesign the site
from scratch.

Goal: produce a refined visual pass for the new Astro homepage that feels more
premium, more intentional, and more balanced across desktop and mobile. Keep
the Ploy-inspired hero rhythm, but make it zodiac-native and consistent with
Cosmic Void: cool near-black, restrained hairlines, the twelve pastel sign hues
as the only chroma, Instrument Sans + EB Garamond + JetBrains Mono.

Allowed edits: homepage markup/styles, shared CSS tokens only if clearly needed,
and small reusable visual refinements that improve the current design. Avoid new
third-party UI systems. Preserve accessibility, reduced motion, one H1, and the
existing CTA routes.

Before final handoff, run:
npm run check
npm run build
npm test
node scripts/check-dist.mjs
node scripts/report-bundles.mjs

Also provide desktop and mobile screenshots and note any residual concerns.
```

## Visual QA Checklist

- Desktop first viewport resembles the approved direction, not a split hero.
- Mobile headline does not clip or overflow.
- Buttons are reachable and readable.
- The ticker peeks below the hero on normal desktop and mobile heights.
- Reduced-motion users see the poster, not forced motion.
- Homepage bundle remains free of the ephemeris engine.
- No new one-note purple, beige, slate-blue, or gold theme.

## Owner Preference

The owner has approved the broad look. They likely want taste-level polish now:
spacing, crop, contrast, typography, and finish. Keep the changes visually
meaningful but technically conservative.
