# Step 1.8, instrument side: every station of Mercury..Pluto from 2024-01-01 to
# 2027-01-01, as the sign changes of Swiss's longitude speed (FLG_SPEED, apparent
# geocentric ecliptic of date), found on a 1-day grid and bisected (60 halvings), once
# in TT (calc) and once in UT (calc_ut, Swiss's own Delta-T). For each station, Swiss's
# speed at the station -/+ {60, 45, 30, 20, 10, 5} minutes on both clocks.
# Every call must return FLG_SWIEPH and FLG_SPEED, or the run aborts (nothing to discard
# silently). Mirrors the audit's production-positions/stations-swiss.py for the TT scan.
# Reads the .se1 files in SWISS_EPHE. Writes $WORK/s18/stations-swiss.json (Swiss's station
# instants and speeds: never committed) and prints its summary.
#   $PYTHON tools/s18/swiss_stations.py
import json, swisseph as swe
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SWISS_EPHE, out_dir  # noqa: E402

OUT = out_dir('s18')
swe.set_ephe_path(SWISS_EPHE)
F = swe.FLG_SWIEPH | swe.FLG_SPEED
B = {'Mercury': swe.MERCURY, 'Venus': swe.VENUS, 'Mars': swe.MARS, 'Jupiter': swe.JUPITER,
     'Saturn': swe.SATURN, 'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE, 'Pluto': swe.PLUTO}
LADDER = [60, 45, 30, 20, 10, 5]
calls = 0

def speed(jd, ipl, ut):
    global calls
    xx, rf = (swe.calc_ut if ut else swe.calc)(jd, ipl, F)
    calls += 1
    if not (rf & swe.FLG_SWIEPH) or not (rf & swe.FLG_SPEED):
        raise SystemExit(f'non-SWIEPH/SPEED return {rf} for {ipl} at {jd} ut={ut}')
    return xx[3]

def stations(ipl, ut):
    jd0 = swe.julday(2024, 1, 1, 0.0)
    jd1 = swe.julday(2027, 1, 1, 0.0)
    out = []
    jd = jd0
    prev = speed(jd, ipl, ut)
    while jd < jd1:
        nxt = speed(jd + 1, ipl, ut)
        if prev * nxt < 0:
            a, b, fa = jd, jd + 1, prev
            for _ in range(60):
                m = (a + b) / 2
                fm = speed(m, ipl, ut)
                if fa * fm <= 0:
                    b = m
                else:
                    a, fa = m, fm
            root = (a + b) / 2
            if root < jd1:
                out.append((root, 'retrograde-station' if prev > 0 else 'direct-station'))
        prev = nxt
        jd += 1
    return out

rows = []
for name, ipl in B.items():
    tt = stations(ipl, False)
    ut = stations(ipl, True)
    if len(tt) != len(ut):
        raise SystemExit(f'{name}: {len(tt)} TT stations but {len(ut)} UT stations')
    for (jt, kind), (ju, kind_u) in zip(tt, ut):
        if kind != kind_u or abs((jt - ju) * 86400 - swe.deltat(ju) * 86400) > 5:
            raise SystemExit(f'{name}: TT and UT scans disagree at {jt} / {ju}')
        row = {'body': name, 'kind': kind, 'jd_tt': jt, 'jd_ut': ju, 'deltaT_s': swe.deltat(ju) * 86400,
               'ladderTT': {}, 'ladderUT': {}}
        for k in LADDER:
            row['ladderTT'][str(k)] = [speed(jt - k / 1440, ipl, False), speed(jt + k / 1440, ipl, False)]
            row['ladderUT'][str(k)] = [speed(ju - k / 1440, ipl, True), speed(ju + k / 1440, ipl, True)]
        rows.append(row)

summary = {'stations': len(rows), 'byBody': {n: sum(1 for r in rows if r['body'] == n) for n in B}, 'calls': calls,
           'allSWIEPH': True, 'swe.version': swe.version}
json.dump({'summary': summary, 'stations': rows}, open(OUT + 'stations-swiss.json', 'w'), indent=1)
print(json.dumps(summary, indent=1))
