"""Fetch only pinned official reference inputs into this scratch directory."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
pypi = json.loads((ROOT / 'receipts/pypi-pyswisseph-2.10.3.2.json').read_text())
commit = json.loads((ROOT / 'receipts/swisseph-master-commit.json').read_text())
assert pypi['info']['version'] == '2.10.3.2'
revision = commit['sha']
assert len(revision) == 40 and all(c in '0123456789abcdef' for c in revision)
sdist, = [item for item in pypi['urls'] if item['packagetype'] == 'sdist']
assert sdist['digests']['sha256'] == 'c54c305e83dbd5d2b71e58d8a69d8ee41de24c4d3328ce09e2af860a3537624d'
inputs = [{
    'name': sdist['filename'], 'url': sdist['url'],
    'destination': 'downloads/' + sdist['filename'],
    'expectedSHA256': sdist['digests']['sha256'],
    'provider': 'PyPI / astrorigin pyswisseph',
}]
for filename in ['semo_18.se1', 'sepl_18.se1']:
    inputs.append({
        'name': filename,
        'url': f'https://raw.githubusercontent.com/aloistr/swisseph/{revision}/ephe/{filename}',
        'destination': 'ephe/' + filename,
        'provider': 'Astrodienst / aloistr/swisseph',
        'gitRevision': revision,
    })

def acquire(item):
    request = Request(item['url'], headers={'User-Agent': 'Wave19-independent-validation/1.0'})
    with urlopen(request, timeout=60) as response:
        payload = response.read()
        receipt = {
            **item, 'retrievedAtUTC': datetime.now(timezone.utc).isoformat(),
            'resolvedURL': response.url, 'headers': dict(response.headers),
            'bytes': len(payload), 'sha256': sha256(payload).hexdigest(),
        }
    if 'expectedSHA256' in item:
        assert receipt['sha256'] == item['expectedSHA256']
    assert len(payload) > 100_000, 'Reject empty/error download'
    path = ROOT / item['destination']
    assert not path.exists(), f'Refusing to overwrite acquired input: {path}'
    path.write_bytes(payload)
    return receipt

with ThreadPoolExecutor(max_workers=3) as pool:
    receipts = list(pool.map(acquire, inputs))
manifest = {
    'purpose': 'Scratch-only independent Swiss reference acquisition; no application results',
    'distributionVersion': '2.10.3.2',
    'officialDistributionURL': 'https://pypi.org/project/pyswisseph/2.10.3.2/',
    'officialSwissRepository': 'https://github.com/aloistr/swisseph',
    'repositoryCommit': revision,
    'inputs': receipts,
}
(ROOT / 'receipts/acquisition.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps([{k: r[k] for k in ['name', 'bytes', 'sha256']} for r in receipts], indent=2))
