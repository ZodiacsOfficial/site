# Why the all-ten-body maximum is an arcsecond when the median is half a milliarcsecond

Dated 2026-09-20. This corrects an **interpretation** in
`FOUR-CONFIGURATIONS.md`. Not one recorded number changes: the measurement
was re-run against the same pack `c9ebc641…`, the same kernel and the same
Swiss installation, and every figure in `raw/four-configurations/report.json`
came back bit-identical. What changed is the sentence explaining them.

Tool: `examples/precision-alpha/tools/measure/deflection-audit.mjs`.
Output: `raw/deflection-audit/report.json` (grid, 29,460 body-epochs) and
`raw/deflection-audit-corpus/report.json` (corpus, 160). Swiss remains a
measuring instrument; the bulk per-instant values it writes are gitignored.

## The claim that was wrong

> Swiss returns the planet centre; this pack and this kernel give a
> planetary-SYSTEM barycentre for Mars outward. Comparing those against
> Swiss measures that difference, not the reduction, so the headline is the
> four bodies where both sides mean the same point.

Both halves are wrong for the outer bodies, and the document's own numbers
were already saying so.

### What Swiss actually returns, checked rather than assumed

`tools/measure/swiss.py` calls `swe.calc_ut(jd, ipl, FLG_SWIEPH|FLG_SPEED)`
with the ordinary body identifiers. Run against pyswisseph 2.10.03:

```
FLG_CENTER_BODY = 1048576          (not requested by swiss.py)

body      default lon          +CENTER_BODY lon      difference
Sun       280.009507242139     280.009507242139      0.000000"
Moon      346.138414785388     346.138414785388      0.000000"
Mercury   274.383330781643     274.383330781643      0.000000"
Venus     314.409508272029     314.409508272029      0.000000"
Mars      238.384622401460     238.384622401460      0.000000"
Jupiter   276.670351966249     CENTER_BODY raised: file 'sepm9599.se1' not found
Saturn    291.394970749117     CENTER_BODY raised: file 'sepm9699.se1' not found
Uranus     32.694052118222     CENTER_BODY raised: file 'sepm9799.se1' not found
Neptune   346.264534803049     CENTER_BODY raised: file 'sepm9899.se1' not found
Pluto     292.385615274775     CENTER_BODY raised: file 'sepm9999.se1' not found
```

Three facts follow, none of them assumed:

1. For Jupiter outward, Swiss needs **`SEFLG_CENTER_BODY` plus a
   planetary-moon file** (`sepm95xx`…`sepm99xx.se1`) to produce a body
   centre. It has to construct one. Its default is therefore not a body
   centre — it is the planetary-system barycentre, the same point this pack
   and DE440s store.
2. For Sun through Mars the flag is a **no-op to twelve decimal places**.
   The Mars system barycentre sits about 9 mm from Mars's centre; there is
   nothing to correct.
3. The return flag is **258 = FLG_SWIEPH | FLG_SPEED with or without
   CENTER_BODY**, so `retflag` cannot tell a caller which centre it got.
   `swiss.py` reads the return flag to detect a Moshier fallback, which it
   does correctly; it cannot be used to detect a centre convention, and it
   never claimed to.

### The recorded data already refuted it

If Swiss returned body centres while this pack returned system
barycentres, the disagreement would be largest exactly where the satellite
systems are heaviest. Worst-case offsets, moons aligned, at each body's
minimum geocentric distance:

| body | barycentre offset | angular, at closest approach |
| --- | --- | --- |
| Mars | 0 km | 0.0000″ |
| Jupiter | 227 km | 0.0796″ |
| Saturn | 292 km | 0.0501″ |
| Uranus | 47 km | 0.0038″ |
| Neptune | 76 km | 0.0036″ |
| Pluto | 2126 km | 0.1025″ |

Measured, over the 2,946-instant grid, configuration D against Swiss,
restricted to body-epochs more than one solar radius from the Sun:

| body | system barycentre? | max | p50 |
| --- | --- | --- | --- |
| Sun | no | 0.002952″ | 0.000476″ |
| Moon | no | **0.013821″** | 0.002563″ |
| Mercury | no | 0.003503″ | 0.000490″ |
| Venus | no | 0.008835″ | 0.000502″ |
| Mars | yes | 0.005465″ | 0.000415″ |
| Jupiter | yes | 0.002245″ | **0.000305″** |
| Saturn | yes | 0.001982″ | 0.000330″ |
| Uranus | yes | 0.001849″ | 0.000241″ |
| Neptune | yes | 0.001762″ | 0.000275″ |
| Pluto | yes | 0.001678″ | 0.000282″ |

Jupiter agrees **35 times better than a centre-versus-barycentre mismatch
would allow**, Saturn 25 times, Pluto 61 times. The grid step is 37.211
days, which is not commensurate with any satellite period, so a
moon-period signal could not hide in the sampling. And the six "system
barycentre" bodies are not the worst four — they are the **best six**. The
document's own table had Jupiter's median as the lowest of all ten.

## What the arcsecond actually is

Every body-epoch in the grid whose disagreement exceeds 0.0139″ is a body
**behind the solar disc**. Elongations here are great-circle separations
from the apparent Sun, not longitude differences:

| epoch | body | elongation | D vs Swiss | with deflection off on both sides |
| --- | --- | --- | --- | --- |
| 2070-11-10T18:45:07Z | Mars | 0.0306° | −1.244680″ | −0.000647″ |
| 2069-12-10T21:10:33Z | Uranus | 0.0789° | −0.911437″ | −0.000033″ |
| 1864-11-10T03:20:38Z | Mercury | 0.1071° | −0.167757″ | −0.000349″ |
| 2144-07-09T08:01:26Z | Jupiter | 0.1122° | +0.095107″ | −0.000704″ |
| 1912-11-05T12:29:16Z | Mars | 0.1831° | −0.017529″ | +0.000521″ |
| 2143-08-09T10:26:52Z | Moon | 22.4453° | −0.013821″ | −0.013819″ |

The Sun's apparent radius is about 0.266°. The first five are inside it.
The sixth is the Moon at 22°, unaffected by deflection, and it is the
largest honest disagreement in the whole sweep.

Turning gravitational light deflection off on **both** sides:

| group | max, deflection on | max, deflection off |
| --- | --- | --- |
| all 29,460 body-epochs | **1.244680″** | **0.013819″** |
| outside the solar disc (> 0.266°) | 0.013821″ | 0.013819″ |
| outside 1° | 0.013821″ | 0.013819″ |
| outside 3° | 0.013821″ | 0.013819″ |

One correction accounts for the entire spread, and only where the body is
occulted. Outside the disc, switching it off changes the maximum by
0.000002″.

On the corpus set nothing is behind the Sun at all: its all-ten maximum of
0.010666″ is the **Moon** at 65.9° elongation, and the 0.001538″ quoted for
"the six system barycentres" is **Saturn at 82° elongation** — as far from
a centre-versus-barycentre offset as it is possible to be.

## The four differences, separated

**Centre versus barycentre — excluded.** Both sides return the
planetary-system barycentre for Jupiter outward; Mars's offset is
millimetres. Bounded by the table above at 25–61× below what a mismatch
would produce. **No centre-correction data is added, because the
comparison does not show it is needed.**

**Time and frame — excluded by construction.** The harness sets
`ttDays = utDays + swissDeltaTSeconds/86400`
(`tools/measure/four-configurations.mjs:168`), so both sides evaluate the
same TT instant and a clock difference cannot appear as a modelling
difference. Frame bias, IAU 2006 precession and IAU 2000B nutation are the
same models on both sides, and whatever they contribute is inside the
0.0138″ floor below.

**Corrections — the whole of the spread.** Light-time, aberration and
deflection. Disabling deflection alone takes the maximum from 1.244680″ to
0.013819″, so light-time and aberration contribute nothing visible at this
scale.

**Implementation — what is left at grazing elongation.** Both sides use
the same point-mass (`eraLd`-form) deflection. They differ in what they do
when the impact parameter falls inside the Sun:

| epoch | body | elongation | our deflection | Swiss's deflection |
| --- | --- | --- | --- | --- |
| 2070-11-10 | Mars | 0.0306° | −1.546606″ | −0.302573″ |
| 2069-12-10 | Uranus | 0.0789° | −3.242075″ | −2.330671″ |
| 1864-11-10 | Mercury | 0.1071° | −1.297083″ | −1.129675″ |
| 2144-07-09 | Jupiter | 0.1122° | +0.904612″ | +0.808801″ |

`src/core/reduce.mjs:111` sets `deflectionLimit: 1e-14` and
`src/core/reduce.mjs:251` uses it as the floor on `q·(q+e)`. It is
deliberately far below the solar limb, so this reduction applies an
effectively unclamped formula where ERFA's `eraLdsun` would clamp at 1e-6.
Swiss limits it. Neither is verifiable: at these
elongations **the body is behind the Sun and nothing is observable**, so
both numbers extrapolate a point-mass formula outside its domain. The
divergence is real, it is bounded, and it belongs to configurations that do
not occur in practice.

**The floor — kernel and model.** With the near-Sun cases and deflection
set aside, the residual is 0.0138″ maximum, and that maximum is the Moon;
every other body is at or below 0.0089″, with medians of 0.24–0.5 mas. That
is the DE440s-versus-Swiss-source difference plus the compression plus
everything else, and it is the honest headline for how these two agree.

## What this changes in FOUR-CONFIGURATIONS.md

Two sentences, regenerated from
`tools/measure/four-configurations.mjs` rather than hand-edited:

- The four-body subset is **retained** — it is what the earlier record
  reported, so the numbers stay comparable — but it is now described as
  continuity, not as a centre-versus-barycentre correction, and the note
  says plainly that all ten bodies mean the same point.
- The "six system barycentres" line no longer calls the gap a definition
  difference. It says what the gap is.

Worth stating, because the subset does not do what it was thought to do:
Mercury sits in the four-body headline and Mercury at 0.1071° elongation is
one of the five occulted spikes — 0.167757″, which is the entire four-body
grid maximum for configuration D. **Restricting to four bodies never
excluded the near-Sun cases.** Restricting by elongation does, and it
applies to all ten equally.

## What is still not claimed

Agreement with Swiss is consistency between two descendants of JPL
development ephemerides, not accuracy, and nothing here is evidence of
superior physical astronomy. Nothing here says which deflection treatment
is correct at grazing elongation; it says the two differ and that no
observation can settle it. No centre-of-body data has been added, and none
is needed.
