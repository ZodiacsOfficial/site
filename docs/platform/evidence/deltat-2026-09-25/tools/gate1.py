"""Gate 1 and the fit against every IERS day. Writes ../iers-12.json and outputs/gate1.json.

    DELTAT_SOURCES=<dir> python3 tools/gate1.py [module]

- Gate 1 (rule 1c): |ΔT − IERS| ≤ 0.2 s at 12 dated values, 1962 to the last
  observed day, all at 0h UTC. IERS values by the per-era source rule: 20 C04
  through 1973-01-01, finals2000A rows flagged I after. rc.7's
  Espenak–Meeus polynomial is scored beside it.
- Every IERS day from 1962-01-01 to the last observed day: largest error, RMS,
  share within ±σ, and the smallest σ / formal error (M3's band rule: the band
  is at least the IERS formal error). Predicted rows (P) likewise.
- Representation of Table S15 (2016) from −720 to 1941 on a 0.05-year grid,
  and the joins.
The module is the reference implementation unless a path is given.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

DATES = [(1962, 3, 15), (1969, 9, 15), (1977, 3, 15), (1984, 9, 15), (1992, 3, 15), (1999, 9, 15),
         (2007, 3, 15), (2014, 9, 15), (2017, 8, 21), (2020, 1, 1), (2024, 4, 8), (2026, 9, 22)]


def main():
    module = sys.argv[1] if len(sys.argv) > 1 else None
    c04 = lib.read_c04()
    finals = lib.read_finals()
    daily = lib.iers_daily(c04, finals)
    obs = lib.last_observed(daily)
    src = {s['file']: s for s in json.load(open(os.path.join(lib.EVIDENCE, 'sources.json')))['sources'] if 'sha256' in s}

    # ---- gate 1
    def raw_rows(name, mjds, parse):
        out = {}
        for line in open(lib.source(name)):
            m = parse(line)
            if m in mjds:
                out[m] = line.rstrip('\n')
        return out
    gate_mjds = {lib.mjd_of(*d) for d in DATES}

    def c04_mjd(line):
        if line.startswith('#') or not line.strip():
            return None
        return int(float(line.split()[4]))

    def finals_mjd(line):
        return int(float(line[7:15])) if len(line) >= 78 and line[57] in 'IP' else None
    raw = {'C04': raw_rows('eopc04.1962-now', gate_mjds, c04_mjd), 'finals': raw_rows('finals2000A.all', gate_mjds, finals_mjd)}
    rows = []
    for y, m, d in DATES:
        mjd = lib.mjd_of(y, m, d)
        v, err, flag = daily[mjd]
        u = c04[mjd][0] if flag == 'C04' else finals[mjd][1]
        row = {'date': f'{y:04d}-{m:02d}-{d:02d}', 'mjd': mjd, 'source': 'eopc04.1962-now' if flag == 'C04' else 'finals2000A.all',
               'flag': 'I' if flag == 'C04' else flag, 'ut1MinusUtc': u, 'ut1MinusUtcError': err,
               'taiMinusUtc': round(lib.tai_utc(mjd), 7), 'ttMinusUt1': round(v, 4)}
        row['sourceRow'] = raw['C04' if flag == 'C04' else 'finals'][mjd]
        if flag != 'C04' and mjd in c04:
            row['c04TtMinusUt1'] = round(lib.tt_minus_ut1(c04[mjd][0], mjd), 4)
        assert row['flag'] == 'I', row
        rows.append(row)
    uts = [lib.ut_of_mjd(r['mjd']) for r in rows]
    model = lib.ts_model(uts, module)
    em = lib.ts_model(uts, 'espenak-meeus')
    for r, s, sg, e in zip(rows, model['seconds'], model['sigma'], em['seconds']):
        r['model'] = round(s, 4)
        r['sigma'] = round(sg, 4)
        r['residual'] = round(s - r['ttMinusUt1'], 4)
        r['rc7Residual'] = round(e - r['ttMinusUt1'], 3)
    worst = max(rows, key=lambda r: abs(r['residual']))
    worst_rc7 = max(rows, key=lambda r: abs(r['rc7Residual']))
    fixture = {
        'rule': 'Rule 1c, gate 1: |ΔT − IERS| ≤ 0.2 s at these 12 instants (0h UTC). ΔT = 32.184 + (TAI − UTC) − (UT1 − UTC).',
        'sourceRule': '20 C04 through 1973-01-01 (MJD 41683); finals2000A rows flagged I from 1973-01-02.',
        'sources': {k: {'sha256': src[k]['sha256'], 'bytes': src[k]['bytes'], 'lastModified': src[k]['lastModified'], 'url': src[k]['url']}
                    for k in ('eopc04.1962-now', 'finals2000A.all', 'tai-utc.dat')},
        'values': [{k: r[k] for k in ('date', 'mjd', 'source', 'flag', 'ut1MinusUtc', 'ut1MinusUtcError', 'taiMinusUtc', 'ttMinusUt1') + (('c04TtMinusUt1',) if 'c04TtMinusUt1' in r else ()) + ('sourceRow',)}
                   for r in rows],
    }
    with open(os.path.join(lib.EVIDENCE, 'iers-12.json'), 'w') as f:
        json.dump(fixture, f, indent=1, ensure_ascii=False)
        f.write('\n')

    # ---- every IERS day
    days = sorted(m for m in daily if m >= lib.mjd_of(1962, 1, 1))
    ev = lib.ts_model([lib.ut_of_mjd(m) for m in days], module)
    o = {'n': 0, 'ss': 0.0, 'max': 0.0, 'at': None, 'inside': 0, 'minRatio': math.inf}
    p = {'n': 0, 'max': 0.0, 'at': None, 'inside': 0, 'minRatio': math.inf}
    decades = {}
    for m, s, sg in zip(days, ev['seconds'], ev['sigma']):
        v, err, flag = daily[m]
        d = s - v
        acc = o if flag in ('C04', 'I') else p
        acc['n'] += 1
        if flag != 'P':
            o['ss'] += d * d
            dec = decades.setdefault(lib.date_of_mjd(m)[0] // 10 * 10, [0, 0.0, 0.0])
            dec[0] += 1
            dec[1] += d * d
            dec[2] = max(dec[2], abs(d))
        if abs(d) > acc['max']:
            acc['max'], acc['at'] = abs(d), lib.iso_of_mjd(m)
        acc['inside'] += abs(d) <= sg
        acc['minRatio'] = min(acc['minRatio'], sg / err) if err > 0 else acc['minRatio']
    observed = {'days': o['n'], 'from': '1962-01-01', 'to': lib.iso_of_mjd(obs), 'maxAbs': round(o['max'], 4), 'maxAt': o['at'],
                'rms': round(math.sqrt(o['ss'] / o['n']), 4), 'withinSigma': round(o['inside'] / o['n'], 4),
                'minSigmaOverFormalError': round(o['minRatio'], 2),
                'byDecade': {str(k): {'days': v[0], 'rms': round(math.sqrt(v[1] / v[0]), 4), 'maxAbs': round(v[2], 4)} for k, v in sorted(decades.items())}}
    predicted = {'days': p['n'], 'to': lib.iso_of_mjd(max(daily)), 'maxAbs': round(p['max'], 4), 'maxAt': p['at'],
                 'withinSigma': round(p['inside'] / p['n'], 4), 'minSigmaOverFormalError': round(p['minRatio'], 2)}

    # ---- Table S15 representation and joins
    t16 = lib.s15_2016()
    grid = [-720 + 0.05 * k for k in range(int((1941 + 720) / 0.05))]
    rep = lib.ts_model([(y - 2000) * 365.25 for y in grid], module)
    diffs = [abs(s - lib.s15(t16, y)) for y, s in zip(grid, rep['seconds'])]
    k = max(range(len(diffs)), key=lambda i: diffs[i])
    representation = {'maxAbs': round(diffs[k], 4), 'at': round(grid[k], 2), 'gridYears': 0.05}
    table = lib.load_table()
    y_obs = lib.year_of_mjd(table['knots']['observedTo']['mjd'])
    y_pred = lib.year_of_mjd(table['knots']['predictedTo']['mjd'])
    eps = 1e-7
    probes = [-720, 1941, 1956, y_obs, y_pred]
    jv = lib.ts_model([((y + dy) - 2000) * 365.25 for y in probes for dy in (-eps, 0.0, 0.01, -0.01)], module)
    joins = {}
    for i, (name, y) in enumerate(zip(['-720', '1941', '1956', 'observedTo', 'predictedTo'], probes)):
        s = jv['seconds'][4 * i:4 * i + 4]
        g = jv['sigma'][4 * i:4 * i + 4]
        joins[name] = {'year': round(y, 5), 'valueLeft': round(s[0], 4), 'valueRight': round(s[1], 4), 'valueStep': round(s[1] - s[0], 4), 'sigmaLeft': round(g[0], 4), 'sigmaRight': round(g[1], 4),
                       'slopeLeft': round((s[1] - s[3]) / 0.01, 4), 'slopeRight': round((s[2] - s[1]) / 0.01, 4),
                       'segments': [jv['segment'][4 * i], jv['segment'][4 * i + 1]]}

    out = {'module': os.path.basename(model['module']), 'tableDigest': model['table']['digest'], 'tableVersion': model['table']['version'],
           'gate1': {'limit': 0.2, 'maxAbsResidual': round(abs(worst['residual']), 4), 'worstDate': worst['date'],
                     'rc7MaxAbsResidual': round(abs(worst_rc7['rc7Residual']), 3), 'rc7WorstDate': worst_rc7['date'],
                     'values': [{k: r[k] for k in ('date', 'ttMinusUt1', 'model', 'sigma', 'residual', 'rc7Residual')} for r in rows],
                     'verdictOnReference': 'PASS' if abs(worst['residual']) <= 0.2 else 'FAIL'},
           'everyObservedDay': observed, 'predictedRows': predicted, 's15Representation': representation, 'joins': joins}
    lib.dump(out, 'gate1.json')
    print(json.dumps(out['gate1'], indent=1))
    print(json.dumps({k: out[k] for k in ('everyObservedDay', 'predictedRows', 's15Representation', 'joins')}, indent=1))


if __name__ == '__main__':
    main()
