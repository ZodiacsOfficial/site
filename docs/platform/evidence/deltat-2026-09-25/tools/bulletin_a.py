"""Bulletin A's UT1 − UTC predictions against what was then observed, and the
band σ(h) = 0.03 + 0.09·h^0.75 s against the realized errors. Writes
outputs/bulletin-a.json.

    DELTAT_SOURCES=<dir> python3 tools/bulletin_a.py

For each issue, the error at horizon d days is the predicted UT1 − UTC for
(reference MJD + d) minus the finals2000A I value for that day. Where a leap
second not yet announced fell inside the horizon (2015-06-30 and 2016-12-31,
quarterly set only) the difference carries a 1 s step, which is removed: the
error in ΔT = TT − UT1 has no such step. S_t is the issue's own stated
accuracy, 0.00025·d^0.75 s.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

HORIZONS = (10, 30, 60, 90, 120, 180, 270, 365)


def sigma_days(d):
    h = d / 365.25
    return 0.03 + 0.09 * h ** 0.75


def evaluate(files, obs):
    errs = {h: [] for h in HORIZONS}
    used = 0
    for f in files:
        r = lib.read_bulletin_a(f)
        if not r:
            continue
        used += 1
        for h in HORIZONS:
            m = r['ref'] + h
            if m in r['pred'] and m in obs:
                d = r['pred'][m] - obs[m]
                errs[h].append(d - round(d))
    out = {}
    for h, e in errs.items():
        if not e:
            continue
        a = sorted(abs(x) for x in e)
        rms = math.sqrt(sum(x * x for x in e) / len(e))
        st = 0.00025 * h ** 0.75
        out[str(h)] = {'n': len(e), 'rms': round(rms, 4), 'p68': round(a[int(0.68 * (len(a) - 1))], 4), 'max': round(a[-1], 4),
                       'S_t': round(st, 4), 'rmsOverS_t': round(rms / st, 2),
                       'sigma': round(sigma_days(h), 4), 'sigmaOverRms': round(sigma_days(h) / rms, 2),
                       'withinSigma': round(sum(1 for x in a if x <= sigma_days(h)) / len(a), 3)}
    return used, out


def main():
    finals = lib.read_finals()
    obs = {m: v[1] for m, v in finals.items() if v[0] == 'I'}
    quarterly = lib.bulletins('bulletin-a-quarterly')
    weekly = lib.bulletins('bulletin-a')
    res = {}
    for name, files in (('quarterly 2015–2025', quarterly), ('weekly 2025-01-02 to 2026-09-17', weekly)):
        used, out = evaluate(files, obs)
        res[name] = {'issues': used, 'horizonsDays': out}
        print(name, used)
        for h, v in out.items():
            print(' ', h, v)
    lib.dump({'sigmaRule': 'σ = 0.03 + 0.09·(d/365.25)^0.75 s at d days after the last observed day', 'sets': res}, 'bulletin-a.json')


if __name__ == '__main__':
    main()
