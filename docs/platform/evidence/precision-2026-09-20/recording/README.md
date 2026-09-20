# Recording of the developer preview

Recorded 2026-09-20 by `scripts/record-precision-preview.mjs`
against the built `dist/`, in Chromium. Nothing is staged or re-shot: the
script drives the page and the browser renders what it renders.

- `session.webm` — the whole session, unedited.
- `01-nothing-loaded.png` — Nothing loaded. Every calculation below will be refused until there is.
- `02-synthetic-fixture.png` — synthetic fixture ready
- `03-synthetic-places.png` — synthetic fixture ready
- `04-pack-verified.png` — pack loaded and verified
- `05-apparent-places.png` — pack loaded and verified
- `06-empirical-conditional.png` — pack loaded and verified
- `07-geometric-proven.png` — pack loaded and verified
- `08-disposed.png` — disposed. Nothing is loaded, and every calculation will be refused.
- `09-phone.png` — phone width, full page

A real pack was loaded from disk in this run; it is not committed here and is not distributable.
