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

## L2a delivery — verified draft, 2026-09-13

Draft [#480](https://github.com/ZodiacsOfficial/site/pull/480) is delivered at
`2e7b676d5026aaeaa78fc9b541b01972a7c81424`, tree
`0305b08b378d6c9ae470e0f621a9ce1ecb532f98`, against unchanged main
`0490c4f8a92f045417d7f81ed502f0789e8ecdc2`. GitHub's tested merge tree equals the
candidate tree. All 14 hosted jobs pass in
[Site Check 34759307903](https://github.com/ZodiacsOfficial/site/actions/runs/34759307903),
including 5,145 tests, 15 visual cases, 30 Lighthouse routes and both widget gates.
No hosted retry or budget waiver was needed. The exact-source
[protected preview](https://zodiacs-5btqxmpa6-zodiacsofficial.vercel.app/birth-chart/)
is READY and verified for known/unknown chart replacement, neutral automatic naming,
Today, Profile and Russian Profile. Existing authorization/protection was preserved.

L2a is implemented, tested, preview-verified and review-ready. It remains a draft,
unmerged and not production-deployed. Calculation receipts and contact receipt strings
are unchanged; newly saved forecast text intentionally gains uncertainty wording.
Complete-date interval activation remains separate. SDK merge/npm publication remains
held; no L3–L6, Astrofolio or Zodia work is included. Two inherited moderate development-only
Vitest/mocker advisories remain below the unchanged gates; production audit is clean.

[Evidence](evidence/l2-reference-sun/README.md),
[preview observations](evidence/l2-reference-sun/PREVIEW.md), [remaining work](REMAINING.md).
Final closeout records are committed locally and mirrored to the shared checkpoint;
the remote PR stays on the exact verified source with final results in its description.

## Current delivery state

- **L1:** implemented, tested, merged and production-verified. No release regression remains.
- **L2 bounded interpretation slice:** verified draft #480; all 14 hosted checks pass
  and exact-source preview is verified. Review-ready, unmerged and not production-deployed.
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
