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

---

## 2026-09-20: wired to the real runtime

`precision-runtime.mjs` was a seam that threw. It is now a bundle of the
actual runtime in `examples/precision-alpha`, built by `build.mjs` from
`precision-runtime.src.mjs`. The build fails if a `node:` import, a
`require`, a `Buffer` or a `process.` reference survives into the output, so
what the page runs is the same environment-neutral core the Node tests run.

```sh
node docs/platform/evidence/precision-2026-09-20/demo/build.mjs
node docs/platform/evidence/precision-2026-09-20/demo/serve.mjs 8791 &
node docs/platform/evidence/precision-2026-09-20/demo/drive-alpha.mjs --pack /path/to/pack.zeph
```

`--pack` is required. The driver derives its broken fixtures from that pack
into a temporary directory and deletes them afterwards; no pack and nothing
derived from a kernel is written into the repository.

### What the run showed — `../raw/demo-alpha-run.json`

| | Chromium 141.0.7390.37 | Firefox 151.0 | WebKit |
| --- | --- | --- | --- |
| verdict | **pass** | **pass** | not run |
| longitude/latitude/distance identical to the Node run | 70/70 | 70/70 | — |
| search verdict matches Node | True | True | — |
| click accepted mid-run | 37 ms | 66 ms | — |
| off-origin requests | 0 | 0 | — |
| anything persisted | no | no | — |

WebKit: attempted and **not run**. `playwright-core` is installed here but no
WebKit build is: `no webkit build is installed in this environment`. That is recorded rather than quietly dropped,
and it is the one part of E4 this environment cannot decide.

The ten bodies compared in the page are the ten in the contract, and the six
system barycentres are labelled as such in the pack info panel.

### Failures, each for its own reason, with a working pack loaded first

The order is the point. A refusal from a page that has no pack says nothing
about whether date and coverage validation work, so a valid pack is loaded
and shown to produce a real answer before any of these are tried:

| case | outcome |
| --- | --- |
| malformed instant | `bad-instant` |
| before coverage | `out-of-coverage` |
| after coverage | `out-of-coverage` |
| inside coverage, inside the light-time margin | `out-of-coverage` |
| unknown request | `unknown-request` |
| unknown body | `unknown-body` |
| search with no declared allowance | `unsupported-option` |

And, replacing a pack that was working, each broken artifact for its own reason:

| pack | refused with | left the old pack answering? |
| --- | --- | --- |
| payload bit flipped | bad-pack — the pack does not match the digest it carries | no |
| header number edited | bad-pack — the pack does not match the digest it carries | no |
| v1 container | bad-pack — this is a ZODEPH01 pack: its digest covers only the payload, so its header is unprotected. Re-seal it with tools/seal.mjs | no |
| truncated | bad-pack — header declares 1737168 bytes of pack; only 1042288 precede the digest trailer | no |
| not a pack at all | bad-pack — not a zodiacs ephemeris pack | no |

A good pack loaded after a bad one works again, and so does one loaded after
a page reload. After `dispose` the runtime refuses with `no-pack`
rather than reading released state.

### One thing the browsers disagreed about, and what it was

The first Firefox run failed: **27 of 70** rows differed from the Node run.
Longitude and distance matched bit for bit; only apparent LATITUDE differed,
by up to three ulps.

The cause was `Math.hypot`. IEEE-754 requires `sqrt` to be correctly rounded
and ECMAScript inherits that, but neither requires anything of `hypot`, and
V8 and SpiderMonkey really do differ in the last bits. The core now computes
`sqrt(x*x + y*y)` instead — safe here because components are kilometres, so
the squares are about 1e20 against a double's 1.8e308 — and a test asserts
that `Math.hypot` stays out of the core. After that change both engines
agree with Node on all 70 rows,
exactly.

`atan2`, `sin` and `cos` are still implementation-defined in ECMAScript.
They agreed bit for bit between these two engines on everything measured,
which is an observation about these engines and these inputs, not a
guarantee, and nothing here claims otherwise.
