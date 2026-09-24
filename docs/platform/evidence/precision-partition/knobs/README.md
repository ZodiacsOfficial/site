# The amendment that was not taken

`PARTITION-EVALUATION.md` section 4 froze two knobs before any target was
written, and allowed them to be changed **once** if the evaluation in
section 6 failed. It did fail — P-3 and P-4 — so the amendment was
available. This directory is why it was declined.

The order matters and is stated rather than implied: the evaluation in
`../evaluation/` was run and recorded first. These sweeps were run
afterwards. They could not have chosen its thresholds.

## The two failing targets pull in opposite directions

`boundaryToleranceSec` is the width at which a span still straddling the
five-degree floor is given up on and reported as *boundary*. Tightening it
buys a narrower unproved residue and costs bisection; loosening it does the
reverse. On the Moon, the case that fails both targets:

| tolerance | status | evaluations | ratio to baseline | boundary width |
| ---: | --- | ---: | ---: | ---: |
| 1 s | **budget-exhausted** | 2,058,589 | 1.94× | 0.154 % |
| 5 s | **budget-exhausted** | 2,101,175 | 1.90× | 0.712 % |
| 15 s | finished | 2,115,633 | 1.89× | 2.834 % |
| 30 s | finished | 1,602,022 | 2.50× | 3.943 % |
| **60 s** (frozen) | finished | **1,260,163** | **3.17×** | **5.266 %** |
| 120 s | finished | 1,023,596 | 3.91× | 7.223 % |
| 300 s | finished | 831,837 | 4.81× | 10.867 % |
| 900 s | finished | 662,361 | 6.04× | 20.673 % |

P-3 wants ≤ 1 %. P-4 wants ≥ 4×. **No tolerance satisfies both**, and at
the two that satisfy P-3 the partition spends its cell budget before
reaching any subsearch — which fails P-1, the target section 6 calls
fatal. Those two rows return **zero events**.

Loosening to 300 s would flip P-4 to a pass on all four named cases. It
would also take P-3 from failing on two cases to failing on four, the Moon
at 10.9 % and Mercury at 2.0 %. Trading a target that fails on two cases
for one that fails on four, in order to report a pass, is the manoeuvre the
brief names and forbids. The frozen value stands.

## The other knob is on a plateau

`relightWidthRatio` is how far a span may shrink below the span its
light-time interval came from before that interval is derived again. At
tolerance 60 s:

| ratio | Moon | Mercury | Saturn |
| ---: | ---: | ---: | ---: |
| 1 | 3,927,368 | 943,864 | 43,858 |
| 2 | 1,300,783 | 209,528 | 16,195 |
| 4 | 1,260,163 | 208,088 | 16,195 |
| **8** (frozen) | **1,260,163** | **208,088** | **16,195** |
| 16 | 1,260,163 | 208,088 | 16,195 |
| 32 | 1,260,163 | 208,088 | 16,195 |

Four and above are bit-identical: by the time a span has been bisected
twice it is already re-deriving, so raising the ratio changes nothing. One
and two are strictly worse — never relighting costs the Moon 3.1× its
frozen figure, which is the inherited-interval problem
`PARTITION_DEFAULTS` documents, measured. There is no better value to move
to.

## What was decided

Neither knob changed. The evaluation stands as an **unamended** run with
the verdict it earned: P-1, P-2, P-5, P-6 and P-7 hold; P-3 and P-4 do
not, on the cases and by the margins `../evaluation/` records.

## Reproducing

```bash
node sweep-tolerance.mjs /path/to/pack.zeph    # the tolerance table
node sweep-relight.mjs   /path/to/pack.zeph    # the ratio table
```

Both print a line per configuration and a JSON array at the end;
`knob-sweep.json` holds the collected output of the three runs behind the
two tables. The baseline evaluation counts they divide by are pinned in
the tool, taken from the recorded evaluation — the Moon's is the
4,000,000 budget ceiling and not a measured cost, so every ratio against it
is a lower bound.
