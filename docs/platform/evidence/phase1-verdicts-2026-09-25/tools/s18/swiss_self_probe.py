# Step 1.8, instrument check: why does Swiss's own +-0.001-day longitude difference sometimes
# differ from its analytic Moon speed by ~0.3"/day? Look for a step in Swiss's longitude at the
# flagged sample, the one where that difference is largest (moon_compare.mjs's swissSelf),
# with flags checked. Reads $WORK/s18/moon-engine.json and moon-swiss.json and the .se1 files
# in SWISS_EPHE; prints differences of Swiss's own longitudes and speeds (never committed).
#   $PYTHON tools/s18/swiss_self_probe.py > $WORK/s18/probe/swiss-self-probe.log
import swisseph as swe, json
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SWISS_EPHE, out_dir  # noqa: E402
OUT = out_dir('s18')
swe.set_ephe_path(SWISS_EPHE)
F = swe.FLG_SWIEPH | swe.FLG_SPEED
eng = json.load(open(OUT + 'moon-engine.json'))
sws = json.load(open(OUT + 'moon-swiss.json'))['rows']
flagged = max((i for i, r in enumerate(sws) if r), key=lambda i: abs(sws[i]['cdTT'] - sws[i]['speedTT']))
s = eng['samples'][flagged]
jd0 = s['jd_tt']
def lon(jd, flags=F):
    xx, rf = swe.calc(jd, swe.MOON, flags); assert rf & swe.FLG_SWIEPH; return xx
# 1. Second differences of longitude on a 10 s grid over +-0.002 day: a jump shows as an outlier.
h = 10/86400
pts = [jd0 + k*h for k in range(-18, 19)]
L = [lon(j)[0] for j in pts]
d2 = [(L[i+1]-2*L[i]+L[i-1])*3600e3 for i in range(1, len(L)-1)]  # mas
print('second differences (mas) on a 10 s grid:', [round(x, 3) for x in d2])
# 2. Speed from successive 10 s differences vs analytic speed along the grid ("/day).
for i in range(0, len(pts)-1, 3):
    cd = (L[i+1]-L[i])/h
    mid = lon((pts[i]+pts[i+1])/2)[3]
    print(round((pts[i]-jd0)*1440, 2), 'min: 10 s difference - analytic speed =', round((cd-mid)*3600, 4), '"/day')
# 3. Same with nutation switched off and with true positions, to see which part carries it.
for name, fl in [('NONUT', F | swe.FLG_NONUT), ('TRUEPOS', F | swe.FLG_TRUEPOS), ('J2000', F | swe.FLG_J2000 | swe.FLG_NONUT), ('NOABERR', F | swe.FLG_NOABERR)]:
    a = lon(jd0 - 0.001, fl)[0]; b = lon(jd0 + 0.001, fl)[0]
    print(name, 'cd - analytic =', round(((b - a)/0.002 - lon(jd0, fl)[3])*3600, 4), '"/day')
print('default cd - analytic =', round(((lon(jd0+0.001)[0]-lon(jd0-0.001)[0])/0.002 - lon(jd0)[3])*3600, 4))
