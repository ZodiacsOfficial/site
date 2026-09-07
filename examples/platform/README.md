# Zodiacs platform starter

Three runnable plain-JavaScript examples: a browser-local natal chart, a
personalized transit snapshot, and a publisher sky iframe. No framework,
account, API key, private environment variable, wallet, telemetry, or database
is needed. The two calculators import only the public `@zodiacs/engine` root.

This is a **private example-project archive**, version `0.1.0-rc.2`. Its bundled
engine is the **unpublished npm release candidate `0.1.1-rc.1`**. Downloading or
running this project does not publish either package or close the engine's
numerical review and operator publication gates. This is not evidence of
external developer adoption.

## Run from the downloadable archive

Use Node.js **22** and npm (tested with Node 22.23.2). In an empty directory:

```sh
tar -xzf /path/to/zodiacs-platform-starter-0.1.0-rc.2.tgz
cd package
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm start
```

Open **http://127.0.0.1:4178/**. Use that printed address rather than `localhost`;
the example server deliberately accepts only its exact loopback Host header.
Stop it with Ctrl+C. If the port is occupied, choose another with
`node scripts/server.mjs 4179` and use its printed URL. The server exposes only the listed built assets, accepts only
GET/HEAD, performs no request logging, and never receives calculation inputs.
It is a local demonstration server, not a production hosting system.

The archive includes the verified candidate tarball. `npm-shrinkwrap.json`
pins its dependencies and esbuild **0.28.1**, including artifact integrity.
Installation downloads public npm dependencies; calculation does not.
Install scripts are unnecessary for this example: esbuild uses its installed
platform binary. The build preserves dependency notices and MIT license text.

If starting from source with no `vendor/` directory, first run
`node scripts/fetch-engine.mjs`. It downloads only the exact candidate URL,
rejects redirects, limits response size and duration, and verifies SHA-256
before writing the archive. Then follow `npm ci` onward above. An existing
file with the wrong hash is rejected, not overwritten.

## 1. Browser-local natal chart

After the setup above, open **http://127.0.0.1:4178/natal.html** and select
**Calculate locally**. The visible inputs are synthetic: December 21, 2001 at
09:00 UTC, latitude 78.2232°, longitude 15.6267°, requested Placidus houses.

Expected result: 12 bodies; ASC approximately **23.871984°** (Aries);
`requestedHouseSystem: "placidus"`, `actualHouseSystem: "whole"`, and
`flags: ["polar-fallback"]`. The engine falls back above 66° absolute latitude.
Changing to Whole sign shows the requested and actual whole-sign system.

Expected failure: set the instant to `2001-02-29T09:00:00Z` and calculate.
The impossible date produces an error and clears the previous result; it does
not silently become March 1. Empty coordinates, `NaN`, `Infinity`, invalid
options, out-of-range coordinates, and exact geographic poles are rejected.

For **Unknown — noon UTC approximation**, enter a date as `YYYY-MM-DD`.
The instant becomes 12:00 UTC on that date; the result carries `no-time`, and
angles/houses are absent. Planetary positions, especially the Moon, are
approximate without the actual birth time. This convention does not infer
the birthplace's local noon.

Privacy check: load the page fully, inspect the browser Network panel, disable
network access, change an input, and calculate again. The computation still
works in the loaded tab. Inputs stay in memory: no fetch, storage, form
submission, URL parameter, analytics, or account is used. The application writes
no persistent storage; native browser form/history restoration, extensions, and
developer tools remain outside its control. Navigation and refresh need the local
server; this is not an installed offline application.

Next step: adapt `src/calculate.mjs` and the text-only rendering in
`src/app.mjs` to your own UI. Resolve real local birth times, daylight-saving
gaps/folds, and historical timezone rules before passing an instant. The
example deliberately does not load the optional `/geo` entry or a place index.

## 2. Personalized transit snapshot

After the same setup, open **http://127.0.0.1:4178/transits.html**. Select
**Calculate locally** for the visible synthetic birth and fixed
`2026-09-07T12:00:00Z` transit instant. This is a dated snapshot, not today's
live sky and not a future timing search.

Expected result: 12 moving positions and major aspects from moving bodies
(`a`) to natal bodies (`b`), sorted by orb. This public API does not include
natal ASC/MC contacts. Provenance gives both resolved UTC instants, the
original entered offsets, engine/candidate identity, source and artifact
commits, SHA-256, conventions, requested/actual natal houses, and flags.
Changing the transit date changes the positions.

Expected failure: a transit value such as `2026-09-07T12:00:00` has no offset
and is rejected. Use `Z` or `+HH:mm`/`-HH:mm`. Calendar rollovers, invalid
offsets, and empty values fail before a result is displayed. For example,
`2001-12-21T14:30:00+05:30` and `2001-12-21T09:00:00Z` are the same instant;
the example preserves the submitted string separately from normalized UTC.

Privacy and offline check: load this page, disconnect network access, change
the transit instant, and calculate again. All personalized processing remains
in the loaded browser tab; the publisher iframe is not present on this page.
`npm test` also recalculates with fetch and persistent storage unavailable.

Next step: consume `positions` and `aspects` from `calculate(input, 'transits')`.
Keep the snapshot instant visible, preserve unknown-time qualification, and
do not describe snapshot aspects as exact-pass times. Complete, durable
calculation receipts remain future work; these fields are example metadata.

## 3. Publisher sky iframe

After the same setup, open **http://127.0.0.1:4178/widget.html**. Choose Dark or
Light, enter a six-digit opaque accent such as `#7B6DA8`, and select
**Load widget**. No request to Zodiacs.org occurs until that button is selected.

Expected result: the hosted sky card at `https://zodiacs.org/embed/sky/`,
including its visible data date and required **Powered by Zodiacs.org** link.
The iframe uses width 100% up to 480 px and a 300 px height, with its normal
scrolling available. The hosted document may adjust the accent for contrast.
Check narrow-screen rendering and ensure attribution remains visible or
reachable. Never hide, crop, proxy, relabel, or remove that attribution.

Expected failure: an accent such as `red` or `#fff` fails validation. If the
external frame is blocked, unavailable, offline, or stale, the always-visible
**Open the sky on Zodiacs.org** link remains available. A frame load event is
not proof of a working or current publication; inspect its displayed date.
The hosted widget has its own deployment and is independent of the local
candidate artifact. This example makes no cache or daily-publication guarantee.

Privacy: the hosted request reveals an IP address and referring origin to
the embed service, not birth inputs. The parent adds no telemetry, storage,
wallet integration, or `postMessage` exchange. The fixed cross-origin iframe
uses the official sandbox contract:

```text
allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox
```

`strict-origin-when-cross-origin` omits the host page's path and query from
the cross-origin referrer. Do not treat scripts plus same-origin permission
as isolation for arbitrary untrusted content hosted on your own origin.

Next step: copy the constrained URL and iframe settings in `src/widget.mjs`
and `src/widget-contract.mjs` into a publisher page, retaining attribution,
title, responsive sizing, sandbox, referrer policy, and a usable fallback link.

## Candidate identity and limits

The exact public artifact is
[the candidate tarball at site commit 40d3f964](https://raw.githubusercontent.com/ZodiacsOfficial/site/40d3f9647a31afc20db007b7cd5269eb4ef73b6a/vendor/zodiacs-engine-0.1.1-rc.1.tgz).
Its SHA-256 is:

```text
f95c887deedb55f64b185ed4dd406b580b6d3287656ab5ec0557215fc02e5d17
```

`candidate.json` distinguishes the site artifact-host commit from engine SDK
source commit `03bf77990f3014b9125eed4976d7a41200aac80d`. Builds verify the
tarball hash and calculations check the installed engine version. Retain the
lockfile and vendor artifact; a matching version string alone cannot prove
that locally modified dependencies still match the reviewed bytes.

Conventions: proleptic Gregorian dates, tropical ecliptic of date, apparent
geocentric positions, true lunar nodes, longitude degrees in `[0, 360)`.
There is no topocentric parallax. A resolved offset is not evidence that the
correct historical birthplace timezone was selected. Date-syntax support is
not a claim of numerical accuracy across that range. Exact poles and
ecliptic/horizon degeneracies are outside verified angle scope; near tangencies
the selected axis may change abruptly. Read the retained engine licensing and
numerical limitations in `/THIRD_PARTY_NOTICES.txt` and the candidate README
inside the vendor archive before extending the examples.

## Checks and packaging

`npm test` builds this example and runs real-candidate calculation/error tests,
network/storage-unavailable recalculation, widget contract checks, and a
loopback server test for allowed assets, traversal/query rejection, method
restrictions, Host checks, CSP, and HEAD behavior. Browser privacy, visual,
offline-after-load, and first-run onboarding checks are separate integrator
checks; automated Node tests do not establish external adoption.

To prepare a private downloadable archive, use `npm pack --ignore-scripts`.
The explicit `files` list includes sources, scripts, tests, this README,
candidate identity, the engine artifact, and `npm-shrinkwrap.json`; it excludes
`node_modules` and build output. Packing creates a local file, not an npm
registry release. Do not use `npm publish` for this private example project.
