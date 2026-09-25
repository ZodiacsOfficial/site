# Step 1.2, instrument side: rebuild the 2024 30-minute Swiss-position scan that
# rule 1a names (the audit's verify/angles-houses-aspects/swiss_dump.py, whose
# output swiss-2024.json has sha256 0dc4b21f...3dc0 per corpora/README.md).
#
# The positions part is the audit's code unchanged, so the audit-format file can be
# compared byte for byte. Two additions:
#   1. every call's returned flag is read; an instant is written only if all ten
#      bodies came back with FLG_SWIEPH and FLG_SPEED (discarded instants counted);
#   2. a second file with each body's longitude at t - 1 s and t + 1 s (same flag
#      rule), so the orb's actual motion under Swiss can judge applying/separating
#      independently of any speed formula.
# Swiss is an instrument here; nothing it writes is committed anywhere.
#
# Reads the .se1 files in SWISS_EPHE. Writes under $WORK/s12: swiss-2024.json (the audit's
# format), swiss-2024-pm1s.json and swiss-scan-summary.json, and prints the summary.
#   $PYTHON tools/s12/swiss_scan_2024.py > $WORK/s12/swiss-scan.log
import swisseph as swe, json, datetime as dt, sys
import os
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SWISS_EPHE, out_dir  # noqa: E402

OUT = out_dir('s12')
swe.set_ephe_path(SWISS_EPHE)
FLG = swe.FLG_SWIEPH | swe.FLG_SPEED
BOD = [('Sun',swe.SUN),('Moon',swe.MOON),('Mercury',swe.MERCURY),('Venus',swe.VENUS),('Mars',swe.MARS),('Jupiter',swe.JUPITER),('Saturn',swe.SATURN),('Uranus',swe.URANUS),('Neptune',swe.NEPTUNE),('Pluto',swe.PLUTO)]
def jd(t): return swe.julday(t.year,t.month,t.day,t.hour+t.minute/60+t.second/3600, swe.GREG_CAL)

calls = 0
badflag = 0          # calls without FLG_SWIEPH (the audit's counter)
nospeed = 0          # calls without FLG_SPEED
def good(rf):
    return bool(rf & swe.FLG_SWIEPH) and bool(rf & swe.FLG_SPEED)

def pos(t):
    """The audit's pos(); also returns whether every call was SWIEPH with speed."""
    global badflag, calls, nospeed
    out=[]; ok=True
    for name,ipl in BOD:
        xx,rf = swe.calc_ut(jd(t), ipl, FLG)
        calls += 1
        if not (rf & swe.FLG_SWIEPH): badflag+=1
        if not (rf & swe.FLG_SPEED): nospeed+=1
        ok = ok and good(rf)
        out.append({'body':name,'lon':xx[0],'lat':xx[1],'speed':xx[3]})
    return out, ok

def lons_at(jdut):
    global calls
    out={}; ok=True
    for name,ipl in BOD:
        xx,rf = swe.calc_ut(jdut, ipl, FLG)
        calls += 1
        ok = ok and good(rf)
        out[name]=xx[0]
    return out, ok

rows=[]; stencil=[]; discarded=[]
t=dt.datetime(2024,1,1); end=dt.datetime(2025,1,1)
H = 1.0/86400.0
while t<end:
    bodies, ok = pos(t)
    j = jd(t)
    minus, ok_m = lons_at(j - H)
    plus, ok_p = lons_at(j + H)
    if ok and ok_m and ok_p:
        rows.append({'utc':t.isoformat()+'Z','bodies':bodies})
        stencil.append({'utc':t.isoformat()+'Z','minus1s':minus,'plus1s':plus})
    else:
        discarded.append(t.isoformat()+'Z')
    t+=dt.timedelta(minutes=30)

# The audit's worked example (Sun-Moon square near 2024-01-04T03:30Z), unchanged,
# so the audit-format file carries the same fields.
def wrap(x):
    x=x%360
    return x-360 if x>180 else x
def orb_signed(t):
    b={p['body']:p for p in pos(t)[0]}
    return abs(wrap(b['Moon']['lon']-b['Sun']['lon']))-90
lo=dt.datetime(2024,1,4,3,0); hi=dt.datetime(2024,1,4,4,0)
flo,fhi=orb_signed(lo),orb_signed(hi)
for _ in range(40):
    mid=lo+(hi-lo)/2; fm=orb_signed(mid)
    if (fm<0)==(flo<0): lo,flo=mid,fm
    else: hi,fhi=mid,fm
exact=lo+(hi-lo)/2
at=dt.datetime(2024,1,4,3,30); b={p['body']:p for p in pos(at)[0]}
example={'exactUTC':exact.isoformat(),'orbAt0330':abs(orb_signed(at)),'minutesToExactFrom0330':(exact-at).total_seconds()/60,
 'moon':b['Moon'],'sun':b['Sun'],'orbAt0331':abs(orb_signed(at+dt.timedelta(minutes=1)))}

# Audit format: {'badflag', 'rows', 'example'} with json.dump defaults, as swiss_dump.py wrote it.
json.dump({'badflag':badflag,'rows':rows,'example':example}, open(OUT+'swiss-2024.json','w'))
json.dump({'h_seconds':1,'rows':stencil}, open(OUT+'swiss-2024-pm1s.json','w'))
summary={'instants_scanned': len(rows)+len(discarded), 'instants_kept': len(rows), 'instants_discarded': len(discarded),
         'discarded': discarded[:20], 'calls': calls, 'calls_without_SWIEPH': badflag, 'calls_without_SPEED': nospeed,
         'flags': 'FLG_SWIEPH|FLG_SPEED (apparent geocentric ecliptic of date, true equinox)', 'swe.version': swe.version,
         'example': example}
json.dump(summary, open(OUT+'swiss-scan-summary.json','w'), indent=1)
print(json.dumps(summary, indent=1))
