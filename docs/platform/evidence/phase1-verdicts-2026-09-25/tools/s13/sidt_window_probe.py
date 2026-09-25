"""Where Swiss's default sidereal time leaves IAU 2006 (the "1850-2050" window of amendment A1).

Swiss 2.10.03 reports "Sid. time: IERS Convention 2010 + long-term extension by Astrodienst"
(swe_get_astro_models, env/provenance-py.json). This probe reads swe.sidtime() against ERFA's
gst06a (UT1 := UTC; TT = UT + Swiss's own deltat_ex, so both sides use one clock) across the
two switch dates and at the grid's epochs, and states the size of any jump at each switch.
Swiss output here is an instrument reading.

Reads the .se1 files in SWISS_EPHE and prints JSON (Swiss minus ERFA at named instants: never
committed).
  $PYTHON tools/s13/sidt_window_probe.py > $WORK/s13/sidt-window-probe.json
"""
import json, math
import swisseph as swe
import erfa
import os, sys
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import SWISS_EPHE  # noqa: E402

swe.set_ephe_path(SWISS_EPHE)
J2000 = 2451545.0


def d_arcsec(jd):
    # Flag check on a call that returns one (the obliquity/nutation the sidereal time uses).
    nut, rf = swe.calc_ut(jd, swe.ECL_NUT, swe.FLG_SWIEPH)
    assert rf & swe.FLG_SWIEPH and not rf & swe.FLG_MOSEPH, rf
    tt = jd + swe.deltat_ex(jd, swe.FLG_SWIEPH)
    st = swe.sidtime(jd) * 15.0
    g = math.degrees(erfa.gst06a(J2000, jd - J2000, J2000, tt - J2000)) % 360.0
    return ((st - g + 180.0) % 360.0 - 180.0) * 3600.0


probes = {}
for label, jd in (('1849-12-31T00Z', 2396757.5), ('1849-12-31T23:59Z', 2396758.5 - 1 / 1440),
                  ('1850-01-01T00Z (T0)', 2396758.5), ('1850-01-01T00:01Z', 2396758.5 + 1 / 1440),
                  ('1850-01-02T00Z', 2396759.5),
                  ('2049-12-31T00Z', 2469806.5), ('2049-12-31T23:59Z', 2469807.5 - 1 / 1440),
                  ('2050-01-01T00Z (T1)', 2469807.5), ('2050-01-01T00:01Z', 2469807.5 + 1 / 1440),
                  ('2050-01-02T00Z', 2469808.5)):
    probes[label] = round(d_arcsec(jd), 5)
epochs = {}
for y in range(1800, 2201, 25):
    epochs[str(y)] = round(d_arcsec(swe.julday(y, 3, 21, 12.0, swe.GREG_CAL)), 5)
print(json.dumps({
    'what': 'swe.sidtime minus ERFA gst06a, arcseconds of RA (UT1 := UTC, Swiss deltaT for TT)',
    'aroundSwitches': probes,
    'jump1850': round(probes['1850-01-01T00:01Z'] - probes['1849-12-31T23:59Z'], 5),
    'jump2050': round(probes['2050-01-01T00:01Z'] - probes['2049-12-31T23:59Z'], 5),
    'gridEpochs_Mar21_12h': epochs,
}, indent=1))
