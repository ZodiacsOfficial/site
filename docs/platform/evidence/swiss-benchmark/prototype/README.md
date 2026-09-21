# The experimental DE backend

Research code. **Nothing here is imported by the site, the published package,
the default browser bundle, any schema or any saved record.** It exists to be
measured, and the measurement is in [`../RESULTS.md`](../RESULTS.md).

| file | what it is |
| --- | --- |
| `spk.mjs` | a minimal reader for JPL SPK (DAF) kernels — segment descriptors and type-2/3 Chebyshev position records |
| `apparent.mjs` | the reduction: light-time iteration, annual aberration, and rotation into the true ecliptic of date |
| `dump-prototype.mjs` | emits the prototype's side of the corpus in the shared dump shape |
| `perf.mjs` | cold start, warm latency and memory, with data acquisition excluded from the timed kernels |

## Reproducing it

The kernel and the Swiss installation are deliberately **not** committed; see
[`../LICENSING.md`](../LICENSING.md) for why that matters for Swiss in
particular. From a scratch directory:

```sh
# reference (AGPL or commercial - measuring instrument only, never redistributed)
python3 -m venv venv && ./venv/bin/pip install pyswisseph
mkdir ephe && cd ephe
curl -LO https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/sepl_18.se1
curl -LO https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/semo_18.se1
cd ..

# positions for the prototype (JPL/NAIF, public domain)
curl -LO https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp
```

Sizes and SHA-256 for all three are pinned in
[`../CONFIGURATION.md`](../CONFIGURATION.md).

## The one design decision worth knowing

Only the **position series** is swapped. Light-time, aberration and the
rotation into the ecliptic of date reuse the same astronomy-engine machinery
the production core already uses. If the reduction had changed too, a measured
difference could not be attributed to the series — which is the entire point of
the experiment.

Gravitational deflection is not applied. That is stated, not overlooked, and it
bounds the result: deflection reaches ~1.7″ only at the solar limb and stays
well under 0.05″ away from the Sun.
