"""The events part of zodiacs-holdout/1.4, reported without a gate.

    python3 holdout_events.py <holdout-1.4.json> > holdout-events.json

For each of the 50 drawn events: the regenerated (rc.8) catalog's instant
minus rc.7's, and minus Swiss's. Both come from the comparisons already
committed, which ran ../events-vs-swiss-2026-09-23/tools/compare.py on each
catalog: events-vs-swiss-2026-09-23/deltas.json (rc.7) and
events-vs-swiss-2026-09-25/deltas.json (rc.8). Swiss's own instants are the
same in both runs to the millisecond, so rc.8 − rc.7 is also the difference
of the two published instants, which is what is computed here.
"""
import json
import os
import sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
EVIDENCE = os.environ.get('EVIDENCE_DIR') or os.path.normpath(os.path.join(HERE, '..', '..'))


def load(name):
    with open(os.path.join(EVIDENCE, name, 'deltas.json')) as f:
        return {d['id']: d for d in json.load(f)['deltas']}


def instant(text):
    return datetime.fromisoformat(text.replace('Z', '+00:00')).timestamp()


def stats(values):
    v = sorted(values)
    n = len(v)
    absolute = sorted(abs(x) for x in v)
    return {'n': n, 'median': round(v[n // 2], 3), 'maxAbs': round(absolute[-1], 3), 'minAbs': round(absolute[0], 3)}


def main():
    holdout = json.load(open(sys.argv[1]))
    rc7 = load('events-vs-swiss-2026-09-23')
    rc8 = load('events-vs-swiss-2026-09-25')
    rows = []
    for event in holdout['events']:
        new, old = rc8[event['id']], rc7[event['id']]
        if new['published'] != event['at']:
            raise SystemExit(f"{event['id']}: holdout instant {event['at']} is not the compared catalog's {new['published']}")
        rows.append({'id': event['id'], 'family': event['family'], 'at': event['at'],
                     'minusRc7Seconds': round(instant(new['published']) - instant(old['published']), 3),
                     'minusSwissSeconds': new['deltaSeconds'], 'rc7MinusSwissSeconds': old['deltaSeconds']})
    families = sorted({r['family'] for r in rows})
    out = {'id': holdout['id'], 'eventsSha256': holdout['eventsSha256'], 'events': len(rows), 'byFamily': {}, 'rows': rows}
    for family in families:
        sel = [r for r in rows if r['family'] == family]
        out['byFamily'][family] = {'minusRc7': stats([r['minusRc7Seconds'] for r in sel]),
                                   'minusSwiss': stats([r['minusSwissSeconds'] for r in sel]),
                                   'rc7MinusSwiss': stats([r['rc7MinusSwissSeconds'] for r in sel])}
    json.dump(out, sys.stdout, indent=1)
    sys.stdout.write('\n')


if __name__ == '__main__':
    main()
