import json
import swisseph as swe
swe.set_ephe_path('/tmp/claude-0/swisslab/ephe')
rows=json.load(open('verify/v6-conj.json'))
def circ(a,b):
    x=(a-b)%360.0
    if x>180: x-=360
    return x*3600.0
print("%12s %8s %11s %12s %14s" % ('jdTt','elongDeg','deflLon','best-Swiss','nodefl-Swiss'))
for r in rows:
    v,f=swe.calc(r['jdTt'], swe.URANUS, swe.FLG_SWIEPH)
    assert f & swe.FLG_SWIEPH
    print("%12.1f %8.3f %11.5f %12.6f %14.6f" % (r['jdTt'], r['elongDeg'], r['deflLonArcsec'], circ(r['lon'],v[0]), circ(r['lonNoDefl'],v[0])))
