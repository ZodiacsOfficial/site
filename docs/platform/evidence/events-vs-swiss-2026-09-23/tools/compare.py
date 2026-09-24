"""Each published event instant against Swiss Ephemeris (SWIEPH files, apparent geocentric).

Usage: python3 compare.py catalog.json ephe-dir out.json
"""
import json, sys, math
from datetime import datetime, timezone
import swisseph as swe

catalog = json.load(open(sys.argv[1]))
swe.set_ephe_path(sys.argv[2])
FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED
BODY = {'Sun': swe.SUN, 'Moon': swe.MOON, 'Mercury': swe.MERCURY, 'Venus': swe.VENUS, 'Mars': swe.MARS,
        'Jupiter': swe.JUPITER, 'Saturn': swe.SATURN, 'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE, 'Pluto': swe.PLUTO}
SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
fallbacks = 0


def jd(iso):
    t = datetime.fromisoformat(iso.replace('Z', '+00:00'))
    return swe.julday(t.year, t.month, t.day, t.hour + t.minute / 60 + (t.second + t.microsecond / 1e6) / 3600)


def calc(body, t):
    global fallbacks
    x, flags = swe.calc_ut(t, BODY[body], FLAGS)
    if not flags & swe.FLG_SWIEPH:
        fallbacks += 1
    return x


def lon(body, t):
    return calc(body, t)[0]


def speed(body, t):
    return calc(body, t)[3]


def wrap(d):
    return (d + 180) % 360 - 180


def root(f, t0, span):
    """The sign change of f nearest t0 within ±span days, to 1e-8 day."""
    step = span / 200
    best = None
    for k in range(-200, 200):
        a, b = t0 + k * step, t0 + (k + 1) * step
        fa, fb = f(a), f(b)
        if fa == 0:
            c = a
        elif fa * fb < 0 and abs(fa) < 90 and abs(fb) < 90:
            lo, hi = a, b
            for _ in range(80):
                mid = (lo + hi) / 2
                if f(lo) * f(mid) <= 0:
                    hi = mid
                else:
                    lo = mid
            c = (lo + hi) / 2
        else:
            continue
        if best is None or abs(c - t0) < abs(best - t0):
            best = c
    return best


rows = []
for e in catalog:
    fam, t0 = e['family'], e.get('at')
    if fam == 'retrograde' or not t0:
        continue  # the cycles' ends are the station events
    t = jd(t0)
    swiss = None
    if fam == 'lunation':
        target = 180 if e['subtype'] == 'full' else 0
        swiss = root(lambda x: wrap(lon('Moon', x) - lon('Sun', x) - target), t, 1)
    elif fam == 'eclipse':
        if e['subtype'] == 'solar':
            _, tret = swe.sol_eclipse_when_glob(t - 3, FLAGS, 0, False)
        else:
            _, tret = swe.lun_eclipse_when(t - 3, FLAGS, 0, False)
        swiss = tret[0]
    elif fam == 'station':
        b = e['bodies'][0]
        swiss = root(lambda x: speed(b, x), t, 5)
    elif fam == 'ingress':
        b = e['bodies'][0]
        to, frm = SIGNS.index(e['signs'][0]), SIGNS.index(e['fromSign'])
        edge = to * 30 if (frm + 1) % 12 == to else ((to + 1) % 12) * 30
        swiss = root(lambda x: wrap(lon(b, x) - edge), t, 5)
    elif fam == 'aspect':
        a, b = e['bodies']
        angle = {'conjunction': 0, 'sextile': 60, 'square': 90, 'trine': 120, 'opposition': 180}[e['aspectType']]
        if angle in (0, 180):
            swiss = root(lambda x: wrap(lon(a, x) - lon(b, x) - angle), t, 10)
        else:
            swiss = root(lambda x: abs(wrap(lon(a, x) - lon(b, x))) - angle, t, 10)
    if swiss is None:
        rows.append({'id': e['id'], 'family': fam, 'published': t0, 'swiss': None})
        continue
    delta = (t - swiss) * 86400
    rows.append({'id': e['id'], 'family': fam, 'subtype': e.get('subtype'), 'bodies': e['bodies'], 'published': t0,
                 'deltaSeconds': round(delta, 3)})

summary = {}
for fam in ['lunation', 'eclipse', 'ingress', 'aspect', 'station']:
    ds = [r['deltaSeconds'] for r in rows if r['family'] == fam and 'deltaSeconds' in r]
    missing = [r['id'] for r in rows if r['family'] == fam and 'deltaSeconds' not in r]
    summary[fam] = {'events': len(ds), 'unmatched': missing, 'maxAbsSeconds': max(abs(d) for d in ds) if ds else None,
                    'meanSeconds': round(sum(ds) / len(ds), 3) if ds else None}
stations = {}
for r in rows:
    if r['family'] == 'station' and 'deltaSeconds' in r:
        b = r['bodies'][0]
        stations[b] = max(stations.get(b, 0), abs(r['deltaSeconds']))
summary['stationMaxAbsSecondsByPlanet'] = stations
summary['swisseph'] = swe.version
summary['swissFileFallbacks'] = fallbacks
summary['swissDeltaTSeconds2026'] = round(swe.deltat(swe.julday(2026, 9, 22, 0)) * 86400, 3)
json.dump({'summary': summary, 'rows': rows}, open(sys.argv[3], 'w'), indent=1)
print(json.dumps(summary, indent=1))
