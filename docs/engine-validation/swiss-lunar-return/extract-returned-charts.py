"""Pure extraction of separately acquired same-time Swiss chart expectations."""
from hashlib import sha256
from pathlib import Path
import json
import sys

root, out = map(Path, sys.argv[1:])
assert not out.exists(), 'Refusing to overwrite extracted same-time expectations'
digests = {
    'lunar-returned-charts.raw.json': '22482ee42813c8cba04226233bb793ab20d82cd5a9932a40ba16ae2e0b8d5e34',
    'lunar-returned-chart-policy.v1.json': '5aa2b8c203811d0e004c1b4af44d96076e64fe04abf6c179387d15b0f0706e1d',
    'lunar-return-policy.v2.json': '16c807cfb7374c340200064ba6f4332b98923f77b05f6f24f62ea5541d5aa146',
}
for name, expected in digests.items():
    assert sha256((root / name).read_bytes()).hexdigest() == expected, f'Source drift: {name}'
raw = json.loads((root / 'lunar-returned-charts.raw.json').read_text())
mapping = {}

def take(op, ip):
    value = raw
    for key in ip.strip('/').split('/'):
        value = value[int(key)] if isinstance(value, list) else value[key]
    mapping[op] = {'file': 'lunar-returned-charts.raw.json', 'pointer': ip}
    return value

result = {'schemaVersion': 1, 'sourceSHA256': digests,
          'extractionRecipeSHA256': sha256(Path(__file__).read_bytes()).hexdigest(), 'charts': []}
for i, source in enumerate(raw['charts']):
    op, ip = f'/charts/{i}', f'/charts/{i}'
    result['charts'].append({
        'id': take(op + '/id', ip + '/id'), 'caseId': take(op + '/caseId', ip + '/caseId'),
        'utc': take(op + '/utc', ip + '/instant/transportUTC'),
        'reference': {
            'positions': {body: {
                'longitudeDegrees': take(op + '/reference/positions/' + body + '/longitudeDegrees', ip + '/positions/' + body + '/values/0'),
                'speedDegreesPerDay': take(op + '/reference/positions/' + body + '/speedDegreesPerDay', ip + '/positions/' + body + '/values/3'),
            } for body in source['positions']},
            'ascmc': take(op + '/reference/ascmc', ip + '/ascmc'),
            'cuspsDegrees': take(op + '/reference/cuspsDegrees', ip + '/cuspsDegrees'),
            'expectedProductHouseSystem': take(op + '/reference/expectedProductHouseSystem', ip + '/expectedProductHouseSystem'),
        },
    })
result['sourceMap'] = mapping
out.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
print(json.dumps({'output': str(out), 'bytes': out.stat().st_size,
                  'sha256': sha256(out.read_bytes()).hexdigest(), 'mappedFields': len(mapping)}))
