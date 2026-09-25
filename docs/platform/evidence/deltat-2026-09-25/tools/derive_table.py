"""Derives the zodiacs-deltat/1 table from the named sources. Writes ../table.json.

    DELTAT_SOURCES=<dir> python3 tools/derive_table.py

1. The reconstruction, −720 to 1941: the C2 cubic spline of Stephenson,
   Morrison & Hohenkerk (2016), Table S15, through its 32 knots from −720 to
   1945 (the rows' a_0, in 0.01 s) with the end second derivatives of its
   first row at −720 and of the row that ends at 1945.
2. Whole-year knots from 1941 (y = 2000 + ut/365.25, so y = 1962 is
   1962-01-01T00:00Z and y = 2027 is 2027-01-01T06:00Z): USNO
   historic_deltat.data to 1961, then IERS ΔT at the knot's instant, linear
   between the daily values at 0h UTC (C04 through 1973-01-01, finals2000A I
   rows after), for every whole year before the last observed day.
3. A knot at the last observed day (the last finals2000A I row).
4. Four knots evenly spaced from there to the last predicted day (the last
   finals2000A P row), from the P rows.
All knot values are rounded to 0.01 s. The digest is the first 16 hex digits
of SHA-256 over the JSON text [from, observedTo, predictedTo, ...knots], with
knots in 0.01 s, the first absolute and the rest differences, exactly as
deltat.ts holds them.
"""
import hashlib
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

PREDICTION_STEPS = 4


def main():
    rows = lib.s15_2016()
    usno = lib.read_usno_historic()
    daily = lib.iers_daily()
    obs = lib.last_observed(daily)
    pred = max(daily)
    assert all(daily[m][2] == 'P' for m in range(obs + 1, pred + 1)) and all(m in daily for m in range(lib.mjd_of(1962, 1, 1), pred + 1))

    # 1. spline knots
    starts = [r[0] for r in rows]
    X = [x for x in starts if x <= 1945]
    Y = [round(rows[starts.index(x)][2] * 100) for x in X]
    k0, k1, a0, a1, a2, a3 = rows[0]
    m0 = 2 * a2 / (k1 - k0) ** 2
    end = next(r for r in rows if r[1] == 1945)
    mn = (2 * end[4] + 6 * end[5]) / (end[1] - end[0]) ** 2
    spline = {'years': [int(x) for x in X], 'centiseconds': Y, 'curvature': [round(m0, 6), round(mn, 6)]}

    # 2-4. knots
    y_obs = lib.year_of_mjd(obs)
    yearly = []
    y = 1941
    while y < y_obs:
        if y < 1962:
            v = usno[float(y)][0]
        else:
            v = lib.daily_at(daily, lib.mjd_of_year(y))
        yearly.append(round(v * 100))
        y += 1
    step = (pred - obs) / PREDICTION_STEPS
    tail = [round(lib.daily_at(daily, obs + k * step) * 100) for k in range(PREDICTION_STEPS + 1)]
    absolute = yearly + tail
    knots = [absolute[0]] + [b - a for a, b in zip(absolute, absolute[1:])]
    canon = json.dumps([1941, obs, pred] + knots, separators=(',', ':'))
    digest = hashlib.sha256(canon.encode()).hexdigest()[:16]

    sigma = json.load(open(os.path.join(lib.EVIDENCE, 'sigma.json')))
    table = {
        'model': 'zodiacs-deltat/1',
        'version': lib.iso_of_mjd(obs),
        'digest': digest,
        'digestInput': canon,
        'spline': spline,
        'knots': {
            'from': 1941,
            'yearly': yearly,
            'observedTo': {'mjd': obs, 'date': lib.iso_of_mjd(obs), 'centiseconds': tail[0]},
            'prediction': [{'mjd': obs + k * step, 'centiseconds': tail[k]} for k in range(1, PREDICTION_STEPS + 1)],
            'predictedTo': {'mjd': pred, 'date': lib.iso_of_mjd(pred), 'centiseconds': tail[-1]},
            'encoded': knots,
        },
        'sigma': {'floor': sigma['floor']['seconds'], 'atomicFrom': 1956, 'telescopicFrom': 1620,
                  'points': sigma['points']},
        'extrapolation': {'tau': 15, 'slope': 'over the prediction window: (last knot − observed knot) / its length in years'},
        'sources': {s['file']: s['sha256'] for s in json.load(open(os.path.join(lib.EVIDENCE, 'sources.json')))['sources'] if 'sha256' in s},
    }
    with open(os.path.join(lib.EVIDENCE, 'table.json'), 'w') as f:
        json.dump(table, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('version', table['version'], 'digest', digest, 'yearly', len(yearly), 'knots', len(knots))
    print('spline', spline)
    print('tail', tail, 'observedTo', obs, 'predictedTo', pred, 'step days', step)
    print('encoded', knots)


if __name__ == '__main__':
    main()
