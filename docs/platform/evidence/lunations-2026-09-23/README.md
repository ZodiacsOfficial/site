# Lunation instants, 2026-09-23

`src/data/sky.json` used to take its new and full moons from astronomy-engine's
`SearchMoonPhase`, which measures the Sun without annual aberration. The
monthly `src/data/transits-YYYY-MM.json` files and every chart take the
apparent Sun. The two sets of instants disagreed by 33.7 to 46.3 s for the
same 124 lunations (audit ledger production-event-search-1). Both generators
now use `scripts/lunation-search.mjs`, and `scripts/sky-lunations.test.mjs`
holds them to each other.

`horizons/` keeps the arbiter the audit used for one of them: JPL Horizons
apparent ecliptic longitudes of the Moon and the Sun (QUANTITIES 31, observer
at the geocentre, airless, DE441), a minute apart around the new moon of
2027-01-07. Each `.query` file is the request that produced the `.txt` beside
it. By linear interpolation of Moon − Sun, the new moon falls at
20:24:23.2 UT. `sky.json` said 20:25:05.9 before this change and says
20:24:19.6 after; the test asserts within 5 s.

These are NASA's published values, retrieved by the audit on 2026-09-22 and
listed in `../engine-audit-2026-09-22/ARTIFACTS.sha256.tsv`. No Swiss output is
committed here.

## Against Swiss Ephemeris, and the brief's first rule

Version 1 of the engine brief set this step's rule as all 124 lunations
within 2 seconds of Swiss Ephemeris. Measured after this change
(`../events-vs-swiss-2026-09-23/`), 1 of 124 are, 25 are within 5 seconds, and
the largest difference is 11.8 seconds. By that rule the step fails, and the
verdict stands as recorded here. What remains is mostly the engine's ΔT,
75.5 s in 2026 where Swiss reads 68.8 s, which moves the Moon about 3.5″ and
the instant about 7 seconds (`../deltat-2026-09-23/`); step 1.4 of the brief
replaces that model. Every lunation is within a minute, which is what the
site's pages claim.
