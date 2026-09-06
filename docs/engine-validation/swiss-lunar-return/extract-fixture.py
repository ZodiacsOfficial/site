"""Pure projection of approved lunar sources; no ephemeris or app calls."""
from hashlib import sha256
from pathlib import Path
import json
import sys

root, out = map(Path, sys.argv[1:])
assert not out.exists(), 'Refusing to overwrite extracted expectations'
digests = {
    'lunar-return-oracle.raw.json': '599fdf9d1655e1677c144f74927d573a0073e8dae85d3ea3f2514dc1d98032c4',
    'lunar-return-policy.v2.json': '16c807cfb7374c340200064ba6f4332b98923f77b05f6f24f62ea5541d5aa146',
    'fixed-target-applicability-amendment.json': '2f9056c0f93b22e3270bf1f496d804759a9057ac6b3e5a142604248ba1dddb1a',
}
sources = {}
for name, expected in digests.items():
    data = (root / name).read_bytes()
    assert sha256(data).hexdigest() == expected, f'Source drift: {name}'
    sources[name] = json.loads(data)
raw = sources['lunar-return-oracle.raw.json']
source_map = {}

def take(output_pointer, source_pointer):
    value = raw
    for key in source_pointer.strip('/').split('/'):
        value = value[int(key)] if isinstance(value, list) else value[key]
    source_map[output_pointer] = {'file': 'lunar-return-oracle.raw.json', 'pointer': source_pointer}
    return value

def chart(op, ip):
    return {
        'positions': {name: {
            'longitudeDegrees': take(op + '/positions/' + name + '/longitudeDegrees', ip + '/positions/' + name + '/values/0'),
            'speedDegreesPerDay': take(op + '/positions/' + name + '/speedDegreesPerDay', ip + '/positions/' + name + '/values/3'),
        } for name in raw['cases'][ip.split('/')[2]][ip.split('/')[3]]['positions']},
        'ascmc': take(op + '/ascmc', ip + '/ascmc'),
        'cuspsDegrees': take(op + '/cuspsDegrees', ip + '/cuspsDegrees'),
        'expectedProductHouseSystem': take(op + '/expectedProductHouseSystem', ip + '/expectedProductHouseSystem'),
    }

result = {'schemaVersion': 1, 'sourceSHA256': digests,
          'extractionRecipeSHA256': sha256(Path(__file__).read_bytes()).hexdigest(), 'cases': []}
for i, (name, reference) in enumerate(raw['cases'].items()):
    op, ip = f'/cases/{i}', '/cases/' + name
    row = {'id': name,
           'natalLongitudeDegrees': take(op + '/natalLongitudeDegrees', ip + '/natalLongitudeDegrees'),
           'independentChartUTC': take(op + '/independentChartUTC', ip + '/chartAtIndependentInstant/instant/productDateTransport'),
           'chartAtIndependentInstant': chart(op + '/chartAtIndependentInstant', ip + '/chartAtIndependentInstant'),
           'crossings': []}
    for j, _ in enumerate(reference['crossings']):
        cp, rp = op + f'/crossings/{j}', ip + f'/crossings/{j}'
        row['crossings'].append({
            'expectedMilliseconds': take(cp + '/expectedMilliseconds', rp + '/estimate/productTransportMilliseconds'),
            'timeScale': take(cp + '/timeScale', rp + '/estimate/timeScale'),
            'fixedExternalTargetAllowedMilliseconds': take(cp + '/fixedExternalTargetAllowedMilliseconds', rp + '/timeBands/fixedExternalTarget/allowedProductMilliseconds'),
            'natalDerivedAllowedMilliseconds': take(cp + '/natalDerivedAllowedMilliseconds', rp + '/timeBands/natalDerivedTarget/allowedProductMilliseconds'),
            'retrograde': take(cp + '/retrograde', rp + '/retrograde'),
            'speedDegreesPerDay': take(cp + '/speedDegreesPerDay', rp + '/evaluation/values/3'),
        })
    if 'relocatedChartAtIndependentInstant' in reference:
        row['relocatedChartAtIndependentInstant'] = chart(op + '/relocatedChartAtIndependentInstant', ip + '/relocatedChartAtIndependentInstant')
    result['cases'].append(row)
result['sourceMap'] = source_map
out.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
print(json.dumps({'output': str(out), 'bytes': out.stat().st_size,
                  'sha256': sha256(out.read_bytes()).hexdigest(), 'mappedFields': len(source_map)}))
