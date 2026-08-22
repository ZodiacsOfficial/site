# T-17 — Positions-only chart sharing

Acceptance evidence for `docs/MASTER-PLAN.md` §19 T-17 and Packet D of
`GROWTH-2026-08-19-full-marketing-audit`.

## Delivered

- The strict v2 `#p=` codec carries twelve tropical longitudes in a fixed
  body order, optional ASC/MC, the configured house-system code, and engine
  version. It has no field for a name, birth date, time, timezone, place,
  coordinates, flags, speed, or retrograde state.
- The share dialog leads with a positions-only fragment link. The legacy v1
  `#c=` link is secondary and explicitly labelled as including birth details.
  The v1 codec remains byte-compatible.
- `Copy link with preview` is a separate opt-in. It sends only the v2
  positions payload to `/api/og/chart?p=`; the default fragment does not send
  that payload to the server. The endpoint stores nothing, rejects unbounded
  query shapes, returns no-store/noindex responses, and renders without
  external assets.
- The primary full-chart image is an 1800×2400 chart sheet: wheel, every
  encoded body plus ASC/MC, sign and rounded degree-minute position, house
  when available, the ten-body major-aspect grid, configured settings, and
  one small `zodiacs.org` corner wordmark. It has no QR code, CTA, chart URL,
  or Registry link.
- `Hide birth details` defaults on. It leaves positions, houses, degrees, and
  aspects intact while replacing the date/time/place receipt with calculation
  settings. The privacy note does not call the positions payload anonymous.
- The chart sheet is prepared after computation behind a dynamic import. A
  supported mobile browser can reach native file sharing from the prepared
  result in one tap; other browsers download the same generic filename.
- English full charts also offer the existing authored signature composition.
  Moon-sign and rising-sign results offer a dedicated single-placement card
  plus the positions-only link. Unknown-time Moon cards carry the 12:00
  reference and the same sign-boundary warning as the result.
- The v2 receiver rebuilds major aspects from shared longitudes and derives
  whole-sign cusps from the shared Ascendant. It never invents motion,
  applying/separating state, or original Placidus cusps, and it labels the
  whole-sign reconstruction.
- Successful `#p=` and `#c=` receivers consume and strip their fragments. The
  shared receiver chrome and post-chart result contain no links into the
  separate records wing; an ordinary fresh calculator visit keeps the
  sanctioned links.
- Share analytics accept fixed variants only. Positions and preview links use
  `positions_link`; the labelled legacy link uses `details_link`; image
  choices use their bounded card variants. Cancelled native shares emit no
  success event.
- Link sharing remains available if image preparation fails. Result and tour
  share actions stay disabled while the primary image is still preparing; if
  preparation fails, they open the surviving link options, while image-specific
  actions remain disabled instead of becoming clickable no-ops.

## Verification — 2026-08-20

- Local production build: 4,178 pages.
- Astro check: 0 errors, 0 warnings, and 9 informational hints.
- Full Vitest suite: 2,784 tests passed, including the two focused Tour-card
  assertions; the focused share/runtime suite passes 87 tests across 9 files.
- Distribution integrity: 4,281 HTML files, 1,507 search documents, and 9
  feed items.
- Bundle gates: `/` 32.2/42 KB gz; `/birth-chart/` 67.1/69 KB gz; engine
  chunk 21.1/25 KB gz; largest chunk 50.1/60 KB gz. Share-card rendering
  remains outside the initial route closure.
- The built-browser T-17 flow passes: primary and preview links, labelled v1
  fallback, bounded analytics, privacy-toggle races, image-failure link
  fallback from the Tour and disabled image actions, 14-row receiver,
  reconstructed houses and aspects, fragment stripping, receiver boundary,
  Moon/rising cards, and one-tap mocked native file sharing.
- The generated chart sheet is 1800×2400. Its durable 33% review artifact is
  [`phase4-sharing/chart-sheet-33-percent.png`](./phase4-sharing/chart-sheet-33-percent.png);
  the full positions table and aspect key remain legible at that size.
- A direct, unmocked Satori/Resvg handler smoke returned the expected HTML
  wrapper and a valid 40,740-byte PNG. API unit tests cover no-store/noindex
  headers, strict query validation, the angle-free 12:00 reference, the
  fragment receiver URL, initialization retry, and render failure before a
  success response is committed. Vercel's Edge builder traced the self-contained
  renderer at 829,768 summed gzip bytes, below the 1 MiB limit.
- Runtime-graph tests pass, and no new direct `astronomy-engine` import was
  added outside the established engine boundaries.

## Deferred deployment evidence

Astro's local static preview does not route Vercel Functions. A Vercel preview
deployment still needs human review of the live `/api/og/chart` HTML and image
responses plus one real social-crawler unfurl. This record does not claim that
external routing or unfurl verification is complete.
