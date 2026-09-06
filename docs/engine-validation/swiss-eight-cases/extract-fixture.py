"""Pure byte-checked projection of reviewed oracle JSON; no ephemeris/app calls.

Usage: python3 extract-fixture.py /path/to/immutable/evidence /path/to/output.json
Each compact leaf records its exact input file and JSON Pointer in sourceMap.
"""
from hashlib import sha256
from pathlib import Path
import json
import sys

root, out = map(Path,sys.argv[1:])
assert not out.exists(), 'Refusing to overwrite extracted expectations'
digests = {
    'eight-case-oracle.raw.json':'26b7d70935e1d4e95aae655fa54041a07d1a22c07cb7422aead44a4f24072c94',
    'eight-case-policy.json':'9dfc069be7c6854da1f0dff578c0b213e64624e720d21e27c6301b7612fd79a4',
    'returned-chart-oracle.raw.json':'77fa5b4518d27e28e2830cf1eaffd790b23765a06550ce96031557803c4c5241',
}
sources={}
for name,expected in digests.items():
    data=(root/name).read_bytes()
    assert sha256(data).hexdigest()==expected, f'Source drift: {name}'
    sources[name]=json.loads(data)
raw=sources['eight-case-oracle.raw.json']
mapping={}
def take(output_pointer,input_pointer,source='eight-case-oracle.raw.json'):
    value=sources[source]
    for key in input_pointer.strip('/').split('/'):
        value=value[int(key)] if isinstance(value,list) else value[key]
    mapping[output_pointer]={'file':source,'pointer':input_pointer}
    return value
def positions(op,ip,source='eight-case-oracle.raw.json'):
    value=sources[source]
    for key in ip.strip('/').split('/'):
        value=value[int(key)] if isinstance(value,list) else value[key]
    return {name:{'longitudeDegrees':take(op+'/'+name+'/longitudeDegrees',ip+'/'+name+'/values/0',source),
                  'speedDegreesPerDay':take(op+'/'+name+'/speedDegreesPerDay',ip+'/'+name+'/values/3',source)} for name in value}
def timing(op,ip):
    return {'expectedMilliseconds':take(op+'/expectedMilliseconds',ip+'/estimate/productTransportMilliseconds'),
            'timeScale':take(op+'/timeScale',ip+'/estimate/timeScale'),
            'allowedMilliseconds':take(op+'/allowedMilliseconds',ip+'/timeBand/allowedProductMilliseconds')}
def chart(op,ip,source='eight-case-oracle.raw.json'):
    return {'positions':positions(op+'/positions',ip+'/positions',source),
            'cuspsDegrees':take(op+'/cuspsDegrees',ip+'/cuspsDegrees',source),
            'ascmc':take(op+'/ascmc',ip+'/ascmc',source)}
result={'schemaVersion':1,'scope':'Compact independent expectations; engineering gates and conventions remain in byte-preserved eight-case policy',
        'sourceSHA256':digests,'extractionRecipeSHA256':sha256(Path(__file__).read_bytes()).hexdigest()}
result['epochs']=[]
for index,name in enumerate(['E1800','E2000','E2199']):
    result['epochs'].append({'id':name,'positions':positions(f'/epochs/{index}/positions',f'/cases/{name}/positions')})
result['stations']=[]
for index,name in enumerate(['Mstation','Sstation']):
    op=f'/stations/{index}';ip=f'/cases/{name}'
    station={'id':name,'targetLongitudeDegrees':take(op+'/targetLongitudeDegrees',ip+'/targetLongitudeDegrees'),
        'analyticStationMilliseconds':take(op+'/analyticStationMilliseconds',ip+'/analyticStation/estimate/productTransportMilliseconds'),
        'analyticStationLongitudeDegrees':take(op+'/analyticStationLongitudeDegrees',ip+'/analyticStation/evaluation/values/0'),
        'finiteDifferenceStationMilliseconds':take(op+'/finiteDifferenceStationMilliseconds',ip+'/finiteDifferenceStation/estimate/productTransportMilliseconds'),
        'crossings':[]}
    for j,_ in enumerate(raw['cases'][name]['crossings']):
        co=f'{op}/crossings/{j}';ci=f'{ip}/crossings/{j}'
        station['crossings'].append({**timing(co,ci),
            'retrograde':take(co+'/retrograde',ci+'/retrograde'),
            'speedDegreesPerDay':take(co+'/speedDegreesPerDay',ci+'/evaluation/values/3')})
    result['stations'].append(station)
result['progression']={'positions':{name:{'longitudeDegrees':take('/progression/positions/'+name+'/longitudeDegrees','/cases/P2020/expected/'+name)} for name in raw['cases']['P2020']['expected']}}
ip='/cases/Solar1990'
result['solar']={'natalLongitudeDegrees':take('/solar/natalLongitudeDegrees',ip+'/natal/values/0'),
    'nearest':timing('/solar/nearest',ip+'/selectedNearest'),
    'mostRecent':timing('/solar/mostRecent',ip+'/selectedMostRecent'),
    'independentChartUTC':take('/solar/independentChartUTC',ip+'/locatedChartAtIndependentInstant/instant/productDateTransport'),
    'independentChart':chart('/solar/independentChart',ip+'/locatedChartAtIndependentInstant'),
    'returnedChartUTC':take('/solar/returnedChartUTC','/charts/0/utc','returned-chart-oracle.raw.json'),
    'returnedChart':chart('/solar/returnedChart','/charts/0','returned-chart-oracle.raw.json')}
ip='/cases/Saturn1990'
result['saturn']={'natalLongitudeDegrees':take('/saturn/natalLongitudeDegrees',ip+'/natal/values/0'),
    'natalRetrograde':take('/saturn/natalRetrograde',ip+'/natalRetrograde'),'seasons':[]}
for i,season in enumerate(raw['cases']['Saturn1990']['seasons']):
    op=f'/saturn/seasons/{i}';sp=f'{ip}/seasons/{i}'
    row={'index':take(op+'/index',sp+'/index'),'crossings':[]}
    for j,_ in enumerate(season['crossings']):
        co=f'{op}/crossings/{j}';ci=f'{sp}/crossings/{j}'
        row['crossings'].append({**timing(co,ci),'retrograde':take(co+'/retrograde',ci+'/retrograde')})
    result['saturn']['seasons'].append(row)
result['sourceMap']=mapping
out.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
print(json.dumps({'path':str(out),'bytes':out.stat().st_size,'sha256':sha256(out.read_bytes()).hexdigest(),'mappedFields':len(mapping)}))
