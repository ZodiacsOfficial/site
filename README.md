# zodiacs.org

Official website repository for Zodiacs.org.

Live site:

- https://zodiacs.org
- https://zodiacs.org/sdk/

Production deploys from the `main` branch through Vercel.

## Designer handoff

The full polish handoff is in [`DESIGNER_HANDOFF.md`](DESIGNER_HANDOFF.md).

Use that document for:

- brand tone
- current page structure
- visual system notes
- interaction requirements
- asset locations
- registry and verifier constraints
- polish opportunities
- QA checklist

The current site should be refined, not redesigned from scratch.

## Repository structure

- `index.html` - main Zodiacs.org landing page (loads the precompiled app)
- `src/app.jsx` - source for the main page's React app (edit this, not the bundle)
- `assets/app.js` - precompiled app bundle served by `index.html` (generated)
- `sdk/index.html` - dedicated SDK page
- `registry/zodiacs.registry.json` - public registry artifact
- `assets/` - Zodiac artwork, icons, venue marks, and social preview assets
- `scripts/validate-assets.mjs` - asset validation script
- `scripts/build-app.mjs` - compiles `src/app.jsx` to `assets/app.js`

## Building the main page

The page's interactivity lives in `src/app.jsx`. It is compiled ahead of time to
`assets/app.js` (using Babel's React preset) so visitors never download or run a
compiler in the browser. After editing `src/app.jsx`, regenerate the bundle and
commit both files:

```bash
node scripts/build-app.mjs
```

The site stays a static deploy: `index.html` loads the committed `assets/app.js`
directly, so no build runs on Vercel.

## Asset handoff

PNG artwork is organized and documented in [`assets/README.md`](assets/README.md).
The machine-readable inventory is [`assets/manifest.json`](assets/manifest.json).

Validate the full PNG set from the repo root:

```bash
node scripts/validate-assets.mjs
```

## Safety posture

The site should keep the SDK and registry positioned as read-only infrastructure. Avoid copy or UI that implies custody, signing, transaction submission, swaps, market calls to action, or financial promises.

## Claude plugin

The frontend design plugin config is stored in `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "frontend-design@anthropics": true
  }
}
```
