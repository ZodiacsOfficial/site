# Zodiacs Platform status

## Current checkpoint — L1 released; bounded L2 interpretation correction

L1 / C-017 is merged in [#476](https://github.com/ZodiacsOfficial/site/pull/476)
as `307c832e662e1996ee904f11fb1678e402808a03`, with the exact owner-approved tree.
All 14 automatic post-merge jobs passed in
[run 34756055748](https://github.com/ZodiacsOfficial/site/actions/runs/34756055748).
Production and rollback verification found no critical regression.
Current main/production at the L2 starting refresh is
`0490c4f8a92f045417d7f81ed502f0789e8ecdc2`, an automated Registry snapshot descendant
with unchanged L1 runtime. [Production evidence](evidence/l1-production/README.md).

The owner now authorizes only downstream unknown-time reference-Sun interpretation
in L2, based on this current main. Calculated positions, receipt bytes, known-time
behavior and approved design stay intact. Complete-date interval activation is
separate until provider completeness, runtime support and skipped/repeated-date
policies are established. [L2 scope and evidence](evidence/l2-reference-sun/README.md).
No merge/deployment, SDK merge/npm publication, L3–L6, Astrofolio or Zodia work is
included. The SDK publication hold remains explicit.

## Current delivery state

- **L1:** implemented, tested, merged and production-verified. No release regression remains.
- **L2 bounded interpretation slice:** implemented locally; required checks and exact-source
  draft preview are in progress. Not release-ready, merged or production-deployed.
- **Complete-date coverage:** inactive and deferred; no whole-date certainty claim.
- **SDK:** existing vendored rc.6 engine and optional read-only ownership SDK preserved;
  merge/npm publication held. External adoption is unclaimed.

Production `dpl_DRnrXu34g9od11bzmgoYCb368QYr` serves the L2 starting main on both
zodiacs.org and www.zodiacs.org. Retained rollback baseline
`dpl_5U72NfyjWZb4T2x2Q93DUqo1Ac4g` remains READY. No rollback was needed.

[Finite remaining checklist](REMAINING.md), [PLAN](PLAN.md),
[DECISIONS](DECISIONS.md), [EVIDENCE](EVIDENCE.md).
The [pre-L2 checkpoint archive](STATUS-2026-09-13-pre-l2.md) preserves earlier
pending-release/outage states as historical evidence, superseded by this checkpoint.
