import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path('/private/tmp/zodiacs-r3-site')
HERE = Path('/private/tmp/zodiacs-r3-site-review')
MAIN = '1d7d0d0e3baf06f813e9f164aa8ec5394bbd6af7'
SELECTED = '60f9c779b69935e93dd14b7f8aac90dbbd4a6d35'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def blob(path):
    p = ROOT / path
    if not p.exists() and not p.is_symlink():
        return None
    b = os.readlink(p).encode() if p.is_symlink() else p.read_bytes()
    return hashlib.sha1(b'blob ' + str(len(b)).encode() + b'\0' + b).hexdigest()

def tree(ref):
    out = {}
    for record in git('ls-tree', '-rz', ref).split(b'\0'):
        if not record:
            continue
        metadata, path = record.split(b'\t', 1)
        mode, kind, sha = metadata.decode().split(' ')
        out[path.decode()] = (mode, sha)
    return out

main = tree(MAIN)
accepted = tree(SELECTED)
concurrent = json.loads((HERE / 'concurrent-main.json').read_text())['files']
concurrent_changes = [f['filename'] for f in concurrent]
concurrent_differences = [p for p in concurrent_changes if blob(p) != main[p][1]]
immutable = [p for p in main if p.startswith('public/assets/data/registry-research/items/')]
immutable_differences = [p for p in immutable if blob(p) != main[p][1]]
astrofolio = sum(json.loads((HERE / 'astrofolio-files.json').read_text()), [])
astrofolio_present = [f['filename'] for f in astrofolio if (ROOT / f['filename']).exists()]
conflicts = json.loads(Path('/private/tmp/zodiacs-r3-evidence/main-preserved-conflicts.json').read_text())
conflict_differences = [p for p in conflicts if blob(p) != main[p][1]]

frozen = json.loads(Path('/private/tmp/zodiacs-platform-reference-caption-evidence/freeze1-identity.json').read_text())['files']
frozen_mismatch = [p for p, expected in frozen.items()
                   if hashlib.sha256((ROOT / p).read_bytes()).hexdigest() != expected['sha256']]

main_lock = json.loads(base64.b64decode(json.loads((HERE / 'main-lock-api.json').read_text())['content']))
lock = json.loads((ROOT / 'package-lock.json').read_text())
lock_differences = sorted(k for k in set(lock['packages']) | set(main_lock['packages'])
                          if lock['packages'].get(k) != main_lock['packages'].get(k))
expected_lock = json.loads(json.dumps(main_lock))
expected_lock['packages']['']['dependencies']['@zodiacs/engine'] = 'file:vendor/zodiacs-engine-0.1.1-rc.6.tgz'
selected_lock = json.loads(git('show', SELECTED + ':package-lock.json'))
expected_lock['packages']['node_modules/@zodiacs/engine'] = selected_lock['packages']['node_modules/@zodiacs/engine']
archive = ROOT / 'vendor/zodiacs-engine-0.1.1-rc.6.tgz'

protected = [
    'CLAUDE.md', 'public/registry/zodiacs.registry.json',
    'src/data/registry-research/approval-manifest.json',
    'vendor/zodiacs-engine-0.1.0.tgz', 'scripts/phase1-scope-guard.mjs',
    'tests/visual/lighthouse.mjs', 'tests/visual/widget-lighthouse.mjs',
    'scripts/verify-daily-freshness.mjs', 'public/sw.js',
    'scripts/registry-market-snapshot-lib.mjs',
    'scripts/registry-market-snapshot.test.mjs', 'scripts/registry-research-lib.mjs',
    'scripts/build-sign-pages.mjs', 'scripts/sign-records.test.mjs',
    'tests/sign-record-drive.mjs', 'src/pages/today/index.astro',
]

tracked = [p.decode() for p in git('ls-files', '-z').split(b'\0') if p]
new_compositions = [p for p in tracked if not p.startswith('docs/')
                    and blob(p) not in [main.get(p, ('', None))[1], accepted.get(p, ('', None))[1]]]

report = {
    'main': MAIN,
    'selected': SELECTED,
    'head': git('rev-parse', 'HEAD').decode().strip(),
    'mergeHead': git('rev-parse', 'MERGE_HEAD').decode().strip(),
    'unmergedPaths': git('diff', '--name-only', '--diff-filter=U').decode().splitlines(),
    'accepted469AncestorOfMergeHead': subprocess.run(['git', 'merge-base', '--is-ancestor',
        '35301d24907b6eb7117a1f4b0ae690ca42c57de6', SELECTED], cwd=ROOT).returncode == 0,
    'concurrentChangedPaths': len(concurrent_changes),
    'concurrentDifferentFromMain': concurrent_differences,
    'mainImmutableItemCount': len(immutable),
    'mainImmutableDifferences': immutable_differences,
    'rootConflictPreservationPathCount': len(conflicts),
    'rootConflictPreservationDifferences': conflict_differences,
    'astrofolioActualPathCount': len(astrofolio),
    'astrofolioPresent': astrofolio_present,
    'frozenCaptionCount': len(frozen),
    'frozenCaptionMismatches': frozen_mismatch,
    'lockDifferentPackageRecords': lock_differences,
    'lockExactlyMainPlusAcceptedEngine': lock == expected_lock,
    'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'protectedMainIdentities': {p: {'main': main[p][1], 'candidate': blob(p)} for p in protected},
    'composedNonDocumentationPaths': new_compositions,
    'composedSourceSha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in new_compositions},
}
(HERE / 'candidate-review.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['protectedMainIdentities', 'composedSourceSha256']}, indent=2))
assert not report['unmergedPaths']
assert report['accepted469AncestorOfMergeHead']
assert not immutable_differences
assert not astrofolio_present
assert not frozen_mismatch
assert lock == expected_lock
assert all(v['main'] == v['candidate'] for v in report['protectedMainIdentities'].values())
