#!/usr/bin/env python3
"""One timing block for the Swiss side. Emits JSON on stdout.

Phases are kept separate on purpose. Loading .se1 data is acquisition, not
calculation, and timing it as though it were calculation would flatter or
damn the wrong thing depending on which side you did it to.

Every call's returned flag is checked: a MOSEPH fallback is a different
program answering, and it is refused rather than silently averaged in.
"""
import json, os, random, resource, sys, time
import swisseph as swe

EPHE = sys.argv[1]
ROUND = int(sys.argv[2])
REPS = int(sys.argv[3])
BODIES = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS,
          swe.JUPITER, swe.SATURN, swe.URANUS, swe.NEPTUNE, swe.PLUTO]
FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED

def rss_mib():
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0

out = {"system": "swiss", "runtime": "python %s" % sys.version.split()[0],
       "binding": swe.version, "round": ROUND, "rssStartMiB": rss_mib()}

# --- cold: set the data path and force the first read of every file we use.
t0 = time.perf_counter()
swe.set_ephe_path(EPHE)
jd0 = swe.julday(2020, 6, 15, 12.0)
backends = set()
for b in BODIES:
    xx, ret = swe.calc_ut(jd0, b, FLAGS)
    if ret < 0:
        raise SystemExit("swiss error flag %d" % ret)
    backends.add("SWIEPH" if ret & swe.FLG_SWIEPH else
                 ("MOSEPH" if ret & swe.FLG_MOSEPH else "OTHER"))
out["coldInitMs"] = (time.perf_counter() - t0) * 1000.0
out["rssAfterLoadMiB"] = rss_mib()
out["backendsObserved"] = sorted(backends)
if backends != {"SWIEPH"}:
    raise SystemExit("refusing: backend was %s, not SWIEPH" % sorted(backends))

# --- per-call floor, like for like: one body's apparent position, which is
# the cheapest real ephemeris call either side can make. An earlier draft
# timed swe.julday against Node's MakeTime, comparing two unrelated things.
# The instant must VARY. Swiss caches per (jd, body), so repeating one
# instant measures a cache hit, not a calculation — an earlier draft did
# exactly that and reported 0.37 us against a real per-body cost of ~6 us.
floor_jds = [jd0 + i * 0.37 for i in range(max(REPS, 2000))]
for i in range(2000):
    swe.calc_ut(floor_jds[i], swe.MARS, FLAGS)
t0 = time.perf_counter()
for i in range(REPS):
    swe.calc_ut(floor_jds[i], swe.MARS, FLAGS)
out["bindingFloorUs"] = (time.perf_counter() - t0) / REPS * 1e6
out["workloadNote"] = "10 bodies, position + speed"

# Same warmup discipline as the other side, so neither is measured cold.
for i in range(300):
    swe.calc_ut(swe.julday(1950 + i % 200, 1 + i % 12, 1 + i % 27, 12.0), swe.MARS, FLAGS)

# --- warm: 10 bodies at one instant, repeated, instants shuffled per rep so
# the same record is not re-read from cache every time.
rnd = random.Random(0xC0FFEE ^ ROUND)
instants = [swe.julday(1900 + rnd.randrange(0, 250), rnd.randrange(1, 13),
                       rnd.randrange(1, 28), rnd.random() * 24) for _ in range(REPS)]
warm = []
for jd in instants:
    t0 = time.perf_counter()
    for b in BODIES:
        xx, ret = swe.calc_ut(jd, b, FLAGS)
        if not (ret & swe.FLG_SWIEPH):
            raise SystemExit("refusing: non-SWIEPH result mid-run")
    warm.append((time.perf_counter() - t0) * 1000.0)
warm.sort()
out["warm10BodiesMs"] = {"p50": warm[len(warm)//2], "p95": warm[int(len(warm)*0.95)],
                         "min": warm[0], "max": warm[-1], "n": len(warm)}

# --- batch: the same total work in one go, to separate per-call overhead.
t0 = time.perf_counter()
for jd in instants:
    for b in BODIES:
        swe.calc_ut(jd, b, FLAGS)
out["batchTotalMs"] = (time.perf_counter() - t0) * 1000.0
out["batchPerChartMs"] = out["batchTotalMs"] / len(instants)
out["rssPeakMiB"] = rss_mib()
print(json.dumps(out))
