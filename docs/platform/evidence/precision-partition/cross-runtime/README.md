# One domain plan, three engines

The deflection directory next door checks that Node, Chromium and Firefox
agree on the ANSWER the deflected rung publishes. This one checks the
object the partition adds: a **plan** — where the profile can and cannot
answer over a window — and whether a plan made in one engine describes the
same spans, under the same identity, as a plan made in another.

The plan is the interesting thing to compare because it is the thing a
consumer caches. An engine that partitions a window differently hands the
same longitude query a different set of admissible spans, and gets a
legitimately different answer that no amount of root agreement would
reveal. Worse, each engine would **refuse** the other's plan — correct
behaviour, and a silent loss of the reuse the partition exists for.

## Running it

```bash
node make-pack.mjs                 # only to rebuild the fixture; the bytes are committed
node serve.mjs 8796 &
node drive.mjs http://127.0.0.1:8796/ --out cross-runtime-run.json
```

`serve.mjs` serves this directory and the package itself with no bundler,
so the bytes the browser runs are the bytes the package ships.

## The same bytes, verified where they are used

`pack.bin` is the synthetic fixture from
`examples/precision-alpha/examples/synthetic-pack.mjs`, built **once** in
Node and committed. Every runtime re-computes its SHA-256 from the bytes it
actually received before planning anything, and that digest is what goes
into the plan key it publishes — so a runtime that received different bytes
cannot publish a matching key. It is a fixture: the arithmetic is real, the
sky is not, and nothing here is derived from or redistributes any kernel.

## Compared to the bit

The plan's four span lists and its **key**, the events found over it with
each one's eligibility and the rung that located it, and what each result
claims — over the request and over the proved-admissible spans, which are
two different claims. All as decimal strings, so a comparison cannot round
a near-match into a match.

**Reported and not compared:** evaluations, cells and wall time. Engines
are allowed to differ there. Measured here, they did not: zero spread on
all five cases.

## The cases, and what each is for

| | | |
| --- | --- | --- |
| P1 | Mars, ±38 d | elongation stays above 104°, so the whole request is admissible and the smaller claim and the larger one coincide |
| P2 | Venus, ±1 d, 137° | the fast companion crosses the five-degree floor three times: boundary spans, and a request no run can be complete over |
| P3 | Venus, ±1 d, 317° | the same window and body as P2 at a different longitude. Its plan **must** be P2's plan |
| P4 | Sun, ±38 d | the deflector as target: no deflection applies, the floor restricts nothing, and the plan is one admissible span costing nothing |
| P5 | Venus, ±1 d, tolerance 5 s | the same request as P2 at a tighter tolerance, which is where this fixture's exclusions become provable. Its plan must **not** share P2's key |

P5 exists because at the default sixty seconds the companion's three
sub-five-degree runs come back entirely as *boundary*: the elongation
enclosure over a sixty-second span is wider than the gap between the
geometry and the floor, so nothing is proved below it. Measured on this
fixture: 60 s gives 0 excluded spans, 20 s gives 2, 5 s gives 3 — the
three the geometry has. A cross-runtime check that only ever saw boundary
spans would never compare a **proved exclusion**, which is the verdict a
caller most needs the engines to agree on: it says an answer does not
exist, rather than that one was not reached.

## What the driver refuses to pass on

Agreement alone is not enough — a run where every case came back
"everything admissible" would agree perfectly and mean nothing. The driver
fails unless the run actually exercised a proved exclusion, a boundary
span, a request that IS complete, a request that is not complete but is
exhaustive over its admissible spans, and the deflector-as-target
exception; unless P2 and P3 share a plan key (longitude independence,
checked rather than asserted); and unless P2 and P5 do **not** (the
tolerance is part of the identity).

## Result

`cross-runtime-run.json`. All three engines verified the digest, published
identical plans, keys and answers on all five cases, made no off-origin
request, and raised no page error.
