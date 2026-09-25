"""Swiss Ephemeris's own ΔT, for comparison in the README only: three values
after 2026, and statistics of how far Swiss's ΔT sits from Table S15 (2016),
from the 2020 revision and from this model before 1962, which is what gate 3
compares there. deltat_ex has no return flag: it raises on error, and each
call is made with FLG_SWIEPH and the .se1 path set.

    DELTAT_SOURCES=<dir> python3 tools/moon/swiss_deltat.py <ephe-dir> > outputs/swiss-deltat.json
"""
import json
import math
import os
import sys

import swisseph as swe

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import lib  # noqa: E402

swe.set_ephe_path(sys.argv[1])


def swiss(y):
    """Swiss ΔT in seconds at Julian year y, UT (the argument the model uses)."""
    return swe.deltat_ex(2451545.0 + (y - 2000) * 365.25, swe.FLG_SWIEPH) * 86400


def worst(pairs):
    y, d = max(pairs, key=lambda p: abs(p[1]))
    return {'maxAbs': round(abs(d), 3), 'at': y}


out = {'swiss': swe.version, 'flag': 'FLG_SWIEPH', 'seconds': {}}
for y, m, d in ((2026, 9, 22), (2050, 1, 1), (2100, 1, 1)):
    out['seconds'][f'{y:04d}-{m:02d}-{d:02d}T00:00Z'] = round(swe.deltat_ex(swe.julday(y, m, d, 0.0), swe.FLG_SWIEPH) * 86400, 2)

t16, t20 = lib.s15_2016(), lib.s15_2020()
years = [1800 + 0.5 * k for k in range(2 * (1962 - 1800))]
model = lib.ts_model([(y - 2000) * 365.25 for y in years])['seconds']
sw = [swiss(y) for y in years]
before_1941 = [(y, s - lib.s15(t16, y)) for y, s in zip(years, sw) if y < 1941]
out['before1962'] = {
    'grid': '1800.0 to 1961.5 every half year',
    'swissMinusS15_2016_1800to1940': worst(before_1941),
    'swissMinusS15_2016_at': {str(y): round(swiss(y) - lib.s15(t16, y), 3) for y in (1800, 1850, 1900)},
    'swissMinusS15_2020_1800to1940': worst([(y, s - lib.s15(t20, y)) for y, s in zip(years, sw) if y < 1941]),
    'swissMinusModel_1800to1961': worst([(y, s - m) for y, s, m in zip(years, sw, model)]),
    'swissMinusModel_1800to1961_rms': round(math.sqrt(sum((s - m) ** 2 for s, m in zip(sw, model)) / len(sw)), 3),
}
out['at1000'] = {'swissMinusS15_2016': round(swiss(1000) - lib.s15(t16, 1000), 3),
                 'swissMinusS15_2020': round(swiss(1000) - lib.s15(t20, 1000), 3)}
json.dump(out, sys.stdout, indent=1)
sys.stdout.write('\n')
