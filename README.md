# zodiacs.org

Official website repository for Zodiacs.org — a free astrology platform
(Learn / Tools / Collect) with the original token registry preserved as the
site's collector's wing.

Live site: https://zodiacs.org · Strategy: [`docs/STRATEGY.md`](docs/STRATEGY.md)

Production deploys from the `main` branch through Vercel (Astro static build).

## The two wings

- **New site (Astro)** — everything in `src/`: homepage, 12 sign guides at
  `/{sign}/`, calculators (`/birth-chart/`, `/moon-sign/`, `/rising-sign/`),
  learn pages, and the local-first cosmic profile. Dark "Cosmic Void" design
  system, Instrument Sans + JetBrains Mono, the pastel SDK sign icons as the
  core visual language. No token/market language on these surfaces.
- **Legacy wing (`public/`)** — the registry experience, served verbatim at
  its historical URLs: `/registry/` (the original registry landing),
  `/registry/{sign}/` (catalogue pages), `/thesis/`, `/archive/`, `/sdk/`, and
  the discovery ring. Warm Gilt museum aesthetic, unchanged.

## Repository structure

- `src/pages/` — Astro routes (homepage, guides, calculators, profile, sitemap)
- `src/lib/engine/` — client-side chart engine (astronomy-engine + in-house
  houses/aspects; `engine/full.ts` is the only module importing the ephemeris)
- `src/content/guides/` — the 12 sign guides (MDX, zod-validated)
- `src/styles/tokens.css` — the Cosmic Void design tokens
- `src/app.jsx` — source for the legacy registry SPA served at `/registry/`
- `public/` — the legacy wing + root artifacts, shipped byte-verbatim
- `scripts/` — wing generators + data pipelines (see below)
- `docs/STRATEGY.md` — product/UX/SEO/technical strategy

## Generated output (edit sources, then regenerate and commit both)

| Output | Generator | Source |
| --- | --- | --- |
| `public/registry/{sign}/index.html` | `npm run legacy:signs` | `scripts/sign-data.mjs` + registry JSON |
| `public/archive/` + feeds | `npm run legacy:archive` | `scripts/archive-data.mjs` |
| `public/assets/app.js` | `npm run legacy:app` | `src/app.jsx` |
| `public/assets/og/*.png` | `npm run legacy:og` | registry + artwork (Playwright) |
| `public/assets/zodiac-icons/{48,128,400}/` | `npm run data:icons` | `public/assets/sdk/zodiac-icons/circle/` |
| `public/data/cities/` | `npm run data:cities` | GeoNames (CC-BY 4.0) |
| `src/data/sky.json` | `npm run data:sky` | astronomy-engine |
| `public/assets/pulse.json`, `distribution.json` | weekly cron workflows | Wikimedia / Solana RPC |

CI (`site-check`) builds the Astro site, runs the engine accuracy vectors,
checks every link in `dist/`, and re-runs the wing generators failing on any
drift — commit regenerated output together with the source edit.

## Development

```bash
npm install
npm run dev        # Astro dev server
npm run build      # static build to dist/
npm run check      # astro check (types)
npm test           # engine accuracy vectors (vitest)
node scripts/check-dist.mjs   # link/artifact integrity over dist/
```

## Safety posture

The registry wing stays read-only infrastructure: no custody, signing, or
transaction submission happens on Zodiacs.org. Acquisition links on catalogue
pages route to third-party venues and are framed as access, never as
recommendations. Crypto/market language never appears outside the wing —
CI enforces this.

Birth data entered into the calculators is computed entirely client-side and
never leaves the visitor's device; saved charts live in the browser's local
storage. Place search data: GeoNames.org (CC BY 4.0).
