# Step 1.8, instrument side: every lunar perigee and apogee from 2024-01-01 to
# 2027-01-01 (TT), as the sign changes of Swiss's geocentric Moon distance rate
# (xx[5] of calc with FLG_SPEED), bisected. Only anchors the sampling instants;
# A3's own anchors (astronomy-engine SearchLunarApsis) are sampled as well.
# Every call's returned flag must carry FLG_SWIEPH and FLG_SPEED, or the run aborts.
# Reads the .se1 files in SWISS_EPHE. Writes $WORK/s18/apsides-swiss.json (Swiss's apsis
# instants: never committed) and prints its summary.
#   $PYTHON tools/s18/swiss_apsides.py
import json, swisseph as swe
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SWISS_EPHE, out_dir  # noqa: E402

OUT = out_dir('s18')
swe.set_ephe_path(SWISS_EPHE)
F = swe.FLG_SWIEPH | swe.FLG_SPEED
AU_KM = 149597870.7
calls = 0

def moon(jd):
    global calls
    xx, rf = swe.calc(jd, swe.MOON, F)
    calls += 1
    if not (rf & swe.FLG_SWIEPH) or not (rf & swe.FLG_SPEED):
        raise SystemExit(f'non-SWIEPH return {rf} at {jd}')
    return xx

jd0 = swe.julday(2024, 1, 1, 0.0)   # read as TT by calc
jd1 = swe.julday(2027, 1, 1, 0.0)
step = 0.25
out = []
jd = jd0
prev = moon(jd)[5]
while jd < jd1:
    nxt = moon(jd + step)[5]
    if prev * nxt < 0:
        a, b, fa = jd, jd + step, prev
        for _ in range(60):
            m = (a + b) / 2
            fm = moon(m)[5]
            if fa * fm <= 0:
                b = m
            else:
                a, fa = m, fm
        root = (a + b) / 2
        if root < jd1:
            out.append({'kind': 'perigee' if prev < 0 else 'apogee', 'jd_tt': root, 'distKm': moon(root)[2] * AU_KM})
    prev = nxt
    jd += step

summary = {'apsides': len(out), 'perigees': sum(1 for x in out if x['kind'] == 'perigee'),
           'apogees': sum(1 for x in out if x['kind'] == 'apogee'), 'calls': calls, 'allSWIEPH': True,
           'span_tt': [jd0, jd1], 'scanStepDays': step}
json.dump({'summary': summary, 'apsides': out}, open(OUT + 'apsides-swiss.json', 'w'), indent=1)
print(json.dumps(summary, indent=1))
