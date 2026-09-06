"""Generate independent Swiss references only; never import the application."""
import ctypes
from datetime import datetime, timezone
from hashlib import sha256
from importlib import metadata
import json
import math
import os
from pathlib import Path
import platform
import sys

ROOT = Path(__file__).resolve().parent
EPHE = ROOT / 'ephe'
DESTINATION = ROOT / 'swiss-references.raw.json'
assert not DESTINATION.exists(), 'Refuse to replace previously generated reference evidence'
# The documented environment override must not redirect the oracle elsewhere.
os.environ['SE_EPHE_PATH'] = str(EPHE)
import swisseph as swe

assert Path(swe.__file__).resolve().is_relative_to(ROOT / 'env')
assert metadata.version('pyswisseph') == '2.10.3.2'
assert swe.version == '2.10.03'
assert ctypes.sizeof(ctypes.c_int) == 4
swe.set_ephe_path(str(EPHE))

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

acquisition = json.loads((ROOT / 'receipts/acquisition.json').read_text())
for item in acquisition['inputs']:
    assert digest(ROOT / item['destination']) == item['sha256']

library = ctypes.CDLL(swe.__file__)
array6 = ctypes.c_double * 6
array13 = ctypes.c_double * 13
array10 = ctypes.c_double * 10
pointer = ctypes.POINTER(ctypes.c_double)
library.swe_calc.argtypes = [ctypes.c_double, ctypes.c_int, ctypes.c_int, pointer, ctypes.c_char_p]
library.swe_calc.restype = ctypes.c_int
library.swe_houses_ex.argtypes = [ctypes.c_double, ctypes.c_int, ctypes.c_double, ctypes.c_double, ctypes.c_int, pointer, pointer]
library.swe_houses_ex.restype = ctypes.c_int
library.swe_get_current_file_data.argtypes = [ctypes.c_int, pointer, pointer, ctypes.POINTER(ctypes.c_int)]
library.swe_get_current_file_data.restype = ctypes.c_char_p

FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED
EPHEMERIS_MASK = swe.FLG_JPLEPH | swe.FLG_SWIEPH | swe.FLG_MOSEPH
assert FLAGS == 258

def time_input(iso):
    instant = datetime.fromisoformat(iso.replace('Z', '+00:00'))
    assert instant.utcoffset().total_seconds() == 0
    jd_tt, jd_ut1 = swe.utc_to_jd(
        instant.year, instant.month, instant.day,
        instant.hour, instant.minute,
        instant.second + instant.microsecond / 1_000_000,
        swe.GREG_CAL,
    )
    return {
        'utc': iso, 'calendar': 'proleptic Gregorian',
        'conversion': 'swe.utc_to_jd(..., swe.GREG_CAL)',
        'jdTT': jd_tt, 'jdUT1': jd_ut1,
        'deltaTSeconds': (jd_tt - jd_ut1) * 86400,
        'ut1Convention': 'Swiss Delta-T-model-derived UT1, not a separately retrieved IERS DUT1 observation',
    }

def loaded_file(index):
    start = ctypes.c_double()
    end = ctypes.c_double()
    de_number = ctypes.c_int()
    filename = library.swe_get_current_file_data(index, ctypes.byref(start), ctypes.byref(end), ctypes.byref(de_number))
    if not filename:
        return {'index': index, 'loaded': False}
    path = Path(filename.decode()).resolve()
    assert path.is_relative_to(EPHE)
    return {
        'index': index, 'loaded': True, 'path': str(path),
        'sha256': digest(path), 'startJD': start.value, 'endJD': end.value,
        'deNumber': de_number.value,
    }

nodes = []
for utc in ['2005-03-15T00:00:00Z', '2020-01-01T00:00:00Z', '2026-07-01T00:00:00Z']:
    instant = time_input(utc)
    raw = array6()
    warning = ctypes.create_string_buffer(256)
    # Capture first-call warnings before the wrapper can populate Swiss's cache.
    raw_flags = library.swe_calc(instant['jdTT'], swe.TRUE_NODE, FLAGS, raw, warning)
    returned, returned_flags = swe.calc(instant['jdTT'], swe.TRUE_NODE, FLAGS)
    assert raw_flags >= 0
    assert returned_flags == raw_flags
    assert list(returned) == list(raw)
    assert (returned_flags & EPHEMERIS_MASK) == swe.FLG_SWIEPH, 'Reject non-Swiss or Moshier fallback'
    assert all(math.isfinite(value) for value in returned)
    lunar = loaded_file(1)
    assert lunar['loaded'], 'Require actual lunar-file use'
    assert lunar['startJD'] <= instant['jdTT'] <= lunar['endJD']
    nodes.append({
        'id': 'swiss-true-node-' + utc[:10], 'input': instant,
        'body': 'SE_TRUE_NODE', 'bodyId': swe.TRUE_NODE,
        'requestedFlags': FLAGS, 'returnedFlags': returned_flags,
        'returnedEphemerisMask': returned_flags & EPHEMERIS_MASK,
        'wrapperRawReturn': [list(returned), returned_flags],
        'cRawReturn': {'values': list(raw), 'statusAndFlags': raw_flags, 'warning': warning.value.decode()},
        'longitudeDegrees': returned[0], 'longitudeSpeedDegreesPerDay': returned[3],
        'filesAfterCalculation': [loaded_file(0), lunar],
    })

polar = []
for name, utc, latitude, longitude in [
    ('tromso', '2001-12-21T09:30:00Z', 69.6492, 18.9553),
    ('longyearbyen', '2001-12-21T09:00:00Z', 78.2232, 15.6267),
    ('southern-longyearbyen-mirror', '2001-12-21T09:00:00Z', -78.2232, 15.6267),
]:
    instant = time_input(utc)
    whole_cusps, whole_ascmc = swe.houses_ex(instant['jdUT1'], latitude, longitude, b'W', 0)
    whole_raw, whole_angles = array13(), array10()
    whole_status = library.swe_houses_ex(instant['jdUT1'], 0, latitude, longitude, ord('W'), whole_raw, whole_angles)
    assert whole_status == 0
    assert list(whole_cusps) == list(whole_raw)[1:]
    assert list(whole_ascmc) == list(whole_angles)[:len(whole_ascmc)]
    placidus_raw, placidus_angles = array13(), array10()
    placidus_status = library.swe_houses_ex(instant['jdUT1'], 0, latitude, longitude, ord('P'), placidus_raw, placidus_angles)
    wrapper_error = None
    try:
        swe.houses_ex(instant['jdUT1'], latitude, longitude, b'P', 0)
    except swe.Error as error:
        wrapper_error = str(error)
    assert placidus_status == -1 and wrapper_error is not None
    polar.append({
        'id': 'swiss-polar-' + name, 'input': instant,
        'latitudeDegrees': latitude, 'longitudeDegreesEastPositive': longitude,
        'flags': 0,
        'whole': {
            'requestedHouseCode': 'W', 'cStatus': whole_status,
            'cuspsDegrees': list(whole_cusps), 'ascmc': list(whole_ascmc),
            'ascendantDegrees': whole_ascmc[0], 'midheavenDegrees': whole_ascmc[1],
            'cRawCuspsIncludingUnusedIndexZero': list(whole_raw), 'cRawAscmc': list(whole_angles),
        },
        'placidusRequest': {
            'requestedHouseCode': 'P', 'cStatus': placidus_status,
            'wrapperError': wrapper_error,
            'returnedFallbackSystem': 'Porphyry, per Swiss API error contract; NOT Placidus and NOT product whole-house fallback',
            'cRawCuspsIncludingUnusedIndexZero': list(placidus_raw), 'cRawAscmc': list(placidus_angles),
        },
    })

output = {
    'schemaVersion': 1, 'generatedAtUTC': datetime.now(timezone.utc).isoformat(),
    'scope': 'Independent Swiss true-node and polar house/angle references only; no application calculations or comparisons',
    'runtime': {
        'python': sys.version, 'platform': platform.platform(), 'executable': sys.executable,
        'distributionVersion': metadata.version('pyswisseph'), 'swissVersion': swe.version,
        'extensionPath': swe.__file__, 'extensionSHA256': digest(Path(swe.__file__)),
        'ephemerisPath': str(EPHE), 'environmentOverride': 'SE_EPHE_PATH explicitly set to the same scratch ephemeris path',
    },
    'generationRecipe': {'path': str(Path(__file__).resolve()), 'sha256': digest(Path(__file__).resolve())},
    'acquisitionReceiptSHA256': digest(ROOT / 'receipts/acquisition.json'),
    'predeclaredComparisonPolicySHA256': digest(ROOT / 'comparison-policy.json'),
    'conventions': {
        'node': 'Traditional osculating ascending lunar node; tropical geocentric ecliptic-of-date coordinates with nutation under Swiss default flags',
        'unitsInRawSixTuple': ['longitude degrees', 'latitude degrees', 'distance AU', 'longitude speed degrees/day', 'latitude speed degrees/day', 'distance speed AU/day'],
        'houses': 'Geographical latitude and east-positive longitude, tropical houses, UT1 input derived by Swiss UTC conversion',
        'precision': 'Unrounded Python JSON serialization of returned IEEE-754 doubles; printed digits are not an accuracy guarantee',
        'warningCapture': 'Direct calls to the same unmodified Swiss C library preserve the calc warning buffer and house status/fallback arrays that the wrapper may omit',
    },
    'sources': {
        'api': 'https://www.astro.com/swisseph/swephprg.htm',
        'conventions': 'https://www.astro.com/swisseph/swisseph.htm',
        'distribution': 'https://pypi.org/project/pyswisseph/2.10.3.2/',
        'ephemerisAcquisition': acquisition,
    },
    'trueNode': nodes, 'polar': polar,
}
DESTINATION.write_text(json.dumps(output, indent=2, allow_nan=False) + '\n')
print(json.dumps({
    'rawReceipt': str(DESTINATION),
    'trueNode': [{key: row[key] for key in ['id', 'longitudeDegrees', 'longitudeSpeedDegreesPerDay', 'returnedFlags']} for row in nodes],
    'polar': [{'id': row['id'], 'asc': row['whole']['ascendantDegrees'], 'mc': row['whole']['midheavenDegrees'], 'placidusStatus': row['placidusRequest']['cStatus']} for row in polar],
}, indent=2))
