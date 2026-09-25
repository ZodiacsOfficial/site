"""How far the reconstruction's sources disagree, per era. Writes outputs/revision.json.

    DELTAT_SOURCES=<dir> python3 tools/revision.py

- Table S15.2020 (the 2020 addendum; not shipped, read only for this) minus
  Table S15 (2016, what the model uses): largest difference per era, on a
  0.05-year grid.
- USNO historic_deltat.data minus Table S15 (2016), at USNO's half-year points:
  mean, RMS and largest difference per era. USNO's values before 1955 are an
  older reduction of the occultations; after 1955.5 they are atomic-time values.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

ERAS = [(-720, 1000), (1000, 1600), (1600, 1620), (1620, 1700), (1700, 1800), (1800, 1900), (1900, 1941), (1941, 1956), (1956, 2016)]


def main():
    t16, t20 = lib.s15_2016(), lib.s15_2020()
    usno = lib.read_usno_historic()
    rev = {}
    for a, b in ERAS:
        n = int(round((b - a) / 0.05))
        worst, at = 0.0, None
        for k in range(n):
            y = a + 0.05 * k
            d = lib.s15(t20, y) - lib.s15(t16, y)
            if abs(d) > abs(worst):
                worst, at = d, round(y, 2)
        rev[f'{a}-{b}'] = {'maxAbs': round(abs(worst), 3), 'signed': round(worst, 3), 'at': at}
    us = {}
    for a, b in [(1657, 1700), (1700, 1800), (1800, 1850), (1850, 1900), (1900, 1941), (1941, 1956), (1956, 1985)]:
        d = [(usno[y][0] - lib.s15(t16, y), y) for y in sorted(usno) if a <= y < b]
        worst = max(d, key=lambda x: abs(x[0]))
        us[f'{a}-{b}'] = {'n': len(d), 'mean': round(sum(x for x, _ in d) / len(d), 3), 'rms': round(math.sqrt(sum(x * x for x, _ in d) / len(d)), 3),
                          'maxAbs': round(abs(worst[0]), 3), 'at': worst[1]}
    lib.dump({'s15_2020MinusS15_2016': rev, 'usnoMinusS15_2016': us}, 'revision.json')
    for k, v in rev.items():
        print('2020-2016', k, v)
    for k, v in us.items():
        print('USNO-2016', k, v)


if __name__ == '__main__':
    main()
