"""Replays the weekly ΔT monitor over the 90 weekly Bulletin A issues of
2025-01-02 to 2026-09-17. Writes outputs/monitor-replay.json.

    DELTAT_SOURCES=<dir> python3 tools/monitor_replay.py

A table "as of" an issue is built by derive_table.py's rule from what was
known that day: whole-year knots and the observed knot from the finals2000A I
rows up to the issue's last observed day, and four prediction knots from that
issue's own predictions (365 days). The model is the Python twin (checked
against the TypeScript module by parity.py) with that table.

The monitor runs the day after each issue (the Friday), "today" being that
day at 0h UTC. It fires when
  (value)  |ΔT_model(today) − ΔT_IERS(today)| > max(0.1 s, σ_model(today)), or
  (window) the table's last prediction knot is fewer than 90 days after today.
ΔT_IERS(today) is the finals2000A value for that day (observed by now; on the
day itself it is the first predicted row, within a millisecond of it).
Each run also reports the largest |model − IERS prediction| over the issue's
prediction window, as the monitor's issue body would.

Refresh cadences replayed:
  none    the table of 2025-01-02 all through (89 runs after it);
  yearly  refreshed with the first issue of each calendar year (2025-01-02,
          2026-01-01), the yearly sky-data refresh;
The first issue only builds the first table; the 89 later issues are the runs.

Also measured: what a weekly table commit would have done. For each of the 89
weeks, the largest change of the model's ΔT, table of that week against the
week before, over the site's published event span (2026-01-01 to
2031-01-01, sampled daily). The site's generated data hold millisecond instants
that prebuild checks match exactly, so any change of 1 ms or more re-issues them.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

BASE = lib.load_table()


def table_as_of(issue, daily):
    ref = issue['ref']
    y_obs = lib.year_of_mjd(ref)
    yearly = []
    y = 1941
    usno = lib.read_usno_historic()
    while y < y_obs:
        v = usno[float(y)][0] if y < 1962 else lib.daily_at(daily, lib.mjd_of_year(y))
        yearly.append(round(v * 100))
        y += 1
    pred = {m: lib.tt_minus_ut1(u, m) for m, u in issue['pred'].items()}
    end = max(pred)
    assert end == ref + 365 and all(ref + k in pred for k in range(1, 366)), issue['date']

    def at(m):
        if m <= ref:
            return lib.daily_at(daily, m)
        a = math.floor(m)
        f = m - a
        va = daily[a][0] if a <= ref else pred[a]
        return va if f == 0 else va * (1 - f) + pred[a + 1] * f
    step = (end - ref) / 4
    tail = [round(at(ref + k * step) * 100) for k in range(5)]
    absolute = yearly + tail
    knots = [absolute[0]] + [b - a for a, b in zip(absolute, absolute[1:])]
    t = dict(BASE)
    t['knots'] = {'from': 1941, 'encoded': knots, 'observedTo': {'mjd': ref}, 'predictedTo': {'mjd': end}}
    return t, pred


def main():
    daily = lib.iers_daily()
    obs_days = {m: v[0] for m, v in daily.items() if v[2] in ('C04', 'I')}
    issues = sorted((lib.read_bulletin_a(p) for p in lib.bulletins('bulletin-a')), key=lambda r: r['ref'])
    assert len(issues) == 90
    cadences = {'none': {issues[0]['ref']}, 'yearly': {issues[0]['ref']} | {r['ref'] for r in issues if lib.date_of_mjd(r['ref'])[1:] <= (1, 7) and r['ref'] != issues[0]['ref']}}
    out = {}
    for name, refresh in cadences.items():
        model = None
        runs = []
        for r in issues:
            if r['ref'] in refresh:
                table, _ = table_as_of(r, daily)
                model = lib.Model(table)
                built = lib.iso_of_mjd(r['ref'])
                if r is issues[0]:
                    continue
            today = r['ref'] + 1
            y = lib.year_of_mjd(today)
            truth = obs_days[today]
            m = model.seconds(y)
            sig = model.sigma(y)
            pred_end = lib.mjd_of_year(model.pred_y)
            window_days = pred_end - today
            pred = {k: lib.tt_minus_ut1(u, k) for k, u in r['pred'].items()}
            worst_window = max(abs(model.seconds(lib.year_of_mjd(k)) - v) for k, v in pred.items())
            value_fire = abs(m - truth) > max(0.1, sig)
            window_fire = window_days < 90
            runs.append({'issue': r['date'], 'today': lib.iso_of_mjd(today), 'tableOf': built, 'model': round(m, 4), 'iers': round(truth, 4),
                         'diff': round(m - truth, 4), 'sigma': round(sig, 4), 'daysToLastPredictionKnot': round(window_days, 2),
                         'maxAbsVsIersPredictionWindow': round(worst_window, 4), 'valueFires': value_fire, 'windowFires': window_fire})
        fires = [x for x in runs if x['valueFires'] or x['windowFires']]
        episodes = 0
        prev = False
        for x in runs:
            now = x['valueFires'] or x['windowFires']
            episodes += now and not prev
            prev = now
        worst = max(runs, key=lambda x: abs(x['diff']))
        out[name] = {'refreshes': sorted(lib.iso_of_mjd(m) for m in refresh), 'runs': len(runs),
                     'valueFires': sum(x['valueFires'] for x in runs), 'windowFires': sum(x['windowFires'] for x in runs),
                     'runsFiring': len(fires), 'issueEpisodes': episodes,
                     'firstWindowFire': next((x['today'] for x in runs if x['windowFires']), None),
                     'maxAbsDiffToday': abs(worst['diff']), 'maxAbsDiffTodayOn': worst['today'],
                     'maxDiffOverSigma': round(max(abs(x['diff']) / x['sigma'] for x in runs), 3),
                     'maxAbsVsIersPredictionWindow': max(x['maxAbsVsIersPredictionWindow'] for x in runs),
                     'runsDetail': runs}
        print(name, {k: v for k, v in out[name].items() if k != 'runsDetail'})
    tables = [lib.Model(table_as_of(r, daily)[0]) for r in issues]
    span = [lib.year_of_mjd(m) for m in range(lib.mjd_of(2026, 1, 1), lib.mjd_of(2031, 1, 1))]
    shifts = []
    for a, b in zip(tables, tables[1:]):
        shifts.append(max(abs(b.seconds(y) - a.seconds(y)) for y in span))
    near = []
    for a, b, r in zip(tables, tables[1:], issues[1:]):
        lo = r['ref'] + 1
        near.append(max(abs(b.seconds(lib.year_of_mjd(m)) - a.seconds(lib.year_of_mjd(m))) for m in range(lo, lo + 2 * 365)))
    srt = sorted(shifts)
    weekly = {'weeks': len(shifts), 'weeksChangingAtLeast1ms': sum(x >= 0.001 for x in shifts),
              'medianMaxShiftSeconds': round(srt[len(srt) // 2], 4), 'maxShiftSeconds': round(srt[-1], 4),
              'maxShiftNextTwoYearsSeconds': round(max(near), 4), 'medianMaxShiftNextTwoYearsSeconds': round(sorted(near)[len(near) // 2], 4),
              'span': '2026-01-01 to 2030-12-31, daily'}
    print('weekly commits', weekly)
    lib.dump({'weeklyTableCommits': weekly, 'rule': 'fires when |model(today) − IERS(today)| > max(0.1 s, σ(today)) or when the last prediction knot is < 90 days away',
              'issues': 90, 'runs': 89, 'cadences': out}, 'monitor-replay.json')


if __name__ == '__main__':
    main()
