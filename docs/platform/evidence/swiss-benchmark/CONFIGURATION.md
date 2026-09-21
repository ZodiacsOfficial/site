# Benchmark configuration — pinned before measuring

Everything the comparison depends on, recorded so the run can be repeated and
so a later reader can tell which configuration produced which number.

## Software and data

| thing | identity |
| --- | --- |
| Zodiacs engine | `@zodiacs/engine` 0.1.1-rc.6 |
| Zodiacs artifact | `vendor/zodiacs-engine-0.1.1-rc.6.tgz`, sha256 `09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e` |
| Zodiacs dependency | `astronomy-engine` 2.1.19 |
| Swiss binding | `pyswisseph` 2.10.3.2 (reports library 2.10.03) |
| Swiss data | `sepl_18.se1` 484 061 B, sha256 `ca1393ceab3a44fb…`; `semo_18.se1` 1 304 771 B, sha256 `1ca07bd67c24374d…` |
| Node | v22.22.2 |
| Python | 3.11.15 |
| Host | Linux 6.18.44 x86_64, 4 logical CPUs |

The Swiss data files are the two smallest that cover the corpus: planets and
the Moon from 1800. They were fetched once and are **not** committed to this
repository — see `LICENSING.md` in this directory for why that matters.

## Which ephemeris actually ran

`FLG_SWIEPH` is a *request*, not a guarantee. With no `.se1` files present,
Swiss answers from its built-in Moshier series and says so only in the return
flag. That was observed directly here before the data files were fetched:

```
requested SWIEPH -> lon=0.873696405 retflag=260 ACTUALLY_USED=MOSEPH
```

and after:

```
requested SWIEPH -> lon=0.873694956 retflag=258 ACTUALLY_USED=SWIEPH
```

`dump_swiss.py` therefore reads the backend back out of the return flag on
**every call**, records it per body, and the comparator excludes any row whose
backend was not `SWIEPH`. The committed report carries
`"isFullSwissConfiguration": true` and `"swissBackendsObserved": ["SWIEPH"]`;
if a future run falls back, those fields will say so instead of quietly
reporting a Moshier run as a Swiss one.

## Conventions, matched before measuring

The Zodiacs receipt declares `planetPositions: apparent-geocentric-ecliptic-of-date`
and `zodiac: tropical`. The matched Swiss configuration is therefore its
default — apparent, geocentric, ecliptic of date, tropical — plus `FLG_SPEED`.
No `NOABERR`, no `NOGDEFL`, no `J2000`, no `SIDEREAL`, no `TOPOCTR`.

That the conventions really do match was checked by toggling each effect and
watching the residual move, rather than by assuming it:

| Swiss variant | Swiss Sun longitude | Zodiacs − Swiss |
| --- | --- | --- |
| matched: apparent geocentric of date | 0.873694956 | **−1.288″** |
| + no gravitational deflection | 0.873694956 | −1.288″ |
| + no annual aberration | 0.879411683 | −21.869″ |
| true (geometric) position | 0.879409758 | −21.862″ |
| J2000 frame | 1.037708682 | −591.738″ |

Removing aberration moves Swiss by ~20.6″ and the residual grows, so both
implementations apply it. Deflection is nil for the Sun, as it must be. The
J2000 row is three orders larger, so both are of-date. The 1.288″ that remains
is not a convention mismatch; it is a difference between the two
implementations.

## What this comparison is, and is not

Both implementations ultimately descend from JPL development ephemerides.
Agreement between them is **consistency**, not independent observational
accuracy. No claim in this directory says otherwise, and nothing here has been
checked against an independent observation.

The corpus (`tools/corpus.mjs`) was written before any measurement was taken
and is committed with the results. It is stratified so that a headline figure
cannot be assembled from the easy cases, and six holdout cases are kept back
from tuning.
