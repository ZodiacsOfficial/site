# Step 1.8, instrument side: Swiss's Moon longitude speed (FLG_SPEED, apparent
# geocentric ecliptic of date) at every engine sample of moon-engine.json:
#   speedTT  at the engine's own TT (clock pinned; the comparison the rule is about),
#   speedUT  at the same UT with Swiss's own Delta-T (the product-level view),
#   cdTT     Swiss's own longitude differenced over +-0.001 day at that TT, which shows
#            whether Swiss's analytic speed is the derivative of the longitude it reports,
#   lonTT, lonMinus, lonPlus  the longitudes used for cdTT.
# A sample is kept only if every call returned FLG_SWIEPH and FLG_SPEED.
# Reads $WORK/s18/moon-engine.json and the .se1 files in SWISS_EPHE. Writes
# $WORK/s18/moon-swiss.json (Swiss's speeds and longitudes: never committed) and prints counts.
#   $PYTHON tools/s18/moon_swiss.py
import json, swisseph as swe
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SWISS_EPHE, out_dir  # noqa: E402

OUT = out_dir('s18')
swe.set_ephe_path(SWISS_EPHE)
F = swe.FLG_SWIEPH | swe.FLG_SPEED
ok_flag = lambda rf: bool(rf & swe.FLG_SWIEPH) and bool(rf & swe.FLG_SPEED)

eng = json.load(open(OUT + 'moon-engine.json'))
rows, discarded, calls = [], 0, 0
H = 0.001
for s in eng['samples']:
    xt, r1 = swe.calc(s['jd_tt'], swe.MOON, F)
    xu, r2 = swe.calc_ut(s['jd_ut'], swe.MOON, F)
    xm, r3 = swe.calc(s['jd_tt'] - H, swe.MOON, F)
    xp, r4 = swe.calc(s['jd_tt'] + H, swe.MOON, F)
    calls += 4
    if not all(ok_flag(r) for r in (r1, r2, r3, r4)):
        discarded += 1
        rows.append(None)
        continue
    d = (xp[0] - xm[0]) % 360.0
    if d > 180: d -= 360.0
    rows.append({'speedTT': xt[3], 'speedUT': xu[3], 'cdTT': d / (2 * H), 'lonTT': xt[0], 'lonMinus': xm[0], 'lonPlus': xp[0],
                 'deltaT_s': swe.deltat(s['jd_ut']) * 86400.0})
json.dump({'swe.version': swe.version, 'calls': calls, 'discarded': discarded, 'rows': rows}, open(OUT + 'moon-swiss.json', 'w'))
print(json.dumps({'samples': len(rows), 'calls': calls, 'discarded': discarded}))
