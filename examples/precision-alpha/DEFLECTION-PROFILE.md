# The solar-deflection profile, specified before it is implemented

Profile id: **`zodiacs-deflected-of-date/1`**
Mode name: **`validated-retarded-aberrated-deflected-of-date`**

Rung 5 of the ladder. It adds ONE correction to
`validated-retarded-aberrated-of-date`: gravitational light deflection by
the Sun.

It is **still not an apparent place**, and the name does not claim to be
one. What remains absent is listed in §3 and appears on every result.

---

## 0 · What the investigation overturned

This specification is written after a five-dimension investigation in which
every load-bearing number was re-derived by a second agent. Four of the
things it found change what this profile can say, so they come first.

**The comment in `reduce.mjs` about the limiter is wrong.** It says ERFA's
clamp "silently caps the deflection at roughly a tenth of an arcsecond".
Two independent computations put the peak deflection under ERFA's own
`dlim = 1e-6` at **5.7586 arcsec** — 57.6× that, and 3.29× the 1.7512
arcsec of a ray grazing the limb. The comment is not repeated here, and
§6 replaces it.

**`eraLd` itself omits a second-order term.** An independent RK4 integration
of the weak-field ray disagrees with `eraLd` by **2.1e-3 arcsec at 0.3
degrees elongation** (Neptune), falling below 5e-8 arcsec beyond 10
degrees. Proved second order in GM by exact epsilon-scaling: halving `SRS`
halves the relative gap. The mechanism is measured — the true bent ray
bows away from the Sun, so its minimum distance exceeds the straight
chord's impact parameter by the same relative amount, and the deflection
goes as 1/b. **This is a property of the model, not of an implementation
of it**, and it bounds what agreement with `eraLd` is worth near
conjunction.

**`dlim = 1e-14`, the value `reduce.mjs` uses, is below the noise floor of
the quantity it clamps.** `q·(q+e) = 1 + q·e` with `q·e ≈ −1` has a last
bit of 1.11e-16, so there are only about **90 distinct doubles between 0
and 1e-14**. Measured relative error of the naive dot against the stable
form: −0.06% at 0.9·φ_lim, +0.91% at 1.1·φ_lim, −2.14% at 0.5·φ_lim. The
clamp decision there is not reliably decidable, and the "peak" it implies
(5.6156e4 arcsec, about 15.6 degrees) is not a physical quantity.

**`eraLd` is linear in `p`.** `p1 = (I − w[e×q]_×)·p`, and `w` depends only
on `q`, `e`, `em` and `dlim`. Confirmed bit-for-bit for k = 0.5, 2, 1e6,
1e-30. This is what makes the whole thing fit the existing search (§5).

## 1 · The quantity

For a target body and an ecliptic longitude `L` measured from the true
equinox of date, the instants at which

```
d(t)   = r_target(t − tau) − r_observer(t)        reception light-time
D(t)   = LD(d, sun, t)                            solar deflection, §2
P(t)   = bm1·D + S·v,  S = |D| + (D·v)/(1 + bm1)  aberration, unnormalised
Q(t)   = R(t)·P(t)                                the frame of date
f(t)   = sin(L)·Q_x − cos(L)·Q_y = 0
g(t)   = cos(L)·Q_x + sin(L)·Q_y > 0
```

Everything after `D` is rung 4, unchanged.

## 2 · The deflection, exactly

```
e     = unit(r_observer(t) − r_sun(t))            Sun -> observer, RECEPTION
em    = |r_observer(t) − r_sun(t)| / au           au
q     = unit(r_target(t − tau) − r_sun(t − tau))  Sun -> source, EMISSION
w     = SRS / em / max(q·(q + e), dlim)
D     = d + w · (d × (e × q))
```

`SRS = 1.97412574336e-8`, ERFA's `ERFA_SRS`, the Schwarzschild radius of
the Sun divided by the au. Independently reconstructed from
`2·GM_sun/(c²·au)` with `GM_sun = 1.32712440041e20 m³/s²` and
`au = 1.495978707e11 m`: agreement 4.0e-12 relative.

**`d` is NOT normalised, and does not need to be.** `eraLd` is linear in
its `p`, so feeding the unnormalised light-time vector returns
`|d|` times the deflected unit vector, which is a positive rescaling and
does not move a root. §5 carries this through.

**`q` and `e` ARE normalised, and must be.** Rescaling `q` by 1.0001 moves
the answer by 0.113 arcsec against a 0.377 arcsec deflection at 1 degree —
a 1e-4 relative error in `|q|` costs 30% of the deflection. Their norms
are two square roots per evaluation and there is no way around them.

### Finite distance, not the distant-source approximation

`eraLdsun` calls `eraLd(1.0, p, p, e, em, dlim)` — **`q = p`**, the
distant-star approximation. This profile does not. `q` is the real
Sun-to-source direction at emission, which is `eraLd`'s own interface and
what `reduce.mjs` already does.

The difference is not small for planets. Worst case on the grid measured,
Venus at 0.3 degrees elongation on the near branch: **1.5554 arcsec**.
The distant-source form would need that error quoted; this profile does
not incur it.

Closed form, proved algebraically and confirmed to 1.18e-12 relative over
200 000 random geometries: with `chi` the Sun-centred angle between source
and observer,

```
delta = (SRS / em) · tan(chi / 2)
```

and the distant-source form is the same identity with `chi -> pi − phi`.

### Epochs

| quantity | epoch | why |
| --- | --- | --- |
| `e`, `em` | reception `t` | the observer is at reception; rung 3 already fixes this |
| `q` | emission `t − tau` | the source was there when the light left |
| `r_sun` for `e` | reception `t` | |
| `r_sun` for `q` | emission `t − tau` | |

`ld.c` Note 3 says the deflector should ideally sit at the ray's closest
approach. That is **not** what this profile does, and the cost is measured:
using reception time for both legs instead of the split above changes the
answer by at most **1.96e-5 arcsec** (Pluto at the limb). Using the true
closest-approach epoch instead of the split changes it by **3.13e-10
arcsec**. The split-epoch choice is therefore within 3.2e-10 arcsec of
`ld.c`'s ideal, and the simpler reception-for-both would cost 1.96e-5.
Nothing in the pinned sources fixes `q`'s epoch; Note 3 constrains only the
deflecting body.

### The Sun as target

Deflection is **not applied when the target is the Sun**. A body does not
deflect its own light, and the formula is degenerate there (`q` and `e`
become antiparallel and `q·(q+e) -> 0` for reasons that are not a grazing
ray). `reduce.mjs` already skips it; this profile keeps that and says why.

### The Moon

Applied, and measured to be negligible: over 20 years at 20-minute
sampling the geocentric Moon's solar deflection never exceeds **5.69
microarcsec**, and it is never behind the Sun. It is applied anyway rather
than special-cased, because a profile with a body-dependent correction
list is two profiles.

## 3 · Applied and omitted

Applied, beyond rung 4:

* gravitational light deflection by the **Sun**, `eraLd` form, finite
  distance, `bm = 1`.

Omitted, and named on every result:

* **deflection by any body other than the Sun.** Jupiter contributes up to
  16 milliarcsec at its own limb; nothing here models it.
* **the second-order term `eraLd` itself omits** — up to 2.1e-3 arcsec at
  0.3 degrees elongation, below 5e-8 arcsec beyond 10 degrees (§0).
* the Klioner solar-potential term inside the aberration. **This is a
  different thing from solar light bending and is not enabled to match
  ERFA.** `eraAb` carries it as a refinement of the aberration; this
  profile's `aberrate` runs with `withPotential: false`, exactly as rung 3
  does, and the two must not be conflated because they are separate terms
  in separate transformations.
* Shapiro (relativistic) delay: the light-time is Newtonian straight-line.
* topocentric parallax, diurnal aberration, refraction: the observer is the
  geocentre.
* the 2000B-versus-2000A nutation difference, as rung 4.

**This is not a complete relativistic model and not a universal apparent
place.** It is one more named correction on a named chain.

## 4 · Order of operations

```
light-time  ->  DEFLECTION  ->  aberration  ->  frame rotation
```

Deflection before aberration, because the vocabulary is exact: `eraLd`
transforms a *coordinate* direction into a *natural* direction, and `eraAb`
transforms a *natural* direction into a *proper* direction. Natural is the
output of one and the input of the other.

The order is not free. Swapping deflection and aberration changes the
answer by, measured at the solar limb:

| observer velocity | commutator |
| --- | --- |
| exactly perpendicular to `e` (idealised circular orbit) | 6.61e-7 arcsec |
| tilted by Earth's actual eccentricity (0.96 deg) | 3.00e-6 arcsec |
| worst over all directions at the same speed | 1.41e-4 arcsec |

and in the regime `dlim = 1e-14` admits, **4.53 arcsec**. An earlier
reading of this called the commutator "small and linear in |v|"; it is
small only for a velocity direction that happens to sit near a
cancellation, and the maximum is `delta·beta` exactly.

The frame rotation commutes with everything before it to 1.18e-11 arcsec —
it is a rigid rotation of the whole configuration — but it is applied last
anyway, because that is where rung 4 puts it.

## 5 · Normalization, and why the enclosure survives

The existing search deliberately removed normalization: `aberrate` returns
an unnormalised `P`, because `f` needs only the SIGN of a projection and
multiplying by `|d| > 0` does not move a root. Interval division refuses on
a straddling denominator, so every division removed is a way the enclosure
can no longer fail.

`ld.c` Note 8 requires unit vectors, which looks like it forces the
normalization back. It does not, and the reason is §0's fourth finding:

```
p1 = p + w·(p × (e × q)) = (I − w·[e × q]_×)·p
```

is **linear in `p`**. So for any `k > 0`, `LD(k·d) = k·LD(d)`, the
projection scales by `k`, and its sign — which is all `f` uses — is
unchanged. Confirmed bit-for-bit at k = 0.5, 2, 1e6, 1e-30; at 1e-6 and
1e30 the residual is 2.1e-16 and 1.4e-16 relative, which is rounding.

So:

* `d` enters **unnormalised**. No new division.
* `q` and `e` are **normalised**, by construction: two square roots. Their
  denominators are `|r_target − r_sun|` and `|r_observer − r_sun|`, which
  are bounded away from zero everywhere in the supported domain (§7) — a
  target or observer at the centre of the Sun is not in it.
* `|D|`, needed by the aberration's `S`, replaces `|d|`. It is **not**
  `|d|`: `(d × a)·d = 0` identically, so `|D| = |d|·sqrt(1 + w²|e×q|²) ≥
  |d| > 0`. The Pythagorean form is the argument that it stays positive;
  it is not how the norm is computed, and the componentwise sum does
  cancel — measured at 7.6e-8 relative at 0.27 degrees.
* the one remaining new division is `1/max(q·(q+e), dlim)`, and the
  `max` is exactly what keeps its denominator away from zero. §6.

**A correction to the sketch this replaces:** substituting `|D|` for `dist`
in the aberration is only right if `d` and `d'` are *also* replaced by `D`
and `D'`. All three move together or none do.

## 6 · The limiter: what it is, what it is not

`dlim` is **`phi²/2`**, where `phi` is the angular separation at which
limiting begins (`ld.c` Note 4, quoted exactly in the pinned copy). It is
**not** an error cap and **not** an angular tolerance.

Below `phi`, the returned deflection is *artificially reduced, reaching
zero at phi = 0* — so the limiter does not bound the error, it replaces the
model with a convention that goes the wrong way.

| `dlim` | threshold `phi` | peak deflection | where that sits |
| --- | --- | --- | --- |
| `1e-6` (ERFA `eraLdsun` at em = 1 au) | 291.702 arcsec | **5.7586 arcsec** | 0.304 solar radii — inside the disc |
| `1e-14` (`reduce.mjs`) | 0.029170 arcsec | 5.6156e4 arcsec = 15.6 deg | 3.04e-5 solar radii — meaningless |

Both peaks are AT the threshold, and the deflection is unimodal in `phi`:
rising below it, falling above. Two grid-based attempts to find the peak
during the investigation both missed it by sweeping a range that did not
contain it.

ERFA scales `dlim` by `1/max(em², 1)`, which holds the *impact parameter*
at which limiting begins roughly fixed as the observer recedes. For a
geocentric observer at ~1 au the scaling is inert.

### This profile's choice

**`dlim = 1e-6 / max(em², 1)`, ERFA's own**, and the supported domain of §7
is set so that **the limiter never activates inside it**. Measured over 60
years at 2-hour sampling, the limiter fires on **0 of 262 980 samples** for
every one of the ten bodies even at `dlim = 1e-14`; at `1e-6` the
threshold is 10 000× wider and still far inside the excluded region.

The limiter is therefore a guard against a division by zero on a geometry
this profile refuses anyway — not a working part of the answer. Every
result reports `limiterActive`, and if it is ever true the result is
outside the supported domain and says so.

**The limiter is piecewise and its derivative jumps.** At the threshold,
`dw/dx` goes from `−SRS/(em·dlim²)` to exactly 0. In deflection angle the
one-sided slopes at `dlim = 1e-6` are `+1.9741e-2` and `−1.9741e-2` arcsec
per arcsec, a jump of `−3.9482e-2`; at `dlim = 1e-14` they are
`±1.8314e6` with a jump of `−3.6628e6` — note the arctangent chain factor
`cos²(delta_peak) = 0.9277`, without which that number is 7.2% wrong.
**Nothing in this profile differentiates across the transition.** The
domain excludes it.

## 7 · Supported domain

Declared on the smallest defensible basis, as four different boundaries
that are NOT the same boundary:

| region | where | what it means |
| --- | --- | --- |
| the model is defined | `phi > 0` | the formula returns a finite number |
| the limiter is active | `phi < 291.70/em arcsec` | a convention, not the model |
| the line of sight is obstructed | `phi < R_sun_apparent` | 943.5–975.5 arcsec over a year — **not a constant** |
| the model is worth its own error bar | `phi >~ 10 deg` | where `eraLd`'s omitted second-order term drops below 5e-8 arcsec |

The apparent solar radius is **not fixed**: over 2026 it runs 943.525 to
975.521 arcsec as the Earth's distance runs 0.983301 to 1.016646 au. A
fixed arcsecond threshold is therefore either sometimes inside or sometimes
outside the disc, and the domain test uses the *computed* apparent radius.

**Initial supported domain: solar elongation >= 5 degrees (18 000
arcsec).** Justification, in order of which binds:

1. It is 18.7× the largest apparent solar radius, so the line of sight is
   never obstructed and never near-obstructed.
2. It is 61.7× the widest limiter threshold, so the limiter never fires.
3. `eraLd`'s own omitted second-order term is **measured** there, not
   extrapolated: the independent ray integration puts it at **4.23e-7
   arcsec at 5 degrees** (Neptune, the worst of the bodies tested, because
   the enhancement goes as the source distance). The measured series is
   2.08e-3 arcsec at 0.3 deg, 5.58e-5 at 1 deg, 4.23e-7 at 5 deg, 4.97e-8
   at 10 deg.
4. It is where the current interval implementation can actually bound the
   deflection usefully — §8 of `DEFLECTION-PREREGISTRATION.md` fixes the
   number rather than this document guessing it.

Three bodies — Venus, Jupiter and Uranus — reach geometries at conjunction
where the deflection **exceeds the separation** (Uranus: 90.5 arcsec of
deflection at 17.4 arcsec of separation). All three are behind the disc and
far inside the excluded region. An earlier reading said only Venus did; a
2-hour grid had simply missed the other two.

### Outside the domain

A typed refusal, `out-of-domain`, carrying the computed elongation, the
computed apparent solar radius, and which of the four boundaries was
crossed. **Not** a silently limited number, and **not** a substituted
convention.

The ecliptic longitude of a body behind the Sun is still a well-defined
formal coordinate, and a chart may legitimately want it. This profile does
not supply it: the caller should use rung 4, which has no solar term and
no near-Sun degeneracy, and whose answer there is exactly as good as it is
anywhere else. That is a documented downgrade the caller chooses, not a
substitution this profile makes.

### Searches that cross the excluded region

The excluded interval is reported as an **excluded interval**, distinct
from `unresolved`: unresolved means the arithmetic could not decide,
excluded means the profile declines to model. `established` cannot be true
and `isExactTotal` cannot be true while either list is non-empty. Events
already isolated outside the excluded region are kept and reported as a
lower bound, exactly as a budget-exhausted run does.

How often it matters, geocentric, per body per year within 5 degrees:
measured from the ephemeris rather than estimated, in
`DEFLECTION-PREREGISTRATION.md` §4.

## 8 · Time, frame, coverage, data

Unchanged from rung 4 and restated so the profile is self-contained:

* **Time scale**: TDB seconds past J2000 in and out. The frame needs TT,
  through the declared two-term model, error 3e-5 s.
* **Frame**: mean ecliptic of date, true equinox of date.
* **Model coverage**: 1900–2100, IAU 2000B's own span, intersected with the
  pack's coverage, intersected with the elongation domain of §7.
* **Data identity**: the pack's `payloadSha256`, on every result.
* **Bodies**: the ten of the retarded contract. System barycentres are
  barycentres, not centres, and every result says so.

## 9 · Pinned references

`tools/measure/erfa-deflection/`, by content digest:

| file | sha256 | revision |
| --- | --- | --- |
| `ld.c` | `affa41a6028f8f2e…` | 2021 February 24 |
| `ldsun.c` | `42c5ffb96f12c836…` | 2016 June 16 |
| `ab.c` | `ff4bac5fc8a2ccb5…` | 2021 February 24 |

ERFA **2.0.1** / SOFA Issue **2023-10-11**, from `configure.ac` on the
branch fetched. The same pair the frame vectors already pin, so this
package's reference set is one version and not two.

## 10 · What this profile does not claim

It is not an apparent place. It is not a complete relativistic model. It
does not surpass, replace, or benchmark against Swiss Ephemeris, and it
does not touch the production birth-chart engine.

Agreement with `eraLd` is agreement with a first-order model whose own
second-order omission is measured in §0. Near conjunction that omission is
larger than every implementation difference this package can measure, which
is the honest reason the supported domain is set where it is.
