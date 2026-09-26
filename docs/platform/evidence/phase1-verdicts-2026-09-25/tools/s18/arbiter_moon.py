# Step 1.8, arbiter check (not part of the rule, which is against Swiss): is the engine's
# excess over Swiss at the apsides the engine's own error, or Swiss's? The Moon's
# longitude rate from the raw JPL kernel (de440s.bsp via jplephem), geocentric, rotated
# with ERFA's IAU 2006/2000A bias-precession-nutation (pnm06a) to the true equator and
# equinox of date and then by the true obliquity (obl06 + nut06a's deps) to the true
# ecliptic of date, differenced over +-0.001 day at the engine's TT (TDB taken as TT):
#   arbGeo  geometric (what the engine's EclipticGeoMoon models),
#   arbLt   geometric at t - tau, tau = distance / c (the light-time Swiss's apparent Moon carries).
# Swiss FLG_TRUEPOS speed is read too (flag checked), to compare like with like.
# Needs pyerfa 2.0.1.5, jplephem 2.24 and numpy beside pyswisseph. Reads
# $WORK/s18/moon-engine.json, the kernel at JPL_KERNEL (de440s.bsp) and the .se1 files in
# SWISS_EPHE. Writes $WORK/s18/moon-arbiter.json (per-sample kernel rates and Swiss speeds:
# never committed; it records the kernel's path).
#   $PYTHON tools/s18/arbiter_moon.py
import json, math
import numpy as np, erfa, swisseph as swe
from jplephem.spk import SPK
from importlib.metadata import version
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import JPL_KERNEL, SWISS_EPHE, out_dir  # noqa: E402

OUT = out_dir('s18')
KERNEL = JPL_KERNEL
C_KM_S = 299792.458
swe.set_ephe_path(SWISS_EPHE)
kernel = SPK.open(KERNEL)
moon_seg, earth_seg = kernel[3, 301], kernel[3, 399]

def geo(jd):
    return moon_seg.compute(jd) - earth_seg.compute(jd)  # km, ICRF, geometric geocentric Moon

def ecl_lon(vec, jd):
    d1, d2 = 2400000.5, jd - 2400000.5
    r = erfa.pnm06a(d1, d2) @ vec
    eps = erfa.obl06(d1, d2) + erfa.nut06a(d1, d2)[1]
    y = math.cos(eps) * r[1] + math.sin(eps) * r[2]
    return math.degrees(math.atan2(y, r[0]))

def lon_geo(jd):
    return ecl_lon(geo(jd), jd)

def lon_lt(jd):
    tau = np.linalg.norm(geo(jd)) / C_KM_S / 86400.0
    for _ in range(2):
        tau = np.linalg.norm(geo(jd - tau)) / C_KM_S / 86400.0
    return ecl_lon(geo(jd - tau), jd)

def rate(fn, jd, h=0.001):
    d = (fn(jd + h) - fn(jd - h)) % 360.0
    if d > 180: d -= 360.0
    return d / (2 * h)

eng = json.load(open(OUT + 'moon-engine.json'))
rows = []
for s in eng['samples']:
    jd = s['jd_tt']
    xx, rf = swe.calc(jd, swe.MOON, swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_TRUEPOS)
    if not (rf & swe.FLG_SWIEPH) or not (rf & swe.FLG_SPEED):
        rows.append(None); continue
    rows.append({'arbGeo': rate(lon_geo, jd), 'arbLt': rate(lon_lt, jd), 'swissTruepos': xx[3], 'arbLonGeo': lon_geo(jd) % 360.0})
json.dump({'kernel': KERNEL, 'pyerfa': version('pyerfa'), 'jplephem': version('jplephem'), 'numpy': np.__version__, 'rows': rows},
          open(OUT + 'moon-arbiter.json', 'w'))
print(json.dumps({'samples': len(rows), 'discarded': sum(1 for r in rows if r is None)}))
