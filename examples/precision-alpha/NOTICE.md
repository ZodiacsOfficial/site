# Third-party material in this package

## What is in the source tree

**IAU 2000B nutation series — ERFA (liberfa), BSD-3-Clause.**
`src/core/nutation-series-2000b.mjs` carries the 77 luni-solar coefficients of
the IAU 2000B model. They were parsed out of ERFA's `src/nut00b.c` by
`docs/platform/evidence/precision-2026-09-20/numerics/tools/parse-erfa-tables.py`.
ERFA is derived with permission from IAU SOFA, and the underlying series is
McCarthy & Luzum (2003), the 77-term truncation of MHB2000 (Mathews, Herring &
Buffett 2002). The full ERFA licence text is in `LICENSE-erfa`; its three
clauses (retain the notice, do not use the names to endorse, no warranty) are
satisfied by this file, that copy, and the provenance string exported as
`SERIES_PROVENANCE`.

**IAU 2006 precession and the frame-bias construction.**
`src/core/frames.mjs` implements the published Fukushima-Williams recipe
(Wallace & Capitaine 2006; IERS Conventions 2010 chapter 5) using the same
rotation conventions as ERFA's `eraPfw06`, `eraFw2m` and `eraBi00`. The
coefficients are published constants, not fitted values, and not copied code.

**The five-term comparator.** `nutAstronomyEngine` in `src/core/nutation.mjs`
reimplements the truncated series that `astronomy-engine` 2.1.19 ships as
`iau2000b`, so the truncation can be measured without patching that library.
astronomy-engine is MIT (Don Cross). No astronomy-engine code is imported or
bundled here.

**The bounded search.** `src/core/interval-search.mjs` is this project's own
work, copied unchanged from the research track it was written in. Its header
says where.

## What is NOT in this package

**No ephemeris data.** No JPL kernel, no compiled coefficient pack, and no
fixture derived from either is committed here. The runtime reads a pack the
user supplies locally. `docs/platform/evidence/precision-2026-09-20/RIGHTS.md`
records the actual NAIF terms, including the two questions about derived
coefficient sets that are genuinely unsettled; nothing is distributed while
they are.

**Nothing from Swiss Ephemeris.** No code, no data, no output, and nothing
here is fitted to Swiss output. Swiss appears in the research track only as a
measuring instrument, and its results are never redistributed.

## A correction a pack header may contradict

Pack headers written by the 2026-09-20 compiler carry
`dependencies[].licence` = "US Government work, public domain
(JPL/Caltech-NASA)" for the DE kernel. That claim is wrong, and
`docs/platform/evidence/precision-2026-09-20/RIGHTS.md` corrects it against
NAIF's own rules page: SPICE and its kernels are produced by Caltech/JPL
under contract to NASA, NAIF never says public domain, and what it grants is
a permission with conditions. **RIGHTS.md governs; the string in a pack
header does not.** The generator has not been re-run to change it, because
that would move every recorded pack digest in the frozen evidence; the
correction is recorded here and in the alpha's report instead.

## This package

MIT, the same as `@zodiacs/engine`. It is an alpha: it does not replace the
production engine and is not wired into the site.
