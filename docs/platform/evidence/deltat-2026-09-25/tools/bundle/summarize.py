"""Writes outputs/engine-chunk.json from the three rows measure.sh printed (JSON
lines): rc.7 as vendored, engine b457204 without the model, and b457204 with
deltat.ts and the E2 prototype. run.sh calls it.

    python3 tools/bundle/summarize.py <rows.jsonl>
"""
import json
import os
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'outputs', 'engine-chunk.json')
WHAT = {
    'rc7': '@zodiacs/engine 0.1.1-rc.7 as vendored at 982caca2',
    'rc8-phase1-b457204': 'engine b457204 (rc8-phase1: steps 1.7, 1.10, 1.11), no ΔT model',
    'rc8-phase1-b457204+deltat': 'engine b457204 + deltat.ts + the E2 prototype (tools/bundle/apply-e2-prototype.py)',
}
BUDGET = 25 * 1024
PROPOSED = 26 * 1024

with open(sys.argv[1]) as f:
    rows = [json.loads(line) for line in f if line.strip()]
if [r['label'] for r in rows] != list(WHAT):
    raise SystemExit(f'expected the rows {list(WHAT)}, in that order')
for r in rows:
    r['what'] = WHAT[r['label']]
base, model = rows[1], rows[2]
out = {
    'budget': {'engineChunkKB': 25, 'bytes': BUDGET},
    'tool': 'tools/bundle/measure.sh on a scratch copy of the site at 982caca2 (Astro 7.3.2)',
    'variants': rows,
    'modelCostBytes': model['engineClosureGzipBytes'] - base['engineClosureGzipBytes'],
    'overBudgetBytes': model['engineClosureGzipBytes'] - BUDGET,
    'proposedBudgetBytes': PROPOSED,
    'headroomAtProposedBudgetBytes': PROPOSED - model['engineClosureGzipBytes'],
    'routesUnchangedByModel': base['routes'] == model['routes'],
}
with open(OUT, 'w') as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
    f.write('\n')
print({k: v for k, v in out.items() if k != 'variants'})
