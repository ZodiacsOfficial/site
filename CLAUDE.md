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
`src/` AND the registry wing (`public/registry/`, `public/thesis/`,
`public/archive/`, `public/sdk/`, discovery pages) — wears the dark
"Cosmic Void" system: void surfaces, EB Garamond display, Instrument Sans
body (wing pages may use EB Garamond body — museum register), JetBrains
Mono data, self-hosted fonts only (no Google Fonts anywhere), the 12
pastel sign hues as the only chroma. Warm Gilt is retired; do not
reintroduce gold accents anywhere.

The CONTENT boundary survives the visual merge:

1. **New surfaces** (`src/`): consumer astrology. **No token/market/crypto
   language or links.** The sanctioned cross-links into the wing are the
   CollectBand on sign guides (EN + ES), the records line on the birth-chart
   result (`ChartCalculator`, full mode), and the contextual saved-chart link
   to Registry Collection when `PUBLIC_REGISTRY_COLLECTION_ENABLED=1` — all in the records
   register, never market language. Two carve-outs: `src/pages/registry/collection/`
   is itself a Registry surface (records register, protective negations only,
   no acquisition links), and the legal pages (Privacy, Terms, Disclosure, all
   locales) carry the wallet/provider/market-risk disclosures that the Registry
   features legally require — disclosure language there is compliance text,
   not a boundary breach. The wing's nav/footer label is "Registry" (ES
   "Registro"); the URL path is `/registry/` (permanently 301-redirected
   from the old `/collect/` in `vercel.json`).
2. **Wing** (`public/…` above): the registry catalogue keeps its museum
   voice, token content, and acquisition links — that register stays in
   the wing. Wing pages style themselves (inline blocks or
   `public/assets/discovery.css`); they still never link the hashed Astro
   bundle of `src/styles/tokens.css` (public HTML can't reference hashed
   assets) — they inline the same token VALUES instead. Don't link
   `discovery.css` into `src/` pages.

## Generated vs source (do not hand-edit generated output)

`public/sdk/index.html` is hand-authored source. Edit it directly; no generator
owns that page.

- `public/registry/{sign}/index.html` ← `node scripts/build-sign-pages.mjs`
  (data: `scripts/sign-data.mjs` + `public/registry/zodiacs.registry.json`)
- `public/archive/` (+ feeds) ← `node scripts/build-archive.mjs`
- `public/registry/gallery/index.html` + `public/assets/gallery.js` ←
  `node scripts/build-shelf.mjs` (page + esbuild-bundled Three.js scene;
  source `src/shelf/`, data from `sign-data.mjs` + the registry JSON —
  addresses are fetched live by the page, never baked in)
- `src/shelf/figures.geometry.json` + `public/assets/sculptures/{512,1024}/`
  ← `node scripts/build-figure-assets.mjs` (silhouettes traced from
  `public/assets/nuggets/` and extruded by the gallery; the nuggets
  themselves are never touched). Deliberately NOT in the drift job: the
  traced geometry re-derives identically anywhere and is re-checked by
  `scripts/shelf-figures.test.mjs`, but the webp encodes are libvips output
  and are not byte-stable across platforms — same rule as the cabinet
  materials.
- `public/assets/app.js` ← `node scripts/build-app.mjs` (source `src/app.jsx`)
- `public/registry/index.html` Aura marker region (meta flag + no-JS entry
  between the `registry-aura-entry` comments) ← stamped by
  `scripts/configure-registry-aura.mjs` (predev/prebuild) and
  `scripts/build-app.mjs` from `PUBLIC_REGISTRY_COLLECTION_ENABLED` in the SHELL
  env (plain-node generators don't read `.env` files — set the flag in the
  shell or the Astro/site halves will skew, which `check-dist` fails on).
  The committed state is always flag-OFF (`content="0"`, no entry): the CI
  drift gate regenerates with the flag unset. Never commit flag-on output.
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
- `api/_assistant/context.ts` ← `vite-node --script
  scripts/build-assistant-context.mjs` (committed assistant site guide)
- `api/_assistant/persona.ts` is Fable-authored source; edit it only via Fable.
- `public/assets/og/v2/` ← `node --experimental-strip-types
  scripts/build-og-void.mjs` (ALL share cards sitewide since Part Q — wing
  pages reference `v2/sign/{slug}.png` + `v2/share.png`; the 13 legacy gilt
  cards at `public/assets/og/*.png` are frozen and unreferenced — leave
  the files alone, don't regenerate or re-reference them)
- `public/assets/pulse.json` / `distribution.json` ← weekly cron workflows

`public/sw.js` is a PWA worker — the owner approved superseding the old
push-only rule (2026-07-15, WS4 merge decision). Strict invariants: HTML
navigations and wing pages are network-first (a live deploy always wins;
cache is only the offline fallback); `/registry/**.json` identity data is
NEVER served from cache — offline is an honest network failure, not an old
identity verdict; only hashed/immutable assets (`/_astro/`, fonts, icons)
and `/data/` shards are cache-first; caches are versioned per build
(`scripts/build-service-worker.mjs` stamps `CACHE_VERSION` between the
`@build` markers; activate deletes old caches); push stays behind the
build-time flag. Never make any HTML or registry-authority route
cache-first — a caching worker can serve stale static deploys.

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
houses/aspects). `engine/full.ts` is the only BROWSER module allowed to
import `astronomy-engine` (bundle isolation — the homepage must never load
it). One server-only exception since the #108 hotfix:
`src/lib/engine/server-ephemeris.ts` (the calendar function's Node adapter,
CJS interop via createRequire). `scripts/report-bundles.mjs` enforces both
sides — the exact import allowlist AND a marker check that no browser
chunk ever carries astronomy-engine/createRequire; a CI parity test pins
server and browser ephemeris to 1e-12 agreement.
Accuracy is gated by `vitest` test vectors; run `npm test` after any engine
change. Timezone conversion (`src/lib/time/localToUtc.ts`) resolves historical
offsets via `Intl` — never hand-roll offsets.

## Checks

```bash
npm run build && npm run check && npm test
node scripts/check-dist.mjs   # link/artifact integrity over dist/
```
