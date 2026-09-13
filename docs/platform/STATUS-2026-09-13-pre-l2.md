# Zodiacs Platform status

## L1 phase names — verified draft delivered

Released-site post-merge CI 34744052278 is complete: all 14 jobs pass, with no
release-regression finding. L1 / C-017 is complete for review in draft
[#476](https://github.com/ZodiacsOfficial/site/pull/476) at
`37295167eba36281a362b74d092b006c945f44ec`, based on unchanged released main f592d514.
Final hosted run 34745644178 passes all 14 jobs: 5,120 tests, visual regression,
Lighthouse and widget gates. Required local checks, 66 focused tests, exact numerical/
receipt preservation, 512-instant lite parity and refreshed 18-view evidence pass.
Exact-source preview `dpl_53Q5Y1CLjZENEFC7WPxmZ8qBySfv` is READY and verified.
[Evidence](evidence/l1-phase-category/README.md). No merge, production deployment,
SDK publication-status change, or L2–L6 work. Zodia and Astrofolio remain excluded.
No L1 blocker remains; release approval and publication are separate future actions.


## Site-only release completed — 2026-09-13 07:11 UTC

Owner approved #471 at `8fa2f4b0d8ca7b4fd30fd07d1416342be7c85c1c`.
Candidate/main were unchanged; all required approved-tree checks remained valid.
Marked ready and merged as `f592d5143f52851b8f47be17e43fbf9fd5be8b8f`, whose
complete tree exactly equals the approved candidate. Production
`dpl_J97NYSVs815T59Eksj1hLYDTbMWb` is READY on zodiacs.org and www.zodiacs.org.
Live chart/Moon/developer flows, current editions, Registry bytes and pinned
public downloads pass. Prior deployment `dpl_FLuUjmWEphVnJsvqesvNGAir5gBg`
remains READY with Instant Rollback available; no critical regression or rollback.

[Release evidence](evidence/site-production-release-2026-09-13/README.md).
The automatic post-merge CI rerun is in progress, not claimed passed; the 14-job
approved run is reused for the identical tree. SDK merge/npm remains held.
Zodia, Astrofolio and L1–L6 remain excluded. External adoption is unclaimed.
This checkpoint supersedes earlier pending site approval/deployment language;
prior records below remain historical evidence.


## Final site preparation — ready for owner approval

2026-09-13 06:47 UTC: #471 is refreshed to `8fa2f4b0d8ca7b4fd30fd07d1416342be7c85c1c`
against main `6ded3e09d018e22d413016bd9856805911c5c68f`. September 13 paired
editions and all 31 published Registry items are preserved. All 14 required hosted
jobs pass, including 5,095 tests, visual, Lighthouse and widget gates; eight refreshed
preview views and five exact served assets pass. Current production and the rehearsed
rollback baseline are main 6ded3e09 / READY dpl_FLuUjmWEphVnJsvqesvNGAir5gBg.

[Final owner checklist](FINAL-RELEASE-REVIEW.md) traces every review to its actual
origin. Owner/maintainer review and site release authority are pending. Earlier
blanket practitioner/lawyer/native-speaker signoff requirements were overstated;
those specialist reviews are recommended and unclaimed for this bounded scope.
Source/licensing review and critical-defect gates remain mandatory. No rule or
explicit hold was waived. Zodia is excluded; SDK merge/npm remains held. No main
merge, package publication, production deployment/settings change or L1–L6 work.
[New evidence](evidence/final-release-preparation/README.md); sealed R3 evidence is reused.

Historical checkpoints follow.

## Owner disposition — Zodia archived, excluded

The owner has explicitly excluded Zodia from this platform session and requested
archival to the SD card. Completed verified archival copy: `/Volumes/MACMINI_SD/Archives/Zodia/20260913T060317Z`.
All 91 tracked app files match the source byte-for-byte; app tree equals SDK main.
Workspace restoration context and available Git history are included with SHA-256
manifest and verified Git bundle. Original repository files are preserved.
O5 exclusion is accepted; no Zodia preview, app release or configuration work is
a platform gate. Earlier pending-exclusion language below is historical and
superseded. SDK publication hold and site human-review/release gates remain.
No Vercel project or production setting was changed.

Checkpoint: 2026-09-12 UTC. Root remains the accountable shared-file integrator.
R3 engineering and required hosted verification are complete in isolated review
drafts. Release approval remains pending. SDK #5's explicit publication hold is
preserved; no main merge, npm publication, production deployment or L1–L6 work
was performed. Astrofolio remains separate.

## O5 — investigation complete; exclusion recommended

The auxiliary launch target is a separate Zodia app target, misconfigured at the
SDK repository root; all 23 retained deployments failed, including June production
attempts. Recommend excluding it from this release, leaving it enabled and untouched.
[Current decision packet](RELEASE-DECISION.md) consolidates exact owner actions and
human reviews. Site can ship independently with explicit site-only approval; SDK
merge/npm hold remains. No source/settings/release changes or repeated CI.

## R3 — verified integration drafts; owner release gates remain

- Site draft [#471](https://github.com/ZodiacsOfficial/site/pull/471):
  `6fca2d9c5f30ec2e4c82c25ea91396fddd3d9f77`, based on fresh main
  `1d7d0d0e3baf06f813e9f164aa8ec5394bbd6af7` plus accepted #469 and its
  evidence-only closeout. All 16 selected heads are included; all 28 published
  immutable Registry items and concurrent main fixes are preserved. All 4,469
  actual changed paths (243 outside documentation) and the complete remote tree
  match. Main's newer dependency closure and the accepted rc.6 pin coexist.
- SDK draft [#12](https://github.com/ZodiacsOfficial/sdk/pull/12):
  `f747be5098d8f7bca86a4997d3dc0efd40a5828b`, based on main
  `b49e0f14f9f17bc84db39486f2c4bb075e0ae3ff` and accepted #11. All 563 actual
  PR paths/blobs match. Package sources/artifacts remain unchanged; fresh rebuild
  reproduces the immutable engine archive byte for byte. Clean consumer, pins,
  compatibility, optional ownership isolation and whole-tree rollback pass.
- Required hosted CI passes: all 14 site jobs in
  [34702476713](https://github.com/ZodiacsOfficial/site/actions/runs/34702476713),
  including 5,095 tests, visual regression, 30 Lighthouse routes and both widget
  gates; SDK [CI34702178888](https://github.com/ZodiacsOfficial/sdk/actions/runs/34702178888)
  and [AppCI34702178877](https://github.com/ZodiacsOfficial/sdk/actions/runs/34702178877)
  pass 579 and 56 tests respectively. Actual CI merge trees equal both candidates.
- Exact site preview passes 24 groups and 38 screenshots, including six-language
  captions, current editions and saved-chart Today. SDK primary preview is READY
  and passes two bounded layout/script views; its API/account flows were excluded.
  The **auxiliary `sdk-zodia-launch` preview still fails `STATIC_BUILD_NO_OUT_DIR`**.
  The owner must classify or configure that extra target before counting it as
  part of a green release. It is not silently bypassed or counted as passing.

Both main branches remain unchanged on the final refresh. No new numerical scope,
human signoff, npm publication, production deployment or external adoption is
inferred. This is implemented, tested, draft-delivered and ready for review;
release approval remains subject to the stated owner/external gates. Final
closeout files are local and mirrored separately from the frozen green remote
source; PR descriptions carry the completed hosted outcomes without a redundant
documentation-only CI run.

[Integration evidence](evidence/r3-release-integration/README.md),
[exact candidate identities](evidence/r3-release-integration/candidate.json),
[finite release approval checklist](evidence/r3-release-integration/RELEASE-APPROVAL.md).
Historical R1/R2 and C-016 records below retain their original source scope.

## R1/R2 maintenance — complete for draft review

The preserved minimum-version dependency proposal is integrated in an isolated
checkout based on C-016 `9912e37`, with prior closeout records at `062da26`.
Both dependency audit gates pass. Existing generators pair the September 12
Daily Sky, horoscope and Registry artifacts with a real September 12 market
snapshot. Behavioral tests now explicitly establish pilot and market conditions;
production approval and provenance rules are unchanged. A further horoscope
same-sign fixture exposed by the new edition is corrected in memory only.
Draft [#469](https://github.com/ZodiacsOfficial/site/pull/469) is delivered at
`35301d24907b6eb7117a1f4b0ae690ca42c57de6`. Final build/typecheck, 5,091 tests
and 18 fresh captures pass. The exact READY preview passes 22 view groups and
five served-artifact comparisons. All fourteen jobs pass in
[Site Check 34688849189](https://github.com/ZodiacsOfficial/site/actions/runs/34688849189),
including visual regression, all 30 Lighthouse routes and both widget gates.
R1/R2 have no remaining blocker. This candidate is implemented, tested and
review-ready; the whole platform still requires R3 and owner/external gates.
It is not merged, npm-published, production-deployed or externally adopted.
Final closeout records are local/mirrored; the remote draft stays on the exact
green source, with final results recorded in its PR description. See [maintenance record](evidence/r1-r2-maintenance/README.md).

## C-016 — Historical reference-caption checkpoint

Draft[#438](https://github.com/ZodiacsOfficial/site/pull/438), **Make chart and Moon
reference captions match their data**, is delivered at
`9912e37bee3f20de691b6bed8165ff36189d1eca`, based on exact C-015
`9d180c9f1a2f66893ccd6d73fcda106cb3894674`.
All722 actual paths/statuses/blobs match:36 accepted non-documentation files
and686 documentation files. The source is unchanged since accepted local review.

- **Implemented/tested:**23 product/copy files,10 scoped tests/drivers and three
  reviewed metadata/generated files. Local build/check,5,091 tests in420 files,
 24 actual six-language page groups,34/35/20 native caption/date/ownership groups,
  sharing and18 unchanged approved captures pass. Independent numerical/caller,
  consumer/image/privacy, metadata and evidence audits accept their stated scopes.
- **Preview deployed/verified:** READY deployment `dpl_42iL979pobWWCgELp1X4vAmtL953`
  at the exact source passes14 hosted groups across six languages, with28
  screenshots and72 verified served bodies. Four unavailable image bodies and
  the unobserved isolated access bootstrap remain explicitly qualified.
- **Hosted CI — blocked:** Site Check34232899292 has13 successful jobs and one
  failed job. Attempt1 passed the caption/numerical/visual gates, then failed
  two performance samples. Its single justified retry stopped on newly reported
  production dependency advisories. No further unchanged-source retry was issued.
- **Release state:** implemented, locally accepted and draft-delivered; hosted
  release acceptance is **not complete**. Not release-ready, merged, npm-published,
  production-deployed or externally adopted.
- **Prepared maintenance — not integrated:** minimum fixed dependency versions
  clear the audit gates, but a fresh build also needs current paired publication
  data and exposes three Registry research tests. The entire proposal and its
  failures are preserved, then only owned temporary changes are restored. The
  accepted draft source stays9912e37. Further work is listed as a release blocker.

Evidence: [scope and accepted records](evidence/reference-captions/README.md),
[hosted preview](evidence/reference-captions/hosted-preview/REVIEW.md),
[original CI and retry decision](evidence/reference-captions/hosted-ci-initial/README.md),
[remaining blockers and preserved proposal](evidence/reference-captions/release-blockers/REVIEW.md).
The old/new sharing-image mismatch has no established cause; the older sample
is not a fresh baseline. Original sealed evidence is preserved with a corrigendum.

## Delivery and boundaries

The shared checkout remains on its original local branch at831bc9e, with accepted
C-016 working files preserved. Its dataless shared Git object index stalled reads;
delivery used a healthy isolated clone with all33 frozen and51 acceptance source
identities verified. No shared metadata, concurrent work or cloud settings were
changed. [Delivery proof](evidence/reference-captions/delivery-carrier/README.md).

Astrofolio Verification & Provenance remains a separate owner session/workstream.
Its isolated view, local adapter, tests and docs/astrofolio-trust records are not
integrated here. Inspect its actual draft and changed files before any future
shared-file integration. Its release remains separate from the engine hold.
The approved design, existing functionality and optional read-only ownership SDK
are preserved. SDK#5's explicit do-not-merge/do-not-publish hold remains on the
fresh2026-09-12 read; no owner/human/publication gate is silently discharged.

## What remains

[Finite remaining checklist](REMAINING.md) separates current release/integration
blockers, later corrections/features and owner/external gates. C-017 phase-name
work is not integrated or accepted in C-016. No broader audit or new implementation
is started in this closeout.

[Earlier checkpoints](STATUS-2026-09-08.md), [PLAN](PLAN.md),
[DECISIONS](DECISIONS.md), [EVIDENCE](EVIDENCE.md) and [REVIEW](REVIEW.md)
retain historical source identities, failures, completed releases and limitations.

## L1 release authorized; GitHub outage blocks completion — 2026-09-13

Owner approved site #476 at 37295167eba36281a362b74d092b006c945f44ec.
Head and main f592d5143f52851b8f47be17e43fbf9fd5be8b8f are unchanged; all 14 hosted
Site Check jobs remain successful. Prepared merge tree f4c432b146453f9c54992da73f07aece680f5744
is identical to the approved candidate. PR was marked ready successfully.
Merge attempts returned EOF, empty responses, timeout, and HTTP 405
“Merge already in progress”; GitHub reports a major Pull Requests outage
(incident 0rn90wk115q9). Final read: OPEN, not draft, mergeCommit null.
Production still READY at dpl_J97NYSVs815T59Eksj1hLYDTbMWb, source f592d514,
with both zodiacs.org and www.zodiacs.org aliases. This is the recorded owner-authorized
rollback baseline. No L1 production deployment or post-merge verification is claimed.
Resume by checking whether the pending merge completed before retrying; verify
production source, chart/Moon behavior, numerical/receipt preservation and automatic
post-merge CI after GitHub recovers. Reuse unchanged-source L1 evidence.
SDK merge/npm hold remains; L2–L6, Astrofolio and Zodia are untouched.
[Release evidence](evidence/l1-release/README.md).

## L1 reconciliation verified; new approval required

Draft #476 now targets 7b2364b31e3b2e34185f0cc7279e084c08a6ef5e, tree
35c483e9cb8a8febf892854d3ad4b6760a8d3530. Isolated reconciliation preserves both intervening
automation commits from main 355f4261: 18 Registry snapshot/publication files.
All changed files equal main; L1 runtime, engine pins, numerical/receipt logic and tests
are unchanged. No earlier merge completed.

Final verification: all 14 hosted jobs passed on 7b2364b31e3b2e34185f0cc7279e084c08a6ef5e,
including 5,120 tests in 422 files, visual regressions and performance budgets.
Preview dpl_79opjTkFWrzGk5mA5cowpNwvHTsZ is READY at this exact head:
https://zodiacs-hawljcu5p-zodiacsofficial.vercel.app/moon-phase/
Preview content limitation: HTTP and authenticated Vercel fetch returned SSO redirects;
a byte comparison received login HTML, not deployment data. Browser entry timed out.
No data mismatch inferred and no new preview-content verification claimed.
Reuse prior unchanged-runtime L1 browser evidence. New hosted build/freshness/Registry checks pass.
Final main remains 355f42615c21c51bf6ebab27c1499fc6f954e315. PR OPEN/draft/unmerged.
Owner approval is required for the changed tree. Follow-up PAUSED. No production action.
SDK hold and L2-L6/Astrofolio/Zodia exclusions remain.

[Full evidence](evidence/l1-reconciliation/README.md).

## L1 released and production verified - 2026-09-13

Owner-approved7b2364b3 passed protected-preview inspection using the existing Chrome
zodiacs.org session without weakening protection. PR476 merged as307c832e662e1996ee904f11fb1678e402808a03,
exact approved tree35c483e9cb8a8febf892854d3ad4b6760a8d3530. Production deployment
dpl_2PowgjsQGrbefYYuf2Av8WgP4FTk READY; both domains and live Moon/chart boundary witnesses
verified. Numerical/receipt byte-preservation evidence reused for identical source.
Automatic post-merge CI34756055748 passed all14jobs. No critical regression or rollback.
Pre-release rollback baseline dpl_5U72NfyjWZb4T2x2Q93DUqo1Ac4g (355f4261) remains READY.
Existing Registry automation subsequently deployed0490c4f8 at dpl_DRnrXu34g9od11bzmgoYCb368QYr;
L1 runtime/pins/receipt logic unchanged, five changed JSON artifacts verified against current main.
SDK merge/npm hold and L2-L6/Astrofolio/Zodia exclusions preserved. Follow-up remains paused.
[Final production evidence](evidence/l1-production/README.md).
