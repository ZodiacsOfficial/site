"""For information: how sensitive the ascendant is on the ladder (why end-to-end differences there
are large while Placidus on Swiss's own inputs agrees to milliarcseconds). Gains are arcsec of
ASC per arcsec of RAMC and of obliquity, at ERFA's inputs (s19/erfa-inputs.json), by |latitude|.

No Swiss input. Reads $WORK/s19/erfa-inputs.json and prints JSON.
  $PYTHON tools/s19/ladder_gains.py > $WORK/s19/ladder-gains.json
"""
import json, math
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import WORK  # noqa: E402

O = WORK
er = json.load(open(O + '/s19/erfa-inputs.json'))


def asc_of(ramc, eps, lat):
    r, e, p = math.radians(ramc), math.radians(eps), math.radians(lat)
    return math.degrees(math.atan2(math.cos(r), -(math.sin(r) * math.cos(e) + math.tan(p) * math.sin(e)))) % 360.0


h = 0.001 / 3600.0
out = {}
for grid in ('A', 'L'):
    by = {}
    for utc, lat, lon, ramc, eps in er[grid]:
        if 90.0 - eps - abs(lat) <= 0:
            continue  # Placidus refused here; the ASC is still defined but not part of this table
        gR = abs(((asc_of(ramc + h, eps, lat) - asc_of(ramc - h, eps, lat)) + 180) % 360 - 180) / (2 * h)
        gE = abs(((asc_of(ramc, eps + h, lat) - asc_of(ramc, eps - h, lat)) + 180) % 360 - 180) / (2 * h)
        k = str(abs(lat))
        b = by.setdefault(k, {'n': 0, 'maxGainRamc': 0.0, 'maxGainEps': 0.0})
        b['n'] += 1
        b['maxGainRamc'] = round(max(b['maxGainRamc'], gR), 1)
        b['maxGainEps'] = round(max(b['maxGainEps'], gE), 1)
    out[grid] = dict(sorted(by.items(), key=lambda kv: float(kv[0])))
print(json.dumps(out, indent=1))
