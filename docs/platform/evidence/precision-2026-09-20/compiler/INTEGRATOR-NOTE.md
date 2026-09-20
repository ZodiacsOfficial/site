# Integrator note — structural findings, verified 2026-09-20

Read this before designing your candidates. Two facts change the problem.

## 1. Segment 399<-3 (Earth rel. EMB) is EXACTLY redundant, 8.57 MiB

`Earth_rel_EMB = -Moon_rel_EMB / EMRAT`, with `EMRAT = 81.3005682214972`.

Verified over 400 epochs spanning the full segment: max component error
**9.09e-13 km against magnitudes of ~4677 km — 1.9e-16 relative, i.e. machine
epsilon.** This is an algebraic identity, not a fit.

So 8.57 MiB of the 31.15 MiB of coefficients (27.5%) is removable with ZERO
error and one stored constant. Do not spend lossy budget on it, and do not
count it as a compression achievement of your method — report it separately as
a structural/lossless saving, because that is what it is.

## 2. Full segment inventory, by cost

```
 target center intlen ncoef  records      MiB
    301      3      4d    13     27400     8.57   Moon rel EMB      <- dominant
    399      3      4d    13     27400     8.57   Earth rel EMB     <- redundant
      1      0      8d    14     13700     4.60   Mercury bary
      3      0     16d    13      6850     2.14   EMB
     10      0     16d    11      6850     1.83   Sun
      2      0     16d    10      6850     1.67   Venus bary
      4      0     32d    11      3425     0.91   Mars bary
      5      0     32d     8      3425     0.68   Jupiter bary
      6      0     32d     7      3425     0.60   Saturn bary
      7      0     32d     6      3425     0.52   Uranus bary
      8      0     32d     6      3425     0.52   Neptune bary
      9      0     32d     6      3425     0.52   Pluto bary
    199      1 109600d     2         1     0.00   Mercury centre rel bary
    299      2 109600d     2         1     0.00   Venus centre rel bary
                                total 31.15
```

After removing 399 you are at 22.58 MiB and need ~2.9x more to reach the
7.80 MiB target. The Moon is 38% of what remains, so it decides the result —
which is exactly why it must not be dropped or down-weighted.

## 3. Mercury and Venus centres are free; Mars..Pluto centres do not exist here

199<-1 and 299<-2 are single records with 2 coefficients over the whole span.
Their magnitude is negligible, so barycentre == centre for those two. For Mars
through Pluto the kernel has NO body-centre segment, so any centre-vs-barycentre
error is inherent to this data source, not to your representation. Track 2 is
quantifying that separately; do not try to fix it in the compiler.
