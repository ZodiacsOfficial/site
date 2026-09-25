"""The band σ before 1956, from CC BY 4.0 and IERS sources only. Writes ../sigma.json.

    DELTAT_SOURCES=<dir> python3 tools/derive_sigma.py

For each bin of years, four measured indicators; the band is at least the
largest of them:
  F  the floor. RMS of Table S15 (2016) against IERS daily values over
     1962-01-01 to 1971-12-31, the first decade where both exist. It is how
     far an occultation reconstruction sits from the observed value where the
     two can be compared.
  P  before 1620 only, where the curve rests on eclipses: SMH 2016's
     published uncertainty of its parabola, eq. (4.1): 32.5 ± 0.6 s/cy²,
     i.e. 0.6·t² s with t in centuries from 1825, taken at the bin's earliest
     year. (From 1620 the occultations constrain the curve and D and F apply.)
  R  the size of the authors' own revision: the largest |S15.2020 − S15.2016|
     in the bin (the 2020 table is read only for this number).
  D  from 1620 (lunar occultations begin): the weighted mean of
     (SMH's occultation values − Table S15) in the bin and its standard error,
     combined as sqrt(mean² + SE²). Weights are SMH's (Wt = 0.09/ERR²), SMH's
     outlier limits (±100 s before 1700, ±25 s after) are applied about the
     curve, and SE is scaled by the bin's own reduced χ². Decades are pooled
     until a bin holds at least 30 observations.
Bins: 20 years from −720 to 1620, then the pooled decades to 1850. From 1850
to 1956 every indicator but F is below F, which the tool checks and records.

The band is a piecewise-linear upper envelope of the bin maxima, with its
points on bin edges: it stays at or above every bin's value, and at every
edge at most 1.25 times (before 1800) or 1.1 times (from 1800) the larger of the
two adjacent bins' values; points are chosen left to right, each segment as
long as those limits allow; values are rounded up to two significant figures. Before −720 the band is 0.6·t², which
equals the envelope's first value there.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

T16 = lib.s15_2016()
T20 = lib.s15_2020()


def P(y):
    t = (y - 1825) / 100
    return 0.6 * t * t


def R(a, b, step=0.05):
    n = int(round((b - a) / step))
    return max(abs(lib.s15(T20, a + k * step) - lib.s15(T16, a + k * step)) for k in range(n + 1) if a + k * step < b)


def floor_F(daily, a=1962, b=1972):
    r = [lib.s15(T16, lib.year_of_mjd(m)) - v[0] for m, v in daily.items() if lib.mjd_of(a, 1, 1) <= m < lib.mjd_of(b, 1, 1)]
    rms = math.sqrt(sum(x * x for x in r) / len(r))
    return rms, max(abs(x) for x in r), len(r)


def occultations():
    out = []
    for line in open(lib.source('extract-lunarocc.dat')):
        y = float(line[0:10])
        dt = float(line[24:34])
        w = float(line[36:44])
        c = lib.s15(T16, y)
        if c is None:
            continue
        if abs(dt - c) <= (100 if y < 1700 else 25):
            out.append((y, dt - c, w))
    return out


def D(occ, a, b):
    v = [(r, w) for y, r, w in occ if a <= y < b]
    n = len(v)
    if n < 2:
        return n, None, None, None
    sw = sum(w for _, w in v)
    mean = sum(r * w for r, w in v) / sw
    s2 = sum(w * (r - mean) ** 2 for r, w in v) / (n - 1)
    se = math.sqrt(s2 / sw)
    return n, mean, se, math.hypot(mean, se)


def round_up_2sf(x):
    if x <= 0:
        return 0.0
    e = math.floor(math.log10(x)) - 1
    q = 10 ** e
    return round(math.ceil(x / q - 1e-9) * q, max(0, -e))


def envelope(bins, slack):
    """bins: [(a, b, M)] contiguous; slack(year) -> allowed ratio to the tight envelope.
    Returns [(year, σ)], linear between points, with σ >= M on every bin (checked at
    both ends of each bin) and σ <= slack × tight at every bin edge, where tight at an
    edge is the larger of its two bins' values. Points sit on bin edges and are chosen
    left to right, each segment reaching as far as it can with its end value as low as
    the lower bounds allow."""
    edges = [bins[0][0]] + [b for _, b, _ in bins]
    tight = [max(bins[k - 1][2] if k > 0 else 0, bins[k][2] if k < len(bins) else 0) for k in range(len(edges))]
    last = len(edges) - 1
    i, vi = 0, tight[0]
    pts = [(edges[0], vi)]
    while i < last:
        best = None
        for j in range(i + 1, last + 1):
            xi, xj = edges[i], edges[j]
            lo = tight[j]
            for k in range(i, j):
                for e in (edges[k], edges[k + 1]):
                    if e > xi:
                        lo = max(lo, vi + (bins[k][2] - vi) * (xj - xi) / (e - xi))
            at = lambda x: vi + (x - xi) * (lo - vi) / (xj - xi)
            if all(at(edges[k]) <= slack(edges[k]) * tight[k] + 1e-9 for k in range(i, j + 1)):
                best = (j, lo)
        j, lo = best
        pts.append((edges[j], lo))
        i, vi = j, lo
    out = [(x, round_up_2sf(v)) for x, v in pts]
    for (x0, v0), (x1, v1) in zip(out, out[1:]):  # rounding up keeps σ >= M; check anyway
        for a, b, m in bins:
            if a >= x0 and b <= x1:
                assert min(v0 + (a - x0) * (v1 - v0) / (x1 - x0), v0 + (b - x0) * (v1 - v0) / (x1 - x0)) >= m - 1e-9
    return out


def main():
    daily = lib.iers_daily()
    F_rms, F_max, F_n = floor_F(daily)
    F = math.ceil(F_rms * 100 - 1e-9) / 100
    occ = occultations()
    rows = []
    # Before 1620 the band is max(P, T): P is a formula in the engine, T a table.
    # Where P alone covers every indicator (P at the bin's end, its smallest value,
    # at or above the bin's largest R), T is not needed.
    start = None
    for a in range(-720, 1620, 20):
        b = a + 20
        r = R(a, b)
        rows.append({'from': a, 'to': b, 'P': round(P(a), 3), 'Pend': round(P(b), 3), 'R': round(r, 3),
                     'M': round(max(F, P(a), r), 3)})
        if start is None and P(b) < max(F, r):
            start = a
    bins = []
    for a in range(start, 1620, 20):
        bins.append((a, a + 20, max(F, R(a, a + 20))))
    edges = list(range(1620, 1860, 10))
    i = 0
    while i < len(edges) - 1:
        a = edges[i]
        j = i + 1
        while j < len(edges) - 1 and D(occ, a, edges[j])[0] < 30:
            j += 1
        b = edges[j]
        n, mean, se, d = D(occ, a, b)
        m = max(F, R(a, b), d)
        bins.append((a, b, m))
        rows.append({'from': a, 'to': b, 'R': round(R(a, b), 3), 'n': n,
                     'meanResidual': round(mean, 3), 'SE': round(se, 3), 'D': round(d, 3), 'M': round(m, 3)})
        i = j
    # 1850-1956: every indicator but F is below F
    after = []
    for a in range(1850, 1956, 10):
        b = min(a + 10, 1956)
        n, mean, se, d = D(occ, a, b)
        after.append({'from': a, 'to': b, 'R': round(R(a, b), 3), 'n': n, 'D': round(d, 3)})
        assert max(R(a, b), d) < F, (a, b)
    bins.append((1850, 1956, F))
    pts = envelope(bins, lambda y: 1.25 if y < 1800 else 1.1)
    # check the band pointwise on a 0.25-year grid against every indicator
    worst = 0
    for k in range(int((1956 + 720) / 0.25)):
        y = -720 + 0.25 * k
        band = max(P(y) if y < 1620 else 0, interp(pts, y))
        need = max(F, abs(lib.s15(T20, y) - lib.s15(T16, y)) if y < 1945 else 0)
        worst = min(worst, band - need)
    assert worst >= -1e-9, worst
    out = {
        'floor': {'seconds': F, 'rms': round(F_rms, 4), 'max': round(F_max, 4), 'days': F_n,
                  'what': 'RMS of Table S15 (2016) minus IERS 20 C04 ΔT, every day 1962-01-01 to 1971-12-31, rounded up to 0.01 s',
                  'context': {f'{a}-{b - 1}': dict(zip(('rms', 'max', 'days'), (round(x, 4) if i < 2 else x for i, x in enumerate(floor_F(daily, a, b)))))
                              for a, b in ((1962, 1982), (1972, 1982), (1962, 2016))}},
        'bins': rows,
        'after1850': after,
        'points': [[x, v] for x, v in pts],
        'rule': 'y < −720: 0.6·t²; −720 ≤ y < 1620: max(0.6·t², table); 1620 ≤ y < 1956: table (linear between points; 0 before the first point); t = (y − 1825)/100',
    }
    with open(os.path.join(lib.EVIDENCE, 'sigma.json'), 'w') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('floor', F, 'rms', round(F_rms, 4), 'max', round(F_max, 4), 'table from', start)
    print('points', len(pts), pts)


def interp(pts, y):
    if y < pts[0][0]:
        return 0.0
    for (x0, v0), (x1, v1) in zip(pts, pts[1:]):
        if y < x1:
            return v0 + (y - x0) * (v1 - v0) / (x1 - x0)
    return pts[-1][1]


if __name__ == '__main__':
    main()
