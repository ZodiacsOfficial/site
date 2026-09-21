# Independent Swiss station location for Uranus, Jan 2020 - written by the verifier,
# deliberately NOT reusing the track's bridge search strategy.
import sys, json, datetime
sys.path.insert(0,'/tmp/claude-0/swisslab/venv/lib/python3.11/site-packages')
import swisseph as swe
swe.set_ephe_path('/tmp/claude-0/swisslab/ephe')
FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED
TARGET = 32.6940395

def lon_at(dt):
    # dt: datetime in UTC
    ss = dt.second + dt.microsecond/1e6
    jd_tt, jd_ut1 = swe.utc_to_jd(dt.year, dt.month, dt.day, dt.hour, dt.minute, ss, swe.GREG_CAL)
    jd_nom = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute/60.0 + ss/3600.0)
    off = (jd_tt - jd_nom)*86400.0
    assert abs(off-69.184) < 1e-3, off
    xx, ret = swe.calc(jd_tt, swe.URANUS, FLAGS)
    assert ret == 258, ret
    return xx[0], xx[3], off

# golden-section / ternary search on longitude (Uranus retrograde -> station is a MINIMUM of longitude here?)
base = datetime.datetime(2020,1,11,0,0,0,tzinfo=datetime.timezone.utc)
lo = datetime.datetime(2020,1,5,tzinfo=datetime.timezone.utc)
hi = datetime.datetime(2020,1,17,tzinfo=datetime.timezone.utc)
# use speed sign change (swiss gives speed directly - an INDEPENDENT derivative, not a finite difference)
def speed(dt): return lon_at(dt)[1]
a,b = lo,hi
sa,sb = speed(a), speed(b)
print("speed endpoints", sa, sb)
for i in range(70):
    mid = a + (b-a)/2
    sm = speed(mid)
    if sm == 0: a=b=mid; break
    if (sm<0)==(sa<0): a,sa = mid,sm
    else: b,sb = mid,sm
    if (b-a).total_seconds() < 1e-6: break
st = a + (b-a)/2
L,S,off = lon_at(st)
print("station utc      :", st.isoformat())
print("station longitude:", repr(L))
print("station speed    :", S)
print("g* signed        :", repr(L-TARGET))
print("|g*|             :", repr(abs(L-TARGET)))
print("recorded witness :", 0.04418806505509565)
print("diff arcsec      :", (abs(L-TARGET)-0.04418806505509565)*3600)
