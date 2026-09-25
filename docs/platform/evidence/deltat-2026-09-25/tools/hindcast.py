"""Hindcast of the extrapolation rule, and σ(h) against it. Writes outputs/hindcast.json.

    DELTAT_SOURCES=<dir> python3 tools/hindcast.py

Record: one ΔT value per year on 1 January (y = whole year): Table S15 (2016)
to 1940, USNO historic_deltat.data 1941–1961, IERS (C04 to 1972, finals I
rows after) 1962–2026. Each rule sees only the record up to its launch year L
and predicts L + h. Rules:
  hold             ΔT_L
  last slope       ΔT_L + s·h, s = ΔT_L − ΔT_{L−1}
  damped (model)   ΔT_L + s·τ(1 − e^(−h/τ)) + C(L, h), τ = 15 years, where
                   C = LT(L+h) − LT(L) − LT′(L)·h is the curvature of SMH 2016's
                   long-term curve (the integral of eq. 5.1)
  damped, no curve ΔT_L + s·τ(1 − e^(−h/τ))
  slope + parabola ΔT_L + s·h + 0.00325·h²   (0.00325 s/yr² is eq. 4.1's 32.5 s/cy²)
and the damped rule with τ = 10, 20 and 30 for comparison (τ = 15 is not refitted).
σ(h) is the model's band at h years after the last observation; the model
itself has a year of Bulletin A predictions before it extrapolates, so the
hindcast, which extrapolates from the last observed year, is the harder test.

The band's slope beyond ten years is set here: the smallest value, rounded up
to 0.01 s/yr, for which σ(10) + slope·(h − 10) is at least the model rule's
p68 error at every whole-year horizon from 20 to 100 years in every launch
window, with σ(10) = 0.12·10^1.5. p68 is the ⌊0.68(n − 1)⌋-th of the n sorted
absolute errors. The tool derives the slope and stops if the band in use
differs. It also reports what the ten tabulated horizons alone would require,
and the smallest σ/p68 over every whole-year horizon from 1 to 100.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

H = [1, 2, 3, 5, 10, 20, 30, 50, 75, 100]
WINDOWS = ((1851, 2025), (1955, 2025), (1700, 2025))
SIGMA_10 = 0.12 * 10 ** 1.5
SLOPE = 0.61  # s/yr beyond h = 10; derived in main() and checked there


def p68(errors):
    a = sorted(abs(x) for x in errors)
    return a[int(0.68 * (len(a) - 1))]


def sigma_h(h):
    if h <= 1:
        return 0.03 + 0.09 * h ** 0.75
    if h <= 10:
        return 0.12 * h ** 1.5
    return SIGMA_10 + SLOPE * (h - 10)


def main():
    t16 = lib.s15_2016()
    usno = lib.read_usno_historic()
    daily = lib.iers_daily()
    rec = {}
    for y in range(1620, 2027):
        if y < 1941:
            rec[y] = lib.s15(t16, float(y))
        elif y < 1962:
            rec[y] = usno[float(y)][0]
        else:
            rec[y] = lib.daily_at(daily, lib.mjd_of_year(y))

    def curve(L, h):
        return lib.long_term(L + h) - lib.long_term(L) - lib.long_term_rate(L) * h

    def rules(L, h):
        v = rec[L]
        s = rec[L] - rec[L - 1]
        out = {
            'hold': v,
            'last slope': v + s * h,
            'damped τ=15 + curve (model)': v + s * 15 * (1 - math.exp(-h / 15)) + curve(L, h),
            'damped τ=15, no curve': v + s * 15 * (1 - math.exp(-h / 15)),
            'slope + parabola': v + s * h + 0.00325 * h * h,
        }
        for tau in (10, 20, 30):
            out[f'damped τ={tau} + curve'] = v + s * tau * (1 - math.exp(-h / tau)) + curve(L, h)
        return out

    res = {}
    for lo, hi in WINDOWS:
        block = {}
        for h in H:
            errs = {}
            for L in range(lo, hi + 1):
                if L + h > 2026:
                    continue
                for k, v in rules(L, h).items():
                    errs.setdefault(k, []).append(v - rec[L + h])
            if not errs:
                continue
            row = {}
            for k, e in errs.items():
                row[k] = {'rms': round(math.sqrt(sum(x * x for x in e) / len(e)), 3), 'p68': round(p68(e), 3)}
            model = row['damped τ=15 + curve (model)']
            block[str(h)] = {'launches': len(next(iter(errs.values()))), 'sigma': round(sigma_h(h), 3),
                             'sigmaOverModelRms': round(sigma_h(h) / model['rms'], 2), 'rules': row}
        res[f'{lo}-{hi}'] = block
    summary = {}
    for w, block in res.items():
        model = {h: b['rules']['damped τ=15 + curve (model)'] for h, b in block.items()}
        sig = {h: b['sigma'] for h, b in block.items()}
        long = [h for h in block if int(h) >= 20]
        summary[w] = {
            'sigmaOverRms20to100': [round(min(sig[h] / model[h]['rms'] for h in long), 3), round(max(sig[h] / model[h]['rms'] for h in long), 3)] if long else None,
            'sigmaOverP68': {h: round(sig[h] / model[h]['p68'], 3) for h in block},
            'tauVariantsMaxRelativeRmsChange': round(max(abs(block[h]['rules'][f'damped τ={t} + curve']['rms'] / model[h]['rms'] - 1)
                                                         for h in block for t in (10, 20, 30)), 3),
            'bestRuleByHorizon': {h: min(((k, v['rms']) for k, v in block[h]['rules'].items() if k not in ('damped τ=10 + curve', 'damped τ=20 + curve', 'damped τ=30 + curve')), key=lambda kv: kv[1])[0] for h in block},
        }
    # The model rule's p68 at every whole-year horizon, in every launch window.
    every = {}
    for lo, hi in WINDOWS:
        for h in range(1, 101):
            e = [rules(L, h)['damped τ=15 + curve (model)'] - rec[L + h] for L in range(lo, hi + 1) if L + h <= 2026]
            if e:
                every[(f'{lo}-{hi}', h)] = (len(e), p68(e))
    needs = {key: (p - SIGMA_10) / (key[1] - 10) for key, (n, p) in every.items() if 20 <= key[1] <= 100}
    binding = max(needs, key=needs.get)
    derived = math.ceil(needs[binding] * 100 - 1e-9) / 100
    if abs(derived - SLOPE) > 1e-12:
        raise SystemExit(f'the band in use has slope {SLOPE} s/yr beyond ten years; the hindcast requires {derived}')
    tabulated = {key: v for key, v in needs.items() if key[1] in H}
    tab_binding = max(tabulated, key=tabulated.get)
    tab_slope = math.ceil(tabulated[tab_binding] * 100 - 1e-9) / 100
    tab_short = {}
    for (w, h), (n, p) in sorted(every.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        if 20 <= h <= 100 and SIGMA_10 + tab_slope * (h - 10) < p:
            tab_short.setdefault(w, []).append(h)
    coverage = {}
    for lo, hi in WINDOWS:
        w = f'{lo}-{hi}'
        ratios = {h: sigma_h(h) / every[(w, h)][1] for h in range(1, 101) if (w, h) in every}
        worst = min(ratios, key=ratios.get)
        coverage[w] = {'horizons': [min(ratios), max(ratios)], 'minSigmaOverP68': round(ratios[worst], 3), 'at': worst,
                       'horizonsBelowP68': sorted(h for h, r in ratios.items() if r < 1)}
    slope = {'rule': 'smallest slope, rounded up to 0.01 s/yr, with σ(10) + slope·(h − 10) ≥ the model rule\'s p68 at every whole-year horizon from 20 to 100 years in every launch window',
             'sigmaAt10': round(SIGMA_10, 7), 'required': round(needs[binding], 4), 'bindingWindow': binding[0], 'bindingHorizon': binding[1],
             'bindingLaunches': every[binding][0], 'bindingP68': round(every[binding][1], 3),
             'slope': derived, 'constant': round(derived * 10 - SIGMA_10, 7),
             'sigmaBeyond10': f'{derived}·h − {derived * 10 - SIGMA_10:.7f}',
             'tabulatedHorizonsOnly': {'required': round(tabulated[tab_binding], 4), 'window': tab_binding[0], 'horizon': tab_binding[1],
                                       'slope': tab_slope, 'wholeYearHorizonsBelowP68WithThatSlope': tab_short},
             'coverage': coverage}
    print('slope beyond 10 years', slope)
    lib.dump({'record': 'S15 (2016) to 1940, USNO 1941–1961, IERS 1962–2026, on 1 January', 'slopeBeyond10': slope, 'summary': summary, 'launchWindows': res}, 'hindcast.json')
    for w, block in res.items():
        print('launch years', w)
        for h, b in block.items():
            r = b['rules']
            print(f"  h={h:>3} n={b['launches']:>3} σ={b['sigma']:7.3f} σ/rms={b['sigmaOverModelRms']:5.2f} | " +
                  ' | '.join(f"{k} {v['rms']:.2f}" for k, v in r.items()))


if __name__ == '__main__':
    main()
