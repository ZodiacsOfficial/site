"""Rule 1c, gate 3, from dumps of multiyear-dump.mjs and corpus-dump.mjs. Statistics only.

    python3 tools/moon/moon_gate3.py <ephe-dir> <model multiyear dump> <rc.7 multiyear dump> <model corpus dump> <rc.7 corpus dump> > outputs/moon-gate3.json

Swiss Ephemeris is an instrument here, not a target: its Moon is evaluated at
the engine's UT (calc_ut, so with Swiss's own ΔT) and at the engine's TT
(calc). FLG_SWIEPH | FLG_SPEED, apparent geocentric ecliptic of date, as
swiss-benchmark/tools/multiyear_swiss.py; every call's return flag is read and
a row not answered from the .se1 files aborts the run.
  gap     p50 of |engine − Swiss at the same UT| minus p50 of |engine − Swiss
          at the engine's TT|, p50 being the ⌊n/2⌋-th sorted value; gated
          |gap| ≤ 0.3″ per era up to 2026 and on the corpus's 18 MEASURE cases.
  paired  per instant |(engine − Swiss(UT)) − (engine − Swiss(TT))|, the Moon
          displacement that comes only from the two ΔT values; gated p95 ≤ 0.3″
          per era up to 2026.
Eras after 2026 are reported without a gate: there both ΔT values are
extrapolations.
"""
import hashlib
import json
import sys

import swisseph as swe

FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED
J2000 = 2451545.0
GATED = [(1800, 1849), (1850, 1899), (1900, 1949), (1950, 1999), (2000, 2026)]
REPORTED = [(2027, 2049), (2050, 2099), (2100, 2149), (2150, 2199), (1800, 2026), (1962, 2026), (1800, 1961), (1800, 1954), (1955, 2026), (2000, 2049), (2027, 2199), (1800, 2199)]


def wrap(a, b):
    return ((a - b + 540.0) % 360.0 - 180.0) * 3600.0


def summ(v):
    v = sorted(v)
    n = len(v)
    return {'n': n, 'p50': round(v[n // 2], 3), 'p95': round(v[min(n - 1, int(0.95 * n))], 3), 'max': round(v[-1], 3)}


def moon(jd, tt):
    xx, ret = (swe.calc if tt else swe.calc_ut)(jd, swe.MOON, FLAGS)
    if ret < 0 or not ret & swe.FLG_SWIEPH:
        raise SystemExit(f'Swiss did not answer from its .se1 files (flag {ret}) at {jd}')
    return xx[0]


def multiyear(path):
    raw = open(path, 'rb').read()
    lines = raw.decode().splitlines()
    rows = []
    for line in lines[1:]:
        r = json.loads(line)
        lon = r['bodies']['Moon'][0]
        a = wrap(lon, moon(J2000 + r['ut'], False))
        b = wrap(lon, moon(J2000 + r['tt'], True))
        rows.append((int(r['utc'][:4]), abs(a), abs(b), abs(a - b)))
    out = {'dumpSha256': hashlib.sha256(raw).hexdigest(), 'header': json.loads(lines[0]), 'eras': {}}
    for lo, hi in GATED + REPORTED:
        sel = [x for x in rows if lo <= x[0] <= hi]
        ut, tt, pr = summ([x[1] for x in sel]), summ([x[2] for x in sel]), summ([x[3] for x in sel])
        out['eras'][f'{lo}-{hi}'] = {'gated': (lo, hi) in GATED, 'sameUt': ut, 'sameTt': tt,
                                     'gap': round(ut['p50'] - tt['p50'], 3), 'paired': pr}
    return out


def corpus(path):
    raw = open(path, 'rb').read()
    lines = raw.decode().splitlines()
    ut, tt = [], []
    for line in lines[1:]:
        r = json.loads(line)
        if r['set'] != 'measure':
            continue
        ut.append(abs(wrap(r['moon'], moon(J2000 + r['ut'], False))))
        tt.append(abs(wrap(r['moon'], moon(J2000 + r['tt'], True))))
    a, b = summ(ut), summ(tt)
    return {'dumpSha256': hashlib.sha256(raw).hexdigest(), 'header': json.loads(lines[0]), 'cases': len(ut),
            'sameUt': a, 'sameTt': b, 'gap': round(a['p50'] - b['p50'], 3)}


def main():
    ephe, model_dump, em_dump, model_corpus, em_corpus = sys.argv[1:6]
    swe.set_ephe_path(ephe)
    res = {'swiss': swe.version, 'flags': FLAGS, 'model': {'multiyear': multiyear(model_dump), 'corpus': corpus(model_corpus)},
           'rc7': {'multiyear': multiyear(em_dump), 'corpus': corpus(em_corpus)}}
    verdict = {}
    m = res['model']
    verdict['3a corpus |gap| <= 0.3'] = abs(m['corpus']['gap']) <= 0.3
    for lo, hi in GATED:
        e = m['multiyear']['eras'][f'{lo}-{hi}']
        verdict[f'3b {lo}-{hi} |gap| <= 0.3'] = abs(e['gap']) <= 0.3
        verdict[f'3c {lo}-{hi} paired p95 <= 0.3'] = e['paired']['p95'] <= 0.3
    res['onReference'] = verdict
    json.dump(res, sys.stdout, indent=1, ensure_ascii=False)
    sys.stdout.write('\n')


if __name__ == '__main__':
    main()
