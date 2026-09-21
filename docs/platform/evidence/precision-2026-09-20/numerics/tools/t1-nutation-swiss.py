"""
The Swiss side of the nutation comparison.

  venv/bin/python3 t1-nutation-swiss.py <t1-node.json> <ephe> > raw/t1-swiss.json

swe.calc (not calc_ut) is given the SAME TT Julian Date the node side used, so
Delta-T cannot enter.  The return flag is recorded for every single call; a run
that silently fell back to Moshier is not a Swiss measurement.
"""
import json
import sys

import swisseph as swe

node = json.load(open(sys.argv[1]))
swe.set_ephe_path(sys.argv[2])
FLAGS = swe.FLG_SWIEPH

out = {"swisseph_binding": swe.version, "requested_flags": FLAGS, "rows": []}
backends = set()


def used(ret):
    if ret < 0:
        return "ERROR"
    if ret & swe.FLG_JPLEPH:
        return "JPLEPH"
    if ret & swe.FLG_SWIEPH:
        return "SWIEPH"
    if ret & swe.FLG_MOSEPH:
        return "MOSEPH"
    return "UNKNOWN"


for r in node["rows"]:
    jd_tt = r["jdTt"]
    vals, flg = swe.calc(jd_tt, swe.ECL_NUT, FLAGS)
    # Sanity anchor: ask for the Sun too, and record which backend answered.
    _sun, sflg = swe.calc(jd_tt, swe.SUN, FLAGS | swe.FLG_SPEED)
    backends.add(used(sflg))
    out["rows"].append({
        "jdTt": jd_tt,
        "tobl": vals[0], "mobl": vals[1],
        "dpsi": vals[2] * 3600.0, "deps": vals[3] * 3600.0,
        "nutRetflag": flg, "sunRetflag": sflg, "sunBackend": used(sflg),
    })

out["ephemeris_backends_observed"] = sorted(backends)
out["is_full_swiss_configuration"] = backends == {"SWIEPH"}
json.dump(out, sys.stdout)
sys.stdout.write("\n")
