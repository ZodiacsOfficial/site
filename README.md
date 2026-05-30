# zodiacs.org

Landing page repository for zodiacs.org.

## Design handoff

Claude should own the visual design and frontend implementation. This repo starts intentionally minimal so the landing page can be designed from scratch.

## Asset handoff

PNG artwork is organized and documented in [`assets/README.md`](assets/README.md).
The machine-readable inventory is [`assets/manifest.json`](assets/manifest.json).

Validate the full PNG set from the repo root:

```bash
node scripts/validate-assets.mjs
```

## Requested Claude plugin

The requested frontend design plugin config is stored in `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "frontend-design@anthropics": true
  }
}
```
