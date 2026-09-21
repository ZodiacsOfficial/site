# #549: merged, deployed, and what was checked on the deployment

`fdc5d7b1`, squash-merged 2026-09-21 from `claude/eager-ramanujan-razak3`
at head `75064edb`. Site Check run `35636765573` finished **success** on
that head — 53 steps, `Precision alpha tier A` 273/273 among them.

No review was required by the repository's protections and none was
fabricated. `mergeable_state` read `clean` before the merge and the merge
went through the ordinary API path with `expectedHeadSha` pinned to
`75064edb`.

## The PR's own description was corrected before merging

It said "43 files, all under `examples/precision-alpha/` and
`docs/platform/evidence/precision-aberration/`". At the merged head it was
**45 files**, and three of them were outside those trees — including one
**public** file. The description now names all three. The old wording was
written before the direction fix forced the preview bundle to be
regenerated, and leaving it would have made the release record say no
public file changed when one did.

## The served worker carries the reviewed correction

Checked against the bytes the site serves, not against the repository's
intent. **At the merged head `fdc5d7b1`**, which is the state this section
is about:

```
$ curl -s https://zodiacs.org/precision-preview/worker.mjs | sha256sum
0a7f23b08166fa2e8f15b687655f565dbb51563ba45e8218473c79ad515a8a1e
$ git show fdc5d7b1:public/precision-preview/worker.mjs | sha256sum
0a7f23b08166fa2e8f15b687655f565dbb51563ba45e8218473c79ad515a8a1e
```

Byte-identical, 129 464 bytes, and the correction is in it:

```js
roots.push({ lo: a2, hi: b2, kind: "transversal", longitudeRising: fhi - flo < 0 });
...
direction: r.longitudeRising === void 0 ? null : r.longitudeRising ? "increasing" : "decreasing",
```

## The direction labels, against an independently established longitude

`direction-on-deployed.mjs`, recorded in `direction-on-deployed.json`.
Chromium 141, against `https://zodiacs.org`, speaking the deployed
worker's own protocol so the bytes under test are the served ones.

The label comes from the search. The truth comes from the worker's
`places` request, which runs the apparent reducer at an instant — a
different code path, a different quantity, and one that never sees `f`.

**40 labels checked, 40 agree**, and both directions occur:

| | |
| --- | --- |
| increasing crossings | 22, reference deltas +0.011 to +22.8 deg over the step |
| decreasing crossings | 18, reference deltas −10.6 to −16.6 deg |
| labels disagreeing with the reference | **0** |
| off-origin requests | none |
| page errors | none |

The two public modes use different words for the same claim — the
validated mode says `increasing`/`decreasing`, the empirical one says
`rising`/`falling`. Both are claims about the longitude, so the harness
normalises them and keeps the raw label beside it. An unrecognised word
stays unrecognised and fails.

### The decreasing half needed a fixture the preview does not ship

**The deployed preview's own synthetic fixture has no retrograde
geometry.** Every body in it orbits the observer directly, so over the
whole usable window all four are strictly prograde: the smallest step in
ecliptic longitude is +0.228 deg per quarter-day for the Sun and positive
at every one of 241 samples for all of them. No change of period would fix
that; it is the layout.

So a decreasing crossing cannot be established on it at all — and an
inverted label on a prograde-only fixture is wrong in one direction and
looks right in the other, which is exactly the half a one-sided check
would miss.

`retrograde-fixture.mjs` supplies one, through the preview's **own
`load-pack` path** — the public capability a person loading their own pack
uses. It is the package's fixture (an Earth-like observer and a slower
outer body sharing a heliocentric longitude at t = 0, which is what makes
the loop) with one change: the Moon, which the package leaves at a zero
vector, is given a real path, because a Moon on the observer has no
direction and the preview refuses the whole places table when one body is
degenerate. Synthetic throughout; nothing is redistributed. Its bytes are
digested in Node and **re-digested inside the page**, and the run records
that the two match.

Loaded that way, the fixture's Venus shows 129 backward steps and its Mars
272, against 0 for every body of the preview's own.

The preview correctly reports the supplied pack as **not** its own
synthetic fixture, and the harness fails if it ever claims otherwise.

## The two public modes keep the quantities they declared

| mode | support | exact total | assumptions |
| --- | --- | --- | --- |
| `validated-geometric` | `proven` | yes | none |
| `empirical-apparent` | `conditional` | no | `sampled-derivative-bounds`, `branch-assignment-from-samples`, `declared-rate-ceiling` |

**No new mode is exposed.** The of-date mode's source merged with the
package; the preview offers the same two modes it offered before.

One mode declined rather than answering, and that is recorded rather than
counted against it: `empirical-apparent` on the fast companion — 24 degrees
of longitude per quarter-day, past what a sampled rate bound can honestly
carry — returned `support: none` and no events. Declining is the right
answer there, and a pass rule that called it a failure would push toward a
mode that answers anyway.

## Cancellation, recovery, disposal, privacy

`scripts/drive-precision-preview.mjs --base https://zodiacs.org`,
Chromium 141, verdict **pass**, no problems and no errors, in
`preview-deployed-run.json`. Nineteen steps; the ones this mandate names:

- **cancel** — the worker is terminated, the pack state says so, compute is
  disabled, output cleared, and a late reply from the stopped worker does
  not overwrite it (`repliesFromTheStoppedWorker: 0`).
- **recover** — the fixture reloads and compute is enabled again.
- **dispose** — "nothing is loaded, and every calculation will be refused",
  `computeDisabled: true`.
- **privacy** — `localStorage` 0, `sessionStorage` 0, cookies empty,
  IndexedDB empty, no cache entry holds this route, and **no off-origin
  request, no beacon, no assistant call** of any kind. Every request the
  page made is listed, same-origin included.

## Ordinary birth charts

`chart-route-requests.mjs`, recorded in `chart-route-requests.json`. Every
request the live `/birth-chart/` route makes is in that file, same-origin
included:

| | |
| --- | --- |
| total requests | 55 |
| Astro chunks | 44 |
| requests to `/precision-preview/*` | **0** |
| page errors | none |

One off-origin request, `plausible.io/js/…` — the site's existing analytics
on a consumer route. It is pre-existing site behaviour and outside this
work; it is named here rather than left as an unexplained count. The
**preview** route, by contrast, made no off-origin request at all, which is
the boundary the section above is about.

An earlier draft of this section quoted "134 requests, 82 Astro chunks"
from an ad-hoc run that was never committed, and those numbers do not
reproduce — the figures above come from the harness that is now in this
directory.

The engine isolation gate (`report-bundles.mjs`) and the engine accuracy
vectors both passed in Site Check on the merged head, as did the
birth-chart ownership and export drives against `dist/`.

To be exact about scope: this establishes which code the **route** loads.
It does not drive a full chart through the place lookup; Site Check does
that against the built site.

## Package availability

`@zodiacs/precision-alpha` is **not published to npm**. Nothing in this
release publishes it. `clean-consumer.json` records what actually happens:
`npm pack` produces `zodiacs-precision-alpha-0.1.0-preview.1.tgz`
(244 890 bytes), `npm install --offline` puts it in an empty project, and a
consumer imports it by specifier. That establishes the `exports` map and
the consumer path. It is not a registry release and must not be recorded as
one.

## What was skipped, and is not a pass

The `Browser evidence` workflow shows **skipped**. It is optional on this
event; a skipped workflow is not a completed browser test, and it is not
counted as one. The browser measurements in the PR come from the recorded
runs under `docs/platform/evidence/precision-aberration/browser/`, and the
deployment measurements from the two runs recorded here.
