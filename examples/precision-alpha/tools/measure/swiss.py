"""
The Swiss side of the four-configuration measurement.

  python3 swiss.py <instants.json> <ephe-dir> > swiss.json

Swiss Ephemeris is a MEASURING INSTRUMENT here and nothing else: no Swiss
code, data or output is a fitting target anywhere in this package, and
nothing Swiss is redistributed.

Two things this does deliberately, both carried over from the established
comparator in docs/platform/evidence/swiss-benchmark/tools/dump_swiss.py so
the numbers stay comparable with what is already recorded:

1. It records the ephemeris ACTUALLY used on every call, read back out of
   the return flag. Swiss falls back to its built-in Moshier series without
   complaint when the .se1 files are missing, and a run that fell back is
   not the Swiss/JPL configuration however it was invoked.
2. It matches the conventions under test -- apparent geocentric, ecliptic of
   date, tropical -- rather than whichever Swiss defaults are convenient.
"""
import json
import sys

import swisseph as swe

BODY = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY, "Venus": swe.VENUS,
    "Mars": swe.MARS, "Jupiter": swe.JUPITER, "Saturn": swe.SATURN,
    "Uranus": swe.URANUS, "Neptune": swe.NEPTUNE, "Pluto": swe.PLUTO,
}
FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED


def used(retflag):
    if retflag < 0:
        return "ERROR"
    if retflag & swe.FLG_JPLEPH:
        return "JPLEPH"
    if retflag & swe.FLG_SWIEPH:
        return "SWIEPH"
    if retflag & swe.FLG_MOSEPH:
        return "MOSEPH"
    return "UNKNOWN"


def jd_ut_of(iso):
    date, clock = iso.rstrip("Z").split("T")
    y, mo, d = (int(v) for v in date.split("-"))
    parts = clock.split(":")
    hh, mm = int(parts[0]), int(parts[1])
    ss = float(parts[2]) if len(parts) > 2 else 0.0
    return swe.julday(y, mo, d, hh + mm / 60.0 + ss / 3600.0)


def main():
    instants = json.load(open(sys.argv[1]))
    swe.set_ephe_path(sys.argv[2])
    out = {
        "swisseph_binding": swe.version,
        "requested_flags": FLAGS,
        "convention": "apparent geocentric, ecliptic of date, tropical",
        "role": "measuring instrument only; nothing here is a fitting target",
        "cases": [],
    }
    backends = set()
    for case in instants["cases"]:
        jd_ut = jd_ut_of(case["utc"])
        rec = {
            "id": case["id"],
            "utc": case["utc"],
            "jdUt": jd_ut,
            "deltaTSeconds": swe.deltat(jd_ut) * 86400.0,
            "bodies": {},
        }
        for name, ipl in BODY.items():
            try:
                xx, ret = swe.calc_ut(jd_ut, ipl, FLAGS)
                backends.add(used(ret))
                rec["bodies"][name] = {"lon": xx[0], "lat": xx[1], "distAu": xx[2], "lonSpeed": xx[3], "retflag": ret}
            except Exception as exc:                       # noqa: BLE001
                rec["bodies"][name] = {"error": str(exc)}
                backends.add("ERROR")
        out["cases"].append(rec)
    out["backendsObserved"] = sorted(backends)
    out["isFullSwissConfiguration"] = backends == {"SWIEPH"}
    json.dump(out, sys.stdout)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
