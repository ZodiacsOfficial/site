# Phase 5A — People directory: implementation review

> **RESERVED STUB — NO REVIEW HAS BEEN PERFORMED.**
>
> This file exists so the review has a fixed home and a fixed name. It
> contains no findings, no verdict, and no assessment of anything,
> because there is nothing yet to review: Phase 5A is design only, and no
> implementation candidate exists.

## What this file will hold

An independent Fable review of Sol Ultra's Phase 5B `noindex` pilot,
written against `docs/PHASE5-PEOPLE-FABLE-HANDOFF.md` and conducted the
same way as the Phase 3 and Phase 4 implementation reviews:

- the exact reviewed commit SHA;
- a PASS / PASS AFTER BLOCKERS / FAIL verdict;
- P0–P3 findings, each with route, state, reproducible evidence, and the
  smallest safe correction;
- an explicit statement of whether the implementation realises this
  handoff faithfully;
- a separate non-blocking backlog;
- a bounded handoff back to Sol Ultra;
- confirmation that nothing was released, indexed, deployed or emailed
  during the review.

## Entry conditions

This review may begin only when all of the following are true:

1. An implementation candidate exists on its own branch with a green CI
   run recorded.
2. Every box in handoff §20 is claimed complete by the implementer.
3. All 21 routes are `noindex, nofollow` and absent from the sitemap,
   navigation and search index.
4. The correction route (`people@zodiacs.org`, handoff §13) is live.

Until then this file stays exactly as it is. **Do not fill it in
speculatively, and do not treat its existence as evidence that a review
happened.**
