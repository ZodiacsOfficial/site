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

## The two wings — hard boundaries

1. **New site** (Astro): everything in `src/` renders the consumer astrology
   experience — homepage, sign guides, calculators, learn pages, profile.
   Dark "Cosmic Void" design system (`src/styles/tokens.css`), Instrument Sans
   + JetBrains Mono, the 12 pastel sign icons as the core visual language.
   **No token/market/crypto language or links on these surfaces** — the only
   sanctioned cross-link is the CollectBand component on sign guides.
2. **Legacy wing** (`public/collect/`, `public/thesis/`, `public/archive/`,
   `public/sdk/`, discovery pages): the registry experience, served verbatim.
   Keeps its own Warm Gilt inline styles and museum voice. Never link
   `src/styles/tokens.css` into it; never link `discovery.css` into new pages.

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
- `public/assets/pulse.json` / `distribution.json` ← weekly cron workflows

CI re-runs the wing generators and fails on drift — always commit regenerated
output together with the source edit.

## Voice rules (new surfaces)

Plain language first, jargon translated inline. Confident and warm; never
woo-woo, never salesy, no financial language anywhere outside the wing.
Computed facts stated with degrees and timestamps — the site shows its work.
Canonical labels live in `docs/STRATEGY.md` §4.

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
