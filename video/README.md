# zodiacs.org — 15s looping video for the X timeline

Remotion source for the free-tools showcase. Square (1080×1080, 30fps,
450 frames) is the deliverable; wide (1920×1080) and vertical (1080×1920)
render from the same scene components via the `format` prop.

## What's real

- **The chart is real.** June 16, 1993 · 12:30 PM EDT · New York, NY,
  computed by the site's own engine (`@zodiacs/engine` 0.1.0) via
  `tools/find-birth-data.ts` → `data/natal-chart.json`. Gemini Sun 25°31′,
  Taurus Moon 14°56′, Virgo Rising 20°50′, Placidus houses, the true 1993
  Uranus–Neptune conjunction, four genuine retrogrades.
- **The wheel is the site's wheel.** `src/components/Wheel.tsx` is a port
  of `src/lib/wheel/Wheel.tsx` (same geometry, radii, colors, stroke
  weights, collision layout, conventions — South Node hidden, aspects
  drawn under 6° orb, dashed when separating), fed by that chart.
- **The screenshots are the running site.** `public/shots/*` captured with
  Playwright from `astro dev` (`tools/capture*.mjs`), cropped to the tools
  themselves — no nav, footer, or registry chrome in any frame.
- **The sky scene is the real sky** for the render date
  (`tools/today-sky.ts` → `data/sky-now.json`), cross-checked against the
  site's `/moon-phase/`, `/transits/`, `/retrogrades/` pages captured the
  same day.
- Glyph audit: `GLYPHS.md`.

## Design tokens

Colors, type, and motion curves come verbatim from the site
(`src/styles/tokens.css` → `src/theme.ts`; fonts are the same self-hosted
woff2 files, copied to `public/fonts/`).

## Storyboard (frames @30fps)

- 0–40 hero: real natal chart, "Your whole chart. Free." (frame 0 is the
  thumbnail — fully composed, no fade from black)
- 40–140 natal: wheel match-moves left, aspect web redraws chord by chord
  (tightest orb first), Big Three surface as real placements + the
  engine receipt line
- 140–230 horoscopes: two real sign cards side by side; the second slot
  cycles Leo → Pisces (three genuinely different readings on screen)
- 230–320 synastry: the tool's bi-wheel + Person A/B chips + real counts
  (36 cross-chart aspects · 18 easeful · 18 charged) and three real
  cross-aspects
- 320–405 sky: live ephemeris readout (UTC stamp, Moon, phase,
  retrogrades, next eclipse) + real moon-phase and transit-ring UI
- 405–450 end: "Free. No signup." then resolve to the exact frame-0
  composition

The backdrop dial turns exactly one revolution across the 450 frames, so
frame 449 → frame 0 wraps seamlessly (`tools/verify-loop.mjs` pixel-checks
the pair; the only difference is the dial's 0.8°/frame).

## Commands

```bash
npm install
npm run render:square     # out/zodiacs-x-square.mp4  (the deliverable)
npm run render:wide       # out/zodiacs-x-wide.mp4
npm run render:vertical   # out/zodiacs-x-vertical.mp4
npm run still:first       # out/loop-frame-000.png
npm run still:last        # out/loop-frame-449.png
npm run verify:loop       # pixel-compares the two stills
npm run verify:legibility # 350px-wide stills for every text moment
```

`remotion.config.ts` points the renderer at the environment's Chromium
(`/opt/pw-browsers/chromium`, chrome-for-testing mode). H.264, CRF 16.

## Regenerating the data

```bash
# from the repo root (uses the site's engine + tz resolver)
npx vite-node --script video/tools/find-birth-data.ts
npx vite-node --script video/tools/today-sky.ts
# screenshots need `npx astro dev --port 4321` running
node video/tools/capture.mjs && node video/tools/capture2.mjs \
  && node video/tools/capture3.mjs && node video/tools/capture4.mjs
node video/tools/gen-icon-data.cjs
```

## Content constraints honored

No token/registry/wallet/price language or UI anywhere; screenshots crop
tight to the tools; copy stays in the site's plain register (placements,
Big Three, synastry, lunation vocabulary; no marketing verbs; ≤4 words per
display line; "free" and "no signup" each said twice).
