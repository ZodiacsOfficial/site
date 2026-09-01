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
| `fomo-official.svg` | `fomo.family/favicon.svg` | 2026-08-25 | Fomo's full-colour app icon, used only as an `<img>`: inside the consumer handoff buttons (the Astrofolio vitrine and `/fomo/`) and in the `/fomo/` phone mock-up header, where it identifies the app being depicted. It is never used as a CSS mask or presented as an endorsement. |
| `coinbase.svg` | `static-assets.coinbase.com/ui-infra/illustration/v1/pictogram/svg/light/coinbaseLogoNavigation-4.svg` | 2026-08-05 | Coinbase's own navigation pictogram. Brand blue replaced with ink; viewBox tightened 40→34 units. |
| `moonpay.svg` | `www.moonpay.com/safari-pinned-tab.svg` | 2026-08-05 | MoonPay's Safari pinned-tab mask — already monochrome on transparency. Potrace preamble and metadata stripped; viewBox tightened. |
| `ramp.svg` | `cdn.prod.website-files.com/…/6a4bbd700ee30b63d3ba9652_Logo%20sign.svg` (linked from `rampnetwork.com`) | 2026-08-05 | Ramp Network's logo sign. Fill replaced with ink. Preferred over their 32px favicon PNG, which would soften at 2× density. |

## Store badges (`public/assets/badges/`)

Apple's and Google's own download badges, used unmodified as `<img>` links to
the Fomo listings on `/fomo/`. Each program publishes its badge for exactly
this use and forbids redrawing, recolouring, or cropping it. The Google PNG
keeps its built-in clear space and is scaled so its visible badge matches the
Apple badge's 48px height, which is above Apple's 40px minimum.

| File | Source | Retrieved | Notes |
| --- | --- | --- | --- |
| `app-store-en.svg` | `developer.apple.com/assets/elements/badges/download-on-the-app-store.svg` | 2026-09-01 | Black "Download on the App Store", en-US, 119.66×40 units, with its published light outline for dark backgrounds. |
| `google-play-en.png` | `play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png` | 2026-09-01 | "Get it on Google Play", English, 646×250 including clear space. |

## House glyphs (ours, not the vendor's)

These are drawn in the site's own hand because no maskable vendor asset exists.
They read as quiet ink icons rather than as a company's logo, which is the
honest presentation when we cannot use the real thing.

| File | Why |
| --- | --- |
| `fomo.svg` | Fomo's published favicon is a raster app icon embedded in an SVG wrapper, so it remains unsuitable for the monochrome payment-list mask. The separate `fomo-official.svg` file is used at full colour in the Fomo handoff CTA instead. |
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
