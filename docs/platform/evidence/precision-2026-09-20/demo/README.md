# The isolated browser demonstration

A development tool. Not a product surface, not a migration, and not reachable
from the site: it lives here in the evidence tree rather than in `public/` or
`src/`, so the default production bundle is untouched and
`scripts/report-bundles.mjs` never sees it.

```sh
node docs/platform/evidence/precision-2026-09-20/demo/serve.mjs 8791
# then open http://127.0.0.1:8791/
node docs/platform/evidence/precision-2026-09-20/demo/drive.mjs http://127.0.0.1:8791/
```

To rebuild the worker after editing `worker.src.mjs`:

```sh
npx esbuild demo/worker.src.mjs --bundle --format=esm --platform=browser \
  --external:./precision-runtime.mjs --outfile=demo/worker.mjs
```

## What it does

- **Takes a pack from your disk.** A `<input type="file">`, read into an
  ArrayBuffer and handed to the worker. There is no URL anywhere in the
  worker and nothing is written to storage of any kind.
- **Runs both backends on the same instant** and shows the per-body
  difference in arcseconds, with the measured cost of each.
- **Shows what the run assumed** — the pack's coverage, conventions and
  identity — rather than leaving them implicit.
- **Refuses** rather than answering: no pack, an unparseable instant, an
  instant outside coverage, an instant inside coverage but inside the
  light-time margin, and any request it does not implement.
- **Stays responsive and cancels for real.** All calculation is in a module
  Worker; long runs check a generation counter between chunks and stop.

## What an actual browser run showed

Chromium **141.0.7390.37**, driven by `demo/drive.mjs`, output in
`../raw/demo-browser-run.txt`:

```
refusal cases:
  instant before coverage -> refused: no-pack
  instant after coverage -> refused: no-pack
  inside coverage but inside the light-time margin -> refused: no-pack
  malformed instant -> refused: no-pack
  unknown request -> refused: unknown-request

compare with no pack: refused: no-pack — Load a precision pack before asking for precision output.
mid-run cancel accepted in 39 ms -> cancelled: stopped after 200 of 400
off-origin network requests: none
page errors: none
failed requests: none
```

The cancel line is the one worth reading twice: the click was accepted 39 ms
into a 400-chart run and the run stopped at 200, which is what "cancellation
is real" has to mean to be worth claiming.

## What it does NOT yet show, stated plainly

**Four of the five refusal cases currently refuse for the wrong reason.**
With no pack loaded, `no-pack` short-circuits before the coverage and
instant-parsing checks are reached, so those paths are written but unproven.
They become meaningful only once a real pack is supplied, and the driver
should then assert the specific reason for each case rather than merely that
something was refused. Until then this section is an honest gap, not a pass.

**There is no precision backend in this build.** `demo/precision-runtime.mjs`
is a seam that throws. That is deliberate: a demonstration that quietly
answers from the lightweight backend while the label says precision would be
worse than one that refuses. The compiler track owns the real runtime and the
`ZODEPH01` container it reads; wiring it in is the next step for this page.

**One browser, one host.** Chromium 141 on this Linux host. Firefox is
installed under `/opt/pw-browsers/firefox-1532` and has not been driven yet.
Nothing here is a claim about Safari, about mobile, or about any other
machine.

## Privacy, by construction rather than by promise

No birth data of any kind is entered, accepted or displayed — the instant
field is a UTC timestamp and the comparison is of body longitudes. Nothing is
persisted: no `localStorage`, no `sessionStorage`, no IndexedDB, no cookies.
The driver asserts zero off-origin requests, and the worker bundle contains no
fetch path at all. If a user-approved pack download is ever added, what such a
request would reveal — the date range being asked for, to whoever serves it —
has to be spelled out on the page before it ships, which is gate 3 of
`../swiss-benchmark/NEXT.md`.
