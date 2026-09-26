"""The Moon's sign ingresses the site publishes, against Swiss Ephemeris.

  venv/bin/python moon-ingresses.py <site>/src/data/aura-moon-ingresses.json <ephe-dir>

For each published ingress, Swiss's own crossing of the same sign boundary
(swe.mooncross_ut from half a day before, FLG_SWIEPH, apparent geocentric
ecliptic of date) and the site's instant minus Swiss's, in seconds. Prints
statistics only; no Swiss instant is written.
"""
import json
import sys
from datetime import datetime

import swisseph as swe

SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
         'sagittarius', 'capricorn', 'aquarius', 'pisces']


def jd(iso):
    t = datetime.fromisoformat(iso.replace('Z', '+00:00'))
    return swe.julday(t.year, t.month, t.day, t.hour + t.minute / 60 + (t.second + t.microsecond / 1e6) / 3600)


def main():
    data = json.load(open(sys.argv[1]))
    swe.set_ephe_path(sys.argv[2])
    diffs = []
    for row in data['ingresses']:
        t = jd(row['at'])
        crossing = swe.mooncross_ut(SIGNS.index(row['sign']) * 30.0, t - 0.5, swe.FLG_SWIEPH)
        diffs.append((t - crossing) * 86400.0)
    ordered = sorted(abs(d) for d in diffs)
    print(json.dumps({
        'from': data['from'], 'to': data['to'], 'n': len(diffs),
        'medianAbsSeconds': round(ordered[len(ordered) // 2], 3),
        'maxAbsSeconds': round(ordered[-1], 3),
        'meanSeconds': round(sum(diffs) / len(diffs), 3),
        'minSeconds': round(min(diffs), 3), 'maxSeconds': round(max(diffs), 3),
        'swisseph': swe.version,
    }))


if __name__ == '__main__':
    main()
