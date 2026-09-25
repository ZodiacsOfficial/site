"""ΔT, σ and segment of the TypeScript module at the years the README quotes. Writes outputs/values.json.

    DELTAT_SOURCES=<dir> python3 tools/values.py [module]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

YEARS = [-3000, -2000, -1000, -720, 0, 500, 1000, 1500, 1600, 1620, 1700, 1750, 1800, 1850, 1900, 1941, 1950, 1956, 2000, 2026, 2027, 2030, 2050, 2100, 2150, 2199]


def main():
    r = lib.ts_model([(y - 2000) * 365.25 for y in YEARS], sys.argv[1] if len(sys.argv) > 1 else None)
    rows = [{'year': y, 'seconds': round(s, 3), 'sigma': round(g, 3), 'segment': seg} for y, s, g, seg in zip(YEARS, r['seconds'], r['sigma'], r['segment'])]
    lib.dump({'table': r['table']['digest'], 'argument': 'y = 2000 + ut/365.25 (Julian years)', 'rows': rows}, 'values.json')
    for x in rows:
        print(x)


if __name__ == '__main__':
    main()
