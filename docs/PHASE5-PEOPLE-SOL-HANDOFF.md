# Phase 5B People pilot — Sol implementation handoff

Status: **implementation complete and locally verified; not published**

Prepared: 2026-07-26

Production base: `51573a87ef492f15cb41177e727d0b46320d5fef`

Fable handoff commits integrated: `e824752`, `93a8b9e`

## Release boundary

This candidate adds exactly twenty English People records and twenty profile
routes plus the `/people/` directory. Every route is `noindex, nofollow`,
excluded from navigation, sitemap, search, hreflang and assistant discovery,
and protected by the matching `X-Robots-Tag` response header.

The candidate has not been pushed, previewed, deployed, indexed or released.
No email has been sent. Phase 6 has not begun.

The release remains blocked until `people@zodiacs.org` is proven to exist and
to be monitored. A read-only Gmail search at 2026-07-26T06:01:21Z found no
message to, delivered to, or mentioning that exact address. The owner then
authorized exactly one end-to-end test:

- Sent: 2026-07-26T12:10:35Z
- Subject: `[Zodiacs Phase 5 mailbox test] 20260726T121020Z`
- Receipt token: `PHASE5-PEOPLE-20260726T121020Z`
- Gmail message/thread: `19f9e55936daad8e`
- Provider state: accepted into `SENT`
- Receipt state at 2026-07-26T12:12:48Z: absent from the monitored Inbox and
  absent from all non-Sent mail; no delivery-failure notice present

The owner authorized one retest after the first receipt remained absent:

- Sent: 2026-07-26T12:35:16Z
- Subject: `[Zodiacs Phase 5 mailbox retest] 20260726T123504Z`
- Receipt token: `PHASE5-PEOPLE-RETEST-20260726T123504Z`
- Gmail message/thread: `19f9e6c26ca31296`
- Provider state: accepted into `SENT`
- Receipt state at 2026-07-26T12:36:27Z: absent from the monitored Inbox and
  absent from all non-Sent mail; no delivery-failure notice present

This proves that both authorized messages were sent, but it is not positive
evidence that the destination is monitored. No third message was sent. Because
the pilot contains pages about living people, no preview or production
publication may occur before a genuine end-to-end receipt is confirmed.

## What was implemented

- A deterministic, source-pinned data build for the twenty reviewed people.
- A strict runtime schema and independent source/data/content validators.
- A no-JavaScript directory with Sun-sign and seven-discipline filters, plus a
  progressively enhanced name search.
- Twenty profile pages with a real server-rendered chart wheel, no houses or
  angles, explicit unknown-time language, evidence and correction sections,
  related same-sign names and sharing links.
- Seventeen credited public-domain or Creative Commons portraits with mobile
  thumbnails; three deliberate pastel sign-disc fallbacks where the reviewed
  licence did not qualify.
- Twenty deterministic 1200×630 Open Graph cards.
- Capped birthday-page cross-links and the correction/removal address on About.
- Build, distribution, browser, schema, bundle, privacy and noindex gates in CI.

## Accuracy amendment

The design pilot treated every noon-chart placement as settled. Thirteen of
the twenty civil dates actually contain at least one sign transition while the
birth time is unknown. Phase 5B now samples the complete civil day, including
both midnight boundaries, and counts only placements whose sign remains stable
through the entire interval.

Uncertain placements remain visible and plainly labelled, but are excluded
from element, modality and stellium totals. Generated copy cannot claim a
ten-body total when a record has any uncertain placement. The validator pins
this rule for every record.

Current reviewed content range:

- 20 records across all 12 Sun signs.
- 332–404 original words per page.
- 12–15 substantive statements per page.
- Maximum pairwise similarity `0.3048`, below the `0.32` ceiling.
- Phase 5B data/content validation: **467/467**.

## Verification evidence

- Production build: **3,692 pages**, exit 0.
- Distribution gate: **3,791 HTML files**, People **21/21** noindex/nofollow,
  self-canonical, and absent from sitemap, search and hreflang.
- Schema: **2,508 JSON-LD documents**, **9,855 graph nodes**, 0 errors.
- Bundle budgets: pass; OG bundle **14.99 MB** under the unchanged 15 MB cap.
- Astro check: 0 errors, 0 warnings (5 non-blocking hints).
- Full Vitest suite: **192 files / 1,430 tests**, all pass.
- Focused People browser drive: **341 assertions**, all pass.
- Fable acceptance proofs: **21 boards / 75 renders**, zero overflow and zero
  page errors.
- Existing visual regression: all 15 reference states pass.
- Russian localization: R0 and R2 route/browser gates pass unchanged.
- Lighthouse, three runs per route:
  - `/people/`: performance 100, accessibility 100, adjusted SEO 100,
    LCP 1.36s, CLS 0, TBT 0ms.
  - `/people/ada-lovelace/`: performance 98, accessibility 100, adjusted SEO
    100, LCP 2.33s, CLS 0, TBT 0ms.
  - The adjusted SEO score excludes only Lighthouse's intentional
    crawlability failure; all six runs independently confirmed noindex.
- `git diff --check`: clean.

## Bounded next gates

Before a noindex pilot release:

1. Provision `people@zodiacs.org`.
2. Send one authorized end-to-end test and confirm the receipt in the monitored
   mailbox.
3. Obtain an independent Fable implementation review from the candidate SHA.
4. Push the isolated candidate, obtain green CI, merge normally, verify all
   People response headers and discovery exclusions in production, and record
   the merge SHA, deployment and UTC cutover.

Before Phase 5C may make any People route indexable:

1. Complete the required legal review of the personal-data position.
2. Close every P0/P1 from the independent review and private pilot.
3. Re-run the content, source, portrait, search-discovery, schema, visual,
   accessibility and three-run Lighthouse gates on the exact release SHA.

Do not expand beyond the twenty-person pilot, add localized People routes, add
People to global navigation/search, or begin Phase 6 under this handoff.
