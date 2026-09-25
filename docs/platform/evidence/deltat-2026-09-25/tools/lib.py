"""Shared readers and the model twin for the zodiacs-deltat/1 evidence tools.

Every tool reads the raw sources from one directory, given by the environment
variable DELTAT_SOURCES (default: ./sources beside the working directory).
The files keep their original names; ../sources.json names each one by
SHA-256, and `source()` refuses a file whose digest differs unless
DELTAT_ANY_SNAPSHOT=1 is set (a later IERS file is a legitimate re-run, but
then the numbers are not the README's).

Conventions used throughout:
- ΔT = TT − UT1 in seconds; TT − UT1 = 32.184 + (TAI − UTC) − (UT1 − UTC).
- IERS values are at 0h UTC of their MJD.
- y = 2000 + (MJD − 51544.5) / 365.25, the argument the engine uses
  (astronomy-engine's `ut` divided by 365.25).
- Source per era for observed values (critique #15): IERS 20 C04 through
  MJD 41683 (1973-01-01), finals2000A rows flagged I from MJD 41684
  (1973-01-02, the first row of finals2000A.all).
"""
import hashlib
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
EVIDENCE = os.path.dirname(HERE)
SOURCES_DIR = os.environ.get('DELTAT_SOURCES', os.path.join(os.getcwd(), 'sources'))
ANY_SNAPSHOT = os.environ.get('DELTAT_ANY_SNAPSHOT') == '1'
LAST_C04_MJD = 41683  # 1973-01-01; finals2000A.all starts at 41684

_manifest = None


def manifest():
    global _manifest
    if _manifest is None:
        with open(os.path.join(EVIDENCE, 'sources.json')) as f:
            _manifest = {s['file']: s for s in json.load(f)['sources']}
    return _manifest


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def source(name):
    """Path of a named raw source, digest-checked against sources.json."""
    path = os.path.join(SOURCES_DIR, name)
    if not os.path.exists(path):
        raise SystemExit(f'missing source {name} in {SOURCES_DIR} (set DELTAT_SOURCES)')
    want = manifest().get(name, {}).get('sha256')
    if want and not ANY_SNAPSHOT:
        got = sha256_file(path)
        if got != want:
            raise SystemExit(f'{name}: sha256 {got} is not the recorded {want} (DELTAT_ANY_SNAPSHOT=1 to run on another snapshot)')
    return path


def bulletins(folder):
    """Paths of the Bulletin A issues in a sources.json folder entry, each digest-checked."""
    entry = manifest()[folder + '/']
    paths = []
    for member in entry['members']:
        path = os.path.join(SOURCES_DIR, folder, member['file'])
        if not ANY_SNAPSHOT and sha256_file(path) != member['sha256']:
            raise SystemExit(f'{folder}/{member["file"]}: digest differs from sources.json')
        paths.append(path)
    return paths


# ---------------------------------------------------------------- time

def mjd_of(y, m, d):
    """MJD at 0h UTC of a Gregorian date (Fliegel–Van Flandern)."""
    a = (14 - m) // 12
    yy = y + 4800 - a
    mm = m + 12 * a - 3
    jdn = d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045
    return jdn - 2400001


def date_of_mjd(mjd):
    """(y, m, d) of an integer MJD."""
    jdn = int(mjd) + 2400001
    a = jdn + 32044
    b = (4 * a + 3) // 146097
    c = a - 146097 * b // 4
    d = (4 * c + 3) // 1461
    e = c - 1461 * d // 4
    m = (5 * e + 2) // 153
    return 100 * b + d - 4800 + m // 10, m + 3 - 12 * (m // 10), e - (153 * m + 2) // 5 + 1


def iso_of_mjd(mjd):
    y, m, d = date_of_mjd(mjd)
    return f'{y:04d}-{m:02d}-{d:02d}'


def year_of_mjd(mjd):
    return 2000 + (mjd - 51544.5) / 365.25


def mjd_of_year(y):
    return 51544.5 + (y - 2000) * 365.25


# ---------------------------------------------------------------- IERS and USNO files

def read_tai_utc(path=None):
    """tai-utc.dat rows: (start MJD, a, b, c) with TAI − UTC = a + (MJD − b)·c."""
    rows = []
    for line in open(path or source('tai-utc.dat')):
        m = re.search(r'=JD\s+(\d+\.5)\s+TAI-UTC=\s*([\d.]+)\s*S\s*\+\s*\(MJD\s*-\s*([\d.]+)\s*\)\s*X\s*([\d.]+)\s*S', line)
        if m:
            jd, a, b, c = map(float, m.groups())
            rows.append((jd - 2400000.5, a, b, c))
    return rows


_TAI = None


def tai_utc(mjd):
    global _TAI
    if _TAI is None:
        _TAI = read_tai_utc()
    cur = None
    for start, a, b, c in _TAI:
        if mjd >= start:
            cur = (a, b, c)
    if cur is None:
        raise ValueError(f'no TAI − UTC before 1961 (MJD {mjd})')
    a, b, c = cur
    return a + (mjd - b) * c


def tt_minus_ut1(ut1_minus_utc, mjd):
    return 32.184 + tai_utc(mjd) - ut1_minus_utc


def read_finals(path=None):
    """finals2000A.all (IAU 2000): MJD -> (flag, UT1 − UTC, formal error), Bulletin A columns."""
    out = {}
    for line in open(path or source('finals2000A.all')):
        if len(line) < 78 or line[57] not in 'IP':
            continue
        out[int(float(line[7:15]))] = (line[57], float(line[58:68]), float(line[68:78]))
    return out


def read_c04(path=None):
    """IERS 20 C04: MJD -> (UT1 − UTC, formal error)."""
    out = {}
    for line in open(path or source('eopc04.1962-now')):
        if line.startswith('#') or not line.strip():
            continue
        p = line.split()
        out[int(float(p[4]))] = (float(p[7]), float(p[15]))
    return out


def read_usno_historic(path=None):
    """USNO historic_deltat.data: year -> (TT − UT1, error) at half-year steps, 1657–1984.5."""
    out = {}
    for line in open(path or source('historic_deltat.data')):
        p = line.split()
        try:
            out[float(p[0])] = (float(p[1]), float(p[2]))
        except (ValueError, IndexError):
            pass
    return out


def iers_daily(c04=None, finals=None):
    """MJD -> (ΔT, formal error of UT1 − UTC, source) with the per-era source rule.

    source is 'C04' through MJD 41683, then 'I' (finals observed) or 'P' (finals predicted).
    """
    c04 = c04 if c04 is not None else read_c04()
    finals = finals if finals is not None else read_finals()
    out = {}
    for mjd, (u, e) in c04.items():
        if mjd <= LAST_C04_MJD:
            out[mjd] = (tt_minus_ut1(u, mjd), e, 'C04')
    for mjd, (flag, u, e) in finals.items():
        if mjd > LAST_C04_MJD:
            out[mjd] = (tt_minus_ut1(u, mjd), e, flag)
    return out


def last_observed(daily):
    return max(m for m, v in daily.items() if v[2] in ('C04', 'I'))


def daily_at(daily, mjd):
    """Linear interpolation of daily values at a fractional MJD."""
    a = math.floor(mjd)
    f = mjd - a
    if f == 0:
        return daily[a][0]
    return daily[a][0] * (1 - f) + daily[a + 1][0] * f


# ---------------------------------------------------------------- Table S15 (piecewise cubics)

def read_s15(path):
    rows = []
    for line in open(path):
        p = line.split()
        if len(p) == 7:
            try:
                int(p[0])
                rows.append(tuple(map(float, p[1:])))
            except ValueError:
                pass
    return rows


def s15(rows, y):
    """ΔT from a Table S15 as its notes say: K_i <= Y < K_{i+1} (equality only at the last K)."""
    for k0, k1, a0, a1, a2, a3 in rows:
        if k0 <= y < k1 or (y == k1 == rows[-1][1]):
            t = (y - k0) / (k1 - k0)
            return a0 + a1 * t + a2 * t * t + a3 * t ** 3
    return None


def s15_2016():
    return read_s15(source('Table-S15.txt'))


def s15_2020():
    """The 2020 addendum's table. Used only as a measurement of revision size; nothing from it ships."""
    return read_s15(source('Table-S15.2020.txt'))


# ---------------------------------------------------------------- Bulletin A issues

def read_bulletin_a(path):
    """(date, reference MJD of S_t, {MJD: predicted UT1 − UTC}) of one weekly Bulletin A."""
    txt = open(path, errors='replace').read()
    m = re.search(r'S t = 0\.00025 \(MJD-(\d+)\)\*\*0\.75', txt)
    if not m:
        return None
    ref = int(m.group(1))
    d = re.search(r'^\s+(\d{1,2}) (\w+) (\d{4})\s+Vol\.', txt, re.M)
    i = txt.find('UT1-UTC(sec)')
    pred = {}
    for line in txt[i:].splitlines()[1:]:
        p = line.split()
        if len(p) == 7 and p[3].isdigit():
            pred[int(p[3])] = float(p[6])
        elif pred and not line.strip():
            break
    return {'date': ' '.join(d.groups()) if d else None, 'ref': ref, 'pred': pred}


# ---------------------------------------------------------------- the model twin

LOD_T0 = 1825.0  # SMH 2016 eq. (5.1): lod = 1.78 t − 4.0 sin(2πt/15) ms, t in centuries from 1825


def long_term(y):
    """Integral of SMH 2016's lod fit, eq. (5.1), in seconds (arbitrary constant)."""
    t = (y - LOD_T0) / 100
    return 36.525 * (0.89 * t * t + (30 / math.pi) * math.cos(2 * math.pi * t / 15))


def long_term_rate(y):
    """d(long_term)/dy in s/yr = 0.36525 × lod(ms)."""
    t = (y - LOD_T0) / 100
    return 0.36525 * (1.78 * t - 4.0 * math.sin(2 * math.pi * t / 15))


class Model:
    """Python twin of deltat.ts for a given table (a dict as table.json holds it).

    Used by the replay and hindcast tools, which need the same rule on other
    tables. tools/parity.py checks it against the TypeScript module.
    """

    def __init__(self, table):
        self.t = table
        sp = table['spline']
        self.X = list(sp['years'])
        self.Y = [v / 100 for v in sp['centiseconds']]
        self.M = self._second_derivatives(self.X, self.Y, sp['curvature'][0], sp['curvature'][1])
        k = table['knots']
        total = 0
        self.kv = []
        for step in k['encoded']:
            total += step
            self.kv.append(total / 100)
        years = len(self.kv) - 5
        self.obs_y = year_of_mjd(k['observedTo']['mjd'])
        self.pred_y = year_of_mjd(k['predictedTo']['mjd'])
        self.kx = [float(k['from'] + i) for i in range(years)]
        self.kx += [self.obs_y + (j * (self.pred_y - self.obs_y)) / 4 for j in range(5)]
        self.slope = (self.kv[years + 4] - self.kv[years]) / (self.pred_y - self.obs_y)
        self.sig = [v for p in table['sigma']['points'] for v in p]

    @staticmethod
    def _second_derivatives(X, Y, m0, mn):
        n = len(X) - 1
        M = [0.0] * (n + 1)
        M[0] = m0
        c = [0.0] * (n + 1)
        r = [m0] + [0.0] * n
        for i in range(1, n):
            a = X[i] - X[i - 1]
            b = X[i + 1] - X[i]
            piv = 2 * (a + b) - a * c[i - 1]
            c[i] = b / piv
            r[i] = (6 * ((Y[i + 1] - Y[i]) / b - (Y[i] - Y[i - 1]) / a) - a * r[i - 1]) / piv
        M[n] = mn
        for i in range(n - 1, 0, -1):
            M[i] = r[i] - c[i] * M[i + 1]
        return M

    def seconds(self, t):
        X, Y, M, kx, kv = self.X, self.Y, self.M, self.kx, self.kv
        if t < -720:
            return Y[0] + long_term(t) - long_term(-720)
        if t < 1941:
            i = len(X) - 2
            while t < X[i]:
                i -= 1
            h = X[i + 1] - X[i]
            a = X[i + 1] - t
            b = t - X[i]
            return (M[i] * a ** 3 + M[i + 1] * b ** 3) / (6 * h) + (Y[i] / h - M[i] * h / 6) * a + (Y[i + 1] / h - M[i + 1] * h / 6) * b
        n = len(kx) - 1
        if t <= kx[n]:
            if t < self.obs_y:
                i = math.floor(t - 1941)
            else:
                i = n - 4 + min(3, math.floor((4 * (t - self.obs_y)) / (self.pred_y - self.obs_y)))
            return kv[i] + ((t - kx[i]) * (kv[i + 1] - kv[i])) / (kx[i + 1] - kx[i])
        g = t - self.pred_y
        return kv[n] + self.slope * 15 * (1 - math.exp(-g / 15)) + long_term(t) - long_term(self.pred_y) - long_term_rate(self.pred_y) * g

    def sigma(self, t):
        h = t - self.obs_y
        if h > 0:
            if h <= 1:
                return 0.03 + 0.09 * h ** 0.75
            if h <= 10:
                return 0.12 * h ** 1.5
            return 0.61 * h - 2.3052668
        if t >= 1956:
            return 0.03
        c = (t - 1825) / 100
        v = 0.6 * c * c if t < 1620 else 0.0
        S = self.sig
        if t >= S[0]:
            i = 0
            while t >= S[i + 2]:
                i += 2
            v = max(v, S[i + 1] + ((t - S[i]) * (S[i + 3] - S[i + 1])) / (S[i + 2] - S[i]))
        return v

    def segment(self, t):
        if t < -720:
            return 'long-term'
        if t < 1956:
            return 'reconstructed'
        if t <= self.obs_y:
            return 'observed'
        if t <= self.pred_y:
            return 'predicted'
        return 'extrapolated'


def load_table():
    with open(os.path.join(EVIDENCE, 'table.json')) as f:
        return json.load(f)


def dump(obj, name):
    path = os.path.join(EVIDENCE, 'outputs', name)
    with open(path, 'w') as f:
        json.dump(obj, f, indent=1, sort_keys=False)
        f.write('\n')
    return path


def ts_model(uts, module=None):
    """Evaluates the TypeScript module (default: deltat-reference.ts) at astronomy-engine UT days."""
    import subprocess
    cmd = ['node', '--experimental-strip-types', '--no-warnings', os.path.join(HERE, 'eval-model.mjs')]
    if module or os.environ.get('DELTAT_MODULE'):
        cmd.append(module or os.environ['DELTAT_MODULE'])
    out = subprocess.run(cmd, input=json.dumps(list(uts)).encode(), capture_output=True, check=True)
    return json.loads(out.stdout)


def ut_of_mjd(mjd):
    return mjd - 51544.5
