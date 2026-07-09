# zodiacs.org

Free astrology platform (Learn / Tools / Collect) built with Astro, with the
original token registry preserved as the "Collect" wing. Strategy:
`docs/STRATEGY.md`. Frontend design plugin stays enabled:

```json
{
  "enabledPlugins": {
    "frontend-design@anthropics": true
  }
}
```

## One design system, two content registers

Since the Part-Q retheme (owner-directed), the WHOLE site — Astro pages in
`src/` AND the registry wing (`public/collect/`, `public/thesis/`,
`public/archive/`, `public/sdk/`, discovery pages) — wears the dark
"Cosmic Void" system: void surfaces, EB Garamond display, Instrument Sans
body (wing pages may use EB Garamond body — museum register), JetBrains
Mono data, self-hosted fonts only (no Google Fonts anywhere), the 12
pastel sign hues as the only chroma. Warm Gilt is retired; do not
reintroduce gold accents anywhere.

The CONTENT boundary survives the visual merge:

1. **New surfaces** (`src/`): consumer astrology. **No token/market/crypto
   language or links.** The sanctioned cross-links into the wing are the
   CollectBand on sign guides (EN + ES) and the records line on the
   birth-chart result (`ChartCalculator`, full mode) — both in the records
   register ("a canonical record in the registry → View the record"), never
   market language. The wing's nav/footer label is "Registry" (ES
   "Registro"); the URL path stays `/collect/`.
2. **Wing** (`public/…` above): the registry catalogue keeps its museum
   voice, token content, and acquisition links — that register stays in
   the wing. Wing pages style themselves (inline blocks or
   `public/assets/discovery.css`); they still never link the hashed Astro
   bundle of `src/styles/tokens.css` (public HTML can't reference hashed
   assets) — they inline the same token VALUES instead. Don't link
   `discovery.css` into `src/` pages.

## Generated vs source (do not hand-edit generated output)

- `public/collect/{sign}/index.html` ← `node scripts/build-sign-pages.mjs`
  (data: `scripts/sign-data.mjs` + `public/registry/zodiacs.registry.json`)
- `public/archive/` (+ feeds) ← `node scripts/build-archive.mjs`
- `public/assets/app.js` ← `node scripts/build-app.mjs` (source `src/app.jsx`)
- `public/assets/og/*.png` ← `node scripts/build-og-cards.mjs` (Playwright)
- `public/assets/zodiac-icons/{48,128,400}/` ← `node scripts/build-icons.mjs`
  (sources in `public/assets/sdk/zodiac-icons/circle/` are SDK-public —
  keep byte-identical)
- `public/data/cities/` ← `node scripts/build-cities.mjs` (GeoNames, CC-BY)
- `src/data/sky.json` ← `node scripts/build-sky.mjs`
- `src/data/ingresses.json` ← `node scripts/build-ingresses.mjs` (refresh
  yearly with sky.json)
- `src/data/eclipses.json` ← `node scripts/build-eclipses.mjs` (refresh
  yearly with sky.json)
- `src/data/birthdays.json` ← `node scripts/build-birthdays.mjs` (the
  `now` receipt year — refresh yearly with sky.json)
- `src/data/transits-YYYY-MM.json` ← `node scripts/build-transits.mjs`
  (monthly cron: transits-monthly.yml)
- `public/assets/og/v2/` ← `node --experimental-strip-types
  scripts/build-og-void.mjs` (ALL share cards sitewide since Part Q — wing
  pages reference `v2/sign/{slug}.png` + `v2/share.png`; the 13 legacy gilt
  cards at `public/assets/og/*.png` are frozen and unreferenced — leave
  the files alone, don't regenerate or re-reference them)
- `public/assets/pulse.json` / `distribution.json` ← weekly cron workflows

CI re-runs the wing generators and fails on drift — always commit regenerated
output together with the source edit.

## Voice rules (new surfaces)

Plain, confident, warm, unadorned — how a literate person actually talks.
Never woo-woo, never salesy, no financial language outside the wing. Say what
the site does, not that it does it "properly"; state computed facts with
degrees and timestamps rather than boasting about them. Banned as smug tells:
"done/computed properly", "shows its work", "like a human", "no mush", "not
vibes", clever sentence-fragment headlines, and mono-caps eyebrow tags on
every section. Chrome should sound like `src/lib/interpretations.ts` — dry,
specific, calm. Canonical labels live in `docs/STRATEGY.md` §4.

## Design system (new surfaces)

"Cosmic Void": near-monochrome cool void + the twelve pastel disc hues as the
ONLY chroma. Display headlines are EB Garamond (`--font-serif`, the `.display`
utility / `.section-head h2`); body/UI is Instrument Sans; data is JetBrains
Mono. No decorative status dots, no gradient/aurora backgrounds, no gold
anywhere (Warm Gilt is retired sitewide). Reserve `.shell`/`.core` bezels
for elevated moments; grids of equal items use the light `.tile`. Kickers are
sentence-case serif-italic (`.kicker`), not mono-caps eyebrows.

## Engine

`src/lib/engine/` computes charts client-side (astronomy-engine + in-house
houses/aspects). `engine/full.ts` is the only module allowed to import
`astronomy-engine` (bundle isolation — the homepage must never load it).
Accuracy is gated by `vitest` test vectors; run `npm test` after any engine
change. Timezone conversion (`src/lib/time/localToUtc.ts`) resolves historical
offsets via `Intl` — never hand-roll offsets.

## Checks

```bash
npm run build && npm run check && npm test
node scripts/check-dist.mjs   # link/artifact integrity over dist/
```
