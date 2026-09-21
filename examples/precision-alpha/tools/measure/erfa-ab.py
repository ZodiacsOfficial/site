"""
The ERFA side of the aberration comparison.

  PYTHONPATH=<pyerfa> python3 erfa-ab.py <cases.json> > erfa.json

ERFA is a measuring instrument only. Nothing here is redistributed and
nothing in this package is fitted towards it.
"""
import json
import sys

import numpy as np
import erfa


def main():
    spec = json.load(open(sys.argv[1]))
    out = {"binding": f"pyerfa {erfa.__version__}", "routine": "eraAb", "cases": []}
    for c in spec["cases"]:
        p = np.array(c["pnat"], dtype=float)
        p = p / np.sqrt(p.dot(p))
        v = np.array(c["v"], dtype=float)
        bm1 = float(np.sqrt(1.0 - v.dot(v)))
        ppr = erfa.ab(p, v, float(c["sunAu"]), bm1)
        out["cases"].append({"id": c["id"], "ppr": [float(x) for x in np.asarray(ppr).ravel()[:3]]})
    json.dump(out, sys.stdout)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
