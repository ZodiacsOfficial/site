# The Shelf — `/registry/shelf/` (implementation handoff)

Planning session: Fable, 2026-07-28, with owner decisions confirmed in-session.
Implementer: Opus 5. Branch: `claude/scrolling-zodiacs-registry-7juf11`.

## 1. What this is

The owner wants a Stripe-Press-style scrolling shelf for the Twelve, referenced
via <https://x.com/carrabre/status/2081963872890822790>, which points at
<https://github.com/mintdotgg/bookshelf> — an open-source Three.js "editorial
bookshelf": a full-viewport 3D shelf you browse by drag / scroll / arrow keys /
tick rail, where clicking a volume pulls it forward for orbit-and-zoom
inspection; covers are procedurally generated from catalog metadata; it
respects reduced-motion preferences and supports keyboard navigation.

**License gate (read first).** As of 2026-07-28 the reference repo shows **no
license** (no LICENSE file on `main` or `master`; none surfaced on the repo
page). No license ⇒ all rights reserved ⇒ **clean-room only**: use the repo
strictly as a behavioral reference. Do not copy its code, shaders, assets,
copy, or file structure. Re-verify the license at implementation time; only a
verified permissive license changes this. `three` itself is MIT and fine to
depend on.

## 2. Locked decisions (owner, 2026-07-28)

1. **Placement** — standalone wing page at `/registry/shelf/`. The registry
   landing and its React hero are untouched apart from one link (see §4).
2. **Contents** — twelve hardbound volumes, one per sign, in zodiac order
   (Aries № 1 … Pisces № 12). Spines in the sign's pastel hue with glyph,
   name, and №; covers procedurally composed from registry metadata.
3. **Rendering** — Three.js, bundled self-contained into a committed
   `public/assets/shelf.js`, with a full static no-JS fallback in the HTML.
4. **Inspection** — pulling a volume opens it face-on beside a records card:
   №, element · modality · ruling planet, date range, Solana + Base
   addresses, and "Open catalogue entry →" to `/registry/{sign}/`.
   **No acquisition links on the card** — acquisition stays on sign pages.

## 3. Experience spec

- **Entry.** The page paints immediately as static content (list + poster
  treatment); the scene fades in when ready. Full-viewport stage below the
  wing nav.
- **Shelf.** Twelve volumes spine-out. Spine: flat pastel sign hue against
  void, EB Garamond title, sign glyph, № in JetBrains Mono. Cover: a museum
  plate composed from the disc art (`/assets/zodiac-icons/400/{sign}.png`),
  archetype line, and date range.
- **Browse.** Wheel/trackpad, pointer drag with inertia, ←/→ keys, and a
  12-tick rail (real DOM buttons, one per sign) for direct jumps. Hover/focus
  eases neighboring spines apart slightly.
- **Inspect.** Click/Enter pulls the volume to center, face-on; damped orbit +
  zoom (drag / pinch); Esc, a close control, or clicking the void reshelves
  it. The records card is a **DOM overlay** (never text rendered into the
  canvas), so it stays selectable, accessible, and crisp.
- **Records card.** Dry catalogue register, e.g.:
  - `№ 5 — Leo` (serif display)
  - `Fixed fire · ruled by the Sun · Jul 23 – Aug 22`
  - archetype line from registry metadata
  - addresses in mono with copy affordances: Solana (native SPL) and Base
    (bridged ERC-20, chainId 8453) — **fetched live** from
    `/registry/zodiacs.registry.json` at inspect time (see §5). On network
    failure: "Records unavailable offline." — never a stale address.
  - `Open catalogue entry →` → `/registry/{sign}/`
- **Reduced motion.** Under `prefers-reduced-motion`: no idle sway, no
  inertia, crossfades instead of travel — or serve the static presentation
  outright. Implementer's judgment on which, but motion must be effectively
  eliminated; the reference's own reduced-motion behavior is the bar.
- **No-JS / SEO.** The HTML contains the full Twelve as a styled list (name,
  №, archetype, dates, link to catalogue entry) — this is both the fallback
  and the crawlable content. JSON-LD `BreadcrumbList` + `ItemList` (12
  positions) following `public/registry/index.html` conventions. The canvas
  container is `aria-hidden`; all controls that matter exist in the DOM.
- **Keyboard / a11y.** Tab reaches the tick rail; arrows move selection;
  Enter inspects; Esc closes; focus moves into the card while open and is
  restored on close; a polite `aria-live` region announces the pulled volume
  ("№ 5 — Leo, pulled forward").

## 4. Architecture

**New files**

- `public/registry/shelf/index.html` — hand-authored wing page (source of
  truth, not generated). Copy head conventions from
  `public/registry/index.html`: self-hosted `@font-face` blocks, canonical
  `https://zodiacs.org/registry/shelf/`, the Plausible canonical-payload
  snippet, `theme-color #060709`, OG tags (reuse
  `/assets/og/v2/share.png` initially). Wing nav + footer: reuse the wnav
  markup pattern — `scripts/wing-nav.mjs` is the canonical source; use its
  renderer at authoring time if that's clean, else mirror the static markup
  exactly.
- `src/shelf/` — plain JS/TS modules, no React: scene setup, spine/cover
  procedural texture painter, input handling, card wiring. Keep pure math
  (shelf layout positions, snap points, easing, camera keyframes) in
  dependency-free modules so they unit-test under vitest.
- `scripts/build-shelf.mjs` — esbuild (already a devDependency) bundle:
  ESM → minified IIFE, target ES2020, tree-shaken `three`, banner
  `/* Generated from src/shelf/ by scripts/build-shelf.mjs — do not edit. */`.
  Output must be deterministic (no timestamps/randomness) — the drift gate
  depends on it.
- `public/assets/shelf.js` — the committed generated bundle (house pattern,
  same as `public/assets/app.js`).

**Wiring**

- `package.json`: add `"legacy:shelf": "node scripts/build-shelf.mjs"` and a
  pinned `three` devDependency (bundled at generator time; nothing ships from
  node_modules at runtime).
- `.github/workflows/site-check.yml`, `legacy-drift` job: add
  `node scripts/build-shelf.mjs` beside `build-app.mjs` /
  `build-sign-pages.mjs` so CI fails on drift.
- `vercel.json`: add a header for `/assets/shelf.js` →
  `public, max-age=0, must-revalidate` (same as `app.js`).
- `CLAUDE.md`: add the generated-file line under "Generated vs source".
- **Landing link**: one quiet records-register line in the `#catalogue`
  section of `public/registry/index.html` (hand-edit; stay clear of the
  `registry-aura-entry` marker region), e.g. "The Twelve, spine out —
  browse the shelf." → `/registry/shelf/`. Optional stretch: a wnav Registry
  menu item — that touches `scripts/wing-nav.mjs` and regenerates every sign
  page; do it only if the diff stays clean, and commit regenerated pages
  together with it.
- **Sitemap**: check `src/pages/sitemap.xml.ts` — if wing URLs
  (`/registry/`, `/registry/{sign}/`) are listed, add `/registry/shelf/`.
- **Service worker**: expect **no change**. HTML navigations stay
  network-first; `shelf.js` must NOT be added to any cache-first/precache
  list; `/registry/**.json` stays never-cached (the live-address rule in §5
  depends on this). Verify against `scripts/build-service-worker.mjs`.
- **`scripts/report-bundles.mjs`**: `shelf.js` carries no
  astronomy-engine/createRequire (nothing to trip), but confirm the script's
  scope over public assets and register the new file properly if it does size
  accounting — never bypass the check.

## 5. Data contract

- **Inlined in the page** (needed before any network, and doubling as the
  no-JS list): sign order/№, displayName, glyph, hue, archetype, element,
  modality, rulingPlanet, dateRange. Values must match
  `public/registry/zodiacs.registry.json` and the wing's existing per-sign
  data (`scripts/sign-data.mjs`).
- **Fetched live at inspect time**: `/registry/zodiacs.registry.json` →
  `assets[].native.address`, `assets[].representations[].address`. Identity
  data is never served stale: no SW cache (already guaranteed), no
  long-lived in-page cache beyond the visit, honest failure copy offline.
- **Hues**: wing pages inline hue VALUES — public HTML can't reference the
  hashed `src/styles/tokens.css`. Copy the exact values already used by wing
  sources (`src/lib/signs.ts` / `src/styles/tokens.css` are the source of
  truth; `scripts/wing-nav.mjs` and `scripts/build-sign-pages.mjs` already
  duplicate them — stay byte-identical with those).
- **Textures**: cover plates from `/assets/zodiac-icons/400/{sign}.png`
  (immutable-cached). Spine/cover text painted onto 2D canvas textures using
  the self-hosted fonts — load EB Garamond via the FontFace API from
  `/fonts/*.woff2` before painting; JetBrains Mono for № and data lines. No
  Google Fonts, no CDN anything.

## 6. Design-system constraints (Cosmic Void, wing register)

- Void surfaces (`#060709` family); the twelve pastel hues are the ONLY
  chroma. No gold (Warm Gilt is retired), no gradient/aurora backgrounds, no
  decorative status dots.
- Museum register: EB Garamond display and body are both allowed on wing
  pages; kickers are sentence-case serif-italic; no mono-caps eyebrows.
- Voice: dry catalogue lines; state computed facts with values; the banned
  smug tells in CLAUDE.md apply. No market/price language anywhere on this
  page.
- Scene craft: near-monochrome environment — hue lives in the volumes, the
  room stays void. Soft archive lighting, matte materials; avoid the glossy
  PBR-showroom look.

## 7. Performance & runtime rules

- Budget: `shelf.js` ≤ ~180 KB gzip. Measure OrbitControls vs a hand-rolled
  damped orbit (the interaction needs orbit + zoom + reset only) and take the
  smaller if quality holds.
- Renderer: devicePixelRatio capped at 2; render-on-demand (idle scene stops
  drawing after input settles), RAF paused when the tab is hidden; dispose
  geometry/materials/textures and release the context on `pagehide`.
- Init: `defer` the script; static content is the LCP; the scene mounts only
  after fonts + first texture batch are ready. If WebGL is unavailable or
  init fails, the static page IS the page — no error states above the fold.
- Mobile: horizontal drag with inertia for the shelf; pinch-zoom only inside
  inspect; never hijack vertical page scroll.

## 8. Acceptance checklist

- [ ] `npm run build && npm run check && npm test` green
- [ ] `node scripts/check-dist.mjs` green (all new internal links resolve)
- [ ] `node scripts/build-shelf.mjs` run twice → byte-identical output
- [ ] Generated output committed together with source (`shelf.js`; sign pages
      only if the wnav stretch happens)
- [ ] Registry-aura marker region untouched; committed state stays flag-off
      (`content="0"`, no entry)
- [ ] Keyboard-only walkthrough: browse → inspect → copy address → close
- [ ] `prefers-reduced-motion` walkthrough
- [ ] JS disabled: page reads as a complete catalogue list
- [ ] Lighthouse sanity on `/registry/shelf/` (`tests/visual/lighthouse.mjs`
      exists): CLS ≈ 0, LCP from static content
- [ ] No console errors; WebGL context loss handled (restore or fall back)
- [ ] vitest unit coverage for the layout math (positions for 12 volumes,
      clamping, snap points)
- [ ] Visual regression suite (`tests/visual/visual-regression.mjs`): add a
      baseline for the new page or confirm it isn't swept accidentally

## 9. Non-goals

- No changes to the landing hero / `src/app.jsx` (the `#catalogue` link edit
  in the landing HTML is the only landing change).
- No sign-page content changes (unless the wnav stretch is taken).
- No acquisition links on the shelf or card; no ES locale for this page.
- No new fonts, no CDN scripts, no external requests beyond same-origin.
- Frozen legacy OG cards (`public/assets/og/*.png`) stay untouched.

## 10. As built (2026-07-28)

Shipped as planned except where noted:

- **The page is generated, not hand-authored.** `scripts/build-shelf.mjs`
  emits BOTH `public/registry/shelf/index.html` and `public/assets/shelf.js`.
  Twelve volumes meant twelve repeated blocks of catalogue data in the
  register, the JSON-LD `ItemList`, and the scene's data island; generating
  them keeps one source (`sign-data.mjs` + the registry JSON) and puts the
  page under the same CI drift gate as the rest of the wing.
- **Inspection turns the volume, not the camera.** The records card is a
  fixed DOM overlay, so orbiting the camera would swing the card's subject
  out from under it. Drag applies damped yaw/pitch to the volume itself
  (clamped ±35°/±25°), wheel and pinch zoom it. No OrbitControls — the
  hand-rolled version is a few lines and keeps the bundle down.
- **Bundle**: 128 KB gzip (budget was 180). `three` is a devDependency,
  bundled at generator time; nothing resolves it at runtime.
- **Reference licence**: re-checked at implementation time — still no LICENSE
  on `mintdotgg/bookshelf`. Built clean-room from the behaviour description
  in §1; no code, assets, or copy taken.
- **Glyphs keep U+FE0E.** Stripping the text-presentation selector makes
  browsers resolve ♈ to the colour emoji font — in the page AND in the canvas
  the spines are painted with. `scripts/shelf-layout.test.mjs` pins it.
- **Knock-on regenerations.** Adding a dependency changes `package.json` and
  `package-lock.json`, which are hashed into the daily publication's
  `generatorSha256` and the Phase 1 pixel-evidence receipt. Both were
  regenerated (`npm run editorial:daily:build`, `npm run
  test:phase1:acceptance`); expect the same on any future dependency change.
- **OG card**: uses the existing `/assets/og/v2/registry.png`; no new card.

## 11. Open items for the implementer

- Re-check the reference repo's license before borrowing anything; absent a
  verified permissive license, the clean-room rule in §1 stands.
- OrbitControls vs hand-rolled orbit — decide after measuring the bundle.
- Dedicated OG card via `scripts/build-og-void.mjs` (`data:og`) is a
  nice-to-have; until then the page uses `/assets/og/v2/share.png`.
- Confirm how `src/pages/sitemap.xml.ts` treats wing URLs and follow suit.

---

## §12 — Reworked as the Gallery: gold sculptures, 2026-07-28

Owner direction after seeing the shelf: the books were the reference's
metaphor, not the registry's. The Twelve are already objects — the **Gold
Sculptures** (the Cabinet's edition tier IV) — so the row now holds those.
Interaction model unchanged; only what the objects ARE changed.

**Owner decisions.** (1) Full 360° rotation with a **hallmarked reverse** — a
designed engraved back, not a mirrored front. (2) Renamed to
`/registry/gallery/`, "The Gallery", with a courtesy 301 from
`/registry/shelf/`; the source folder and `scripts/build-shelf.mjs` keep their
names. (3) The landing hero's "Browse the Twelve" stays pointed at the featured
sign — that behaviour is pinned by `tests/registry-selector-drive.mjs` and
`scripts/registry-pastel-polish.test.mjs`.

**The constraint that shaped everything.** There is no 3D geometry anywhere in
the repo and never was. The sculptures are twelve 2D renders under
`public/assets/nuggets/` — palette PNGs, quantised alpha, non-uniform aspect,
1024px at most. So the objects are built honestly from what exists: trace the
alpha silhouette, extrude it into a shallow cast, put the photograph on the
face and the registry's hallmark on the back.

**The pipeline** (`scripts/build-figure-assets.mjs`, `npm run data:figure-assets`):

- `src/shelf/contour.mjs` — marching squares with linear interpolation on the
  alpha field (so a quantised edge still traces smoothly), even/odd ring
  classification into outlines and holes, Ramer–Douglas–Peucker, then
  normalisation to scene units (height 1, feet on 0, centred) quantised onto a
  4096 grid. Pure arithmetic: no sharp, no Three, no DOM.
- Emits committed `src/shelf/figures.geometry.json` (47 KB, 4,738 points across
  the twelve) and `public/assets/sculptures/{512,1024}/`.
- Per-sign threshold overrides: Libra traces at alpha ≥ 40 because its chains
  are a few pixels wide and sever at the default 128. It keeps 22 holes — one
  per chain link. Pisces resolves into 7 pieces (its loose beads); Gemini keeps
  11 (the gap between the twins, the lyre's strings).

**Two determinism rules, deliberately different** — this is why the builder is
NOT in the `legacy-drift` job:

- The **geometry** is traced from an unresized raw decode using only IEEE
  arithmetic, so it re-derives identically anywhere.
  `scripts/shelf-figures.test.mjs` regenerates it from the art and compares
  against the committed file: stale geometry fails CI.
- The **webp encodes** are libvips output and are not byte-stable across
  platforms. Committed, guarded by invariants, never by bytes — the same rule
  `scripts/build-cabinet-materials.mjs` already lives under.

Nothing in the geometry path may resize. Resampling is where platforms
disagree.

**Things learned the hard way.**

- `Math.round()` yields `-0` for small negatives; JSON writes it as `0`. Left
  alone, a fresh trace and the committed file compare unequal while serialising
  identically. `quantiseRing` settles it.
- Colours multiply in **linear** space. Darkening the cut edge to a third of
  the cast colour still rendered well over half once written back out; the
  scalar that actually reads as a shadowed edge is ~0.045.
- A figure drawn out is also **turned to face the viewer**
  (`stagePose().faceYaw`). Standing it off to one side without that turn shows
  the cut edge of every contour down its length, and a shallow cast seen at an
  angle reads as a flight of steps.
- `maxWidth` must clear the *narrowest* gap the arc produces. The row
  compresses in x toward its ends (spacing × cos of the end angle ≈ 1.607 at
  the current constants), so 1.5 is the honest ceiling — the collision test
  catches this.
- The reverse is painted **pre-mirrored**: the extrusion gives both faces the
  same texture coordinates, so the back is read from behind.

**As measured.** Bundle 163 KB gzip (cap 180). Row tier 609 KB across the
twelve, hero tier 2.27 MB loaded one sign at a time on view. Geometry 47 KB
raw. No dependency changes, so no lockfile movement and no daily-publication or
Phase-1 receipt knock-ons.

---

## §13 — Round two: the shop window, the turntable, deep links (2026-07-28)

Owner direction after using the Gallery, superseding §2.4 and §10's
"no acquisition on the card":

- **The card is now a shop window.** Under the epithet: price (large) with the
  24h change chip, then "Open Jupiter route" / "View market data", then
  Liquidity · Market cap, then the risk paragraph — all above the facts and
  addresses. Market data is the sign pages' own plumbing (Dex Screener pair
  fetch, `MARKET_PAIRS` baked per figure; cancer and sagittarius show the
  quiet unavailable state). The buy route is built at runtime from the live
  registry answer — `jup.ag/swap/WSOL-{mint}` appears only after the mint
  resolves, and never exists in the committed page. All acquisition copy is
  verbatim reuse of approved sentences; `scripts/registry-risk.test.mjs` now
  covers the gallery too (CTA labels pinned, "Acquire via Jupiter" banned,
  no `jup.ag/swap/` in the static HTML).
- **Header overlap fixed.** `GALLERY.height` 1.85 → 1.6, camera aim raised to
  y 0.42, and a top scrim band (`.stage__scrim-top`) dims anything passing
  behind the title. Stage poses re-anchored (wide y −0.58; narrow y 0.34 so
  the figure stands clear of the card sheet on phones).
- **Turntable.** A drawn-forward figure rotates at 0.22 rad/s until the
  reader drags it (`handTurned`), under `prefers-reduced-motion: no-preference`
  only. The RAF runs only while a piece is on display; the row at rest still
  renders nothing.
- **Deep links.** `/registry/gallery/#leo` arrives standing in front of Leo
  (`signFromHash` in layout.mjs, unit-tested); browsing mirrors the current
  slug into the hash via `replaceState` (seeded so a plain visit keeps its
  clean URL until the reader moves). Every sign page now carries
  "View in the gallery →" under its figure card.

Declined this round: floor reflections, nameplate, texture crossfades,
prev/next on the card, analytics events, dedicated OG card.

Bundle after round two: ~161 KB gzip (cap 180). No dependency changes, so no
lockfile movement and no Phase-1/daily-publication knock-ons.

## §14 — Round three: the camera is framed to measured room (2026-07-28)

Owner report after round two: *"some of the sculptures are tall so they
overlap with the text on top — that's still an issue on mobile. On desktop it
seems like there is a lot of empty space. Fix/audit all the frontend issues
and make this page as if it was made by a world class designer for luxury
goods."*

An eight-viewport Playwright audit (360×640 → 1920×1080, row and open states)
found the round-two constants were the wrong instrument, not the wrong values:

- the free band between header and controls ran from **139 px** (360×640) to
  **574 px** (1920×1080), and one pair of camera constants cannot serve both;
- with a card open, the sculpture was **cropped at the waist** on phones and
  **cut off at the feet** on desktop, with the rail crossing its ankles;
- the desktop title block reserved ~300 px of full-width vertical for a
  520-px-wide masthead — the reported "empty space".

### The change

**The camera is fitted to a rectangle the page measures, not to constants.**
`vitrineFrame()` in `layout.mjs` takes the canvas size, a band in CSS pixels,
and the world box to show, and returns the distance to stand back plus a pan —
a translation across the view axis, which shifts the image without distorting
it. `main.mjs` measures two bands (`bandRects()`, using `offsetTop`/`offsetLeft`
so the card's entrance transform and the page scroll are both irrelevant):

- **row** — header bottom → controls top, full width;
- **stage** — nav bottom → controls top, stopping at the card's left edge on
  wide viewports; nav bottom → sheet top on narrow ones.

`scene.mjs` lerps between the two by `state.open` and places the rig, whose
only fixed properties are a 34° lens and a 6° downward tilt. Consequences:

- Nothing can pass behind the title: the row's band starts below it. The top
  scrim survives only as insurance for the open transition.
- Nothing is cropped: the fit takes whichever axis binds first, and a cast is
  a flat plate, so the square-on pose is its largest silhouette — margin is
  air, not headroom (hence `stageMargin` 1.2).
- `fov` no longer switches on aspect, and `stagePose` no longer needs its
  `faceYaw` correction: a piece on display stands on the camera's own axis,
  so it is square by construction.
- Bounds (`minWorldHeight` 3, `maxWorldHeight` 7.2) stop a pathological band
  from putting a figure in your face or reducing the row to specks.

### The design pass around it

- Masthead, not hero: title `clamp(32px, 4.6vw, 50px)`, lede dropped under
  760 px of height, kicker under 620 px. The lede no longer repeats the
  kicker's sentence.
- The title leaves entirely when a piece is drawn out (was 0.12 opacity), and
  the room dims further behind it (0.12 → 0.06).
- Controls step out of the card's column on wide viewports (`--card-w`, shared
  by the card and the chrome's padding) and fade out entirely on narrow ones,
  where the sheet owns the lower screen. Delayed `visibility` takes them out
  of the tab order once faded.
- The card: sticky close button (it used to scroll away), a bottom dissolve
  that says the record continues — the addresses are below the fold on every
  viewport — and tightened section rhythm.
- The rail now **compares** rather than closes: walking it with a piece on
  display swaps the piece, keyboard included, without stealing focus.
- The hint follows the state (browsing the row vs turning a piece).
- Both fetches got deadlines (registry 12 s, market 8 s). A hung request used
  to leave "Loading market context." on screen indefinitely.

### Verified

`scripts/shelf-layout.test.mjs` gained a framing block (fills its band, centres
in the band rather than the canvas, keeps the widest cast inside the band at
six viewports, respects the world-height bounds, survives an unmeasured band).
A ten-check Playwright walkthrough covers deep links, rail-swaps-while-open,
arrow keys, Escape, the live-mint route, the turntable, reduced motion holding
still, and the register standing without scripting. Bundle 165 KB gzip
(cap 180). Generators re-run byte-identical; no dependency changes.
