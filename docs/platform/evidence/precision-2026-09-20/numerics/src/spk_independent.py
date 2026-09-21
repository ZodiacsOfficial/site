"""
An independent reader for JPL SPK (DAF) kernels.

Written from the NAIF "DAF Required Reading" and "SPK Required Reading"
format descriptions, deliberately NOT from the JavaScript reader it is meant
to check.  Three things are done differently on purpose, so that a shared
mistake is unlikely:

  1. The file is memory-mapped once and viewed as a single float64 array,
     rather than read record by record with per-field buffer offsets.
  2. The covering Chebyshev record is found by BINARY SEARCH over the record
     midpoints actually stored in the data, not by the directory's
     floor((et - init) / intlen) arithmetic.  The directory arithmetic is
     then checked against the search result, so a directory that disagrees
     with the data is caught instead of trusted.
  3. The polynomial is evaluated by numpy.polynomial.chebyshev.chebval, which
     uses the Clenshaw recurrence -- a different numerical algorithm from the
     explicit T_k forward recurrence.

Nothing here derives from Swiss Ephemeris.  JPL development ephemerides are
US Government work in the public domain.
"""
from __future__ import annotations

import mmap
import struct
from dataclasses import dataclass

import numpy as np
from numpy.polynomial import chebyshev as C

RECORD_BYTES = 1024


@dataclass
class Segment:
    start: float
    stop: float
    target: int
    center: int
    frame: int
    dtype: int
    first: int          # 1-based address in doubles
    last: int


class SpkIndependent:
    def __init__(self, path: str):
        self.path = path
        self._fh = open(path, "rb")
        self._mm = mmap.mmap(self._fh.fileno(), 0, access=mmap.ACCESS_READ)
        self.doubles = np.frombuffer(self._mm, dtype="<f8")

        fr = self._mm[0:RECORD_BYTES]
        locidw = fr[0:8].decode("latin1").strip()
        if not locidw.startswith("DAF/SPK"):
            raise ValueError(f"not an SPK file: {locidw!r}")
        locfmt = fr[88:96].decode("latin1").strip()
        if locfmt != "LTL-IEEE":
            raise ValueError(f"unsupported byte order {locfmt!r}")
        self.nd, self.ni = struct.unpack_from("<ii", fr, 8)
        self.fward, self.bward, self.free = struct.unpack_from("<iii", fr, 76)
        self.internal_name = fr[16:76].decode("latin1").strip()
        self.segments = self._read_summaries()
        self._dircache: dict[int, tuple] = {}
        self.boundary_hits = 0

    def close(self):
        self._mm.close()
        self._fh.close()

    def _read_summaries(self) -> list[Segment]:
        ss = self.nd + (self.ni + 1) // 2         # summary size in doubles
        out: list[Segment] = []
        nxt = self.fward
        seen = set()
        while nxt:
            if nxt in seen:
                raise ValueError("summary-record list is cyclic")
            seen.add(nxt)
            rec = self._mm[(nxt - 1) * RECORD_BYTES: nxt * RECORD_BYTES]
            nxt_f, prv_f, nsum_f = struct.unpack_from("<ddd", rec, 0)
            for i in range(int(nsum_f)):
                base = 24 + i * ss * 8
                start, stop = struct.unpack_from("<dd", rec, base)
                ints = base + self.nd * 8
                target, center, frame, dtype, first, last = struct.unpack_from("<6i", rec, ints)
                out.append(Segment(start, stop, target, center, frame, dtype, first, last))
            nxt = int(nxt_f)
        return out

    def segment(self, target: int, center: int) -> Segment:
        for s in self.segments:
            if s.target == target and s.center == center:
                return s
        raise KeyError(f"no segment for target {target} centre {center}")

    def _directory(self, seg: Segment):
        key = seg.last
        if key not in self._dircache:
            init, intlen, rsize, n = self.doubles[seg.last - 4: seg.last]
            self._dircache[key] = (float(init), float(intlen), int(rsize), int(n))
        return self._dircache[key]

    def _records(self, seg: Segment) -> np.ndarray:
        """The segment's Chebyshev records as an (n, rsize) view."""
        _init, _intlen, rsize, n = self._directory(seg)
        flat = self.doubles[seg.first - 1: seg.first - 1 + n * rsize]
        return flat.reshape(n, rsize)

    def state(self, seg: Segment, et: float, check_directory: bool = True):
        """Position (km) and, for type 3, velocity (km/s) at TDB seconds past J2000."""
        if seg.dtype not in (2, 3):
            raise ValueError(f"segment type {seg.dtype} not supported")
        if not (seg.start <= et <= seg.stop):
            raise ValueError(f"et {et} outside [{seg.start}, {seg.stop}]")
        recs = self._records(seg)
        mids = recs[:, 0]
        radii = recs[:, 1]
        # Binary search on the stored midpoints, then step to the record whose
        # own [mid-radius, mid+radius] window actually contains et.
        i = int(np.searchsorted(mids, et))
        for cand in (i - 1, i, i + 1):
            if 0 <= cand < len(mids) and mids[cand] - radii[cand] <= et <= mids[cand] + radii[cand]:
                i = cand
                break
        else:
            i = min(max(i - 1, 0), len(mids) - 1)
        if check_directory:
            init, intlen, _rsize, n = self._directory(seg)
            j = int(np.floor((et - init) / intlen))
            j = min(max(j, 0), n - 1)
            if j != i:
                # Adjacent records share an endpoint, so an et that lands exactly
                # on a boundary is legitimately in both.  Accept that case only,
                # and only after checking the two records really do agree there.
                if abs(j - i) == 1 and self._on_boundary(recs, i, j, et):
                    self.boundary_hits += 1
                else:
                    raise AssertionError(f"directory index {j} disagrees with data index {i} at et={et}")
        rec = recs[i]
        ncomp = 3 if seg.dtype == 2 else 6
        ncoef = (rec.size - 2) // ncomp
        tau = (et - rec[0]) / rec[1]
        coeffs = rec[2: 2 + ncomp * ncoef].reshape(ncomp, ncoef)
        vals = C.chebval(tau, coeffs.T)          # Clenshaw, per component
        pos = np.array(vals[:3], dtype=float)
        vel = np.array(vals[3:], dtype=float) if ncomp == 6 else None
        return pos, vel

    @staticmethod
    def _on_boundary(recs, i: int, j: int, et: float) -> bool:
        """True when et is exactly the endpoint records i and j share."""
        lo, hi = (i, j) if i < j else (j, i)
        return et == recs[lo][0] + recs[lo][1] == recs[hi][0] - recs[hi][1]

    def position(self, seg: Segment, et: float) -> np.ndarray:
        return self.state(seg, et)[0]
