# Pinned zone history before 1970, 2026-09-23 (Phase 1 step 1.12)

Browsers resolve historical time zones from the default build of the IANA
time zone database, which merges places whose clocks have agreed since 1970
and so gives them another city's history before then. Node 22.22 (ICU 78.2,
tzdb 2025c), for example, reads a Stockholm birth at noon on 1 July 1947 on
Berlin's summer time (+2:00, 10:00 UTC), where Sweden kept +1:00. The
database keeps each merged place's own records in its `backzone` file.

`scripts/build-tz-history.mjs` compiles the pinned release (2025c, the same
archive and SHA-256 as `scripts/build-tz-lmt.mjs`) with `backzone` using zic,
and writes each name's offsets before 1970 to `src/data/tz-history/2025c/`,
in 64 files of about a kilobyte gzipped, hashed by name. It leaves out the
17 names whose pinned history differs from the default build after 1970 too
(`excluded.json`: the pre-2024 rule-based WET and EET, Harbin and Chongqing
at their own offsets until 1980, and others), so the hand-over to the
browser at 1970 never jumps; none of them is in the city index.
`src/lib/time/localToUtc.ts` reads these files for a birthplace time before
1970, inside the birthplace clock of step 1.1, and the browser's data after.

## Measured

`index-divergence.json` (by `tools/index-divergence.mjs`) compares the pinned
history with Node's Intl at 12:00 UTC on every day from 1900 to 1969, for each
of the 356 time zones in the city index: 89 differ on at least one day, 58 of
them by an hour or more. The methodology page states those two figures, and
`scripts/claims-bindings.test.mjs` holds it to this file.

Tested: the generator's output offline (`scripts/build-tz-history.test.mjs`:
64 buckets hashed as the resolver hashes, well-formed offsets, every era of
`tz-lmt.json` matched, every city-index zone present, and, on a host with
tzdb 2025c, the same offset as the host at 1970 for every name); ten
divergent places at dated instants, a zone the host already has right, the
1970 hand-over, an excluded name, and the loading rules
(`src/lib/time/localToUtc-history.test.ts`); the birthplace clock at sixteen
era ends against a model that reads the same history
(`localToUtc-birthplace-clock.test.ts`).

Not established: that backzone's records are right. Its maintainers describe
them as less reliable than the main data, and they are used here only where
the main data would otherwise give another place's history.
