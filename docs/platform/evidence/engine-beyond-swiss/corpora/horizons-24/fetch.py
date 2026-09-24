"""One Horizons request per body, TLIST of the 24 corpus TT Julian dates, TIME_TYPE=TT (the fixed clock), apparent observer ecliptic lon/lat (QUANTITIES=31), geocentric (500@399). Every response cached verbatim; the exact query string recorded."""
import json, sys, os, urllib.parse, urllib.request, time
S=sys.argv[2]  # a directory holding the corpus instants (swiss.json in the audit run) and horizons/
swiss=json.load(open(S+'/swiss.json'))
tlist=' '.join(f"{c['jdTt']:.8f}" for c in swiss['cases'])
targets=json.loads(sys.argv[1])  # {"label": "COMMAND"}
log=open(S+'/horizons/queries.log','a')
for label,cmd in targets.items():
    params={'format':'text','COMMAND':f"'{cmd}'",'OBJ_DATA':"'NO'",'MAKE_EPHEM':"'YES'",'EPHEM_TYPE':"'OBSERVER'",'CENTER':"'500@399'",
            'TLIST':f"'{tlist}'",'TLIST_TYPE':"'JD'",'TIME_TYPE':"'TT'",'QUANTITIES':"'31'",'ANG_FORMAT':"'DEG'",'EXTRA_PREC':"'YES'",'CSV_FORMAT':"'YES'",'APPARENT':"'AIRLESS'"}
    url='https://ssd.jpl.nasa.gov/api/horizons.api?'+urllib.parse.urlencode(params)
    out=S+f'/horizons/{label}.txt'
    if os.path.exists(out): print(label,'cached'); continue
    t0=time.time()
    with urllib.request.urlopen(url, timeout=120) as r: body=r.read().decode()
    open(out,'w').write(body)
    log.write(json.dumps({'label':label,'command':cmd,'url':url,'seconds':time.time()-t0,'bytes':len(body)})+'\n')
    print(label,'fetched',len(body),'bytes in',round(time.time()-t0,1),'s')
