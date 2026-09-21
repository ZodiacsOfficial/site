"""
Emits the Swiss Ephemeris side of the comparison.

  venv/bin/python dump_swiss.py <zodiacs.json> <ephe-dir> > swiss.json

Two things this does deliberately.

First, it records the ephemeris ACTUALLY used for every single call, read back
out of the return flag, rather than the one that was requested. Swiss falls
back to its built-in Moshier series without complaint when the .se1 files are
missing, and a run that fell back is not the Swiss/JPL configuration however it
was invoked.

Second, it matches the Zodiacs conventions rather than Swiss defaults that
happen to be convenient: apparent geocentric positions, ecliptic of date,
tropical zodiac. Those are the conventions the Zodiacs receipt declares.
"""
import json
import sys

import swisseph as swe

BODY = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY, "Venus": swe.VENUS,
    "Mars": swe.MARS, "Jupiter": swe.JUPITER, "Saturn": swe.SATURN,
    "Uranus": swe.URANUS, "Neptune": swe.NEPTUNE, "Pluto": swe.PLUTO,
}

# Matched to the Zodiacs receipt's declared conventions:
#   planetPositions = apparent-geocentric-ecliptic-of-date, zodiac = tropical.
# Swiss applies light-time, aberration and deflection by default, and returns
# ecliptic-of-date tropical longitudes unless told otherwise. So the matched
# configuration is the default plus SPEED; no NOABERR, no NOGDEFL, no J2000,
# no SIDEREAL, no TOPOCTR.
FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED


def used_ephemeris(retflag):
    if retflag < 0:
        return "ERROR"
    if retflag & swe.FLG_JPLEPH:
        return "JPLEPH"
    if retflag & swe.FLG_SWIEPH:
        return "SWIEPH"
    if retflag & swe.FLG_MOSEPH:
        return "MOSEPH"
    return "UNKNOWN"


def utc_to_jd_ut(iso):
    date, clock = iso.rstrip("Z").split("T")
    y, mo, d = (int(v) for v in date.split("-"))
    hh, mm, ss = (int(v) for v in clock.split(":"))
    return swe.julday(y, mo, d, hh + mm / 60.0 + ss / 3600.0)


def main():
    zodiacs = json.load(open(sys.argv[1]))
    swe.set_ephe_path(sys.argv[2])

    out = {
        "swisseph_binding": swe.version,
        "requested_flags": FLAGS,
        "convention_note": "apparent geocentric, ecliptic of date, tropical - matched to the Zodiacs receipt",
        "set": zodiacs.get("set"),
        "cases": [],
    }
    backends = set()

    for case in zodiacs["cases"]:
        jd_ut = utc_to_jd_ut(case["utc"])
        rec = {"id": case["id"], "stratum": case["stratum"], "utc": case["utc"],
               "jd_ut": jd_ut, "delta_t_seconds": swe.deltat(jd_ut) * 86400.0, "bodies": {}}
        for name, ipl in BODY.items():
            try:
                xx, ret = swe.calc_ut(jd_ut, ipl, FLAGS)
                backend = used_ephemeris(ret)
                backends.add(backend)
                rec["bodies"][name] = {"lon": xx[0], "lat": xx[1], "speed": xx[3],
                                       "retflag": ret, "ephemeris_used": backend}
            except Exception as exc:                       # noqa: BLE001
                rec["bodies"][name] = {"error": str(exc)}
                backends.add("ERROR")
        out["cases"].append(rec)

    out["ephemeris_backends_observed"] = sorted(backends)
    out["is_full_swiss_configuration"] = backends == {"SWIEPH"}
    json.dump(out, sys.stdout, indent=1)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
