# The same bytes, in three engines — now with a mode that can refuse

```
node make-pack.mjs                 # once; writes pack.bin and pack.json
node serve.mjs 8795 &
node drive.mjs --out cross-runtime-run.json
```

This is the of-date directory's experiment extended to the deflected rung.
The method is unchanged and deliberately so: the pack is built **once**, in
Node, written to `pack.bin`, and every runtime re-computes its SHA-256
**where it is used** — Node with `node:crypto`, the browsers with
`crypto.subtle` — before opening it. A runtime reporting a different digest
has not run this test, and the driver fails.

`pack.bin` here is byte-identical to `../../precision-of-date/cross-runtime/pack.bin`
(`d4fc4e9a…`, 198 055 bytes). It is a copy, not a rebuild: rebuilding it
would have reached `Math.cos` and `Math.acos` in the Chebyshev fit and
produced a different file, and then this directory's numbers could not be
read against the of-date ones. The copy is deliberate and costs nothing —
identical content is one blob in git however many paths point at it
(`7bcb5ad3…` in both) — and it keeps this directory runnable on its own,
which an evidence directory should be.

## What is new here

The deflected mode is the first in the ladder with a **restricted domain**.
Inside five degrees of the Sun it declines to answer, so its result carries
spans it did not examine and a completeness verdict of `false`. That makes
the **domain verdict part of the answer**: a runtime that excluded a
different span answered a different question, however well its roots
matched. `excluded`, `decided`, `decidedFraction` and the window are
therefore compared to the bit alongside the roots.

Three cases exist to exercise that across engines and not only in Node:

| | body | window | what it is for |
| --- | --- | --- | --- |
| C7 | Mars | ±38 d | the floor is never approached; completeness **is** established |
| C8 | Venus | ±1 d | the floor is crossed three times; three spans declined |
| C9 | Sun | ±38 d | the deflector as target — answered, and **not** deflected |

`drive.mjs` fails the run if any of those three paths is missing, so a
green run cannot mean "the new mode never fired".

### Why C8 does not use the shared window

The companion laps the observer every 0.7 days, so its direction passes the
Sun's once per lap: over the shared ±38-day window it enters the floor 109
separate times. Resolving 109 pairs of floor boundaries spends the
search's whole four-million-evaluation budget and exhausts it — so the cost
is a lower bound and not a measurement — and took about a minute in Node,
the wrong side of a browser page timeout. It is a poor case besides: an
exhausted search publishes where it ran out rather than what it concluded.

C8 runs on ±1 day instead. That window's geometry was established from the
pack's own series, by sampling 200 000 points and applying
`deflectionDomain` to the light-time-corrected vector — **not** read off a
search result, which is the thing the case exists to check:

* three sub-five-degree runs, at −0.8205…−0.8010, −0.1193…−0.0998 and
  0.5820…0.6014 days, each 0.0195 d wide, reaching 0.0009, 0.0002 and
  0.0012 degrees
* three crossings of 137 degrees, at −0.43358, 0.26642 and 0.96642 days,
  none of them inside a sub-five-degree run

The search returns exactly those three roots, and three excluded spans each
strictly **inside** the corresponding run — with the straddling slivers at
each boundary reported as unresolved rather than excluded, which is the
distinction the accounting exists to keep.

## What came out

| | |
| --- | --- |
| pack | `d4fc4e9a…`, 198 055 bytes, built once by `node v22.22.2` |
| runtimes | Node 22.22.2, HeadlessChrome 141, Firefox 151 |
| digest verified in each | yes, all three |
| cases | 9, across all four experimental modes |
| **events compared** | **224** |
| roots, brackets, directions, verdicts, excluded spans identical | **yes** |
| **evaluation-count spread** | **0 on every case** |
| off-origin requests | none, in either browser |
| wall time | 5 793 ms Node, 2 725 ms Chromium, 1 888 ms Firefox |

The three deflected cases, as all three engines published them:

```
C7  Mars   ±38 d   1 root    established true    decided 1        excluded 0   2 921 evaluations
C8  Venus  ±1 d    3 roots   established false   decided 0.96989  excluded 3   111 829 evaluations
C9  Sun    ±38 d   0 roots   established true    decided 1        excluded 0   2 417 evaluations
```

C8's excluded spans, identical in Node, Chromium and Firefox:

```
-70867.7490234375 .. -69234.9609375
-10280.56640625   .. -8648.4375
 50308.59375      .. 51934.7900390625
```

## What is compared and what is not

Compared, to the bit: the digest; the window each case was asked about; and
the published answer — roots, brackets, directions, event counts, the
completeness verdict, the excluded and decided spans, `decidedFraction`,
`closestElongationCos`, `widestDeflectionArcsec` and
`tightestLimiterMarginRatio` — as decimal strings, so a comparison cannot
round a near-match into a match.

Reported and **not** folded into the verdict:

* **evaluations, cells and wall time.** They came out identical here; they
  are still reported rather than asserted, because an engine is entitled to
  reach the same answer by a different amount of work.
* **`closestElongationDeg`.** It comes from `Math.acos`, which ECMAScript
  leaves implementation-defined, so two honest engines may differ in its
  last bits. The cosine is what the domain test actually uses — `sinCos`
  and four arithmetic operations — and *that* is compared. Putting the
  degrees in the verdict would repeat the aberrated evidence's mistake with
  `Math.cos` inside the Chebyshev fit: an engine difference dressed up as a
  disagreement.

`drive.mjs` also fails if fewer than ten events were compared. One matching
event across three engines is not a cross-runtime claim.

## How to read the two reported deflection numbers

Neither is a measurement of the sky, and both are easy to misread:

* **`widestDeflectionArcsec`** is an **enclosure's upper bound** over the
  cells of the run, not a value at an instant. It can exceed the largest
  deflection the supported domain admits (0.094847 arcsec, from the closed
  form) on cases whose cells reach the floor, where `e × q` is closest to
  cancelling and the enclosure is loosest. The result carries
  `widestDeflectionIsAnEnclosureUpperBound: true` beside it.
* **`closestElongationDeg`** is likewise taken from enclosures, so it is a
  rigorous **lower** bound on the true closest elongation, not the closest
  elongation. C7 reports 102.2035 degrees; sampling the pack directly puts
  the true minimum over that window at 104.0935. The result carries
  `closestElongationIsAReport: true`.

## What this does not establish

That the three engines agree about **this pack**, through **this package's
source**, served unbundled so the bytes the browser runs are the bytes the
package ships. Not that they agree on every input; not that the deflection
profile is accurate — `DEFLECTION-RESULTS.md` records that it **failed**
its own preregistered usefulness rule; and not anything about the sky.
`pack.bin` is synthetic, built from polynomials in
`examples/synthetic-pack.mjs`, and nothing here is derived from or
redistributes any kernel.
