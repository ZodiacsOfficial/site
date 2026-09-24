"""Horizons VECTORS for the frame-free check (brief v1, M0 item 3): geometric
geocentric ICRF positions, DE441, at the 24 corpus instants, for the Moon
(301), Mars (499) and the Mars system barycentre (4). The instants are the
corpus's TT Julian dates sent as TDB, so the kernel is read at exactly the
same argument (compare_vectors.py). Each response is cached verbatim beside
this file and the query string is logged; a cached file is never refetched.

  python3 fetch_vectors.py
"""
import json
import os
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(HERE, '..', '..', 'corpora', 'horizons-24', 'corpus-tt.json')
TARGETS = {'Moon': '301', 'Mars': '499', 'MarsBary': '4'}

tlist = ' '.join(f"{c['jdTt']:.8f}" for c in json.load(open(CORPUS))['cases'])
with open(os.path.join(HERE, 'queries.log'), 'a') as log:
    for label, command in TARGETS.items():
        out = os.path.join(HERE, f'{label}.txt')
        if os.path.exists(out):
            print(label, 'cached')
            continue
        params = {
            'format': 'text', 'COMMAND': f"'{command}'", 'OBJ_DATA': "'NO'", 'MAKE_EPHEM': "'YES'",
            'EPHEM_TYPE': "'VECTORS'", 'CENTER': "'500@399'", 'REF_PLANE': "'FRAME'", 'REF_SYSTEM': "'ICRF'",
            'VEC_TABLE': "'1'", 'VEC_CORR': "'NONE'", 'OUT_UNITS': "'KM-S'", 'VEC_LABELS': "'NO'",
            'CSV_FORMAT': "'YES'", 'TLIST': f"'{tlist}'", 'TLIST_TYPE': "'JD'", 'TIME_TYPE': "'TDB'",
        }
        url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(params)
        started = time.time()
        with urllib.request.urlopen(url, timeout=120) as response:
            body = response.read().decode()
        open(out, 'w').write(body)
        log.write(json.dumps({'label': label, 'command': command, 'url': url, 'bytes': len(body)}) + '\n')
        print(label, 'fetched', len(body), 'bytes in', round(time.time() - started, 1), 's')
