# Phase 5B People pilot — Sol implementation handoff

Status: **Phase 5B and the conservative Phase 5C indexing boundary are released**

Prepared: 2026-07-26

Integrated production base:
`f4dff60903c442b9c0ca0e96cf82ee79e8964585`

Fable handoff commits integrated: `e824752`, `93a8b9e`

## Release boundary

This release adds exactly twenty English People records and twenty profile
routes plus the `/people/` directory. Every route is `noindex, nofollow`,
excluded from navigation, sitemap, search, hreflang and assistant discovery,
and protected by the matching `X-Robots-Tag` response header.

The noindex pilot was released through PR #165. No People route was made
indexable or submitted through IndexNow. Only the three owner-authorized
mailbox tests recorded below were sent. Phase 6 has not begun.

The independent Fable review commit
`40a5fd81c42b09481b6e6699e2d40bb0f435d4b1` was integrated onto the current
candidate as `a97f8309189348108098001280caf7495813f43d`. It found no P0 and one
P1: four profiles correctly excluded a non-Moon sign transition from their
aggregates but did not name the open sign to readers. The candidate now names
Mercury on Ada Lovelace and Rabindranath Tagore, Venus on Chien-Shiung Wu, and
Mars on Wangari Maathai, and renders the same exact transition in an `Open
signs` evidence row. The generator, independent validator, integrity test,
unit test and browser drive all pin that rule.

## Release evidence

- Candidate head: `1b5ab93fd8b0f39877274365fa6f370cba1dd496`.
- Candidate CI: Site Check run `30207609219`, success.
- Release PR:
  `https://github.com/ZodiacsOfficial/site/pull/165`, merged at
  `2026-07-26T15:27:25Z`.
- Production merge SHA:
  `dadb0821567cdc078b9f7b38e5e1e3ba2061352a`.
- Post-merge CI: Site Check run `30208236247`, success on that exact SHA.
- Vercel production deployment: GitHub deployment `5611511229`, completed at
  `2026-07-26T15:30:05Z`, with immutable deployment URL
  `https://zodiacs-asf024oe8-zodiacsofficial.vercel.app`.
- Live verification completed at `2026-07-26T15:47:47Z`: all 21 People routes
  returned `200`, self-canonicals, page-level `noindex, nofollow`,
  server-level `noindex, nofollow, noarchive`, and no hreflang links. The live
  sitemap and search index contained zero People URLs.
- The four review corrections were present in production: Mercury on Ada
  Lovelace and Rabindranath Tagore, Venus on Chien-Shiung Wu, and Mars on
  Wangari Maathai were named both in the reading and the `Open signs` evidence
  row.
- `/registry/collection/` remained `200` with the current Cabinet of Twelve
  output. The release contains no Registry or Collection source change.

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
4. ~~Push the isolated candidate, obtain green CI, merge normally, verify all
   People response headers and discovery exclusions in production, and record
   the merge SHA, deployment and UTC cutover.~~ Complete; see Release evidence.

## Phase 5C owner decision and candidate boundary

The owner declined outside legal advice and authorized the narrower risk
decision in `docs/PHASE5-PEOPLE-OWNER-RISK-DECISION.md`. It is explicitly not
described as legal advice or universal legal clearance.

- Eighteen reviewed deceased-public-figure profiles are explicitly allowlisted
  for sitemap and search.
- Rigoberta Menchú and Serena Williams remain `noindex, nofollow`, outside the
  sitemap and site search, outside indexable birthday/related rails, and under
  image-asset `X-Robots-Tag` protection.
- The directory remains `noindex, nofollow` because eighteen is below its
  twenty-profile eligibility floor.
- The production builder reads a committed explicit policy; a new record
  cannot become indexable merely by entering the manifest.
- No navigation entry, localized People route, expansion, scheduled ingestion,
  Registry/Collection change, or Phase 6 work is included.

Candidate verification completed so far: 493/493 People validation checks,
369/369 focused browser assertions, 1,431/1,431 unit tests, Astro check across
653 files with zero errors or warnings, the existing visual and R0/R2 locale
drives, a clean 3,791-file production build, exact 18/2
sitemap/search/meta/header distribution, schema 2,526 documents/0 errors, and
bundle budgets green. Three-run Lighthouse passed at 100/100/100 with a
1.35-second LCP for the protected directory, 98/100/100 with a 2.33-second LCP
for indexable Ada Lovelace, and 98/100/100 with a 2.33-second LCP for protected
Serena Williams; the intentional noindex audit was the only excluded SEO audit
on the two protected routes.

### Phase 5C release evidence

- PR `#167` merged at `2026-07-26T17:31:56Z` as
  `877c16a1c7378e41eff13e4ec1308d1e56b4f96e`.
- Candidate run `30212027374` passed on
  `2d408090df3e25f854ac1e583b23504fa2ff52de`; post-merge run
  `30212771757` passed on the exact merge SHA.
- Vercel completed the canonical <https://zodiacs.org> deployment at
  `2026-07-26T17:34:32Z`. The immutable deployment record is
  <https://vercel.com/zodiacsofficial/zodiacs-org/7aC5jL2G3uoiTsTXkj3citAusbiX>.
- Live verification completed at `2026-07-26T17:53:29Z`: exact 18/2
  discovery and protection distribution, twenty self-canonical profile pages,
  no People hreflang, four protected living-person image assets, privacy copy,
  and the unchanged Registry Collection route all passed. Eight live browser
  checks at `390px` and `1280px` passed with zero overflow or browser errors.
- IndexNow accepted the eighteen approved profile URLs, `/privacy/`, and the
  two changed birthday routes with HTTP `200` at
  `2026-07-26T17:53:04.139Z`. No protected URL was submitted.

This completes only the conservative Phase 5C release boundary. It does not
complete the wider 500-person Phase 5 Definition of Done, authorize person
21, or open Phase 6.

Do not expand beyond the twenty-person pilot, add localized People routes, add
People to global navigation/search, or begin Phase 6 under this handoff.
