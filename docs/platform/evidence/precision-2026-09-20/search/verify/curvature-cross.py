# Cross-check the track's curvature (a SECOND difference of positions) against
# Swiss's own analytic daily speed (a first-derivative output), differenced once.
import sys, datetime
sys.path.insert(0,'/tmp/claude-0/swisslab/venv/lib/python3.11/site-packages')
import swisseph as swe
swe.set_ephe_path('/tmp/claude-0/swisslab/ephe')
F = swe.FLG_SWIEPH | swe.FLG_SPEED
def calc(dt):
    ss = dt.second + dt.microsecond/1e6
    jd,_ = swe.utc_to_jd(dt.year,dt.month,dt.day,dt.hour,dt.minute,ss,swe.GREG_CAL)
    xx,ret = swe.calc(jd, swe.URANUS, F); assert ret==258
    return xx[0], xx[3]
st = datetime.datetime(2020,1,11,1,48,9,tzinfo=datetime.timezone.utc)
for hd in [0.5,1,2,5]:
    a = st - datetime.timedelta(days=hd); b = st + datetime.timedelta(days=hd)
    la,sa = calc(a); lb,sb = calc(b); l0,s0 = calc(st)
    d_from_speed = (sb-sa)/(2*hd)                    # d(speed)/dt  = f''  [deg/day^2]
    d_from_pos   = (lb-2*l0+la)/(hd*hd)              # second difference of positions
    print(f"h={hd}d  f'' from Swiss ANALYTIC speed = {d_from_speed:.9e}   f'' from position 2nd difference = {d_from_pos:.9e}   ratio {d_from_speed/d_from_pos:.6f}")
print("track's reported curvature at the station: 8.576e-04 deg/day^2 (DE, 10-min second difference)")
