"""Quantifies the nutation comparison.  Every figure carries its n."""
import json
import sys
import math

node = json.load(open(sys.argv[1]))
swiss = json.load(open(sys.argv[2]))
assert len(node["rows"]) == len(swiss["rows"])
assert swiss["is_full_swiss_configuration"], "Swiss fell back; refusing to report"


def stats(v):
    v = sorted(v)
    n = len(v)
    a = sorted(abs(x) for x in v)

    def q(s, p):
        i = (len(s) - 1) * p
        lo, hi = math.floor(i), math.ceil(i)
        return s[lo] if lo == hi else s[lo] + (s[hi] - s[lo]) * (i - lo)
    return {"n": n, "mean": sum(v) / n, "maxAbs": a[-1], "p50Abs": q(a, .5),
            "p95Abs": q(a, .95), "min": v[0], "max": v[-1],
            "rms": math.sqrt(sum(x * x for x in v) / n)}


series = {}
for key, get in [
    ("ae_minus_swiss_dpsi", lambda n, s: n["ae"]["dpsi"] - s["dpsi"]),
    ("ae_minus_swiss_deps", lambda n, s: n["ae"]["deps"] - s["deps"]),
    ("2000A_minus_swiss_dpsi", lambda n, s: n["n2000a"]["dpsi"] - s["dpsi"]),
    ("2000A_minus_swiss_deps", lambda n, s: n["n2000a"]["deps"] - s["deps"]),
    ("2000AP03_minus_swiss_dpsi", lambda n, s: n["n2000aP03"]["dpsi"] - s["dpsi"]),
    ("2000B_minus_swiss_dpsi", lambda n, s: n["n2000b"]["dpsi"] - s["dpsi"]),
    ("2000B_minus_swiss_deps", lambda n, s: n["n2000b"]["deps"] - s["deps"]),
    ("2000BP03_minus_swiss_dpsi", lambda n, s: n["n2000bP03"]["dpsi"] - s["dpsi"]),
    ("2000B_minus_2000A_dpsi", lambda n, s: n["n2000b"]["dpsi"] - n["n2000a"]["dpsi"]),
    ("2000B_minus_2000A_deps", lambda n, s: n["n2000b"]["deps"] - n["n2000a"]["deps"]),
    ("ae_minus_2000A_dpsi", lambda n, s: n["ae"]["dpsi"] - n["n2000a"]["dpsi"]),
    ("ae_minus_2000B_dpsi", lambda n, s: n["ae"]["dpsi"] - n["n2000b"]["dpsi"]),
    ("aeReimpl_minus_aeLib_dpsi", lambda n, s: n["aeReimpl"]["dpsi"] - n["ae"]["dpsi"]),
    ("mobl_ae_minus_swiss_arcsec", lambda n, s: (n["ae"]["mobl"] - s["mobl"]) * 3600),
    ("tobl_ae_minus_swiss_arcsec", lambda n, s: (n["ae"]["tobl"] - s["tobl"]) * 3600),
]:
    series[key] = stats([get(n, s) for n, s in zip(node["rows"], swiss["rows"])])

# Split by era, because a model's error is not stationary.
eras = {}
for label, lo, hi in [("1850-1900", 2396759.5, 2415020.5), ("1900-2000", 2415020.5, 2451545.0),
                      ("2000-2050", 2451545.0, 2469807.5 - 36525), ("2050-2150", 2469807.5 - 36525, 2469808.5)]:
    pick = [(n, s) for n, s in zip(node["rows"], swiss["rows"]) if lo <= n["jdTt"] < hi]
    if not pick:
        continue
    eras[label] = {
        "ae_minus_swiss_dpsi": stats([n["ae"]["dpsi"] - s["dpsi"] for n, s in pick]),
        "2000B_minus_swiss_dpsi": stats([n["n2000b"]["dpsi"] - s["dpsi"] for n, s in pick]),
        "2000A_minus_swiss_dpsi": stats([n["n2000a"]["dpsi"] - s["dpsi"] for n, s in pick]),
    }

out = {"n": len(node["rows"]), "gridTt": node["grid"], "swissBinding": swiss["swisseph_binding"],
       "swissBackends": swiss["ephemeris_backends_observed"], "unitsArcsec": True,
       "overall": series, "byEra": eras}
json.dump(out, open(sys.argv[3], "w"), indent=1)

for k, v in series.items():
    print(f"{k:34s} n={v['n']:5d} mean={v['mean']:+.6f}\" rms={v['rms']:.6f}\" maxAbs={v['maxAbs']:.6f}\" p95={v['p95Abs']:.6f}\"")
print()
for era, d in eras.items():
    print(era, " ".join(f"{k.split('_')[0]}:maxAbs={v['maxAbs']:.5f}\"" for k, v in d.items()))
