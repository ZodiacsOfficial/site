"""ERFA's RAMC and true obliquity for grids A and L on the engine's own clock, the arbiter's
construction (tools/angle-arbiter.py: gst06a with UT1 := UTC, obl06 + nut06a's deps), so the
engine's own Placidus routine can be run on the arbiter's inputs ("ERFA cusps").

No Swiss input. Reads the corpus and $WORK/s13/erfa-rebuild/angle-clock.json; writes
$WORK/s19/erfa-inputs.json and prints counts.
  $PYTHON tools/s19/erfa_inputs.py > $WORK/s19/erfa-inputs.log
"""
import json, math
import erfa
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SITE_ROOT, WORK, out_dir  # noqa: E402

O = WORK
out_dir('s19')
J2000 = 2451545.0
corpus = json.load(open(SITE_ROOT + '/docs/platform/evidence/engine-beyond-swiss/corpora/angle-grid-inputs.json'))
clock = json.load(open(O + '/s13/erfa-rebuild/angle-clock.json'))
out = {'pyerfa': erfa.__version__, 'erfa': erfa.version.erfa_version}
for grid in ('A', 'L'):
    rows = []
    for (utc, lat, lon, _), (ut, tt) in zip(corpus[grid], clock[grid]):
        ramc = (math.degrees(erfa.gst06a(J2000, ut, J2000, tt)) + lon) % 360.0
        eps = math.degrees(erfa.obl06(J2000, tt) + erfa.nut06a(J2000, tt)[1])
        rows.append([utc, lat, lon, ramc, eps])
    out[grid] = rows
json.dump(out, open(O + '/s19/erfa-inputs.json', 'w'))
print(json.dumps({g: len(out[g]) for g in ('A', 'L')}))
