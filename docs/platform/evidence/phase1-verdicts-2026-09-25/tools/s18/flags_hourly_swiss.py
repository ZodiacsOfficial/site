# Step 1.8: Swiss's retrograde status (sign of FLG_SPEED longitude speed) at every hourly
# instant of flags-hourly-engine.json, at the engine's TT, flags checked on every call;
# then the agreement with the chart's flag, counted apart for instants within 1 h of a
# Swiss station of that body (stations-swiss.json) and for all other instants.
# Reads $WORK/s18/flags-hourly-engine.json and stations-swiss.json and the .se1 files in
# SWISS_EPHE. Writes $WORK/s18/flags-hourly-results.json (counts, and Swiss's speed at each
# disagreement, so it stays in WORK) and prints the counts.
#   $PYTHON tools/s18/flags_hourly_swiss.py > $WORK/s18/flags-hourly.log
import json, swisseph as swe
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SWISS_EPHE, out_dir  # noqa: E402

OUT = out_dir('s18')
swe.set_ephe_path(SWISS_EPHE)
F = swe.FLG_SWIEPH | swe.FLG_SPEED
IPL = {'Mercury': swe.MERCURY, 'Venus': swe.VENUS, 'Mars': swe.MARS, 'Jupiter': swe.JUPITER,
       'Saturn': swe.SATURN, 'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE, 'Pluto': swe.PLUTO}
eng = json.load(open(OUT + 'flags-hourly-engine.json'))
stations = json.load(open(OUT + 'stations-swiss.json'))['stations']
near = {b: [s['jd_tt'] for s in stations if s['body'] == b] for b in IPL}
res = {'instants': len(eng['rows']), 'flags': 0, 'discarded': 0,
       'outsideOneHour': {'flags': 0, 'agree': 0, 'disagreements': []},
       'withinOneHour': {'flags': 0, 'agree': 0, 'disagreements': []}}
for row in eng['rows']:
    for body, retro in zip(eng['bodies'], row['retro']):
        xx, rf = swe.calc(row['jd_tt'], IPL[body], F)
        if not (rf & swe.FLG_SWIEPH) or not (rf & swe.FLG_SPEED):
            res['discarded'] += 1
            continue
        res['flags'] += 1
        bucket = 'withinOneHour' if any(abs(row['jd_tt'] - j) <= 1 / 24 for j in near[body]) else 'outsideOneHour'
        b = res[bucket]
        b['flags'] += 1
        if retro == (xx[3] < 0):
            b['agree'] += 1
        else:
            b['disagreements'].append({'utc': row['utc'], 'body': body, 'engineRetrograde': retro, 'swissSpeed': xx[3]})
json.dump(res, open(OUT + 'flags-hourly-results.json', 'w'), indent=1)
print(json.dumps({k: (v if k not in ('outsideOneHour', 'withinOneHour') else {kk: vv for kk, vv in v.items() if kk != 'disagreements'} | {'disagreements': len(v['disagreements'])}) for k, v in res.items()}, indent=1))
