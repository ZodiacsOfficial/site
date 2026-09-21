"""
Extract the published IAU 2000A / 2000B nutation series from the ERFA C
sources into plain JSON.

Provenance: the coefficient tables are the MHB2000 / McCarthy & Luzum (2003)
published series as carried by ERFA (BSD-3-Clause, derived with permission
from IAU SOFA).  Nothing here comes from Swiss Ephemeris code, data or output.

  python3 parse-erfa-tables.py <vendor-dir> <out-dir>
"""
import json
import re
import sys


def braces_blocks(text):
    """Yield the contents of every top-level { ... } group in `text`."""
    depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == '{':
            if depth == 0:
                start = i + 1
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                yield text[start:i]


def strip_comments(text):
    return re.sub(r'/\*.*?\*/', ' ', text, flags=re.S)


def table_body(src, decl):
    """Text between `} <decl>[] = {` and the matching closing `};`."""
    m = re.search(r'\}\s*' + decl + r'\[\]\s*=\s*\{', src)
    if not m:
        raise SystemExit(f'table {decl} not found')
    i = m.end()
    depth = 1
    j = i
    while depth:
        if src[j] == '{':
            depth += 1
        elif src[j] == '}':
            depth -= 1
        j += 1
    return src[i:j - 1]


def parse_rows(body, nints, nfloats):
    rows = []
    for block in braces_blocks(body):
        nums = re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', block)
        if len(nums) != nints + nfloats:
            raise SystemExit(f'row has {len(nums)} numbers, expected {nints + nfloats}: {block!r}')
        rows.append([int(v) for v in nums[:nints]] + [float(v) for v in nums[nints:]])
    return rows


vendor, out = sys.argv[1], sys.argv[2]

b = strip_comments(open(f'{vendor}/nut00b.c').read())
xb = parse_rows(table_body(b, 'x'), 5, 6)

a = strip_comments(open(f'{vendor}/nut00a.c').read())
xls = parse_rows(table_body(a, 'xls'), 5, 6)

meta = {
    'provenance': 'ERFA (liberfa) src/nut00b.c and src/nut00a.c, BSD-3-Clause, '
                  'derived with permission from IAU SOFA; the series itself is '
                  'MHB2000 (Mathews, Herring & Buffett 2002) / McCarthy & Luzum (2003).',
    'units': '0.1 microarcsecond (and per Julian century for the t-scaled columns)',
    'nut00b_luniSolar': {'n': len(xb), 'columns': ['nl', 'nlp', 'nf', 'nd', 'nom', 'ps', 'pst', 'pc', 'ec', 'ect', 'es'], 'rows': xb},
    'nut00a_luniSolar': {'n': len(xls), 'columns': ['nl', 'nlp', 'nf', 'nd', 'nom', 'sp', 'spt', 'cp', 'ce', 'cet', 'se'], 'rows': xls},
}
# The ERFA planetary struct is 13 integer multipliers followed by four
# integer amplitudes (sp, cp, se, ce), all in units of 0.1 microarcsecond.
xpl2 = parse_rows(table_body(a, 'xpl'), 17, 0)
meta['nut00a_planetary'] = {'n': len(xpl2),
                            'columns': ['nl', 'nf', 'nd', 'nom', 'nme', 'nve', 'nea', 'nma', 'nju', 'nsa', 'nur', 'nne', 'npa', 'sp', 'cp', 'se', 'ce'],
                            'rows': xpl2}

with open(f'{out}/nutation-series.json', 'w') as fh:
    json.dump(meta, fh)
print('nut00b luni-solar terms:', len(xb))
print('nut00a luni-solar terms:', len(xls))
print('nut00a planetary terms :', len(xpl2))
print('nut00a total           :', len(xls) + len(xpl2))
