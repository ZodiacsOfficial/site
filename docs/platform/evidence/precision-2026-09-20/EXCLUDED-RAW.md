# Bulk raw outputs, excluded by size — hashes and how to regenerate

These files exceed 1 MiB and are not committed: the three tracks together produce 54 MiB of
sweep and per-epoch dumps, and a website repository should not carry that forever. Nothing
reproducible is lost. The compiler is proven byte-deterministic (see compiler/raw/determinism.json),
so each file below regenerates identically from the command given.

Recorded 2026-09-20 from the original run.

| bytes | sha256 | file |
| ---: | --- | --- |
| 15496974 | `2656c1462d98fa3f97416d1c3b8a15e1…` | `compiler/raw/sweep.json` |
| 13812888 | `87aeb1531b84dafa0cb7bcbe6b84ce54…` | `numerics/raw/t4-effects.json` |
| 1274504 | `52d9682715c90a95463d03c343d1e8af…` | `numerics/raw/t5-js-dump.json` |
| 13813248 | `9abd14f53551a3842c650dcb4350e116…` | `numerics/verify/t4-effects.json` |
| 1274504 | `52d9682715c90a95463d03c343d1e8af…` | `numerics/verify/t5-js-dump.json` |
| 1492607 | `484fd4fb9931eb170d0fcd85e2fdc5df…` | `numerics/verify/v1-node.json` |

Regenerate from `docs/platform/evidence/precision-2026-09-20/`, with the kernel
at `/tmp/claude-0/swisslab/de440s.bsp` and the Swiss venv at
`/tmp/claude-0/swisslab/venv`:

```sh
# compiler sweep and per-candidate measurements
cd compiler && node sweep.mjs && node choose.mjs && node compile.mjs D && node measure.mjs packs/D.zeph

# numerics effect audit and nutation grids
cd numerics && node tools/t1-nutation-node.mjs && node tools/t4-effects.mjs

# search pipeline (small; nothing here was excluded)
cd search && sh run-all.sh
```

The coefficient packs themselves (`compiler/packs/*.zeph`, 17 MiB) are **not**
excluded for size. They are not committed because `RIGHTS.md` leaves it
unsettled whether a refitted coefficient set derived from a NAIF kernel may be
redistributed, and the standing instruction is to keep packs undistributed
until that is answered. `compile.mjs` rebuilds them byte-identically.
