# The pinned deflection references

Fetched 2026-09-21 from `https://raw.githubusercontent.com/liberfa/erfa/master/src/`,
which is what this work's mandate named. `master` is a moving target, so the
**content digest is the pin**; the declared version and the per-file revision
dates are recorded beside it.

| file | bytes | sha256 | "This revision" |
| --- | --- | --- | --- |
| `ld.c` | 6265 | `affa41a6028f8f2e…` | 2021 February 24 |
| `ldsun.c` | 4554 | `42c5ffb96f12c836…` | 2016 June 16 |
| `ab.c` | 5209 | `ff4bac5fc8a2ccb5…` | 2021 February 24 |

Declared version on that branch, from `configure.ac`:

```
AC_INIT([erfa],[2.0.1])
AC_DEFINE([SOFA_VERSION], ["20231011"], [Define to the version of SOFA])
```

So **ERFA 2.0.1 / SOFA Issue 2023-10-11** — the same pair
`test/tier-a/frame-of-date.nodetest.mjs` already pins for the frame vectors.
The two halves of this package's reference set are therefore one version, not
two, which matters because a reference that is a different version is a
different model.

These are BSD-3-Clause, derived with permission from IAU SOFA. They are kept
here as the reference the implementation is checked against; nothing in the
package is a translation of them, and the licence notice at the foot of each
file travels with it.

## Why all three

- **`ld.c`** — the deflection itself, `eraLd(bm, p, q, e, em, dlim, p1)`, and
  the only place the meaning of `dlim` is stated (Note 4: it is `phi^2/2`).
- **`ldsun.c`** — ERFA's Sun-specific wrapper. It is NOT what this package
  does: it calls `eraLd(1.0, p, p, e, em, dlim)`, passing `p` for `q`, which
  is the distant-source approximation. Pinned so the difference can be
  measured rather than asserted.
- **`ab.c`** — the aberration, already pinned elsewhere in this package at the
  2021-02-24 revision. Repeated here because the ORDER of deflection and
  aberration is part of the profile, and the two cannot be specified apart.
