# What did not work, and why

Failures are recorded here with the same denominators as the successes. Three
of these were caught only because a number that should have been small was
absurd; one was caught only because a proven bound disagreed with a sampled
one. That is the argument for computing both.

## 1. Candidate C (residual over astronomy-engine) lost on every axis

**Predicted before measuring**, and written into `compile.mjs` before the pack
was built: subtracting astronomy-engine's model would shrink the *amplitude* of
what is stored but not its *bandwidth*, because astronomy-engine's series are
truncations of the same orbits — the residual oscillates at the same
frequencies. Fewer bits per coefficient, the same number of coefficients. And
a runtime that must evaluate the model on every light-time iterate pays
astronomy-engine's cost on top of its own.

Measured, and worse than predicted:

| | C | D (the comparable pack) |
| --- | --- | --- |
| size | 1.7819 MiB | 1.6567 MiB |
| compile time | 134 s | 21 s |
| warm p50, 10 bodies | 1.132 ms | 0.054 ms |
| peak RSS, one backend | 80.0 MiB | 62.6 MiB |
| max longitude error vs the uncompressed prototype | **0.196″** | 0.0049″ |
| max geocentric position error | **211 km** (Pluto), 64 km (most bodies) | 0.0095–0.6 km |
| max barycentric velocity error | **3.2e-3 km/s** (Earth) | 2.4e-5 km/s |
| proven bound | **none available** | full, every body |

C is bigger, 21× slower, misses T2 by 4×, misses T7 by 32×, and needs
astronomy-engine 2.1.19 pinned at runtime forever.

The 64 km figure is one failure showing up ten times: it is the EMB residual,
which every geocentric vector inherits through the observer. The compiler
walks the degree up until the sampled fit error is inside budget, capped at 64
coefficients; for EMB and for Pluto it hit the cap and shipped anyway. So the
prediction was directionally right and quantitatively too kind — for EMB the
residual has *higher* bandwidth than the absolute vector, because
astronomy-engine's EMB error carries structure the smooth barycentre motion
does not.

And there is a deeper objection than any of these numbers. A residual pack has
no proven bound at all: the re-expansion argument in §"Proven bounds" works
because the DE kernel is piecewise polynomial. Astronomy-engine's model is not
a polynomial, so nothing about C can be proved — only sampled. That alone
would disqualify it.

## 2. The heliocentric-frame hypothesis was mostly wrong

The sweep fits every planet in two frames: SSB-relative (as DE440s stores it)
and Sun-relative. The stated reason for expecting Sun-relative to win was that
the SSB vector of an outer planet carries the Sun's 7.4e5 km wobble about the
barycentre at Jupiter's 11.86-year period, which is far faster than Neptune's
own motion.

Measured: the frame is nearly irrelevant. Every outer planet chose **ssb**, and
only Mercury chose **sun**, by 1% (0.489 MiB vs 0.494 MiB). The reasoning was
wrong about magnitudes, not about mechanism: the wobble is fast but tiny, so
resolving it to 1 km needs only ~1.4e-6 relative accuracy, which a degree-11
fit over 2740 days already delivers. The hypothesis cost a doubled sweep and
bought 5 KiB.

## 3. Int32Array silently produced a pack that decoded to the wrong number

The quantiser computes, per coefficient field, the largest integer it must
store, and picks a byte width from it. That value was accumulated in an
`Int32Array`. For the low-order coefficients of a body with a large orbit the
integer exceeds 2^31 — EMB's first coefficient needs 1.28e10 — so it wrapped,
the width came out as 4 bytes instead of 6, and every affected field decoded to
a wrong value with no error raised anywhere.

It survived a full compile and a full size measurement. What caught it was that
the API-level position errors came back at 1e8 km. **A compressor that silently
produces plausible-looking garbage is the failure mode to design against**, so
the test file now round-trips every width at its declared extremes, and the
per-body test asserts the sampled error is inside the body's own proven bound —
which this bug would have violated by twelve orders of magnitude.

Fixing it also added 5- and 6-byte widths, so the fix made packs *smaller*
(the model total went from 1.617 to 1.541 MiB) rather than larger.

## 4. The first proven bound was nonsense, twice

The proven refit bound re-expands (source − fit) on an interval where both are
polynomials and sums |coefficients|. The first version produced 2,355,375 km
for Mercury. Two distinct causes:

- for bodies fitted in the Sun-relative frame it compared the fit against the
  SSB segment, so the bound measured the Sun's barycentric motion;
- where the refit interval is not a whole multiple of the source record length
  (EMB: 274 days over 16-day records) a source record straddles a refit
  boundary, so the fit polynomial was being evaluated outside its own interval,
  where a Chebyshev series diverges.

Both are now handled by cutting at the union of *all* breakpoints. The episode
is worth recording because the bound caught itself: a sampled measurement of
the same quantity was 0.15 km and would have passed silently. The disagreement
between a proven bound and a sampled one is a *signal*, not a nuisance.

## 5. A shared scratch buffer moved Pluto 180 degrees

`PackBackend.state()` composes the Moon and the Earth from two reads. The
reduction passed it the same Float64Array the method was using internally, so
the second read overwrote the first and the observer's position was wrong by
the whole EMB vector. Longitude errors came out at 648000″ — exactly 180° —
while the direct vector comparison, which passes its own array, stayed clean at
0.16 km.

The two measurements disagreeing is what exposed it. `state()` now throws if
handed its own scratch buffer, and the test asserts that.

## 6. Cropping the body set is nearly worthless, and that is worth knowing

Experiment (ii) built a pack for the six inner bodies only (Sun, Moon, EMB,
Mercury, Venus, Mars — the minimum that can still produce an observer). It is
**1.6225 MiB against the full 1.6567 MiB: a 2% saving.** The Moon is 52% of the
pack and Mercury another 25%, and both are in any subset worth shipping.
Dropping the five outer planets saves 35 KiB.

Anyone hoping to shrink a pack by shipping fewer bodies should be told this
number before they try. Cropping *time* does work — 1950–2050 is 0.5668 MiB —
but that is a smaller product, not a better compressor, and is reported
separately in `RESULTS.md` for exactly that reason.

## 7. Resident packs regress peak RSS, and the fix is a mode, not an argument

The prototype's resident set excludes its 31.21 MiB kernel entirely: it
`pread`s from the file on every evaluation and never holds it. So *any*
in-memory pack is an RSS regression against it by the pack's own size. D
resident measured 64.4 MiB against the prototype's 64.1 MiB.

Rather than argue that 0.3 MiB does not matter, the runtime grew a
`resident: false` mode that keeps the pack on disk and preads one record per
body per chart — far fewer syscalls than the prototype's two per position
evaluation, because of the record memo. That measures **62.60 MiB**, below the
prototype, and costs nothing measurable at warm p50 (0.0542 ms low-memory
against 0.0565 ms resident, inside the run-to-run spread) while *improving*
cold start from 2.330 ms to 1.208 ms. T4 is met without special pleading.

## 8. Not attempted, and why

- **Entropy coding** (range coder / arithmetic coding over the quantised
  residuals). It would plausibly take another 15–25% but it puts a decode loop
  between the reader and a random record, which is exactly what the record-major
  layout and the one-slot memo exist to avoid. Not worth it against a 7.80 MiB
  target already met by 4.7×.
- **A tighter proven bound by dense sampling plus a Markov remainder.** The
  bound used is max over a 256-point theta grid plus (pi/2M)·sum k|g_k|. A
  finer grid tightens it, at linear cost. The current bound runs about 2.6×
  the sampled maximum; that ratio is a property of the grid, not of the pack.
- **Nutation and the reduction.** The brief's own finding is that the residual
  against Swiss is dominated by astronomy-engine's truncated nutation series,
  not by the positions. Nothing in this track touches that, and no number here
  should be read as improving it.
