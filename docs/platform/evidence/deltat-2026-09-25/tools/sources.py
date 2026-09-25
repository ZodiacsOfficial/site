"""Writes ../sources.json: every raw source the tools read, with URL, retrieval
date, Last-Modified, bytes, SHA-256 and licence. Bytes and digests are computed
from the files in DELTAT_SOURCES; the rest is recorded here by hand.

    DELTAT_SOURCES=<dir> python3 tools/sources.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402

IERS = ('IERS product, free to use with citation of the IERS '
        '(https://www.iers.org/IERS/EN/Science/Publications/publications.html)')
USNO = 'US Government work (USNO), public domain in the United States'
CCBY = 'CC BY 4.0 (the article and its electronic supplementary material, PMC5247521)'

META = [
    ('finals2000A.all', 'https://maia.usno.navy.mil/ser7/finals2000A.all',
     'Thu, 24 Sep 2026 17:37:44 GMT',
     'IERS Rapid Service/Prediction Centre at USNO, Bulletin A columns (IAU 2000). '
     'The mirror https://datacenter.iers.org/data/9/finals2000A.all (Last-Modified 17:37:52) was byte-identical. '
     + USNO + '; ' + IERS,
     'Observed (I) and predicted (P) UT1 − UTC from 1973-01-02; the table from 1973 and its prediction knot; gate 1 after 1972.'),
    ('eopc04.1962-now', 'https://hpiers.obspm.fr/iers/eop/eopc04/eopc04.1962-now',
     'Thu, 24 Sep 2026 13:21:06 GMT', 'IERS EOP 20 C04 (Paris Observatory). ' + IERS,
     'UT1 − UTC 1962-01-01 to 1973-01-01 (per-era source rule); gate 1 before 1973.'),
    ('tai-utc.dat', 'https://maia.usno.navy.mil/ser7/tai-utc.dat',
     'Thu, 18 Jun 2026 17:26:25 GMT', USNO,
     'TAI − UTC, including the 1961–1971 drift formulas.'),
    ('historic_deltat.data', 'https://maia.usno.navy.mil/ser7/historic_deltat.data',
     'Thu, 18 Jun 2026 17:26:25 GMT', USNO,
     'Whole-year knots 1941–1961; comparison with Table S15 (2016) in 1657–1984.'),
    ('Table-S15.txt', 'rspa20160404supp2.zip (below), member Table-S15.txt',
     None, CCBY,
     'Stephenson, Morrison & Hohenkerk 2016, Table S15: the reconstruction from −720 to 1941 (32 knots of its C2 spline).'),
    ('extract-lunarocc.dat', 'rspa20160404supp2.zip (below), member extract-lunarocc.dat',
     None, CCBY + '; derived by SMH from the IOTA/CDS archive VI/132B (Herald & Gault)',
     'The lunar occultation ΔT values and weights SMH 2016 fitted; σ from 1620 to 1850 (decade scatter).'),
    ('rspa20160404supp2.zip', 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5247521/supplementaryFiles '
     '(a zip of the article\'s supplementary files; this member\'s MD5 322c18c812171a2c0c959509e093faf4 equals the JATS record\'s)',
     None, CCBY, 'Container of Table-S15.txt and extract-lunarocc.dat.'),
    ('rspa20160404supp1.pdf', 'same Europe PMC zip, member rspa20160404supp1.pdf (MD5 44538a36f5bcf74db341d2ed1e69a907, as the JATS record)',
     None, CCBY, 'Section S5: how Table S15 is evaluated.'),
    ('PMC5247521.xml', 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5247521/fullTextXML',
     None, CCBY, 'Eq. (4.1) parabola 32.5 ± 0.6 s/cy²; eq. (5.1) lod = 1.78t − 4.0 sin(2πt/15) ms; ṅ = −25.82″/cy².'),
    ('Table-S15.2020.txt', 'https://web.archive.org/web/20220320003423/http://astro.ukho.gov.uk/nao/lvm/Table-S15.2020.txt',
     None, 'No licence established (HMNAO page Crown copyright; Crossref lists only a text-and-data-mining licence for the addendum, 10.1098/rspa.2020.0776). '
     'Used only to measure the 2016→2020 revision; nothing from it ships.',
     'σ before 1850 (revision size).'),
]

BULLETIN_A = ('https://datacenter.iers.org/data/6/<file>', IERS)


def main():
    out = []
    for name, url, lm, lic, use in META:
        path = os.path.join(lib.SOURCES_DIR, name)
        out.append({
            'file': name, 'url': url, 'retrieved': '2026-09-25', 'lastModified': lm,
            'bytes': os.path.getsize(path), 'sha256': lib.sha256_file(path), 'licence': lic, 'usedFor': use,
        })
    for folder, use in (('bulletin-a', 'Weekly issues 2025-01-02 to 2026-09-17: the monitor replay and the weekly calibration.'),
                        ('bulletin-a-quarterly', 'Quarterly issues 2015–2025 (nos. 1, 13, 26, 39 of each volume): the calibration.')):
        files = sorted(os.listdir(os.path.join(lib.SOURCES_DIR, folder)))
        out.append({
            'file': folder + '/', 'url': BULLETIN_A[0], 'retrieved': '2026-09-25', 'lastModified': None,
            'count': len(files), 'licence': BULLETIN_A[1], 'usedFor': use,
            'members': [{'file': f, 'bytes': os.path.getsize(os.path.join(lib.SOURCES_DIR, folder, f)),
                         'sha256': lib.sha256_file(os.path.join(lib.SOURCES_DIR, folder, f))} for f in files],
        })
    with open(os.path.join(lib.EVIDENCE, 'sources.json'), 'w') as f:
        json.dump({'note': 'Raw sources are not committed; each is named here by SHA-256. DELTAT_SOURCES points the tools at a directory holding them.',
                   'sources': out}, f, indent=1, ensure_ascii=False)
        f.write('\n')
    for s in out:
        print(s['file'], s.get('bytes', s.get('count')), s.get('sha256', '')[:16])


if __name__ == '__main__':
    main()
