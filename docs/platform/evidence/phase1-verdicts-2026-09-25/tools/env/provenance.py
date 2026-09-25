"""Provenance of the instruments for the Phase 1 verdict runs (steps 1.2, 1.3, 1.8, 1.9): the
Python, pyswisseph and its .se1 files, pyerfa, numpy, jplephem and the DE440s kernel. The two
measured runs' env/provenance.py, merged.

Reads the .se1 files in SWISS_EPHE (one flag-checked call per file, so the file data Swiss
reports is the file it opened) and the kernel at JPL_KERNEL. Prints JSON (absolute paths
included; summarize.mjs keeps only file names and digests):

  $PYTHON tools/env/provenance.py > $WORK/env/provenance-py.json
"""
import ctypes, hashlib, json, os, platform, sys
from importlib.metadata import PackageNotFoundError, version as pkg_version
import swisseph as swe
sys.dont_write_bytecode = True  # no __pycache__ beside lib/paths.py in the repository
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from paths import JPL_KERNEL, SWISS_EPHE  # noqa: E402

EPHE = SWISS_EPHE
swe.set_ephe_path(EPHE)


def sha(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def installed(name):
    try:
        return pkg_version(name)
    except PackageNotFoundError:
        return None


# One call per file so get_current_file_data reports what was opened; flags checked.
xx, rf = swe.calc_ut(2460676.5, swe.SUN, swe.FLG_SWIEPH | swe.FLG_SPEED)
assert rf & swe.FLG_SWIEPH and not rf & swe.FLG_MOSEPH, rf
planet_file = swe.get_current_file_data(0)
xx, rf = swe.calc_ut(2460676.5, swe.MOON, swe.FLG_SWIEPH | swe.FLG_SPEED)
assert rf & swe.FLG_SWIEPH and not rf & swe.FLG_MOSEPH, rf
moon_file = swe.get_current_file_data(1)

# Swiss's own statement of the astronomical models it uses by default (C API, same .so).
so = ctypes.CDLL(swe.__file__)
so.swe_get_astro_models.restype = None
samod = ctypes.create_string_buffer(4096)
sdet = ctypes.create_string_buffer(65536)
so.swe_get_astro_models(samod, sdet, ctypes.c_int32(swe.FLG_SWIEPH))

try:
    import erfa
    erfa_versions = {'pyerfa': erfa.__version__, 'erfa': erfa.version.erfa_version}
except ImportError:
    erfa_versions = {'pyerfa': None, 'erfa': None}

print(json.dumps({
    'python': sys.version.split()[0],
    'executable': sys.executable,
    'platform': platform.platform(),
    'pyswisseph': installed('pyswisseph'),
    'swe.version': swe.version,
    'swissSo': {'path': swe.__file__, 'sha256': sha(swe.__file__)},
    'ephePath': EPHE,
    'files': {
        'sepl_18.se1': sha(os.path.join(EPHE, 'sepl_18.se1')),
        'semo_18.se1': sha(os.path.join(EPHE, 'semo_18.se1')),
    },
    'get_current_file_data': {'planets': list(planet_file), 'moon': list(moon_file)},
    'swe_get_astro_models': sdet.value.decode(),
    **erfa_versions,
    'numpy': installed('numpy'),
    'jplephem': installed('jplephem'),
    'jplKernel': {'path': JPL_KERNEL, 'sha256': sha(JPL_KERNEL) if os.path.exists(JPL_KERNEL) else None},
}, indent=1))
