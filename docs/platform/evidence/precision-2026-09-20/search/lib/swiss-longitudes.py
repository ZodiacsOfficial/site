"""Swiss Ephemeris longitudes on the v6 D clock recipe. Instrument only; never a fitting target.

Reads {"body": "Uranus", "utc": ["...Z", ...]} on stdin, writes one row per instant.

Clock: the v6 policy's utcRecipe -- swe.utc_to_jd(..., GREG_CAL) for the civil
label, positions from the returned JD TT via swe.calc (NOT calc_ut), and the
69.184 s TT-minus-nominal-UTC guard asserted for every instant.
"""
import json
import sys

import swisseph as swe

BODY = {"Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY, "Venus": swe.VENUS,
        "Mars": swe.MARS, "Jupiter": swe.JUPITER, "Saturn": swe.SATURN,
        "Uranus": swe.URANUS, "Neptune": swe.NEPTUNE, "Pluto": swe.PLUTO}

FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED          # == 258, the policy's required flag word
EXPECTED_TT_MINUS_UTC = 69.184
TOL_SECONDS = 0.001


def split(iso):
    date, clock = iso.rstrip("Z").split("T")
    y, mo, d = (int(v) for v in date.split("-"))
    hh, mm = int(clock[0:2]), int(clock[3:5])
    ss = float(clock[6:])
    return y, mo, d, hh, mm, ss


def main():
    request = json.load(sys.stdin)
    swe.set_ephe_path(request.get("ephe", "/tmp/claude-0/swisslab/ephe"))
    ipl = BODY[request["body"]]
    rows = []
    for iso in request["utc"]:
        y, mo, d, hh, mm, ss = split(iso)
        jd_tt, jd_ut1 = swe.utc_to_jd(y, mo, d, hh, mm, ss, swe.GREG_CAL)
        jd_nominal_utc = swe.julday(y, mo, d, hh + mm / 60.0 + ss / 3600.0)
        offset = (jd_tt - jd_nominal_utc) * 86400.0
        if abs(offset - EXPECTED_TT_MINUS_UTC) > TOL_SECONDS:
            raise SystemExit(f"clock guard failed at {iso}: TT-UTC={offset!r}")
        xx, ret = swe.calc(jd_tt, ipl, FLAGS)
        if ret < 0 or not (ret & swe.FLG_SWIEPH) or (ret & swe.FLG_MOSEPH):
            raise SystemExit(f"non-SWIEPH return at {iso}: retflag={ret}")
        if ret != 258:
            raise SystemExit(f"retflag {ret} != 258 at {iso}")
        rows.append({"utc": iso, "jdTT": jd_tt, "jdUT1Model": jd_ut1,
                     "ttMinusUtcSeconds": offset, "lon": xx[0], "lat": xx[1],
                     "speed": xx[3], "retflag": ret})
    json.dump({"body": request["body"], "swissVersion": swe.version,
               "requestedFlags": FLAGS, "rows": rows}, sys.stdout)


main()
