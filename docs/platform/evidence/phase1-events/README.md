# Grazing return passes, 2026-09-23 (Phase 1 step 1.6)

The site's crossing solver sampled a body's longitude every few days and
bisected only where two samples fell on opposite sides of the target. When a
station lies just past the target, both crossings can fall between two
samples and neither is seen. At the 5-day step used for returns, Saturn is
blind to any station within 0.0103° of the natal degree and Jupiter within
0.0205° (audit ledger production-event-search-4). A birth on
1990-02-12T20:13:55.742Z puts natal Saturn 0.002° below the 2019 station, and
its Saturn return showed one first pass instead of three.

`src/lib/engine/longitude-crossings.ts` now looks at every sampled turn of
the motion. If the offset at the turn is within reach of the local curvature,
it finds the extremum by golden-section search and bisects both crossings
when the extremum passes the target. A turn in the first or last cell is
found from a direction probe just inside the window. That probe is taken only
when the edge offsets are within reach, and no sample falls outside
[from, to].

## Measured

- `graze-corpus.json`: every station of Mercury to Pluto from 2020 to 2030,
  with targets 0.3° to 1e-6° short of the station and three grid phases, 4,941
  cases. The new solver returns the reference number of crossings in all
  4,941; the old one in 3,627. The reference is the transit scanner's
  station-split method at a step 25 times finer (`tools/station-split.ts`).
  The corpus is built to graze, so the new solver's extra evaluations (482,930
  against 362,082) are its worst case.
- `ordinary-identity.json`: 3,000 random ordinary windows give output
  identical to the old solver's.

This is a tested property of these corpora, not a proof that no pair can be
missed. The reach bound assumes smooth motion and at most one station per two
coarse cells, which holds for the ten bodies at the site's steps.

## Tools

`tools/` keeps the scripts as they were run, with `<base>` standing for a
checkout of the site before this change and `<candidate>` for one after. They
ran under `vite-node` from a session scratch directory.
