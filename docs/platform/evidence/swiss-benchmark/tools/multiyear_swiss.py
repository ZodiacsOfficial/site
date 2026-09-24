"""
The multi-year distribution of the shipped engine against Swiss Ephemeris
(brief v1, M0 item 4), from the lines multiyear-zodiacs.mjs writes.

  venv/bin/python multiyear_swiss.py multiyear-zodiacs.jsonl <ephe-dir> > ../multiyear-1800-2199.json

Each instant is compared twice. At the same UT, which is what a chart shows:
the difference then includes the two programs' disagreement about delta-T.
At the same TT, with Swiss evaluated at the engine's own TT: the difference
is then the positions alone. The configuration is dump_swiss.py's (apparent
geocentric, ecliptic of date, tropical, FLG_SWIEPH | FLG_SPEED), and every
call's return flag is checked for the ephemeris actually used. The engine's
North Node is the true node, so Swiss's TRUE_NODE; the South Node is its
opposite point and is not compared separately.

Only statistics are written: per body, for each half-century and for the
whole span, the count and the median, 95th percentile and largest absolute
difference in longitude and latitude, in arcseconds, with the instant of the
largest; and the same for all bodies' longitudes together up to 2026, the
years with an observed delta-T, and from 2027. No per-instant Swiss value is
written.
"""
import hashlib
import json
import sys

import swisseph as swe

BODY = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY, "Venus": swe.VENUS,
    "Mars": swe.MARS, "Jupiter": swe.JUPITER, "Saturn": swe.SATURN,
    "Uranus": swe.URANUS, "Neptune": swe.NEPTUNE, "Pluto": swe.PLUTO,
    "North Node": swe.TRUE_NODE,
}
FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED
J2000 = 2451545.0
ERAS = [(y, y + 49) for y in range(1800, 2200, 50)]
WINDOWS = [(1800, 2026), (2027, 2199)]


def wrap_arcsec(a, b):
    return ((a - b + 540.0) % 360.0 - 180.0) * 3600.0


def summary(values):
    """values: (arcsec, utc) or (arcsec, utc, body) tuples."""
    if not values:
        return None
    ordered = sorted(values, key=lambda v: v[0])
    n = len(ordered)
    out = {
        "n": n,
        "p50": round(ordered[n // 2][0], 3),
        "p95": round(ordered[min(n - 1, int(0.95 * n))][0], 3),
        "max": round(ordered[-1][0], 3),
        "maxAt": ordered[-1][1],
    }
    if len(ordered[-1]) > 2:
        out["maxBody"] = ordered[-1][2]
    return out


def main():
    path, ephe = sys.argv[1], sys.argv[2]
    raw = open(path, "rb").read()
    lines = raw.decode("utf8").splitlines()
    header = json.loads(lines[0])
    swe.set_ephe_path(ephe)

    samples = {mode: {name: {"lon": [], "lat": []} for name in BODY} for mode in ("sameUt", "sameTt")}
    backends = set()
    instants = 0
    for line in lines[1:]:
        row = json.loads(line)
        instants += 1
        year = int(row["utc"][:4])
        clocks = {"sameUt": (swe.calc_ut, J2000 + row["ut"]), "sameTt": (swe.calc, J2000 + row["tt"])}
        for name, ipl in BODY.items():
            lon, lat = row["bodies"][name]
            for mode, (calc, jd) in clocks.items():
                xx, ret = calc(jd, ipl, FLAGS)
                if ret < 0 or not ret & swe.FLG_SWIEPH:
                    raise SystemExit(f"{row['utc']} {name}: Swiss did not answer from its .se1 files (flag {ret})")
                backends.add("SWIEPH")
                samples[mode][name]["lon"].append((abs(wrap_arcsec(lon, xx[0])), row["utc"], year))
                if name != "North Node":
                    samples[mode][name]["lat"].append((abs((lat - xx[1]) * 3600.0), row["utc"], year))

    def windows(mode):
        return {
            f"{a}-{b}": summary([(v, t, name) for name, series in samples[mode].items()
                                 for v, t, y in series["lon"] if a <= y <= b])
            for a, b in WINDOWS
        }

    def table(mode):
        out = {}
        for name, series in samples[mode].items():
            body = {}
            for quantity, values in series.items():
                if not values:
                    continue
                body[quantity] = {
                    "all": summary([(v, t) for v, t, _ in values]),
                    "byEra": {f"{a}-{b}": summary([(v, t) for v, t, y in values if a <= y <= b]) for a, b in ERAS},
                }
            out[name] = body
        return out

    print(json.dumps({
        "what": "@zodiacs/engine against Swiss Ephemeris, apparent geocentric ecliptic of date, tropical, every ten days 1800-2199 at 12:00 UTC",
        "engine": header["engine"],
        "node": header["node"],
        "swissBinding": swe.version,
        "swissBackendsObserved": sorted(backends),
        "flags": FLAGS,
        "cadenceDays": header["cadenceDays"],
        "from": header["from"],
        "to": header["to"],
        "instants": instants,
        "zodiacsDumpSha256": hashlib.sha256(raw).hexdigest(),
        "units": "arcseconds; absolute differences, engine minus Swiss",
        "clocks": {
            "sameUt": "both at the same UT; includes the two programs' delta-T disagreement, as a chart would",
            "sameTt": "Swiss at the engine's own TT; the positions alone",
        },
        "allBodiesLongitude": {"sameUt": windows("sameUt"), "sameTt": windows("sameTt")},
        "sameUt": table("sameUt"),
        "sameTt": table("sameTt"),
    }, indent=1))


if __name__ == "__main__":
    main()
