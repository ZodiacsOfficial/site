# Phase 5B People noindex pilot — Fable implementation review

Status: independent review, performed and complete
Reviewed candidate: `a1a9a8e3cb9a7b8977e398b8133c2309865012f5`
(local branch state; production base `51573a87`, carrying the Phase 5A
handoff commits `e824752` + `93a8b9e` and the implementation commit
`75d11f2` plus four mailbox-evidence documentation commits)
Handoff under review: `docs/PHASE5-PEOPLE-FABLE-HANDOFF.md` (with the
recorded 2026-07-26 accuracy amendment) and
`docs/PHASE5-PEOPLE-SOL-HANDOFF.md`
Review branch: `fable/phase5b-people-review` (this document is its only
change; not pushed)

## Verdict

**PASS AFTER BLOCKERS.**

One P1 blocks the private noindex pilot: on the four pages where a
placement other than the Moon changes sign during the civil day, that
placement is correctly excluded from every aggregate but is never named
as uncertain anywhere the reader can see. Everything else — the twenty
routes, the discovery exclusions, the 25-sample unknown-time honesty,
the sources, the portraits and credits, the correction route, the
mailbox evidence, responsiveness, accessibility, and every Phase 1–4
regression surface — passed independent verification.

**The noindex pilot may be released once the P1 labelling fix lands**,
with the stale PLAN.md ledger (P2-1) corrected in the same push/merge
step the Sol handoff already requires.

## How this review was performed

The worktree at `/Users/chiburashka/Documents/Codex/2026-07-24/site-phase4-sol`
was already checked out at exactly
`a1a9a8e3cb9a7b8977e398b8133c2309865012f5` with a clean tree; nothing was
fetched, replayed, or modified. I read both handoffs in full, the
complete People implementation (`src/lib/people.ts`, both routes,
`PeopleCard.astro`, `people.css`), every generator and validator
(`build-people-pilot`, `build-people-portraits`, `validate-people-pilot`,
`check-people-pilot`, `check-people-dist`, `people-pilot.test.mjs`), the
browser drive, the CI, SEO/Base/vercel/birthday/about/OG/Lighthouse
deltas, and the pilot-data deltas against my Phase 5A records. I re-ran
every requested gate from the exact SHA, re-ran the browser drive with
screenshots, and visually inspected the directory and a profile at 360,
390, 781 and 1280 px, plus a generated OG card.

**Provenance:** the Phase 5A handoff document, proofs, evidence records,
schema, thresholds and corrections procedure are byte-identical to my
pushed `31ac2bd` content as re-parented at `93a8b9e`. The evidence
records (`docs/phase5/people-pilot/evidence/*.json`) were not touched by
the implementation. The candidate's manifest, production
`src/data/people.json`, and my reviewed records agree exactly on every
QID, name, birth date, birthplace, source revision, licence and portrait
decision, and `people.json` pins the manifest's SHA-256.

## Exact test results, from this review's own runs

| Gate | Result |
| --- | --- |
| `npm run check` | exit 0 — 653 files, 0 errors, 0 warnings, 5 hints |
| `npm test` | exit 0 — 1,430/1,430 tests pass |
| `npm run build` | exit 0 — `people-pilot: OK` (drift-exact), `people-pilot-integrity: OK`, `check-dist: OK — 3,791 HTML files`, `people-dist: OK — 21 noindex/nofollow routes, self-canonical, no hreflang, no sitemap or search entry`, `validate-schema: OK — 2,508 JSON-LD documents, 9,855 graph nodes, 0 errors`, `report-bundles: budgets pass` |
| `npm run test:phase5:people` | exit 0 — 4 vitest assertions + browser drive **341/341** |
| `npm run test:visual` | exit 0 — all 15 reference states pass |
| `npm run test:i18n:r0` | exit 0 |
| `npm run test:i18n:r2` | exit 0 — 26 public RU routes + noindex 404 |
| `LIGHTHOUSE_ROUTES=people-directory,people-profile npm run test:lighthouse` | exit 0 — `/people/` 99/100/100, LCP 2.04 s, CLS 0, TBT 0 ms; `/people/ada-lovelace/` 98/100/100, LCP 2.33 s, CLS 0, TBT 0 ms; three runs each; the SEO score excludes only Lighthouse's intentional `is-crawlable` audit, and that audit **failed (noindex active) on every run**, which the runner separately requires |
| `git diff --check` | clean |
| `node scripts/validate-people-pilot.mjs` | **467/467** checks pass |

The working tree remained clean after all gates — every generated
artifact in the commit is drift-exact.

## The thirteen verification points

1. **Exactly 20 profiles and one directory.** Verified in source
   (`people.json` schema pins `length(20)`), in dist (21 entries under
   `dist/people/`), and by the dist gate and drive.
2. **noindex and nofollow everywhere.** `<meta name="robots"
   content="noindex, nofollow, max-image-preview:large">` on all 21
   pages (dist grep + drive on every route), `X-Robots-Tag: noindex,
   nofollow, noarchive` for `/people/(.*)` in `vercel.json`, and
   Lighthouse independently confirmed noindex on all six runs.
3. **No discovery surface carries a People URL.** Sitemap source and
   built `sitemap.xml`: zero matches. Search index: zero entries
   (asserted by `check-people-dist` against the built
   `search-index.json`). Navigation and footer: zero matches. hreflang:
   `SEO.astro` suppresses all alternates on noindex pages; drive asserts
   zero alternate links per route. Assistant discovery:
   `build-assistant-context.mjs` excludes `/people/` by prefix. No
   localized routes exist (`dist/{es,ru,pt,fr,it}/people` absent).
4. **Unknown-time honesty.** The recorded amendment supersedes my
   endpoint-only 5A rule correctly: the computation samples the civil
   day hourly from the opening midnight through the next midnight
   (25 samples inclusive; the validator separately asserts the day
   bounds and rejects the old 23:59 endpoint). A placement counts as
   settled only when its sign holds in all 25 samples; aspects must
   hold in all 25; retrograde claims additionally require direction
   stability, with direction-uncertain bodies surfaced separately.
   Thirteen records carry at least one sign-uncertain placement, and
   aggregates (elements, modalities, stelliums, retrograde counts,
   missing-element claims) are computed from settled placements only —
   pinned three ways: the production validator, the prebuild integrity
   check, and a vitest contract. No page contains houses, angles,
   rising, sect, or a ten-body claim on an uncertain record (validated
   and drive-asserted; the wheel caption states the omissions on every
   profile). **The one gap is the P1 below: the uncertain placement is
   excluded but not named.**
5. **Sources, revisions, dates, portraits, licences.** Byte-parity with
   the reviewed records confirmed programmatically across all 20
   (QID, display name, living flag, full birthDate block, full sources
   block, full birthPlace block, portrait block). The portrait pipeline
   pins each file and thumbnail by SHA-256, format, and dimensions, and
   fails closed on attribution or licence drift.
6. **17 portraits + 3 fallbacks.** Drive asserts, per route: portrait
   loads with natural width, visible credit containing Wikimedia
   Commons, fallback hidden; or — for `chien-shiung-wu`,
   `vincent-van-gogh`, `zaha-hadid` — no portrait image exists and the
   pastel sign-disc fallback renders. Confirmed visually; the broken-
   image handler swaps to the disc fallback.
7. **Correction route.** `mailto:people@zodiacs.org` appears exactly
   once per profile (in the evidence disclosure, with a per-person
   subject), in the directory footer, and on `/about/`. Drive asserts
   presence and keyboard reveal on every representative route without
   JavaScript.
8. **Mailbox evidence.** The four documentation commits form an
   internally consistent, honest chain: the first two sends
   (12:10:35 Z, 12:35:16 Z) are each recorded with the explicit
   statement that absence of a receipt is *not* positive evidence; the
   gate closes only at `07ea56d` after the owner confirmed the
   authorized test was found in the `admin@zodiacs.org` **Spam**
   folder, that `people@zodiacs.org` **is an alias** of that monitored
   Workspace account, and that the sender was **marked safe**; the
   final test (14:20:14 Z) was **owner-confirmed received at
   2026-07-26T14:23:53Z**, and the confirming commit landed 24 seconds
   after that instant. Commit timestamps track the recorded UTC
   instants throughout. Verification basis, stated plainly: the
   repository chain plus the owner's attestation — the connected Gmail
   tool is attached to the sending account and could not inspect the
   destination directly, and this review had no independent mailbox
   access. Nothing in the chain overclaims, and the recorded facts
   match the owner's own statement commissioning this review.
9. **Directory behaviour.** Sign and discipline filters work without
   JavaScript via `:target` CSS over server-rendered content (an
   accepted mechanism deviation from my `?sign=` server-rendering
   spec — same contract, one static page); the drive verifies the Leo
   filter shows exactly the reviewed Leo count with JS disabled, that
   the search field is absent (not inert) without JS, that the enhanced
   name search narrows and announces counts, that the empty state
   appears, that keyboard focus is visible on the sign rail, and that
   reduced motion leaves content visible with no running animation.
   Zero horizontal overflow at 360/390/781/1280 on every checked route
   (drive, all four widths, plus my own re-run).
10. **Readability and visual quality.** Inspected at all four widths
    from fresh screenshots: the directory (three-column at 1280, single
    column at 360/390) and the Ada Lovelace profile (sticky identity
    rail at 1280; portrait, credit, quality label, real wheel with no
    house ring, five reading blocks). Faithful to the Phase 5A boards
    and to the Cosmic Void system; no gold, no new chrome. One P3 nit:
    at 360 px the `overflow-wrap: anywhere` heading breaks
    "Lovelace" mid-word.
11. **Birthday cross-links.** Exactly 18 birthday pages carry the
    "People born on this date" block (20 people over 18 distinct
    dates; January 9 and May 31 each show two cards), rendered only
    when a reviewed person matches and capped at three by
    `peopleForBirthday`. Three further pages match the phrase in
    long-standing editorial prose only — verified not to contain the
    block. No other birthday-page change.
12. **OG, JSON-LD, headers, bundles, Phase 1–4.** Twenty deterministic
    people cards generated and verified inside the existing v2
    pipeline and its unchanged 15 MB ceiling; JSON-LD validates
    site-wide (2,508 documents, 0 errors) with `Person.birthDate`
    emitted only day-precise; response headers verified; bundle budgets
    pass; the full Vitest suite, visual regression, i18n R0/R2, and the
    Phase 1 evidence contract all pass — the Phase 1 screenshot
    recapture inside the candidate is the documented one-time
    consequence of the `Base`/`SEO` template change, and people-only
    files are now excluded from that hash so future pilot revisions
    cannot churn the Phase 1 receipt.
13. **Phase boundary.** `indexEligibility.eligible` is a schema-pinned
    literal `false` on all 20 records with the 5B blocking reason; no
    indexing switch exists anywhere in the implementation; the legal
    review remains listed as a Phase 5C precondition in the Sol
    handoff and is untouched by this candidate. My review stub was
    replaced by this document and by nothing else.

## Findings

### P0 — none.

### P1 — sign-uncertain placements other than the Moon are never named

- **Where:** `/people/chien-shiung-wu/` (Venus),
  `/people/rabindranath-tagore/` (Mercury), `/people/ada-lovelace/`
  (Mercury, alongside its labelled Moon), `/people/wangari-maathai/`
  (Mars, alongside its labelled Moon).
- **Evidence:** each page's aggregates honestly say "the N placements
  whose signs hold for the whole day," the dignity block correctly
  drops the uncertain body (Lovelace's Mercury-in-Sagittarius dignity
  line from the 5A copy is gone), and no text asserts the uncertain
  body's sign — but nothing on the page, in the quality label, or in
  the evidence disclosure names *which* body is unsettled. The reader
  counts ten glyphs on the wheel, reads "eight placements whose signs
  hold," and cannot discover that Mercury and the Moon are the open
  two. On Wu's page the Moon block even says the Moon's sign "is not
  in doubt" while Venus silently is.
- **Why P1:** the review brief's own bar — "any placement that changes
  signs is labelled uncertain" — and the amendment's own claim
  ("uncertain placements remain visible and plainly labelled") are not
  met for these four pages. The pilot's entire ethic is that
  uncertainty is stated, not implied; on pages about real people that
  is a release property, not polish. No false statement is made, so
  this is not a P0.
- **Smallest safe correction:** name the sign-uncertain bodies in
  reader-visible copy — a sentence in the shape block or the quality
  label exactly parallel to the Moon treatment (e.g. "Venus crossed
  from Gemini into Cancer during that day, so its sign is left open"),
  plus an "Unknown-time range" disclosure row listing them; then add a
  validator check that every `stableAcrossDay: false` body outside the
  Moon block is named in the page's copy, regenerate, and re-run
  `test:phase5:people`. No route, schema, or data-shape change needed.

### P2 — safe backlog items

- **P2-1 — the operational ledger was not updated.** `PLAN.md` still
  reads "Phase 5 has not begun" in its active-phase header while this
  candidate implements Phase 5B, and `SETUP.md`'s service inventory
  does not record the now-provisioned `people@zodiacs.org` alias of
  the monitored Workspace account. Prior phases updated the ledger in
  the candidate. Fold both into the push/merge step the Sol handoff
  already defines (its "bounded next gates" step 4), before or with
  the merge — the file is the program's operational source of truth.
- **P2-2 — similarity headroom is now 5%.** The re-seeded copy measures
  0.3048 against the 0.32 ceiling (was 0.2786 at 5A). Fine for these
  twenty; the first expansion person could plausibly trip the ceiling.
  Before any Phase 5C expansion, re-measure across the enlarged set
  and either widen the gloss libraries or tighten selection — never
  the ceiling.

### P3 — polish

- **P3-1 — article grammar on six pages:** "a earth sign" (Tagore),
  "a air sign" (Gandhi, Woolf, Whitman), "a opposition" (Kahlo,
  de Beauvoir). Inherited from my own Phase 5A composition frames
  (`a ${element} sign`, `a ${first.type}`), surfaced by re-seeding —
  a design-tooling defect, not an implementation error. Fix an/a
  selection in `compose-copy.mjs` and regenerate.
- **P3-2 — current-country anachronism:** identity lines render the
  birthplace's present-day country beside historical years
  ("People's Republic of China · 1912–1997" for Wu). Also inherited
  from the 5A design (Wikidata P17 is the current country). Consider
  dropping the country or using an era-neutral label for births that
  predate the named state.
- **P3-3 — name wrapping at 360 px:** `overflow-wrap: anywhere` on the
  profile heading breaks "Lovelace" mid-word without a hyphen. Scope
  the anywhere-wrap to data rows and let headings wrap at spaces.
- **P3-4 — People image assets remain image-indexable:** the
  `X-Robots-Tag` header covers `/people/(.*)` HTML but not
  `/assets/people/*` portraits or `/assets/og/v2/people/*` cards.
  Pages are noindex; the images of living people are not. Consider
  extending the header to both asset prefixes at Phase 5C, or earlier
  at no cost.

## Release decision

- **May the noindex pilot be released?** Yes — **after the P1
  labelling fix**, with P2-1 handled in the push/merge step. Nothing
  else blocks: the discovery boundary is enforced in five independent
  places (meta, header, dist gate, drive, Lighthouse), the data is
  drift-pinned to the reviewed records, and the mailbox gate is
  genuinely closed.
- **Remaining Phase 5C blockers, unchanged and confirmed:**
  1. Qualified legal review of the personal-data position
     (handoff §12) before any route leaves noindex.
  2. Closure of every P0/P1 from this review and from private-pilot
     observation (currently: the single P1 above).
  3. Re-run of the content, source, portrait, search-discovery,
     schema, visual, accessibility and three-run Lighthouse gates on
     the exact release SHA, plus the P2-2 similarity re-measurement
     before any expansion past twenty.

## Non-action confirmation

No implementation, configuration, flag, environment variable, database,
email, or production state was changed by this review. No email was
sent. Nothing was pushed, merged, deployed, previewed publicly, or made
indexable. The only repository change is this document, committed on a
fresh review branch parented directly on
`a1a9a8e3cb9a7b8977e398b8133c2309865012f5`. The gates run by this review
executed locally against the checked-out candidate and left the working
tree clean.
