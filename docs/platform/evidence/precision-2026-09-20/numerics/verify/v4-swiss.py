import json, sys, math
import swisseph as swe
d = json.load(open('verify/v4-dense.json'))
swe.set_ephe_path('/tmp/claude-0/swisslab/ephe')
F = swe.FLG_SWIEPH
IDS = {'Sun':swe.SUN,'Moon':swe.MOON,'Mercury':swe.MERCURY,'Venus':swe.VENUS,'Mars':swe.MARS,
       'Jupiter':swe.JUPITER,'Saturn':swe.SATURN,'Uranus':swe.URANUS,'Neptune':swe.NEPTUNE,'Pluto':swe.PLUTO}
def circ(a,b):
    x=(a-b)%360.0
    if x>180: x-=360
    return x*3600.0
out=[]
bad=0
for r in d['rows']:
    jd=r['jdTt']
    rec={'jdTt':jd,'best':{},'proto':{}}
    for b,pid in IDS.items():
        vals,flg=swe.calc(jd,pid,F)
        if flg<0 or not (flg & swe.FLG_SWIEPH):
            bad+=1; continue
        rec['best'][b]=circ(r['best'][b],vals[0])
        rec['proto'][b]=circ(r['proto'][b],vals[0])
    out.append(rec)
print('non-SWIEPH calls:',bad, file=sys.stderr)
json.dump({'n':len(out),'rows':out},open('verify/v4-dense-diff.json','w'))
