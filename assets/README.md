# Zodiacs Asset Handoff

This folder contains the public PNG assets used by the Zodiacs.org landing page.
The set is organized for handoff to another developer without requiring them to
reverse-engineer filenames from `index.html`.

## Structure

- `icons/<sign>.png` - archived compact sign glyph/mark assets used by selectors and labels.
- `sdk/zodiac-icons/circle/<sign>.png` - SDK brand kit circle icons.
- `nuggets/<sign>.png` - primary sculptural sign figures.
- `nuggets/thumb/<sign>.png` - smaller figure thumbnails for grid and mobile UI.
- `og/share.png` - 1200 x 630 social sharing image.
- `manifest.json` - machine-readable inventory of every PNG, including dimensions and byte sizes.

## Naming Standard

Sign assets use lowercase zodiac slugs:

```txt
aries
taurus
gemini
cancer
leo
virgo
libra
scorpio
sagittarius
capricorn
aquarius
pisces
```

Do not rename these files without updating:

- `assets/manifest.json`
- `index.html`
- any deployment cache or CDN references

## Current Image Families

| Family | Count | Format | Notes |
| --- | ---: | --- | --- |
| `icons` | 12 | PNG | Archived transparent compact marks, max dimension around 256 px |
| `sdk/zodiac-icons/circle` | 12 | PNG | SDK brand kit circle icons, 1024 x 1024 |
| `nuggets` | 12 | PNG | Primary figure artwork, original display assets |
| `nuggets/thumb` | 12 | PNG | Thumbnail variants, max dimension around 320 px |
| `og` | 1 | PNG | Social preview image, 1200 x 630 |

## Validation

Run this from the repo root:

```bash
node scripts/validate-assets.mjs
```

The validator checks that every manifest entry exists, is a PNG, and matches the
recorded width, height, and byte size.

## Handoff Notes

- Keep the canonical sign order in `manifest.json`.
- Treat `manifest.json` as the asset inventory for downstream developers.
- The assets are presentation files, not wallet, trading, or transaction logic.
- If optimized derivatives are created later, place them in a new folder and keep
  these current paths stable for the landing page.
