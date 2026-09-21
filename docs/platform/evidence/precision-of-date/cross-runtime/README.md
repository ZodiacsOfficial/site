# The same bytes, in three engines

```
node make-pack.mjs                 # once; writes pack.bin and pack.json
node serve.mjs 8795 &
node drive.mjs --out cross-runtime-run.json
```

## What was wrong with the previous version of this claim

The aberrated work said its results were "bit-identical across engines",
and had to be corrected to say something narrower: each engine **built**
the fixture before searching it, the Chebyshev fit reaches `Math.cos` and
`Math.acos`, and ECMAScript does not specify those to the bit. The three
engines were therefore searching three different packs — digests
`d11e17e1…`, `0d64d6ee…`, `9cb21bac…` — and the sensitive case cost
126 126 / 126 184 / 126 159 evaluations, a 0.05 % spread. The agreement
measured there was an agreement about the **search**, which is worth
having, but it is not what "identical bytes" says.

This directory fixes the experiment rather than the wording. The pack is
built **once**, in Node, and written to `pack.bin`. Every runtime receives
that file and **re-computes its SHA-256 where it is used** — Node with
`node:crypto`, the browsers with `crypto.subtle` — before opening it. A
runtime reporting a different digest has not run this test, and the driver
fails.

## What came out

| | |
| --- | --- |
| pack | `d4fc4e9a…`, 198 055 bytes, built once by `node v22.22.2` |
| runtimes | Node 22.22.2, Chromium 141, Firefox 151 |
| digest verified in each | yes, all three |
| cases | 6, across all three experimental modes |
| **events compared** | **220** |
| roots, brackets, directions, verdicts identical | **yes, all 220** |
| **evaluation-count spread** | **0 on every case** |

The last row is the part the earlier run could not have. With the bytes
genuinely identical, the three engines do not merely agree about the
answer — they do the same amount of work to reach it. C5, the 108-crossing
companion case, costs exactly 126 230 evaluations in all three.

## What is compared and what is not

Compared, to the bit: the digest, and the published answer — roots,
brackets, directions, event counts and the completeness verdict, as
decimal strings so a comparison cannot round a near-match into a match.

Reported and **not** folded into the verdict: evaluations, cells and wall
time. They came out identical here; they are still reported rather than
asserted, because an engine is entitled to reach the same answer by a
different amount of work, and a rule that forbade it would either fail an
honest run or tempt someone to stop reporting the numbers.

`drive.mjs` also fails if fewer than ten events were compared. One
matching event across three engines is not a cross-runtime claim.

## What this does not establish

That the three engines agree about **this pack**, through **this package's
source**, served unbundled so the bytes the browser runs are the bytes the
package ships. Not that they agree on every input, and not anything about
the sky: `pack.bin` is synthetic, built from polynomials in
`examples/synthetic-pack.mjs`, and nothing here is derived from or
redistributes any kernel.
