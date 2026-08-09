# Venue and payment marks — provenance

`public/assets/venues/*.svg` are rendered as CSS masks (`mask-image` + an ink
background), never as coloured logos: `currentColor` does not reach an SVG
loaded through `<img>`, and the site has no gold. Only a mark's alpha matters,
so every file here is a single-colour glyph on transparency, recoloured to the
ink ramp (`#C6CCDA`) and with its `viewBox` tightened to the artwork — an
oversized viewBox renders the mark tiny under `mask-size: contain`, and a
full-bleed opaque backdrop (the usual shape of an app icon or
`apple-touch-icon`) masks to a solid block.

Marks are used to identify a company the visitor is being sent to. They are not
endorsements, and no vendor here has any relationship with zodiacs.org: no
referral account, no platform fee, no compensation — see
`docs/REGISTRY-TRADE-OWNER-RISK-DECISION.md`. The payment list that shows them
is ordered alphabetically and never ranked.

## Sourced from the vendor's own site

| File | Source | Retrieved | Notes |
| --- | --- | --- | --- |
| `coinbase.svg` | `static-assets.coinbase.com/ui-infra/illustration/v1/pictogram/svg/light/coinbaseLogoNavigation-4.svg` | 2026-08-05 | Coinbase's own navigation pictogram. Brand blue replaced with ink; viewBox tightened 40→34 units. |
| `moonpay.svg` | `www.moonpay.com/safari-pinned-tab.svg` | 2026-08-05 | MoonPay's Safari pinned-tab mask — already monochrome on transparency. Potrace preamble and metadata stripped; viewBox tightened. |
| `ramp.svg` | `cdn.prod.website-files.com/…/6a4bbd700ee30b63d3ba9652_Logo%20sign.svg` (linked from `rampnetwork.com`) | 2026-08-05 | Ramp Network's logo sign. Fill replaced with ink. Preferred over their 32px favicon PNG, which would soften at 2× density. |

## House glyphs (ours, not the vendor's)

These are drawn in the site's own hand because no maskable vendor asset exists.
They read as quiet ink icons rather than as a company's logo, which is the
honest presentation when we cannot use the real thing.

| File | Why |
| --- | --- |
| `fomo.svg` | fomo's published favicon (`fomo.family/favicon.svg`) is a raster app icon embedded in an SVG wrapper, with an opaque backdrop — unusable as a mask and not a vector mark. A brand-kit request would be needed for the real one. |
| `binance-wallet.svg`, `bybit-web3.svg`, `jupiter.svg`, `okx-wallet.svg`, `orca.svg`, `phantom.svg`, `raydium.svg`, `solflare.svg` | Sourced during the venue-list pass; those domains published nothing maskable. |

## Reproduction

| File | Basis |
| --- | --- |
| `applepay.svg` | An in-house reproduction of the Apple Pay lockup ( + "Pay"). Apple's official mark is distributed through their marketing portal under the Apple Pay Identity Guidelines and is not fetchable; the owner accepted a reproduction on 2026-08-02 rather than ship the words "Apple Pay" as plain text. It appears only beside a payment provider that actually offers Apple Pay, never as a claim that zodiacs.org accepts it. Replace this file if the official asset is ever obtained. |

## Adding a mark

1. Take the vendor's own file. Prefer a pinned-tab/mask SVG, then a vector logo, then a transparent PNG. Never trace or redraw a logo.
2. Strip any full-bleed backdrop rect; confirm the alpha traces the glyph.
3. Recolour fills to `#C6CCDA`; tighten the `viewBox` to the ink (measure it, don't eyeball).
4. Render it as a mask at its shipping size before committing.
5. Add a row above with the exact URL and the date.
