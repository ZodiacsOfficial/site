"""Writes the two fixtures the engine's src/deltat.test.ts reads, into a directory
(default ./fixtures):
  iers-12.json          gate 1's twelve IERS values (a copy of ../iers-12.json)
  table-s15-2016.json   Table S15 of SMH 2016 (CC BY 4.0), the rows up to 1945,
                        with the attribution the licence asks for

    DELTAT_SOURCES=<dir> python3 tools/engine_fixtures.py [out-dir]
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'fixtures'
    os.makedirs(out, exist_ok=True)
    shutil.copyfile(os.path.join(lib.EVIDENCE, 'iers-12.json'), os.path.join(out, 'iers-12.json'))
    rows = [r for r in lib.s15_2016() if r[1] <= 1945]
    src = lib.manifest()['Table-S15.txt']
    doc = {
        'source': 'Stephenson, F. R., Morrison, L. V. & Hohenkerk, C. Y. 2016, Measurement of the Earth\'s rotation: '
                  '720 BC to AD 2015. Proc. R. Soc. A 472: 20160404, doi:10.1098/rspa.2016.0404. Electronic '
                  'supplementary material, Table S15 (rows 1 to 31 of 54).',
        'licence': 'CC BY 4.0, https://creativecommons.org/licenses/by/4.0/',
        'file': {'name': 'Table-S15.txt', 'sha256': src['sha256'], 'bytes': src['bytes']},
        'evaluation': 'For K_i <= Y < K_{i+1}: t = (Y − K_i)/(K_{i+1} − K_i), ΔT = a0 + a1·t + a2·t² + a3·t³ seconds.',
        'columns': ['K_i', 'K_i+1', 'a0', 'a1', 'a2', 'a3'],
        'rows': [list(r) for r in rows],
    }
    with open(os.path.join(out, 'table-s15-2016.json'), 'w') as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print(out, len(rows), 'rows')


if __name__ == '__main__':
    main()
