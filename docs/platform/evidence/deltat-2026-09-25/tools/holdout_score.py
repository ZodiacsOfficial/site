"""Scores the step 1.4 holdout (holdout.ts's output) once, after the code commit.

    node --experimental-strip-types tools/moon/holdout-dump.mjs holdout-1.4.json > holdout-dump.jsonl
    DELTAT_SOURCES=<dir> python3 tools/holdout_score.py holdout-1.4.json holdout-dump.jsonl <ephe-dir>

Positions (gated, the paired measure per era): for each instant up to 2026
the Moon's paired clock contribution |(E − S(UT)) − (E − S(TT))| with Swiss as
the instrument (flag read on every call); p95 per era (1800–1849, 1850–1899,
1900–1949, 1950–1999, 2000–2026) must be ≤ 0.3″. The per-era p50 gap is
reported beside it, not gated (about 25 instants an era). Gate 1 on the
holdout: at every instant from 1962-01-01 to the last observed IERS day,
|ΔT − IERS| ≤ 0.2 s, IERS by the per-era source rule, linear between days.
The events part is reported, not gated (README, "Holdout").
"""
import json
import sys

import swisseph as swe

sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import lib  # noqa: E402

FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED
J2000 = 2451545.0
ERAS = [(1800, 1849), (1850, 1899), (1900, 1949), (1950, 1999), (2000, 2026)]


def wrap(a, b):
    return ((a - b + 540.0) % 360.0 - 180.0) * 3600.0


def moon(jd, tt):
    xx, ret = (swe.calc if tt else swe.calc_ut)(jd, swe.MOON, FLAGS)
    if ret < 0 or not ret & swe.FLG_SWIEPH:
        raise SystemExit(f'Swiss did not answer from its .se1 files (flag {ret})')
    return xx[0]


def main():
    holdout = json.load(open(sys.argv[1]))
    rows = [json.loads(line) for line in open(sys.argv[2]).read().splitlines()[1:]]
    swe.set_ephe_path(sys.argv[3])
    assert [r['utc'] for r in rows] == [p['utc'] for p in holdout['positions']]
    daily = lib.iers_daily()
    obs = lib.last_observed(daily)
    per = {}
    gate1 = []
    for r in rows:
        y = int(r['utc'][:4])
        a = wrap(r['moon'], moon(J2000 + r['ut'], False))
        b = wrap(r['moon'], moon(J2000 + r['tt'], True))
        per.setdefault(y, []).append((abs(a), abs(b), abs(a - b)))
        mjd = 51544.5 + r['ut']
        if lib.mjd_of(1962, 1, 1) <= mjd <= obs:
            gate1.append(abs((r['tt'] - r['ut']) * 86400 - lib.daily_at(daily, mjd)))

    def pct(v, q):
        v = sorted(v)
        return round(v[min(len(v) - 1, int(q * len(v)))], 3) if v else None
    out = {'id': holdout['id'], 'positionsSha256': holdout['positionsSha256'], 'eras': {}}
    for lo, hi in ERAS:
        sel = [x for y, xs in per.items() if lo <= y <= hi for x in xs]
        out['eras'][f'{lo}-{hi}'] = {'n': len(sel), 'pairedP95': pct([x[2] for x in sel], 0.95),
                                     'gapP50': round(pct([x[0] for x in sel], 0.5) - pct([x[1] for x in sel], 0.5), 3) if sel else None}
    out['gate1'] = {'instants': len(gate1), 'maxAbs': round(max(gate1), 4) if gate1 else None}
    out['verdict'] = {'paired': all(e['pairedP95'] is None or e['pairedP95'] <= 0.3 for e in out['eras'].values()),
                      'gate1': all(x <= 0.2 for x in gate1)}
    json.dump(out, sys.stdout, indent=1)
    sys.stdout.write('\n')


if __name__ == '__main__':
    main()
