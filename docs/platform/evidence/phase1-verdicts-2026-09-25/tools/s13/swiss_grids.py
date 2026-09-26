"""Swiss Ephemeris 2.10.03 readings for grids A and L of angle-grid-inputs.json (rules 1b, 1h).

Swiss is an instrument here, never a fitting target; this output stays in WORK and is never
committed. UT convention: the UTC instant is passed as UT (UT1 := UTC), as the engine does.

Per case:
  - the ephemeris flag is read on every call that returns one: calc_ut(Sun), calc_ut(Moon)
    with FLG_SWIEPH|FLG_SPEED, and calc_ut(ECL_NUT) with FLG_SWIEPH; a row whose flags lack
    FLG_SWIEPH (or carry FLG_MOSEPH) is discarded and counted;
  - eps_true, eps_mean, dpsi, deps from calc_ut(ECL_NUT); sidtime(); deltat_ex(FLG_SWIEPH);
  - houses_ex(jd_ut, lat, lon, b'P', FLG_SWIEPH): status 0 with cusps and ascmc (ascmc[2] is
    ARMC), or status -1 when pyswisseph raises swisseph.Error;
  - for every case also the C library's own answer through ctypes on the same .so
    (swe_houses_ex2: return code, serr, and the cusps it fills), which shows what pyswisseph
    discards when it raises: Swiss's Porphyry substitute;
  - houses_ex(..., b'O') (Porphyry) for every case;
  - houses_armc(ARMC, lat, eps_true) reproduces houses_ex, which confirms that ECL_NUT's
    eps_true is the obliquity houses_ex used (so "Swiss inputs" are exactly Swiss's).

Reads the corpus in SITE_ROOT and the .se1 files in SWISS_EPHE. Writes $WORK/s13/swiss-grids.json
(never committed). The file records the corpus's absolute path, so its digest depends on where
the repository lives; summarize.mjs also gives the digest with that path made repo-relative.
  $PYTHON tools/s13/swiss_grids.py > $WORK/s13/swiss-grids.log
"""
import ctypes, hashlib, json, math, sys, time
import swisseph as swe
import os
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SITE_ROOT, SWISS_EPHE, WORK, out_dir  # noqa: E402

O = WORK
out_dir('s13')
CORPUS = SITE_ROOT + '/docs/platform/evidence/engine-beyond-swiss/corpora/angle-grid-inputs.json'
swe.set_ephe_path(SWISS_EPHE)

corpus_bytes = open(CORPUS, 'rb').read()
corpus = json.loads(corpus_bytes)

so = ctypes.CDLL(swe.__file__)  # the same shared object pyswisseph runs on
so.swe_houses_ex2.restype = ctypes.c_int
so.swe_houses_ex2.argtypes = [ctypes.c_double, ctypes.c_int32, ctypes.c_double, ctypes.c_double, ctypes.c_int,
                              ctypes.POINTER(ctypes.c_double), ctypes.POINTER(ctypes.c_double),
                              ctypes.POINTER(ctypes.c_double), ctypes.POINTER(ctypes.c_double), ctypes.c_char_p]

FLAGS = swe.FLG_SWIEPH
t0 = time.time()


def parse(utc):
    date, clock = utc.rstrip('Z').split('T')
    y, m, d = (int(v) for v in date.split('-'))
    hh, mm, ss = (int(v) for v in clock.split(':'))
    return y, m, d, hh + mm / 60 + ss / 3600


def c_houses(jd, lat, lon, hsys):
    cusps = (ctypes.c_double * 13)(); ascmc = (ctypes.c_double * 10)()
    cs = (ctypes.c_double * 13)(); acs = (ctypes.c_double * 10)()
    serr = ctypes.create_string_buffer(512)
    rc = so.swe_houses_ex2(jd, FLAGS, lat, lon, ord(hsys), cusps, ascmc, cs, acs, serr)
    return rc, serr.value.decode(), list(cusps)[1:13], list(ascmc)[0:8]


def maxdiff(a, b):
    return max(abs(((x - y) + 180.0) % 360.0 - 180.0) for x, y in zip(a, b)) * 3600.0


def case(row):
    utc, lat, lon, hsys = row
    y, m, d, hour = parse(utc)
    jd = swe.julday(y, m, d, hour, swe.GREG_CAL)
    rec = dict(utc=utc, lat=lat, lon=lon, jd_ut=jd)
    ok = True
    for name, body in (('sun', swe.SUN), ('moon', swe.MOON)):
        _, rf = swe.calc_ut(jd, body, FLAGS | swe.FLG_SPEED)
        rec['flag_' + name] = rf
        ok = ok and bool(rf & swe.FLG_SWIEPH) and not rf & swe.FLG_MOSEPH
    nut, rf = swe.calc_ut(jd, swe.ECL_NUT, FLAGS)
    rec['flag_ecl_nut'] = rf
    ok = ok and bool(rf & swe.FLG_SWIEPH) and not rf & swe.FLG_MOSEPH
    rec.update(eps_true=nut[0], eps_mean=nut[1], dpsi_deg=nut[2], deps_deg=nut[3])
    rec['sidtime_h'] = swe.sidtime(jd)
    rec['deltat_days'] = swe.deltat_ex(jd, FLAGS)
    try:
        cusps, ascmc = swe.houses_ex(jd, lat, lon, hsys.encode(), FLAGS)
        rec.update(status=0, cusps=list(cusps), ascmc=list(ascmc))
    except swe.Error as err:
        rec.update(status=-1, error=str(err))
    rc, serr, c_cusps, c_ascmc = c_houses(jd, lat, lon, hsys)
    rec.update(c_rc=rc, c_serr=serr, c_cusps=c_cusps, c_ascmc=c_ascmc)
    p_cusps, p_ascmc = swe.houses_ex(jd, lat, lon, b'O', FLAGS)
    rec.update(porphyry_cusps=list(p_cusps), porphyry_ascmc=list(p_ascmc))
    armc = p_ascmc[2]
    rec['armc'] = armc
    if rec['status'] == 0:
        a_cusps, _ = swe.houses_armc(armc, lat, rec['eps_true'], hsys.encode())
        rec['armc_check_arcsec'] = maxdiff(a_cusps, rec['cusps'])
        rec['c_vs_py_arcsec'] = maxdiff(c_cusps, rec['cusps'])
    else:
        a_cusps, _ = swe.houses_armc(armc, lat, rec['eps_true'], b'O')
        rec['armc_check_arcsec'] = maxdiff(a_cusps, rec['porphyry_cusps'])
        rec['c_vs_porphyry_arcsec'] = maxdiff(c_cusps, rec['porphyry_cusps'])
    rec['swiephOk'] = ok
    return rec


out = {'what': 'Swiss Ephemeris readings for grids A and L (instrument output; not committed)',
       'corpus': {'path': CORPUS, 'sha256': hashlib.sha256(corpus_bytes).hexdigest()},
       'swe.version': swe.version, 'flags': FLAGS}
summary = {}
for grid in ('A', 'L'):
    rows = [case(r) for r in corpus[grid]]
    kept = [r for r in rows if r['swiephOk']]
    out[grid] = kept
    summary[grid] = dict(
        cases=len(rows), discardedNonSwieph=len(rows) - len(kept),
        status0=sum(1 for r in kept if r['status'] == 0),
        statusMinus1=sum(1 for r in kept if r['status'] == -1),
        errors=sorted({r.get('error') for r in kept if r['status'] == -1}),
        cReturnCodes=sorted({r['c_rc'] for r in kept}),
        cSerr=sorted({r['c_serr'] for r in kept if r['c_serr']}),
        flagsSun=sorted({r['flag_sun'] for r in kept}), flagsMoon=sorted({r['flag_moon'] for r in kept}),
        flagsEclNut=sorted({r['flag_ecl_nut'] for r in kept}),
        maxArmcCheckArcsec=max(r['armc_check_arcsec'] for r in kept),
        maxCVsPyArcsec=max((r['c_vs_py_arcsec'] for r in kept if 'c_vs_py_arcsec' in r), default=None),
        maxCVsPorphyryArcsec=max((r['c_vs_porphyry_arcsec'] for r in kept if 'c_vs_porphyry_arcsec' in r), default=None),
        statusVsCrcAgree=all((r['status'] == 0) == (r['c_rc'] == 0) for r in kept),
    )
out['summary'] = summary
json.dump(out, open(O + '/s13/swiss-grids.json', 'w'))
print(json.dumps({'summary': summary, 'seconds': round(time.time() - t0, 1)}, indent=1))
