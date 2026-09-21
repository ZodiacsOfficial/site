# What would have to be true before any of this reaches production

The prototype is an experiment that met its accuracy target. That authorises a
recommendation, not an adoption, and these are the gates.

## Gates for adopting an optional higher-precision backend

1. **Licensing, answered from a primary source.** JPL ephemerides are public
   domain US Government work, so redistributing a derived coefficient set under
   MIT is *expected* to be fine — but that expectation has not been confirmed
   with a primary source, and the attribution JPL/Caltech asks for has not been
   established. Until it is, no coefficient data ships. See
   [`LICENSING.md`](LICENSING.md).

2. **It stays optional, and off by default.** 31 MiB cannot enter a browser
   bundle whose budget is measured in kilobytes. The default core must be
   untouched, and `scripts/report-bundles.mjs` must still pass with the backend
   absent.

3. **No silent network request.** Fetching a data pack on demand reveals the
   requested date range to whoever serves it. An interface advertised as
   device-only must not acquire that quietly: locally supplied packs first,
   any network path explicitly opted into and documented.

4. **A ΔT decision, made deliberately.** The largest single disagreement this
   study found was not an ephemeris error at all — it was two ΔT extrapolations
   diverging by 109 s at 2100. Adopting DE positions without deciding which ΔT
   model to use would leave most of the far-future disagreement in place. That
   is a separate choice from the ephemeris and should be made as one.

5. **Receipts must stay honest.** The receipt's `conventions` block declares how
   a chart was computed. A chart from a different backend is a different
   calculation and must say so, or two records will silently disagree while
   both claim the same conventions — which is precisely the failure the
   comparison tool exists to catch.

6. **Coverage stated, not implied.** DE440s is 1850–2150. The engine accepts
   1800–2199. A backend that covers less than the input range must refuse
   outside it rather than quietly falling back, and the refusal must be tested.

## The next experiment worth running

Two candidates, in order of expected value:

**Reduce the 31 MiB.** The accuracy result is established; the cost is the
weak half. DE440s carries all bodies at full precision over 300 years. An
astrology workload needs ten bodies, and a bounded window. Re-fitting Chebyshev
coefficients *from the DE kernel* — not from Swiss output — over a narrower
range and to a declared error budget is a real compression question with a
measurable answer: what is the smallest pack that holds, say, 0.5″ over
1900–2100? That is the version of this that could plausibly ship.

**Event-search reliability.** This study measured positions only. Crossings,
stations and unresolved intervals were not compared, and §12's warning applies:
a denser scan does not prove completeness. The existing
`docs/engine-validation/transit-windows` pack is the place to start, not a new
corpus.

## What would NOT be a next step

Publishing any of the numbers in [`RESULTS.md`](RESULTS.md) as a claim that
Zodiacs is more accurate than Swiss Ephemeris. It is not what was measured.
The prototype agrees with Swiss more closely than the shipped core does; both
descend from JPL; and no observation was consulted by anyone in this study.
