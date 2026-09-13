# L2a site-only release — PR #480

Owner approved exact head `2e7b676d5026aaeaa78fc9b541b01972a7c81424`.
Before release, GitHub confirmed unchanged base `0490c4f8a92f045417d7f81ed502f0789e8ecdc2`,
open/unmerged draft, clean mergeability, all 14 Site Check jobs passing in
[34759307903](https://github.com/ZodiacsOfficial/site/actions/runs/34759307903),
and successful Vercel exact-source preview. No reconciliation or new source was needed.
Main protection required zero reviews and had no configured required status contexts;
the repository workflow gates were nevertheless all satisfied. No protection changed.

Marked ready and merged with `--match-head-commit` guarding the approved SHA.
Actual merge: `87f18e0a101b96abf847be58e8a0c31a691992f8`, 2026-09-13 15:15:52 UTC.
Its tree `0305b08b378d6c9ae470e0f621a9ce1ecb532f98` exactly equals the approved tree.

Production [zodiacs.org](https://zodiacs.org/) and www alias now use READY deployment
`dpl_44tNRbymWxhKRRhUwg92gv945paY`, immutable URL
https://zodiacs-oklxtcs6m-zodiacsofficial.vercel.app/ , source actual merge above.
`www` redirects successfully to apex (final HTTP 200).
The pre-release READY deployment `dpl_DRnrXu34g9od11bzmgoYCb368QYr` is the authorized
rollback baseline, recorded before merge in [baseline.json](baseline.json).
No rollback has been needed. [Production metadata](production.json).

## Live native browser verification

Used a new Chrome Incognito window, isolated from existing saved charts, account and
preview data. Synthetic London, 20 March 2024 00:00 produced Sun Pisces 29°52′,
Moon Leo 2°15′, rising Sagittarius 1°52′, matching the verified preview witness.
Changing to unknown time and recalculating replaced this with reference Sun Aries
0°22′, unresolved Moon/rising, no inferred Registry context, and explicit wording:
“Birth time is unknown. These are reference-moment positions; the Sun sign has not
been verified across the whole birth date.” Existing Moon uncertainty remains.

Saved this synthetic guest chart: `Saved · on this device`; Today and Profile show
the neutral automatic name `Reference · 2024-03-20`. Today loads the September 13
edition and qualifies active contacts. Profile qualifies both daily and year-ahead
reference readings, keeps generic Jupiter ingress, and offers sync separately.
Screenshot inspected: notices fit the approved layout. No account sync or email sent. The isolated Incognito window was closed after verification; existing regular-profile data was untouched.

Calculated values, calculation-envelope/download receipt bytes, positions token and
contact receipt serialization reuse the valid identical-source comparison in
[L2 draft evidence](../l2-reference-sun/README.md). The merge introduced zero tree
changes. Newly saved forecast *text* intentionally gains uncertainty copy; no claim
that whole forecast serialization is unchanged. No hosted receipt download is claimed.

[Live edition check](live-editions.log) passes exact committed daily publication,
horoscope inputs, and public sky API agreement. Runtime error query from 15:20 UTC
returned no clusters; this is a bounded observation, not a promise about future errors.

## Automatic post-merge checks

[Site Check 34765077240](https://github.com/ZodiacsOfficial/site/actions/runs/34765077240)
completed successfully: **14/14 jobs passed** on the exact production merge source.
[Full run metadata](post-merge-ci.json), [compressed log](post-merge-ci.log.gz).
Final main and both production aliases retain the approved tree; no intervening
change invalidated evidence. [Final main](main-final.json),
[final deployment](production-final.json), [rollback READY](rollback-ready.json).
No manual reruns or expanded audit were started.

SDK merge/npm publication remains held. Complete-date intervals stay inactive;
L3–L6, Astrofolio and Zodia are excluded. Inherited development-only moderate
Vitest/mocker advisories remain recorded under unchanged passing security gates.
