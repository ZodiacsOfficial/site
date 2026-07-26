# Phase 5B People pilot — Sol implementation handoff

Status: **release candidate complete, independently reviewed and locally
verified; not yet published**

Prepared: 2026-07-26

Production base: `51573a87ef492f15cb41177e727d0b46320d5fef`

Fable handoff commits integrated: `e824752`, `93a8b9e`

## Release boundary

This candidate adds exactly twenty English People records and twenty profile
routes plus the `/people/` directory. Every route is `noindex, nofollow`,
excluded from navigation, sitemap, search, hreflang and assistant discovery,
and protected by the matching `X-Robots-Tag` response header.

The candidate has not been pushed, previewed, deployed, indexed or released.
Only the three owner-authorized mailbox tests recorded below have been sent.
Phase 6 has not begun.

The independent Fable review commit
`40a5fd81c42b09481b6e6699e2d40bb0f435d4b1` was integrated onto the current
candidate as `a97f8309189348108098001280caf7495813f43d`. It found no P0 and one
P1: four profiles correctly excluded a non-Moon sign transition from their
aggregates but did not name the open sign to readers. The candidate now names
Mercury on Ada Lovelace and Rabindranath Tagore, Venus on Chien-Shiung Wu, and
Mars on Wangari Maathai, and renders the same exact transition in an `Open
signs` evidence row. The generator, independent validator, integrity test,
unit test and browser drive all pin that rule.

A read-only Gmail search at 2026-07-26T06:01:21Z found no message to, delivered
to, or mentioning `people@zodiacs.org` in the connected sending account. The
owner then authorized exactly one end-to-end test:

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

The owner subsequently confirmed that an authorized test was received in the
`admin@zodiacs.org` Spam folder, that `people@zodiacs.org` is an alias of that
monitored Workspace account, and that the sender was marked safe. This is
positive end-to-end evidence; the mailbox release gate is closed.

One final owner-authorized classification test was then sent:

- Sent: 2026-07-26T14:20:14Z
- Subject: `[Zodiacs Phase 5 final mailbox test] 20260726T141953Z`
- Receipt token: `PHASE5-PEOPLE-FINAL-20260726T141953Z`
- Gmail message/thread: `19f9ecc42eb8d6ea`
- Provider state: accepted into `SENT`
- Receipt state: owner confirmed receipt in the monitored Workspace mailbox at
  2026-07-26T14:23:53Z; the connected Gmail tool is attached to the sending
  account and could not inspect that destination directly

No fourth message was sent.

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

Current reviewed content range after the review correction:

- 20 records across all 12 Sun signs.
- 332–414 original words per page.
- 12–15 substantive statements per page.
- Maximum pairwise similarity `0.3048`, below the `0.32` ceiling.
- Phase 5B data/content validation: **491/491**.

## Verification evidence

- Production build: **3,692 pages**, exit 0.
- Distribution gate: **3,791 HTML files**, People **21/21** noindex/nofollow,
  self-canonical, and absent from sitemap, search and hreflang.
- Schema: **2,508 JSON-LD documents**, **9,855 graph nodes**, 0 errors.
- Bundle budgets: pass; OG bundle **14.99 MB** under the unchanged 15 MB cap.
- Astro check: 0 errors, 0 warnings (5 non-blocking hints).
- Full Vitest suite: **192 files / 1,431 tests**, all pass.
- Focused People browser drive: **365 assertions**, all pass.
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

1. ~~Provision `people@zodiacs.org`.~~ Complete.
2. ~~Confirm an authorized end-to-end receipt in the monitored mailbox.~~
   Complete; the owner found the receipt in Spam and marked the sender safe.
3. ~~Obtain an independent Fable implementation review from the candidate
   SHA and close every P0/P1.~~ Complete; no P0, and the single P1 is fixed and
   pinned by the 491-check validator and 365-assertion browser drive.
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
