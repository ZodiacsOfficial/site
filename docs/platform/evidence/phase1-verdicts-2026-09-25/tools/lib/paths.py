"""Where the Phase 1 verdict tools read and write (the Python side of lib/paths.mjs).

Each path comes from the environment and falls back to a default:

  SITE_ROOT   the site repository: the root this folder sits in (tools/../../../../..)
  WORK        scratch output, outside the repository: <tempdir>/phase1-verdicts-2026-09-25
  SWISS_EPHE  the directory holding sepl_18.se1 and semo_18.se1: $WORK/ephe
  JPL_KERNEL  de440s.bsp, read only by s18/arbiter_moon.py: $WORK/de440s.bsp

Swiss Ephemeris output is written only under WORK; importing this module fails if WORK is the
repository or lies inside it.
"""
import os
import tempfile

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_ROOT = os.path.abspath(os.environ.get('SITE_ROOT') or os.path.join(TOOLS, '..', '..', '..', '..', '..'))
WORK = os.path.abspath(os.environ.get('WORK') or os.path.join(tempfile.gettempdir(), 'phase1-verdicts-2026-09-25'))
SWISS_EPHE = os.path.abspath(os.environ.get('SWISS_EPHE') or os.path.join(WORK, 'ephe'))
JPL_KERNEL = os.path.abspath(os.environ.get('JPL_KERNEL') or os.path.join(WORK, 'de440s.bsp'))
CORPORA = os.path.join(SITE_ROOT, 'docs', 'platform', 'evidence', 'engine-beyond-swiss', 'corpora')

_from_root = os.path.relpath(WORK, SITE_ROOT)
if not (_from_root == '..' or _from_root.startswith('..' + os.sep)):
    raise SystemExit(f'WORK ({WORK}) is inside the repository ({SITE_ROOT}); Swiss output must stay outside it')


def out_dir(name):
    """$WORK/<name>/, created if missing, with the trailing slash the tools concatenate onto."""
    directory = os.path.join(WORK, name)
    os.makedirs(directory, exist_ok=True)
    return directory + '/'
